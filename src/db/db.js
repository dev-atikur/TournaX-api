const mongoose = require("mongoose");
const { logInfo, logError } = require("../utils/logger");

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    const message = "MONGO_URI is not set";
    if (process.env.NODE_ENV === "production") {
      throw new Error(message);
    }
    console.warn("MongoDB connection skipped: MONGO_URI not set in environment");
    return;
  }

  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  logInfo({ message: "mongodb_connected" });
}

mongoose.connection.on("error", (error) => {
  logError({ message: "mongodb_error", err: error });
});

module.exports = connectDB;
