const mongoose = require("mongoose");
const {
  GAME_MODES,
  TOURNAMENT_STATUS,
  DEFAULT_SCORING,
} = require("../constants/tournament.constants");

const prizeSchema = new mongoose.Schema(
  {
    place: { type: Number, min: 1, required: true },
    title: { type: String, trim: true },
    amount: { type: Number, min: 0, default: 0 },
  },
  { _id: false },
);

const tournamentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 4000, default: "" },
    banner: { type: String, default: null },
    game: { type: String, default: "Free Fire", trim: true },
    gameMode: {
      type: String,
      enum: GAME_MODES,
      required: true,
    },
    map: { type: String, trim: true, default: "Bermuda" },
    entryFee: { type: Number, min: 0, default: 0 },
    prizePool: { type: Number, min: 0, default: 0 },
    maxPlayers: { type: Number, min: 2, required: true },
    currentPlayers: { type: Number, min: 0, default: 0 },
    registrationStart: { type: Date, required: true },
    registrationEnd: { type: Date, required: true },
    tournamentStart: { type: Date, required: true, index: true },
    tournamentEnd: { type: Date, required: true },
    status: {
      type: String,
      enum: Object.values(TOURNAMENT_STATUS),
      default: TOURNAMENT_STATUS.DRAFT,
      index: true,
    },
    rules: { type: String, default: "", maxlength: 8000 },
    prizes: { type: [prizeSchema], default: [] },
    scoringRules: {
      killPoints: { type: Number, default: DEFAULT_SCORING.killPoints, min: 0 },
      bonusPoints: { type: Number, default: DEFAULT_SCORING.bonusPoints, min: 0 },
      placementPoints: { type: mongoose.Schema.Types.Mixed, default: () => ({ ...DEFAULT_SCORING.placementPoints }) },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    moderators: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
  },
  { timestamps: true },
);

tournamentSchema.index({ status: 1, tournamentStart: 1 });
tournamentSchema.index({ gameMode: 1, createdAt: -1 });

const tournamentModel = mongoose.model("tournament", tournamentSchema);

module.exports = tournamentModel;
