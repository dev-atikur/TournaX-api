const crypto = require("crypto");
const generateOtp = require("./generateOtp");
const { setCookie, clearCookie } = require("./cookies");
const jwt = require("jsonwebtoken");
const { sendError } = require("./response");
const bcrypt = require("bcryptjs");
const userModel = require("../models/user.model");
const parseDeviceInfo = require("./parseDeviceInfo");
const { sendOtpEmail } = require("../services/email.service");
const { sendOtpSMS } = require("../services/sms.service");
const sessionModel = require("../models/session.model");
const { TWO_FACTOR_METHOD } = require("../constants/user.constants");
const parseClientIp = require("./parseClientIp");
const { cookieOptions, setAuthCookies } = require("../services/token.service");
const parseDurationToSeconds = require("./parseDuration");
const { logError } = require("./logger");

async function sendOtp(res, type, purpose, data) {
  try {
    if (type === TWO_FACTOR_METHOD.AUTHENTICATOR || type === "authenticator_app") {
      const otpId = jwt.sign(
        {
          id: data?.id,
          email: data?.email,
          phone: data?.phone,
          purpose,
          type: TWO_FACTOR_METHOD.AUTHENTICATOR,
          twoFactorSecret: data?.twoFactorSecret,
          sentAt: Date.now(),
        },
        process.env.OTP_ID_SECRET,
        { expiresIn: process.env.OTP_ID_EXPIRES_IN },
      );
      setCookie(res, "otpId", otpId, cookieOptions(process.env.OTP_ID_EXPIRES_IN, 300));
      return true;
    }

    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);

    clearCookie(res, "otpId");

    const otpId = jwt.sign(
      {
        id: data?.id,
        email: data?.email,
        phone: data?.phone,
        purpose,
        type,
        hashedOtp,
        setupMethod: data?.setupMethod,
        twoFactorSecret: data?.twoFactorSecret,
        sentAt: Date.now(),
      },
      process.env.OTP_ID_SECRET,
      { expiresIn: process.env.OTP_ID_EXPIRES_IN },
    );

    setCookie(res, "otpId", otpId, cookieOptions(process.env.OTP_ID_EXPIRES_IN, 300));

    if (type === "email") return await sendOtpEmail(data?.email, otp);
    if (type === "sms") return await sendOtpSMS(data?.phone);

    sendError(res, "auth/invalid-otp-type");
    return false;
  } catch (error) {
    logError({ message: "otp_send_failed", err: error });
    sendError(res, "auth/otp-send-failed");
    return false;
  }
}

async function issueSession(req, res, user) {
  const expiresInSeconds = parseDurationToSeconds(process.env.LOCAL_ID_EXPIRES_IN, 34560 * 60);
  const localIdHash = crypto.randomBytes(32).toString("hex");
  const localIdHashStored = crypto.createHash("sha256").update(localIdHash).digest("hex");

  const session = await sessionModel.create({
    userId: user._id,
    localIdHash: localIdHashStored,
    deviceInfo: parseDeviceInfo(req.headers["user-agent"]),
    ipAddress: parseClientIp(req),
    userAgent: req.headers["user-agent"],
    expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
  });

  const localId = jwt.sign(
    { id: user._id, sessionId: session._id, tokenHash: localIdHash },
    process.env.LOCAL_ID_SECRET,
    { expiresIn: process.env.LOCAL_ID_EXPIRES_IN },
  );

  const accessId = jwt.sign(
    { id: user._id, role: user.role, sessionId: session._id },
    process.env.ACCESS_ID_SECRET,
    { expiresIn: process.env.ACCESS_ID_EXPIRES_IN },
  );

  setAuthCookies(res, { localId, accessId });
  return session;
}

async function finalizeOtpVerification(req, res, id, purpose) {
  try {
    const user = await userModel.findById(id).select("+password +twoFactorSecret");
    if (!user) {
      sendError(res, "auth/user-not-found");
      return false;
    }

    switch (purpose) {
      case "register":
      case "verify-email":
        user.isActive = true;
        user.emailVerified = true;
        await user.save();
        await issueSession(req, res, user);
        return user;
      case "login":
        if (user.isBanned) {
          sendError(res, "auth/account-restricted");
          return false;
        }
        await issueSession(req, res, user);
        return user;
      case "reset-password": {
        const resetId = jwt.sign({ id: user._id }, process.env.RESET_ID_SECRET, {
          expiresIn: process.env.RESET_ID_EXPIRES_IN,
        });
        setCookie(res, "resetId", resetId, cookieOptions(process.env.RESET_ID_EXPIRES_IN, 600));
        return true;
      }
      case "setup-2fa": {
        const method = req.data?.setupMethod || req.data?.type;
        if (method === TWO_FACTOR_METHOD.AUTHENTICATOR && req.data?.twoFactorSecret) {
          user.twoFactorSecret = req.data.twoFactorSecret;
        }
        if (method && !user.twoFactorMethods.includes(method)) {
          user.twoFactorMethods.push(method);
        }
        user.twoFactorEnabled = true;
        user.twoFactorVerifiedAt = new Date();
        if (method === "sms") {
          user.phone = req.data.phone || user.phone;
          user.phoneVerified = true;
        }
        if (method === "email") {
          user.emailVerified = true;
        }
        await user.save();
        return true;
      }
      default:
        sendError(res, "auth/invalid-otp-purpose");
        return false;
    }
  } catch (error) {
    logError({ message: "otp_finalize_failed", err: error });
    sendError(res, "common/server-error");
    return false;
  }
}

module.exports = { sendOtp, finalizeOtpVerification, issueSession };
