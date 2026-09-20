const transporter = require("../configs/nodemailer.config");
const parseDurationToSeconds = require("../utils/parseDuration");

function expiryLabel() {
  const seconds = parseDurationToSeconds(process.env.OTP_ID_EXPIRES_IN, 300);
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

async function sendOtpEmail(to, otp) {
  try {
    if (!to) return false;

    await transporter.sendMail({
      from: `Play With Fair <${process.env.EMAIL_USER}>`,
      to,
      subject: "Your Play With Fair verification code",
      html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; border-radius: 12px; border: 1px solid #eee;">
        <h1 style="color: #111; font-size: 20px; margin: 0 0 8px;">Verify your email</h1>
        <p style="font-size: 14px; color: #666; margin: 0 0 24px; line-height: 1.5;">
          Use the code below to continue on Play With Fair (PWF).
        </p>
        <div style="background-color: #f5f5f7; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 32px; font-weight: 700; letter-spacing: 4px; color: #6C5CE7;">${otp}</span>
        </div>
        <p style="font-size: 13px; color: #999; margin: 0 0 4px;">
          This code will expire in ${expiryLabel()}.
        </p>
        <p style="font-size: 13px; color: #999; margin: 0;">
          If you didn't request this code, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="font-size: 12px; color: #bbb; text-align: center; margin: 0;">
          &copy; ${new Date().getFullYear()} Play With Fair. All rights reserved.
        </p>
      </div>
    `,
    });

    return true;
  } catch (error) {
    return false;
  }
}

module.exports = { sendOtpEmail };
