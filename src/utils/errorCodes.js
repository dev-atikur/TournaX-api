module.exports = {
  // ─────────────────── General / Common ───────────────────
  "common/server-error": {
    status: 500,
    message: "Something went wrong. Please try again later.",
  },
  "common/not-implemented": {
    status: 501,
    message: "This route is not implemented.",
  },
  "common/invalid-json": {
    status: 400,
    message: "Request body contains invalid JSON.",
  },
  "common/request-error": {
    status: 400,
    message: "An error occurred while processing the request.",
  },
  "common/too-many-requests": {
    status: 429,
    message: "Too many requests. Please try again later.",
  },
  "common/payload-too-large": {
    status: 413,
    message: "Request body is too large.",
  },
  "common/invalid-id": {
    status: 400,
    message: "Invalid identifier.",
  },
  "common/forbidden": {
    status: 403,
    message: "You are not allowed to perform this action.",
  },

  // ─────────────────── Auth: General ───────────────────
  "auth/missing-fields": {
    status: 400,
    message: "Required fields are missing.",
  },
  "auth/unauthorized": {
    status: 401,
    message: "You are not authorized to perform this action.",
  },
  "auth/user-not-found": {
    status: 404,
    message: "User not found.",
  },
  "auth/invalid-credentials": {
    status: 401,
    message: "Invalid email/username or password.",
  },

  // ─────────────────── Auth: Register / Login ───────────────────
  "auth/invalid-ffName": {
    status: 400,
    message: "FF name must be at least 2 characters long.",
  },
  "auth/invalid-ffUid": {
    status: 400,
    message: "FF UID must be at least 3 characters long.",
  },
  "auth/invalid-username": {
    status: 400,
    message:
      "Username must be 3–30 characters and contain only letters, numbers, dots, and underscores.",
  },
  "auth/invalid-email": {
    status: 400,
    message: "Please provide a valid email address.",
  },
  "auth/invalid-password": {
    status: 400,
    message: "Password must be a valid string.",
  },
  "auth/weak-password": {
    status: 400,
    message:
      "Password must be at least 8 characters and include a letter and a number.",
  },
  "auth/email-already-exists": {
    status: 409,
    message: "This email is already registered.",
  },
  "auth/username-already-exists": {
    status: 409,
    message: "This username is already taken.",
  },
  "auth/ffName-already-exists": {
    status: 409,
    message: "This FF name is already registered.",
  },
  "auth/ffUid-already-exists": {
    status: 409,
    message: "This FF UID is already registered.",
  },
  "auth/phone-already-exists": {
    status: 409,
    message: "This phone number is already registered.",
  },

  // ─────────────────── Auth: OTP (generic, email/register/login) ───────────────────
  "auth/otp-send-failed": {
    status: 500,
    message: "Failed to send OTP. Please try again.",
  },
  "auth/invalid-otp-type": {
    status: 400,
    message: "Invalid OTP type. Please provide a valid OTP type.",
  },
  "auth/otp-session-missing": {
    status: 401,
    message: "OTP session not found. Please request a new OTP.",
  },
  "auth/invalid-otp-session": {
    status: 401,
    message: "Invalid or corrupted OTP session. Please request a new OTP.",
  },
  "auth/otp-expired": {
    status: 401,
    message: "This OTP has expired. Please request a new one.",
  },
  "auth/invalid-otp": {
    status: 401,
    message: "The OTP you entered is incorrect.",
  },
  "auth/invalid-otp-purpose": {
    status: 400,
    message: "Invalid OTP purpose.",
  },
  "auth/otp-cooldown": {
    status: 429,
    message: "Please wait before requesting another OTP.",
  },

  // ─────────────────── Auth: Password ───────────────────
  "auth/incorrect-old-password": {
    status: 401,
    message: "The current password you entered is incorrect.",
  },
  "auth/invalid-new-password": {
    status: 400,
    message: "New password must be a valid string.",
  },
  "auth/weak-new-password": {
    status: 400,
    message:
      "Password must be at least 8 characters and include a letter and a number.",
  },

  // ─────────────────── Auth: Forgot / Reset Password ───────────────────
  "auth/invalid-method": {
    status: 400,
    message: "Invalid verification method",
  },
  "auth/reset-session-missing": {
    status: 401,
    message:
      "Password reset session not found. Please start the process again.",
  },
  "auth/invalid-reset-session": {
    status: 401,
    message:
      "Invalid or expired reset session. Please start the process again.",
  },

  // ─────────────────── Auth: Phone Verification ───────────────────
  "auth/phone-not-verified": {
    status: 400,
    message: "Your phone number is not verified. Please verify it first.",
  },

  // ─────────────────── Auth: Two-Factor Authentication ───────────────────
  "auth/2fa-setup-session-missing": {
    status: 401,
    message: "2FA setup session not found. Please start the setup again.",
  },
  "auth/invalid-2fa-setup-session": {
    status: 401,
    message: "Invalid or expired 2FA setup session. Please start again.",
  },
  "auth/2fa-already-enabled": {
    status: 400,
    message: "Two-factor authentication is already enabled.",
  },
  "auth/2fa-not-enabled": {
    status: 400,
    message: "Two-factor authentication is not enabled on this account.",
  },
  "auth/invalid-2fa-method": {
    status: 400,
    message: "Invalid two-factor authentication method.",
  },
  "auth/invalid-recovery-code": {
    status: 401,
    message: "Invalid or already used recovery code.",
  },

  // ─────────────────── Auth: Session ───────────────────
  "auth/session-expired": {
    status: 401,
    message: "Your session has expired or been revoked. Please login again.",
  },
  "auth/forbidden": {
    status: 403,
    message: "You do not have permission to perform this action.",
  },
  "auth/account-restricted": {
    status: 403,
    message: "This account is banned or disabled.",
  },
  "auth/email-not-verified": {
    status: 403,
    message: "Please verify your email before continuing.",
  },

  // ─────────────────── Tournament ───────────────────
  "tournament/not-found": {
    status: 404,
    message: "Tournament not found.",
  },
  "tournament/invalid-status": {
    status: 400,
    message: "Invalid tournament status.",
  },
  "tournament/invalid-transition": {
    status: 409,
    message: "This tournament status change is not allowed.",
  },
  "tournament/registration-closed": {
    status: 409,
    message: "Registration is not open for this tournament.",
  },
  "tournament/full": {
    status: 409,
    message: "This tournament is full.",
  },
  "tournament/already-registered": {
    status: 409,
    message: "You are already registered for this tournament.",
  },
  "tournament/not-registered": {
    status: 404,
    message: "You are not registered for this tournament.",
  },
  "tournament/ff-profile-required": {
    status: 400,
    message: "Free Fire name and UID are required to join this tournament.",
  },
  "tournament/cannot-modify": {
    status: 409,
    message: "This tournament can no longer be modified.",
  },

  // ─────────────────── Match ───────────────────
  "match/not-found": {
    status: 404,
    message: "Match not found.",
  },
  "match/invalid-status": {
    status: 400,
    message: "Invalid match status.",
  },
  "match/invalid-transition": {
    status: 409,
    message: "This match status change is not allowed.",
  },
  "match/room-hidden": {
    status: 403,
    message: "Room details are not available yet.",
  },
  "match/result-exists": {
    status: 409,
    message: "A result already exists for this player in this match.",
  },
  "match/result-not-found": {
    status: 404,
    message: "Match result not found.",
  },
  "match/already-applied": {
    status: 409,
    message: "These results have already been applied.",
  },
  "match/unauthorized-submit": {
    status: 403,
    message: "Players cannot submit official match results.",
  },

  // ─────────────────── Notification / Report ───────────────────
  "notification/not-found": {
    status: 404,
    message: "Notification not found.",
  },
  "report/not-found": {
    status: 404,
    message: "Report not found.",
  },
};
