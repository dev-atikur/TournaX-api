const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    localIdHash: { type: String, default: null, select: false },
    deviceInfo: {
      deviceName: { type: String, default: "Unknown Device" },
      deviceType: { type: String, default: "unknown" },
      os: { type: String, default: null },
      browser: { type: String, default: null },
    },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
    isRevoked: { type: Boolean, default: false, index: true },
    lastActiveAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
sessionSchema.index({ userId: 1, isRevoked: 1 });

const sessionModel = mongoose.model("session", sessionSchema);

module.exports = sessionModel;
