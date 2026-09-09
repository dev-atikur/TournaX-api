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

//🔹 Send OTP function
async function sendOtp(res, type, purpose, data) {
  try {
    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);

    clearCookie(res, "otpId");
    console.log({
      id: data?.id,
      email: data?.email,
      phone: data?.phone,
      purpose,
      type,
      hashedOtp,
      sentAt: Date.now(),
    });

    const otpId = jwt.sign(
      {
        id: data?.id,
        email: data?.email,
        phone: data?.phone,
        purpose,
        type,
        hashedOtp,
        sentAt: Date.now(),
      },
      process.env.OTP_ID_SECRET,
      {
        expiresIn: process.env.OTP_ID_EXPIRES_IN,
      },
    );

    setCookie(res, "otpId", otpId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: parseInt(process.env.OTP_ID_EXPIRES_IN, 10) * 60,
    });

    if (type === "email") return await sendOtpEmail(data?.email, otp);
    if (type === "sms") return await sendOtpSMS(data?.phone);

    sendError(res, "auth/invalid-otp-type");
    return false;
  } catch (error) {
    console.log(error);
    sendError(res, "auth/otp-send-failed");
    return false;
  }
}

//🔹 Finalize OTP Verification
async function finalizeOtpVerification(req, res, id, purpose, data = null) {
  try {
    const user = await userModel.findById(id).select("+password");
    if (!user) {
      sendError(res, "auth/user-not-found");
      return false;
    }

    switch (purpose) {
      case "register":
      case "login":
        const session = await sessionModel.create({
          userId: user._id,
          deviceInfo: parseDeviceInfo(req.headers["user-agent"]),
          ipAddress: parseClientIp(req),
          userAgent: req.headers["user-agent"],
          expiresAt: new Date(
            Date.now() + parseInt(process.env.LOCAL_ID_EXPIRES_IN) * 60 * 1000,
          ),
        });

        const localId = jwt.sign(
          { id: user._id, sessionId: session._id },
          process.env.LOCAL_ID_SECRET,
          { expiresIn: process.env.LOCAL_ID_EXPIRES_IN },
        );

        const accessId = jwt.sign(
          { id: user._id, role: user.role },
          process.env.ACCESS_ID_SECRET,
          { expiresIn: process.env.ACCESS_ID_EXPIRES_IN },
        );

        setCookie(res, "localId", localId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          path: "/",
          maxAge: parseInt(process.env.LOCAL_ID_EXPIRES_IN, 10) * 60,
        });

        setCookie(res, "accessId", accessId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          path: "/",
          maxAge: parseInt(process.env.ACCESS_ID_EXPIRES_IN, 10) * 60,
        });

        user.isActive = true;
        user.emailVerified = true;
        if (!user.twoFactorMethods.includes(TWO_FACTOR_METHOD.EMAIL)) {
          user.twoFactorMethods.push(TWO_FACTOR_METHOD.EMAIL);
        }
        await user.save();
        return user;
      case "reset-password":
        const resetId = jwt.sign(
          { id: user._id },
          process.env.RESET_ID_SECRET,
          { expiresIn: process.env.RESET_ID_EXPIRES_IN },
        );

        setCookie(res, "resetId", resetId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          path: "/",
          maxAge: parseInt(process.env.RESET_ID_EXPIRES_IN, 10) * 60,
        });
        return true;
      default:
        sendError(res, "auth/invalid-otp-purpose");
        return false;
    }
  } catch (error) {
    console.log(error);
    sendError(res, "common/server-error");
    return false;
  }
}

module.exports = { sendOtp, finalizeOtpVerification };
