const { getTwilioClient } = require("../configs/twilio.config");

async function sendOtpSMS(to) {
  try {
    const twilioClient = getTwilioClient();
    if (!twilioClient || !process.env.TWILIO_VERIFY_SERVICE_SID || !to) return false;

    await twilioClient.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({ to, channel: "sms" });
    return true;
  } catch (error) {
    return false;
  }
}

async function verifyOtpSMS(to, code) {
  try {
    const twilioClient = getTwilioClient();
    if (!twilioClient || !process.env.TWILIO_VERIFY_SERVICE_SID || !to) return false;

    const result = await twilioClient.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ to, code });
    return result.status === "approved";
  } catch (error) {
    return false;
  }
}

module.exports = { sendOtpSMS, verifyOtpSMS };
