const twilioClient = require("../configs/twilio.config");

//🔹 Send otp in phone number using sms
async function sendOtpSMS(to) {
  try {
    await twilioClient.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({ to, channel: "sms" });
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
}

//🔹 verify sms otp
async function verifyOtpSMS(to, code) {
  try {
    const result = await twilioClient.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ to, code });
    return result.status === "approved";
  } catch (error) {
    console.log(error);
    return false;
  }
}

module.exports = { sendOtpSMS, verifyOtpSMS };
