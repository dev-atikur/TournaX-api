const userModel = require("../models/user.model");
const { cleanObject } = require("../utils/cleanData");
const { sendError, sendSuccess } = require("../utils/response");
const { logError } = require("../utils/logger");
const { sanitizeString } = require("../utils/validation");
const reportModel = require("../models/report.model");

async function getCurrentUserData(req, res) {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user) return sendError(res, "auth/user-not-found");
    return sendSuccess(res, 200, "User data fetch successfully.", cleanObject(user));
  } catch (error) {
    logError({ message: "get_user_failed", err: error });
    return sendError(res, "common/server-error");
  }
}

async function updateProfile(req, res) {
  try {
    const allowed = ["fullName", "bio", "profilePicture", "avatar", "socialLinks"];
    const updates = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    if (updates.bio) updates.bio = sanitizeString(updates.bio, 500);
    if (updates.fullName) updates.fullName = sanitizeString(updates.fullName, 80);

    const user = await userModel.findByIdAndUpdate(req.user.id, { $set: updates }, { new: true, runValidators: true });
    if (!user) return sendError(res, "auth/user-not-found");
    return sendSuccess(res, 200, "Profile updated successfully", cleanObject(user));
  } catch (error) {
    logError({ message: "update_profile_failed", err: error });
    return sendError(res, "common/server-error");
  }
}

async function createReport(req, res) {
  try {
    const { targetUserId, tournamentId, matchId, reason, details } = req.body;
    if (!reason) return sendError(res, "auth/missing-fields");

    const report = await reportModel.create({
      reporterId: req.user.id,
      targetUserId: targetUserId || null,
      tournamentId: tournamentId || null,
      matchId: matchId || null,
      reason: sanitizeString(reason, 120),
      details: sanitizeString(details || "", 2000),
    });

    return sendSuccess(res, 201, "Report submitted", cleanObject(report));
  } catch (error) {
    logError({ message: "create_report_failed", err: error });
    return sendError(res, "common/server-error");
  }
}

module.exports = { getCurrentUserData, updateProfile, createReport };
