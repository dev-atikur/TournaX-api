const { verify } = require("otplib");
const userModel = require("../models/user.model");

async function verifyOtpAuthenticator(userId, otp, fallbackSecret) {
  try {
    const user = await userModel.findById(userId).select("+twoFactorSecret");
    const secret = fallbackSecret || user?.twoFactorSecret;
    if (!user && !fallbackSecret) return "auth/user-not-found";
    if (!secret) return "auth/2fa-not-enabled";

    const result = await verify({
      secret,
      token: String(otp),
    });
    if (!result || result.valid === false) return "auth/invalid-otp";
    if (result.valid === true || result === true) return true;
    return "auth/invalid-otp";
  } catch (error) {
    return "common/server-error";
  }
}

module.exports = { verifyOtpAuthenticator };
