const matchModel = require("../models/match.model");
const matchResultModel = require("../models/matchResult.model");
const tournamentModel = require("../models/tournament.model");
const tournamentRegistrationModel = require("../models/tournamentRegistration.model");
const userModel = require("../models/user.model");
const { sendError, sendSuccess } = require("../utils/response");
const { cleanObject, cleanArray } = require("../utils/cleanData");
const { parsePagination, paginated } = require("../utils/pagination");
const { getQuery } = require("../utils/path");
const { isObjectId, sanitizeString } = require("../utils/validation");
const { logError } = require("../utils/logger");
const {
  MATCH_STATUS,
  MATCH_TRANSITIONS,
  canTransition,
} = require("../constants/tournament.constants");
const { calculateMatchPoints } = require("../services/scoring.service");
const { isStaffForTournament } = require("./tournament.controller");
const { withTransaction } = require("../utils/transaction");
const { notifyUser } = require("../services/notification.service");

const ROOM_PUBLIC_STATUSES = [MATCH_STATUS.ROOM_READY, MATCH_STATUS.LIVE];

async function canSeeRoom(req, match) {
  if (!req.user) return false;
  const tournament = await tournamentModel.findById(match.tournamentId).select("moderators createdBy").lean();
  if (isStaffForTournament(req.user, tournament)) return true;
  if (!ROOM_PUBLIC_STATUSES.includes(match.status)) return false;
  const registered = await tournamentRegistrationModel.exists({
    tournamentId: match.tournamentId,
    userId: req.user.id,
    status: "registered",
  });
  return Boolean(registered);
}

function stripRoom(match) {
  const cleaned = cleanObject(match, ["roomId", "roomPassword"]);
  return cleaned;
}

async function listMatches(req, res) {
  try {
    const query = getQuery(req);
    if (!query.tournamentId || !isObjectId(query.tournamentId)) {
      return sendError(res, "common/invalid-id");
    }
    const { page, limit, skip } = parsePagination(query);
    const filter = { tournamentId: query.tournamentId };
    if (query.status && Object.values(MATCH_STATUS).includes(query.status)) {
      filter.status = query.status;
    }

    const [items, total] = await Promise.all([
      matchModel.find(filter).sort({ matchNumber: 1 }).skip(skip).limit(limit).lean(),
      matchModel.countDocuments(filter),
    ]);

    return sendSuccess(res, 200, "Matches fetched", paginated(items.map(stripRoom), page, limit, total));
  } catch (error) {
    logError({ message: "list_matches_failed", err: error });
    return sendError(res, "common/server-error");
  }
}

async function getMatch(req, res) {
  try {
    if (!isObjectId(req.params.id)) return sendError(res, "common/invalid-id");
    const match = await matchModel.findById(req.params.id).select("+roomId +roomPassword").lean();
    if (!match) return sendError(res, "match/not-found");

    if (await canSeeRoom(req, match)) {
      return sendSuccess(res, 200, "Match fetched", cleanObject(match));
    }
    return sendSuccess(res, 200, "Match fetched", stripRoom(match));
  } catch (error) {
    logError({ message: "get_match_failed", err: error });
    return sendError(res, "common/server-error");
  }
}

async function createMatch(req, res) {
  try {
    const { tournamentId, matchNumber, title, gameMode, map, scheduledAt, roomId, roomPassword } = req.body;
    if (!isObjectId(tournamentId) || !matchNumber || !title || !gameMode || !scheduledAt) {
      return sendError(res, "auth/missing-fields");
    }

    const tournament = await tournamentModel.findById(tournamentId);
    if (!tournament) return sendError(res, "tournament/not-found");
    if (!isStaffForTournament(req.user, tournament)) return sendError(res, "auth/forbidden");

    const match = await matchModel.create({
      tournamentId,
      matchNumber: Number(matchNumber),
      title: sanitizeString(title, 120),
      gameMode,
      map: map || tournament.map,
      scheduledAt,
      roomId: roomId || null,
      roomPassword: roomPassword || null,
      createdBy: req.user.id,
    });

    return sendSuccess(res, 201, "Match created", stripRoom(match));
  } catch (error) {
    if (error.code === 11000) return sendError(res, "match/invalid-status");
    logError({ message: "create_match_failed", err: error });
    return sendError(res, "common/server-error");
  }
}

