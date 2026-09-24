const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const userModel = require("../models/user.model");
const { generateSecret } = require("otplib");
const { sendOtp, finalizeOtpVerification, issueSession } = require("../utils/otp");
const { sendSuccess, sendError } = require("../utils/response");
const jwt = require("jsonwebtoken");
const { clearCookie } = require("../utils/cookies");
const { cleanObject } = require("../utils/cleanData");
const sessionModel = require("../models/session.model");
const { TWO_FACTOR_METHOD } = require("../constants/user.constants");
const { isPassword } = require("../utils/validation");
const { setAuthCookies, clearAuthCookies } = require("../services/token.service");
const { logError } = require("../utils/logger");

function duplicateKeyCode(error) {
  if (error && error.code === 11000) {
    const field = Object.keys(error.keyPattern || error.keyValue || {})[0];
    if (field === "email") return "auth/email-already-exists";
    if (field === "username") return "auth/username-already-exists";
    if (field === "phone") return "auth/phone-already-exists";
  }
  return null;
}

async function register(req, res) {
  try {
    const { ffName, email, username, fullName } = req.body;
    const hash = await bcrypt.hash(req.body.password, 10);

    const user = await userModel.create({
      ffName,
      email,
      username,
      fullName,
      password: hash,
    });

    const otpSent = await sendOtp(res, "email", "register", {
      id: user._id,
      email: user.email,
    });
    if (!otpSent) return;

    sendSuccess(res, 201, "Registration successful. OTP sent to email.");
  } catch (error) {
    const dup = duplicateKeyCode(error);
    if (dup) return sendError(res, dup);
    logError({ message: "register_failed", err: error });
    return sendError(res, "common/server-error");
  }
}

async function login(req, res) {
  try {
    const { _id, email, twoFactorEnabled, isActive, emailVerified } = req.data;

    if (twoFactorEnabled || !isActive || !emailVerified) {
      const otpSent = await sendOtp(res, "email", emailVerified && twoFactorEnabled ? "login" : "verify-email", {
        id: _id,
        email,
      });
      if (!otpSent) return;
      return sendSuccess(res, 200, "OTP sent successfully. Please verify to complete login.");
    }

    await issueSession(req, res, req.data);
    return sendSuccess(res, 200, "Login successfully", cleanObject(req.data, ["password"]));
  } catch (error) {
    logError({ message: "login_failed", err: error });
    return sendError(res, "common/server-error");
  }
}

async function logout(req, res) {
  try {
    const userId = req.user.id;
    const sessionId = req.params.sessionId || req.user.sessionId;

    if (sessionId) {
      await sessionModel.updateOne(
        { _id: sessionId, userId, isRevoked: false },
        { $set: { isRevoked: true, expiresAt: new Date() } },
      );
    }

    clearAuthCookies(res);
    return sendSuccess(res, 200, "Logged out successfully");
  } catch (error) {
    logError({ message: "logout_failed", err: error });
    return sendError(res, "common/server-error");
  }
}

async function logoutAllDevices(req, res) {
  try {
    const userId = req.user.id;
    await sessionModel.updateMany(
      { userId, isRevoked: false },
      { $set: { isRevoked: true, expiresAt: new Date() } },
    );

    clearAuthCookies(res);
    return sendSuccess(res, 200, "Logged out from all devices");
  } catch (error) {
    logError({ message: "logout_all_failed", err: error });
    return sendError(res, "common/server-error");
  }
}

