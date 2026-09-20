const mongoose = require("mongoose");
const userModel = require("../models/user.model");
const matchResultModel = require("../models/matchResult.model");
const { sendError, sendSuccess } = require("../utils/response");
const { parsePagination, paginated } = require("../utils/pagination");
const { getQuery } = require("../utils/path");
const { isObjectId } = require("../utils/validation");
const { logError } = require("../utils/logger");

async function globalLeaderboard(req, res) {
  try {
    const query = getQuery(req);
    const { page, limit, skip } = parsePagination(query);
    const filter = { isBanned: false, isDisabled: false };

    const [items, total] = await Promise.all([
      userModel
        .find(filter)
        .sort({ totalPoints: -1, totalWins: -1, totalKills: -1 })
        .skip(skip)
        .limit(limit)
        .select("username ffName ffUid profilePicture avatar totalPoints totalWins totalMatches totalKills tournamentsWon")
        .lean(),
      userModel.countDocuments(filter),
    ]);

    const ranked = items.map((user, index) => ({
      rank: skip + index + 1,
      id: user._id,
      username: user.username,
      ffName: user.ffName,
      ffUid: user.ffUid,
      profilePicture: user.profilePicture || user.avatar,
      totalPoints: user.totalPoints,
      totalWins: user.totalWins,
      totalMatches: user.totalMatches,
      totalKills: user.totalKills,
      tournamentsWon: user.tournamentsWon,
    }));

    return sendSuccess(res, 200, "Global leaderboard fetched", paginated(ranked, page, limit, total));
  } catch (error) {
    logError({ message: "global_leaderboard_failed", err: error });
    return sendError(res, "common/server-error");
  }
}

async function tournamentLeaderboard(req, res) {
  try {
    const tournamentId = req.params.id || getQuery(req).tournamentId;
    if (!isObjectId(tournamentId)) return sendError(res, "common/invalid-id");
    const query = getQuery(req);
    const { page, limit, skip } = parsePagination(query);

    const rows = await matchResultModel.aggregate([
      { $match: { tournamentId: new mongoose.Types.ObjectId(tournamentId), verified: true } },
      {
        $group: {
          _id: "$userId",
          totalPoints: { $sum: "$totalPoints" },
          totalKills: { $sum: "$kills" },
          totalMatches: { $sum: 1 },
          totalWins: {
            $sum: { $cond: [{ $eq: ["$placement", 1] }, 1, 0] },
          },
        },
      },
      { $sort: { totalPoints: -1, totalWins: -1, totalKills: -1 } },
      {
        $facet: {
          items: [
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "user",
              },
            },
            { $unwind: "$user" },
            {
              $project: {
                _id: 0,
                id: "$user._id",
                username: "$user.username",
                ffName: "$user.ffName",
                ffUid: "$user.ffUid",
                profilePicture: { $ifNull: ["$user.profilePicture", "$user.avatar"] },
                totalPoints: 1,
                totalKills: 1,
                totalMatches: 1,
                totalWins: 1,
              },
            },
          ],
          meta: [{ $count: "total" }],
        },
      },
    ]);

    const items = (rows[0]?.items || []).map((row, index) => ({
      rank: skip + index + 1,
      ...row,
    }));
    const total = rows[0]?.meta?.[0]?.total || 0;
    return sendSuccess(res, 200, "Tournament leaderboard fetched", paginated(items, page, limit, total));
  } catch (error) {
    logError({ message: "tournament_leaderboard_failed", err: error });
    return sendError(res, "common/server-error");
  }
}

module.exports = { globalLeaderboard, tournamentLeaderboard };
