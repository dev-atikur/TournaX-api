const mongoose = require("mongoose");

const tournamentRegistrationSchema = new mongoose.Schema(
  {
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tournament",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    ffName: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["registered", "withdrawn", "disqualified"],
      default: "registered",
    },
  },
  { timestamps: true },
);

tournamentRegistrationSchema.index({ tournamentId: 1, userId: 1 }, { unique: true });
tournamentRegistrationSchema.index({ userId: 1, createdAt: -1 });

const tournamentRegistrationModel = mongoose.model(
  "tournamentRegistration",
  tournamentRegistrationSchema,
);

module.exports = tournamentRegistrationModel;