async function refreshAccessId(req, res) {
  try {
    const localId = req.cookies.localId;
    if (!localId) {
      clearAuthCookies(res);
      return sendError(res, "auth/unauthorized");
    }

    let decoded;
    try {
      decoded = jwt.verify(localId, process.env.LOCAL_ID_SECRET);
    } catch (error) {
      clearAuthCookies(res);
      return sendError(res, "auth/unauthorized");
    }

    const session = await sessionModel
      .findOne({
        _id: decoded.sessionId,
        userId: decoded.id,
        isRevoked: false,
        expiresAt: { $gt: new Date() },
      })
      .select("+localIdHash");

    if (!session) {
      clearAuthCookies(res);
      return sendError(res, "auth/unauthorized");
    }

    if (session.localIdHash && decoded.tokenHash) {
      const incomingHash = crypto.createHash("sha256").update(decoded.tokenHash).digest("hex");
      if (incomingHash !== session.localIdHash) {
        clearAuthCookies(res);
        return sendError(res, "auth/unauthorized");
      }
    }

    session.lastActiveAt = new Date();
    await session.save();

    const user = await userModel.findById(decoded.id).select("role isBanned isDisabled");
    if (!user) {
      clearAuthCookies(res);
      return sendError(res, "auth/user-not-found");
    }
    if (user.isBanned || user.isDisabled) {
      clearAuthCookies(res);
      return sendError(res, "auth/account-restricted");
    }

    const accessId = jwt.sign(
      { id: user._id, role: user.role, sessionId: session._id },
      process.env.ACCESS_ID_SECRET,
      { expiresIn: process.env.ACCESS_ID_EXPIRES_IN },
    );

    setAuthCookies(res, { accessId });
    return sendSuccess(res, 200, "Access ID refreshed successfully");
  } catch (error) {
    logError({ message: "refresh_failed", err: error });
    return sendError(res, "common/server-error");
  }
}

async function changePassword(req, res) {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return sendError(res, "auth/missing-fields");
    if (!isPassword(newPassword)) return sendError(res, "auth/weak-new-password");

    const user = await userModel.findById(req.user.id).select("+password email");
    if (!user) return sendError(res, "auth/user-not-found");

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) return sendError(res, "auth/incorrect-old-password");

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    await sessionModel.updateMany(
      { userId: user._id, isRevoked: false, _id: { $ne: req.user.sessionId } },
      { $set: { isRevoked: true, expiresAt: new Date() } },
    );

    return sendSuccess(res, 200, "Password changed successfully");
  } catch (error) {
    logError({ message: "change_password_failed", err: error });
    return sendError(res, "common/server-error");
  }
}

async function forgotPassword(req, res) {
  try {
    clearCookie(res, "resetId");
    const { email, phone, method } = req.body;
    if (!email && !phone) return sendError(res, "auth/missing-fields");
    if (!["email", "sms"].includes(method)) return sendError(res, "auth/invalid-method");

    const query = method === "sms"
      ? { phone: String(phone || "").trim() }
      : { email: String(email || "").trim().toLowerCase() };

    const user = await userModel.findOne(query);
    if (!user) {
      return sendSuccess(res, 200, "If this account exists, an OTP has been sent");
    }

    const otpSent = await sendOtp(res, method, "reset-password", {
      id: user._id,
      email: user.email,
      phone: user.phone,
    });
    if (!otpSent) return;

    return sendSuccess(res, 200, "If this account exists, an OTP has been sent");
  } catch (error) {
    logError({ message: "forgot_password_failed", err: error });
    return sendError(res, "common/server-error");
  }
}

async function resetPassword(req, res) {
  try {
    const password = req.body.password;
    const resetId = req.cookies.resetId;

    if (!password) return sendError(res, "auth/missing-fields");
    if (!isPassword(password)) return sendError(res, "auth/weak-password");
    if (!resetId) return sendError(res, "auth/reset-session-missing");

    let decoded;
    try {
      decoded = jwt.verify(resetId, process.env.RESET_ID_SECRET);
    } catch (error) {
      return sendError(res, "auth/invalid-reset-session");
    }

    const user = await userModel.findById(decoded.id).select("+password");
    if (!user) return sendError(res, "auth/user-not-found");

    user.password = await bcrypt.hash(password, 10);
    await user.save();
    await sessionModel.updateMany(
      { userId: user._id, isRevoked: false },
      { $set: { isRevoked: true, expiresAt: new Date() } },
    );

    clearCookie(res, "resetId");
    clearAuthCookies(res);
    return sendSuccess(res, 200, "Password reset successfully");
  } catch (error) {
    logError({ message: "reset_password_failed", err: error });
    return sendError(res, "common/server-error");
  }
}

