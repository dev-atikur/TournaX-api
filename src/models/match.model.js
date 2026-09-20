const mongoose = require("mongoose");
const { GAME_MODES, MATCH_STATUS } = require("../constants/tournament.constants");

const matchSchema = new mongoose.Schema(
  {
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tournament",
      required: true,
      index: true,
    },
    matchNumber: { type: Number, min: 1, required: true },
    title: { type: String, trim: true, maxlength: 120, required: true },
    gameMode: { type: String, enum: GAME_MODES, required: true },
    map: { type: String, trim: true, default: "Bermuda" },
    roomId: { type: String, default: null, select: false },
    roomPassword: { type: String, default: null, select: false },
    scheduledAt: { type: Date, required: true, index: true },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: Object.values(MATCH_STATUS),
      default: MATCH_STATUS.SCHEDULED,
      index: true,
    },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    resultsApplied: { type: Boolean, default: false },
  },
  { timestamps: true },
);

matchSchema.index({ tournamentId: 1, matchNumber: 1 }, { unique: true });
matchSchema.index({ tournamentId: 1, scheduledAt: 1 });

const matchModel = mongoose.model("match", matchSchema);

module.exports = matchModel;
