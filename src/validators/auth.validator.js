const { sendError } = require("../utils/response");
const userModel = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { verifyOtpSMS } = require("../services/sms.service");
const { verifyOtpAuthenticator } = require("../services/authenticator.service");

// Validation middleware for user registration
async function validateRegister(req, res, next) {
  const { ffName, ffUid, email, username, password } = req.body;

  if (!ffName || !ffUid || !email || !username || !password) {
    return sendError(res, "auth/missing-fields");
  }

  if (typeof ffName !== "string" || ffName.length < 2) {
    return sendError(res, "auth/invalid-ffName");
  }

  if (typeof ffUid !== "string" || ffUid.length < 3) {
    return sendError(res, "auth/invalid-ffUid");
  }

  const usernameRegex = /^(?!.*\.\.)(?!.*__)[a-zA-Z0-9._]{3,30}$/;
  if (
    typeof username !== "string" ||
    !usernameRegex.test(username) ||
    username.length < 3
  ) {
    return sendError(res, "auth/invalid-username");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (typeof email !== "string" || !emailRegex.test(email)) {
    return sendError(res, "auth/invalid-email");
  }

  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;
  if (typeof password !== "string") {
    return sendError(res, "auth/invalid-password");
  }
  if (password.length < 6 || !passwordRegex.test(password)) {
    return sendError(res, "auth/weak-password");
  }

  const isUserExist = await userModel.findOne({
    $or: [{ email }, { username }, { ffName }, { ffUid }],
  });
  if (isUserExist?.email === email)
    return sendError(res, "auth/email-already-exists");
  if (isUserExist?.username === username)
    return sendError(res, "auth/username-already-exists");
  if (isUserExist?.ffName === ffName)
    return sendError(res, "auth/ffName-already-exists");
  if (isUserExist?.ffUid === ffUid)
    return sendError(res, "auth/ffUid-already-exists");

  next();
}

// Validation middleware for user login
async function validateLogin(req, res, next) {
  const { email, username, password } = req.body;

  if ((!email && !username) || !password)
    return sendError(res, "auth/missing-fields");

  const user = await userModel
    .findOne({
      $or: [
        { email: email?.toLowerCase() },
        { username: username?.toLowerCase() },
      ],
    })
    .select("+password");

  const isPasswordValid = user
    ? await bcrypt.compare(password, user.password)
    : false;

  if (!isPasswordValid) return sendError(res, "auth/invalid-credentials");

  req.data = user;
  next();
}

// Validation middleware for user verify TwoFactor otp
async function validateVerifyTwoFactor(req, res, next) {
  const userSentOtp = req.body.otp;
  const otpId = req.cookies.otpId;

  if (!userSentOtp) return sendError(res, "auth/missing-fields");
  if (!otpId) return sendError(res, "auth/otp-session-missing");

  let decoded;
  try {
    decoded = jwt.verify(otpId, process.env.OTP_ID_SECRET);
  } catch (error) {
    console.log(error);
    if (error.name === "TokenExpiredError") {
      return sendError(res, "auth/otp-expired");
    }
    return sendError(res, "auth/invalid-otp-session");
  }
  console.log(decoded);

  let isValidOtp;
  switch (decoded.type) {
    case "email":
      isValidOtp = await bcrypt.compare(userSentOtp, decoded.hashedOtp);
      if (!isValidOtp) return sendError(res, "auth/invalid-otp");

      break;
    case "sms":
      isValidOtp = await verifyOtpSMS(decoded.phone, userSentOtp);
      if (!isValidOtp) return sendError(res, "auth/invalid-otp");
      break;
    case "authenticator_app":
      isValidOtp = verifyOtpAuthenticator(decoded?.id, userSentOtp);
      if (!isValidOtp !== true) return sendError(res, result);
      break;
    default:
      return sendError(res, "auth/invalid-otp-type");
  }

  req.data = decoded;
  next();
}

// Validation middleware for user otp session
async function validateOtpSession(req, res, next) {
  const otpId = req.cookies.otpId;
  if (!otpId) return sendError(res, "auth/otp-session-missing");

  let decoded;
  try {
    decoded = jwt.verify(otpId, process.env.OTP_ID_SECRET, {
      ignoreExpiration: true,
    });
  } catch (error) {
    console.log(error);
    return sendError(res, "auth/invalid-otp-session");
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
