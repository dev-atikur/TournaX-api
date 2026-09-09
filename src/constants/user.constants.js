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
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random&color=fff&size=256`;
};

const TWO_FACTOR_METHOD = {
  EMAIL: "email",
  SMS: "sms",
  AUTHENTICATOR: "authenticator",
  RECOVERY: "recovery",
};


module.exports = {
  SOCIAL_PLATFORMS,
  PROFILE_PIC_DEFAULT,
  TWO_FACTOR_METHOD,
};