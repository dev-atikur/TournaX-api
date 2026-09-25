const SOCIAL_PLATFORMS = {
  GITHUB: "github",
  FACEBOOK: "facebook",
  X: "x",
  YOUTUBE: "youtube",
  LINKEDIN: "linkedin",
  TIKTOK: "tiktok",
  INSTAGRAM: "instagram",
};

const PROFILE_PIC_DEFAULT = (username) => {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(username || "PWF")}&background=111827&color=fff&size=256`;
};

const TWO_FACTOR_METHOD = {
  EMAIL: "email",
  SMS: "sms",
  AUTHENTICATOR: "authenticator",
  RECOVERY: "recovery",
};

const USER_ROLES = {
  USER: "user",
  ADMIN: "admin",
};

const USER_PUBLIC_FIELDS = [
  "-password",
  "-twoFactorSecret",
  "-recoveryCodes",
  "-__v",
];

module.exports = {
  SOCIAL_PLATFORMS,
  PROFILE_PIC_DEFAULT,
  TWO_FACTOR_METHOD,
  USER_ROLES,
  USER_PUBLIC_FIELDS,
};
