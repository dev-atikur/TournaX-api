const { sendError } = require("../utils/response");
const userModel = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { verifyOtpSMS } = require("../services/sms.service");
const { verifyOtpAuthenticator } = require("../services/authenticator.service");
const { isEmail, isUsername, isPassword, isFfUid } = require("../utils/validation");
const { TWO_FACTOR_METHOD } = require("../constants/user.constants");

async function validateRegister(req, res, next) {
  const { ffName, ffUid, email, username, password } = req.body;

  if (!ffName || !ffUid || !email || !username || !password) {
    return sendError(res, "auth/missing-fields");
  }

  if (typeof ffName !== "string" || ffName.trim().length < 3) {
    return sendError(res, "auth/invalid-ffName");
  }

  if (!isFfUid(String(ffUid)) && (typeof ffUid !== "string" || ffUid.trim().length < 3)) {
    return sendError(res, "auth/invalid-ffUid");
  }

  if (!isUsername(username)) {
    return sendError(res, "auth/invalid-username");
  }

  if (!isEmail(email)) {
    return sendError(res, "auth/invalid-email");
  }

  if (!isPassword(password)) {
    return sendError(res, "auth/weak-password");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedUsername = username.trim().toLowerCase();
  const normalizedFfUid = String(ffUid).trim();

  const isUserExist = await userModel.findOne({
    $or: [
      { email: normalizedEmail },
      { username: normalizedUsername },
      { ffUid: normalizedFfUid },
    ],
  }).lean();

  if (!isUserExist) {
    req.body.email = normalizedEmail;
    req.body.username = normalizedUsername;
    req.body.ffUid = normalizedFfUid;
    req.body.ffName = ffName.trim();
    return next();
  }

  if (isUserExist.email === normalizedEmail) return sendError(res, "auth/email-already-exists");
  if (isUserExist.username === normalizedUsername) return sendError(res, "auth/username-already-exists");
  if (isUserExist.ffUid === normalizedFfUid) return sendError(res, "auth/ffUid-already-exists");
  return sendError(res, "auth/email-already-exists");
}

async function validateLogin(req, res, next) {
  const { email, username, password } = req.body;

  if ((!email && !username) || !password) {
    return sendError(res, "auth/missing-fields");
  }

  const filters = [];
  if (email) filters.push({ email: String(email).trim().toLowerCase() });
  if (username) filters.push({ username: String(username).trim().toLowerCase() });

  const user = await userModel
    .findOne({ $or: filters })
    .select("+password");

  const isPasswordValid = user ? await bcrypt.compare(password, user.password) : false;
  if (!isPasswordValid) return sendError(res, "auth/invalid-credentials");
  if (user.isBanned || user.isDisabled) return sendError(res, "auth/account-restricted");

  req.data = user;
  next();
}

async function validateVerifyTwoFactor(req, res, next) {
  const userSentOtp = req.body.otp;
  const otpId = req.cookies.otpId;

  if (!userSentOtp) return sendError(res, "auth/missing-fields");
  if (!otpId) return sendError(res, "auth/otp-session-missing");

  let decoded;
  try {
    decoded = jwt.verify(otpId, process.env.OTP_ID_SECRET);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return sendError(res, "auth/otp-expired");
    }
    return sendError(res, "auth/invalid-otp-session");
  }

  switch (decoded.type) {
    case "email": {
      const isValidOtp = await bcrypt.compare(String(userSentOtp), decoded.hashedOtp);
      if (!isValidOtp) return sendError(res, "auth/invalid-otp");
      break;
    }
    case "sms": {
      const isValidOtp = await verifyOtpSMS(decoded.phone, userSentOtp);
      if (!isValidOtp) return sendError(res, "auth/invalid-otp");
      break;
    }
    case TWO_FACTOR_METHOD.AUTHENTICATOR:
    case "authenticator_app": {
      const result = await verifyOtpAuthenticator(decoded.id, userSentOtp, decoded.twoFactorSecret);
      if (result !== true) return sendError(res, result);
      break;
    }
    default:
      return sendError(res, "auth/invalid-otp-type");
  }

  req.data = decoded;
  next();
}

async function validateOtpSession(req, res, next) {
  const otpId = req.cookies.otpId;
  if (!otpId) return sendError(res, "auth/otp-session-missing");

  let decoded;
  try {
    decoded = jwt.verify(otpId, process.env.OTP_ID_SECRET, {
      ignoreExpiration: true,
    });
  } catch (error) {
    return sendError(res, "auth/invalid-otp-session");
  }

  const sentAt = Number(decoded.sentAt || 0);
  if (sentAt && Date.now() - sentAt < 30 * 1000) {
    return sendError(res, "auth/otp-cooldown");
  }

  req.data = decoded;
  next();
}

module.exports = {
  validateRegister,
  validateLogin,
  validateVerifyTwoFactor,
  validateOtpSession,
};
