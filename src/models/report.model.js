const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tournament",
      default: null,
    },
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "match",
      default: null,
    },
    reason: { type: String, required: true, trim: true, maxlength: 120 },
    details: { type: String, trim: true, maxlength: 2000, default: "" },
    status: {
      type: String,
      enum: ["open", "reviewed", "resolved", "dismissed"],
      default: "open",
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
    resolution: { type: String, default: null, maxlength: 1000 },
  },
  { timestamps: true },
);

reportSchema.index({ createdAt: -1 });
reportSchema.index({ status: 1, createdAt: -1 });

const reportModel = mongoose.model("report", reportSchema);

module.exports = reportModel;
