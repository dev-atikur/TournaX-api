const bcrypt = require("bcryptjs");
const userModel = require("../models/user.model");
const { generateSecret, verify } = require("otplib");
const { sendOtp, finalizeOtpVerification } = require("../utils/otp");
const { sendSuccess, sendError } = require("../utils/response");
const jwt = require("jsonwebtoken");
const { clearCookie, setCookie } = require("../utils/cookies");
const { cleanObject } = require("../utils/cleanData");
const sessionModel = require("../models/session.model");
const { TWO_FACTOR_METHOD } = require("../constants/user.constants");

//🔹 Register User function
async function register(req, res) {
  try {
    const { ffName, ffUid, email, username } = req.body;
    const hash = await bcrypt.hash(req.body.password, 10);

    const user = await userModel.create({
      ffName,
      ffUid,
      email,
      username,
      password: hash,
    });

    const otpSent = await sendOtp(res, "email", "register", {
      id: user._id,
      email: user.email,
    });
    if (!otpSent) return;

    sendSuccess(res, 201, "Registration successful. OTP sent to email.");
  } catch (error) {
    console.log(error);
    return sendError(res, "common/server-error");
  }
}

//🔹 Login User function
async function login(req, res) {
  try {
    const { _id, email, twoFactorEnabled, isActive, emailVerified } = req.data;

    if (twoFactorEnabled || !isActive || !emailVerified) {
      const otpSent = await sendOtp(res, "email", "login", { id: _id, email });
      if (!otpSent) return;

      return sendSuccess(res, 201, "OTP sent successfully. Please verify to complete login.");
    }

    const validation = await finalizeOtpVerification(req, res, _id, "login");
    if (!validation) return;

    return sendSuccess(res, 201, "Login successfully", cleanObject(req.data, ["password"]));
  } catch (error) {
    console.log(error);
    return sendError(res, "common/server-error");
  }
}

//🔹 LogOut User function
async function logout(req, res) {
  try {
    const userId = req.user.id;
    const sessionId = req.params.sessionId;

    await sessionModel.updateOne(
      { _id: sessionId, userId, isRevoked: false },
      { $set: { isRevoked: true, expiresAt: new Date() } },
    );

    clearCookie(res, "accessId");
    clearCookie(res, "localId");

    return sendSuccess(res, 200, "Logged out successfully");
  } catch (error) {
    console.log(error);
    return sendError(res, "common/server-error");
  }
}

//🔹 LogOut All User function
async function logoutAllDevices(req, res) {
  try {
    const userId = req.user.id;
    await sessionModel.updateMany(
      { userId, isRevoked: false },
      { $set: { isRevoked: true, expiresAt: new Date() } },
    );

    clearCookie(res, "accessId");
    clearCookie(res, "localId");

    return sendSuccess(res, 200, "Logged out from all devices");
  } catch (error) {
    console.log(error);
    return sendError(res, "common/server-error");
  }
}

//🔹 Refresh access id
async function refreshAccessId(req, res) {
  try {
    const localId = req.cookies.localId;
    if (!localId) {
      clearCookie(res, "accessId");
      return sendError(res, "auth/unauthorized");
    }

    let decoded;
    try {
      decoded = jwt.verify(localId, process.env.LOCAL_ID_SECRET);
    } catch (error) {
      clearCookie(res, "localId");
      clearCookie(res, "accessId");
      return sendError(res, "auth/unauthorized");
    }

    const session = await sessionModel.findOneAndUpdate(
      {
        _id: decoded.sessionId,
        userId: decoded.id,
        isRevoked: false,
      },
      { $set: { lastActiveAt: new Date() } },
      { new: true },
    );
    if (!session) {
      clearCookie(res, "localId");
      clearCookie(res, "accessId");
      return sendError(res, "auth/unauthorized");
    }

    const user = await userModel.findById(decoded.id).select("role");
    if (!user) {
      clearCookie(res, "localId");
      clearCookie(res, "accessId");
      return sendError(res, "auth/user-not-found");
    }

    const accessId = jwt.sign(
      { id: user._id, role: user.role },
      process.env.ACCESS_ID_SECRET,
      { expiresIn: process.env.ACCESS_ID_EXPIRES_IN },
    );

    setCookie(res, "accessId", accessId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: parseInt(process.env.ACCESS_ID_EXPIRES_IN, 10) * 60,
    });

    return sendSuccess(res, 200, "Access ID refreshed successfully");
  } catch (error) {
    console.log(error);
    return sendError(res, "common/server-error");
  }
}

