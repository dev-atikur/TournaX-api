require("dotenv").config();
const mongoose = require("mongoose");
const userModel = require("../models/user.model");
const tournamentModel = require("../models/tournament.model");

async function migrateModerators() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI is not set in environment");
    process.exit(1);
  }

  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(uri);
    console.log("Connected to MongoDB successfully.");

    // 1. Migrate all users with role 'moderator' to 'user'
    const moderatorCount = await userModel.countDocuments({ role: "moderator" });
    console.log(`Found ${moderatorCount} users with role 'moderator'.`);

    if (moderatorCount > 0) {
      const userUpdateResult = await userModel.updateMany(
        { role: "moderator" },
        { $set: { role: "user" } }
      );
      console.log(`Successfully migrated ${userUpdateResult.modifiedCount} moderator user(s) to 'user' role.`);
    } else {
      console.log("No moderator users to migrate.");
    }

    // 2. Clean up legacy moderators array from tournament documents if present
    const tournamentUpdateResult = await tournamentModel.updateMany(
      { moderators: { $exists: true } },
      { $unset: { moderators: "" } }
    );
    if (tournamentUpdateResult.modifiedCount > 0) {
      console.log(`Cleaned legacy 'moderators' field from ${tournamentUpdateResult.modifiedCount} tournament(s).`);
    }

    console.log("Migration completed successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

migrateModerators();
