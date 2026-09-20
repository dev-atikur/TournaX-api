const mongoose = require("mongoose");

async function withTransaction(work) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (error) {
    const message = error && error.message ? error.message : "";
    const unsupported =
      message.includes("Transaction numbers are only allowed") ||
      message.includes("replica set") ||
      error.code === 20;
    if (unsupported) {
      return work(null);
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

module.exports = { withTransaction };