async function updateMatch(req, res) {
  try {
    if (!isObjectId(req.params.id)) return sendError(res, "common/invalid-id");
    const match = await matchModel.findById(req.params.id).select("+roomId +roomPassword");
    if (!match) return sendError(res, "match/not-found");

    const tournament = await tournamentModel.findById(match.tournamentId);
    if (!isStaffForTournament(req.user, tournament)) return sendError(res, "auth/forbidden");

    const allowed = ["title", "gameMode", "map", "scheduledAt", "roomId", "roomPassword", "participants"];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) match[field] = req.body[field];
    });

    if (req.body.status) {
      if (!Object.values(MATCH_STATUS).includes(req.body.status)) {
        return sendError(res, "match/invalid-status");
      }
      if (match.status !== req.body.status && !canTransition(MATCH_TRANSITIONS, match.status, req.body.status)) {
        return sendError(res, "match/invalid-transition");
      }
      match.status = req.body.status;
      if (req.body.status === MATCH_STATUS.LIVE) match.startedAt = match.startedAt || new Date();
      if (req.body.status === MATCH_STATUS.COMPLETED) match.endedAt = new Date();
    }

    await match.save();
    return sendSuccess(res, 200, "Match updated", cleanObject(match));
  } catch (error) {
    logError({ message: "update_match_failed", err: error });
    return sendError(res, "common/server-error");
  }
}

async function submitResults(req, res) {
  try {
    if (!isObjectId(req.params.id)) return sendError(res, "common/invalid-id");
    const results = Array.isArray(req.body.results) ? req.body.results : [req.body];
    if (!results.length) return sendError(res, "auth/missing-fields");

    const match = await matchModel.findById(req.params.id);
    if (!match) return sendError(res, "match/not-found");
    const tournament = await tournamentModel.findById(match.tournamentId);
    if (!isStaffForTournament(req.user, tournament)) return sendError(res, "match/unauthorized-submit");

    const created = [];
    for (const entry of results) {
      if (!isObjectId(entry.userId) || !entry.placement) continue;
      const scored = calculateMatchPoints(
        {
          placement: Number(entry.placement),
          kills: Number(entry.kills || 0),
          bonusPoints: Number(entry.bonusPoints || 0),
        },
        tournament.scoringRules,
      );

      const doc = await matchResultModel.findOneAndUpdate(
        { matchId: match._id, userId: entry.userId },
        {
          $set: {
            tournamentId: match.tournamentId,
            teamId: entry.teamId || null,
            placement: Number(entry.placement),
            kills: Number(entry.kills || 0),
            points: scored.placementPoints + scored.killPoints,
            bonusPoints: scored.bonusPoints,
            totalPoints: scored.totalPoints,
            submittedBy: req.user.id,
            verified: false,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      created.push(doc);
    }

    return sendSuccess(res, 200, "Results submitted", cleanArray(created));
  } catch (error) {
    logError({ message: "submit_results_failed", err: error });
    return sendError(res, "common/server-error");
  }
}

async function verifyResults(req, res) {
  try {
    if (!isObjectId(req.params.id)) return sendError(res, "common/invalid-id");
    const match = await matchModel.findById(req.params.id);
    if (!match) return sendError(res, "match/not-found");
    if (match.resultsApplied) return sendError(res, "match/already-applied");

    const tournament = await tournamentModel.findById(match.tournamentId);
    if (!isStaffForTournament(req.user, tournament)) return sendError(res, "auth/forbidden");

    const applied = await withTransaction(async (session) => {
      const pending = await matchResultModel
        .find({ matchId: match._id, appliedToStats: false })
        .session(session || undefined);

      for (const result of pending) {
        result.verified = true;
        result.verifiedBy = req.user.id;
        result.appliedToStats = true;
        await result.save({ session: session || undefined });

        const inc = {
          totalMatches: 1,
          totalKills: result.kills,
          totalPoints: result.totalPoints,
        };
        if (result.placement === 1) inc.totalWins = 1;

        await userModel.updateOne({ _id: result.userId }, { $inc: inc }, session ? { session } : undefined);
      }

      match.resultsApplied = true;
      match.status = MATCH_STATUS.COMPLETED;
      match.endedAt = match.endedAt || new Date();
      await match.save({ session: session || undefined });
      return pending;
    });

    for (const result of applied || []) {
      await notifyUser(result.userId, {
        title: "Match result verified",
        message: `You earned ${result.totalPoints} points in ${match.title}`,
        type: "match",
        data: { matchId: String(match._id), tournamentId: String(match.tournamentId) },
      });
    }

    return sendSuccess(res, 200, "Results verified and applied");
  } catch (error) {
    logError({ message: "verify_results_failed", err: error });
    return sendError(res, "common/server-error");
  }
}

module.exports = {
  listMatches,
  getMatch,
  createMatch,
  updateMatch,
  submitResults,
  verifyResults,
};
