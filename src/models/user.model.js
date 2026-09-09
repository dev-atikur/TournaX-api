const mongoose = require("mongoose");
const userConstants = require("../constants/user.constants");

const userSchema = mongoose.Schema(
  {
    // Basic Information
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
    ffUid: {
      type: String,
      minLength: 3,
      maxLength: 100,
      unique: true,
      required: true,
      trim: true,
    },
    avatar: {
      type: String,
      default: function () {
        return userConstants.PROFILE_PIC_DEFAULT(this.username);
      },
    },

    // Authentication
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
      required:true,
      select: false,
    },

    // Account Status
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      index: true,
    },
    isActive: { type: Boolean, default: false },
    isDisabled: { type: Boolean, default: false },

    // Two-Factor Authentication
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

    // Tournament Statistics
    totalMatches: { type: Number, default: 0, min: 0 },
    totalWins: { type: Number, default: 0, min: 0 },
    totalKills: { type: Number, default: 0, min: 0 },
    totalPoints: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
  },
);

const userModel = mongoose.model("user", userSchema);

module.exports = userModel;