//🔹 Change Password function
async function changePassword(req, res) {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) return sendError(res, "auth/missing-fields");

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;
    if (typeof newPassword !== "string") {
      return sendError(res, "auth/invalid-new-password");
    }
    if (newPassword.length < 6 || !passwordRegex.test(newPassword)) {
      return sendError(res, "auth/weak-new-password");
    }

    const user = await userModel
      .findById(req.user.id)
      .select("+password email");
    if (!user) return sendError(res, "auth/user-not-found");

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);

    if (!isPasswordValid) {
      return sendError(res, "auth/incorrect-old-password");
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return sendSuccess(res, 200, "Password changed successfully");
  } catch (error) {
    console.log(error);
    return sendError(res, "common/server-error");
  }
}

//🔹 Forgot Password function
async function forgotPassword(req, res) {
  try {
    clearCookie(res, "resetId");
    const { email, phone, method } = req.body;
    if (!email && !phone) return sendError(res, "auth/missing-fields");

    if (!["email", "sms"].includes(method)) return sendError(res, "auth/invalid-method");

    const user = await userModel.findOne({
      $or: [{ email }, { phone }],
    });
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
    console.log(error);
    return sendError(res, "common/server-error");
  }
}

//🔹 Reset Password function
async function resetPassword(req, res) {
  try {
    const password = req.body.password;
    const resetId = req.cookies.resetId;

    if (!password) return sendError(res, "auth/missing-fields");
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;
    if (typeof password !== "string") {
      return sendError(res, "auth/invalid-password");
    }
    if (password.length < 6 || !passwordRegex.test(password)) {
      return sendError(res, "auth/weak-password");
    }
    if (!resetId) return sendError(res, "auth/reset-session-missing");

    let decoded;
    try {
      decoded = jwt.verify(resetId, process.env.RESET_ID_SECRET);
    } catch (error) {
      console.log(error);
      return sendError(res, "auth/invalid-reset-session");
    }

    const user = await userModel.findById(decoded.id).select("+password");
    if (!user) return sendError(res, "auth/user-not-found");

    user.password = await bcrypt.hash(password, 10);
    await user.save();

    clearCookie(res, "resetId");
    return sendSuccess(res, 200, "Password reset successfully");
  } catch (error) {
    console.log(error);
    return sendError(res, "common/server-error");
  }
}

//🔹 setup TwoFactor Function
async function setupTwoFactor(req, res) {
  try {
    if (req.params.method === TWO_FACTOR_METHOD.SMS && !req.body.phone) return sendError(res, "auth/missing-fields");
    if (req.params.method === TWO_FACTOR_METHOD.EMAIL && !req.body.email) return sendError(res, "auth/missing-fields");

    const twoFactorSecret = generateSecret();

    if (req.params.method !== TWO_FACTOR_METHOD.RECOVERY) {
      const otpSent = await sendOtp(res, req.params.method, "setup-2fa", {
        id: req.user.id,
        email: req?.body?.email,
        phone: req?.body?.phone,
        setupMethod: req.params.method,
        twoFactorSecret,
      });
      if (!otpSent) return;
    }

    return sendSuccess(res, 200, "OTP resend successfully");
  } catch (error) {
    console.log(error);
    return sendError(res, "common/server-error");
  }
}

//🔹 Verify Otp function
async function verifyTwoFactor(req, res) {
  try {
    const { id, purpose } = req.data;

    const validation = await finalizeOtpVerification(req, res, id, purpose);
    if (!validation) return;

    clearCookie(res, "otpId");
    return sendSuccess(res, 200, "OTP verified successfully",
      validation === true ? null : cleanObject(validation, ["password"]),
    );
  } catch (error) {
    console.log(error);
    return sendError(res, "common/server-error");
  }
}

//🔹 Resend Otp function
async function resendTwoFactorCode(req, res) {
  try {
    console.log(req.data);
    const { id, type, email, phone, purpose } = req.data;

    const otpSent = await sendOtp(res, type, purpose, { id, email, phone });
    if (!otpSent) return;

    return sendSuccess(res, 200, "OTP resend successfully");
  } catch (error) {
    console.log(error);
    return sendError(res, "common/server-error");
  }
}

//🔹 Switch two factor method
async function switchTwoFactorMethod(req, res) {
  try {
    const newMethod = req.body.method;
    if (!["email", "sms", "authenticator_app"].includes(newMethod)) {
      return sendError(res, "auth/invalid-2fa-method");
    }

    const { id, email, phone, purpose } = req.data;

    const otpSent = await sendOtp(res, newMethod, purpose, { id, email, phone });
    if (!otpSent) return;

    return sendSuccess(res, 200, "OTP resend successfully");
  } catch (error) {
    console.log(error);
    return sendError(res, "common/server-error");
  }
}

module.exports = {
  //🔹 Basic Auth
  register,
  login,
  logout,
  logoutAllDevices,
  refreshAccessId,

  //🔹 Password
  changePassword,
  forgotPassword,
  resetPassword,

  //🔹 2FA
  setupTwoFactor,
  verifyTwoFactor,
  resendTwoFactorCode,
  switchTwoFactorMethod,
};
