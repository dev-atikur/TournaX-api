const mongoose = require("mongoose");

const matchResultSchema = new mongoose.Schema(
  {
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "match",
      required: true,
    },
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tournament",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    teamId: { type: String, default: null },
    placement: { type: Number, min: 1, required: true },
    kills: { type: Number, min: 0, default: 0 },
    points: { type: Number, min: 0, default: 0 },
    bonusPoints: { type: Number, default: 0 },
    totalPoints: { type: Number, min: 0, default: 0 },
    verified: { type: Boolean, default: false },
    appliedToStats: { type: Boolean, default: false },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
  },
  { timestamps: true },
);

matchResultSchema.index({ matchId: 1, userId: 1 }, { unique: true });
matchResultSchema.index({ tournamentId: 1, totalPoints: -1 });

const matchResultModel = mongoose.model("matchResult", matchResultSchema);

module.exports = matchResultModel;
