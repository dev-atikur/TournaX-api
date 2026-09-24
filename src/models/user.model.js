const mongoose = require("mongoose");
const userConstants = require("../constants/user.constants");

const socialLinkSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      enum: Object.values(userConstants.SOCIAL_PLATFORMS),
    },
    url: { type: String, trim: true, maxlength: 300 },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, trim: true, maxlength: 80 },
    username: {
      type: String,
      minLength: 3,
      maxLength: 30,
      unique: true,
      lowercase: true,
      required: true,
      trim: true,
    },
    ffName: {
      type: String,
      minLength: 3,
      maxLength: 50,
      required: true,
      trim: true,
    },
    avatar: {
      type: String,
      default: function () {
        return userConstants.PROFILE_PIC_DEFAULT(this.username);
      },
    },
    profilePicture: {
      type: String,
      default: function () {
        return userConstants.PROFILE_PIC_DEFAULT(this.username);
      },
    },
    bio: { type: String, trim: true, maxlength: 500, default: "" },
    socialLinks: { type: [socialLinkSchema], default: [] },

    email: {
      type: String,
      minLength: 3,
      maxLength: 100,
      unique: true,
      lowercase: true,
      required: true,
      trim: true,
    },
    emailVerified: { type: Boolean, default: false },
    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    phoneVerified: { type: Boolean, default: false },
    password: {
      type: String,
      minLength: 6,
      required: true,
      select: false,
    },

    role: {
      type: String,
      enum: Object.values(userConstants.USER_ROLES),
      default: userConstants.USER_ROLES.USER,
      index: true,
    },
    isActive: { type: Boolean, default: false },
    isBanned: { type: Boolean, default: false, index: true },
    banReason: { type: String, default: null, maxlength: 500 },

    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorMethods: [
      {
        type: String,
        enum: Object.values(userConstants.TWO_FACTOR_METHOD),
      },
    ],
    twoFactorSecret: { type: String, default: null, select: false },
    recoveryCodes: [
      {
        code: { type: String, select: false },
        used: { type: Boolean, default: false },
      },
    ],
    twoFactorVerifiedAt: { type: Date, default: null },

    totalMatches: { type: Number, default: 0, min: 0 },
    totalWins: { type: Number, default: 0, min: 0 },
    totalKills: { type: Number, default: 0, min: 0 },
    totalPoints: { type: Number, default: 0, min: 0, index: true },
    tournamentsPlayed: { type: Number, default: 0, min: 0 },
    tournamentsWon: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

userSchema.index({ totalPoints: -1, totalWins: -1 });
const userModel = mongoose.model("user", userSchema);


module.exports = userModel;