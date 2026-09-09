const { verify } = require("otplib");
const userModel = require("../models/user.model");

// verify Authenticator
async function verifyOtpAuthenticator(userId, otp) {
  try {
    const user = await userModel.findById(userId).select("+twoFactorSecret");

    if (!user) return "auth/user-not-found";
    if (!user.twoFactorSecret) return "auth/2fa-not-enabled";
      
    

    const result = await verify({
      secret: user.twoFactorSecret,
      token: otp,
    });
    if (!result.valid) return "auth/invalid-otp";
  

    return true;
  } catch (error) {
    console.error(error);
    return "common/server-error";
  }
}


module.exports = { verifyOtpAuthenticator };