async function setupTwoFactor(req, res) {
  try {
    const method = req.params.method || req.body.method;
    if (method === TWO_FACTOR_METHOD.SMS && !req.body.phone) return sendError(res, "auth/missing-fields");
    if (method === TWO_FACTOR_METHOD.EMAIL && !req.body.email && !req.authUser?.email) {
      return sendError(res, "auth/missing-fields");
    }

    if (method === TWO_FACTOR_METHOD.AUTHENTICATOR) {
      const twoFactorSecret = generateSecret();
      const otpSent = await sendOtp(res, method, "setup-2fa", {
        id: req.user.id,
        email: req.body.email || req.authUser?.email,
        setupMethod: method,
        twoFactorSecret,
      });
      if (!otpSent) return;
      return sendSuccess(res, 200, "Authenticator setup started", {
        secret: twoFactorSecret,
      });
    }

    if (method !== TWO_FACTOR_METHOD.RECOVERY) {
      const otpSent = await sendOtp(res, method, "setup-2fa", {
        id: req.user.id,
        email: req.body.email || req.authUser?.email,
        phone: req.body.phone,
        setupMethod: method,
      });
      if (!otpSent) return;
    }

    return sendSuccess(res, 200, "OTP sent successfully");
  } catch (error) {
    logError({ message: "setup_2fa_failed", err: error });
    return sendError(res, "common/server-error");
  }
}

async function verifyTwoFactor(req, res) {
  try {
    const { id, purpose } = req.data;
    const validation = await finalizeOtpVerification(req, res, id, purpose);
    if (!validation) return;

    clearCookie(res, "otpId");
    return sendSuccess(
      res,
      200,
      "OTP verified successfully",
      validation === true ? null : cleanObject(validation, ["password"]),
    );
  } catch (error) {
    logError({ message: "verify_2fa_failed", err: error });
    return sendError(res, "common/server-error");
  }
}

async function resendTwoFactorCode(req, res) {
  try {
    const { id, type, email, phone, purpose } = req.data;
    const otpSent = await sendOtp(res, type, purpose, { id, email, phone });
    if (!otpSent) return;
    return sendSuccess(res, 200, "OTP resent successfully");
  } catch (error) {
    logError({ message: "resend_otp_failed", err: error });
    return sendError(res, "common/server-error");
  }
}

async function verifyEmail(req, res) {
  req.body.otp = req.body.otp || req.body.code;
  return verifyTwoFactor(req, res);
}


async function switchTwoFactorMethod(req, res) {
  try {
    const newMethod = req.body.method;
    if (![TWO_FACTOR_METHOD.EMAIL, TWO_FACTOR_METHOD.SMS, TWO_FACTOR_METHOD.AUTHENTICATOR, "authenticator_app"].includes(newMethod)) {
      return sendError(res, "auth/invalid-2fa-method");
    }

    const { id, email, phone, purpose } = req.data;
    const otpSent = await sendOtp(res, newMethod, purpose, { id, email, phone });
    if (!otpSent) return;
    return sendSuccess(res, 200, "OTP resent successfully");
  } catch (error) {
    logError({ message: "switch_2fa_failed", err: error });
    return sendError(res, "common/server-error");
  }
}


async function disableTwoFactor(req, res) {
  try {
    const userId = req.user.id;

    const user = await userModel.findById(userId);

    if (!user) {
      return sendError(res, "auth/user-not-found");
    }

    if (!user.twoFactorEnabled) {
      return sendError(res, "auth/2fa-not-enabled");
    }

    user.twoFactorEnabled = false;
    user.twoFactorMethod = null;

    await user.save();

    return sendSuccess(res, {
      message: "Two-factor authentication disabled successfully",
    });
  } catch (error) {
    console.error("disableTwoFactor:", error);
    return sendError(res, "common/server-error");
  }
}


module.exports = {
  register,
  login,
  logout,
  logoutAllDevices,
  refreshAccessId,
  changePassword,
  forgotPassword,
  resetPassword,
  setupTwoFactor,
  verifyTwoFactor,
  resendTwoFactorCode,
  switchTwoFactorMethod,
  disableTwoFactor
};
