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
  GAME_MODES,
  TOURNAMENT_STATUS,
  TOURNAMENT_TRANSITIONS,
  canTransition,
} = require("../constants/tournament.constants");
const { notifyUser } = require("../services/notification.service");
const { withTransaction } = require("../utils/transaction");

function resolveGameMode(value) {
  if (!value) return null;
  return GAME_MODES.find((item) => item.toLowerCase() === String(value).toLowerCase()) || null;
}

function isStaffForTournament(user, tournament) {
  if (!user || !tournament) return false;
  if (user.role === "admin") return true;
  return (tournament.moderators || []).some((id) => String(id) === String(user.id));
}

function isRegistrationWindowOpen(tournament, now = new Date()) {
  return (
    tournament.status === TOURNAMENT_STATUS.REGISTRATION_OPEN &&
    now >= new Date(tournament.registrationStart) &&
    now <= new Date(tournament.registrationEnd)
  );
}

async function listTournaments(req, res) {
  try {
    const query = getQuery(req);
    const { page, limit, skip } = parsePagination(query);
    const filter = {};

    if (query.status && Object.values(TOURNAMENT_STATUS).includes(query.status)) {
      filter.status = query.status;
    } else if (!req.user || req.user.role === "user") {
      filter.status = { $ne: TOURNAMENT_STATUS.DRAFT };
    }

    if (query.gameMode) {
      const mode = resolveGameMode(query.gameMode);
      if (mode) filter.gameMode = mode;
    }

    if (query.search) {
      const escaped = sanitizeString(query.search, 80).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.title = { $regex: escaped, $options: "i" };
    }

    if (query.from || query.to) {
      filter.tournamentStart = {};
      if (query.from) filter.tournamentStart.$gte = new Date(query.from);
      if (query.to) filter.tournamentStart.$lte = new Date(query.to);
    }

    const sortField = query.sort === "prizePool" ? "prizePool" : query.sort === "start" ? "tournamentStart" : "createdAt";
    const sortDir = query.order === "asc" ? 1 : -1;

    const [items, total] = await Promise.all([
      tournamentModel
        .find(filter)
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(limit)
        .select("-scoringRules")
        .lean(),
      tournamentModel.countDocuments(filter),
    ]);

    return sendSuccess(res, 200, "Tournaments fetched", paginated(cleanArray(items), page, limit, total));
  } catch (error) {
    logError({ message: "list_tournaments_failed", err: error });
    return sendError(res, "common/server-error");
  }
}

async function getTournament(req, res) {
  try {
    if (!isObjectId(req.params.id)) return sendError(res, "common/invalid-id");
    const tournament = await tournamentModel.findById(req.params.id).lean();
    if (!tournament) return sendError(res, "tournament/not-found");
    if (tournament.status === TOURNAMENT_STATUS.DRAFT && !isStaffForTournament(req.user, tournament)) {
      return sendError(res, "tournament/not-found");
    }
    return sendSuccess(res, 200, "Tournament fetched", cleanObject(tournament));
  } catch (error) {
    logError({ message: "get_tournament_failed", err: error });
    return sendError(res, "common/server-error");
  }
}

async function createTournament(req, res) {
  try {
    const body = req.body;
    if (!body.title || !body.gameMode || !body.maxPlayers || !body.registrationStart || !body.registrationEnd || !body.tournamentStart || !body.tournamentEnd) {
      return sendError(res, "auth/missing-fields");
    }
    const gameMode = resolveGameMode(body.gameMode);
    if (!gameMode) return sendError(res, "tournament/invalid-status");

    const tournament = await tournamentModel.create({
      title: sanitizeString(body.title, 120),
      description: sanitizeString(body.description || "", 4000),
      banner: body.banner || null,
      game: body.game || "Free Fire",
      gameMode,
      map: body.map || "Bermuda",
      entryFee: Number(body.entryFee || 0),
      prizePool: Number(body.prizePool || 0),
      maxPlayers: Number(body.maxPlayers),
      registrationStart: body.registrationStart,
      registrationEnd: body.registrationEnd,
      tournamentStart: body.tournamentStart,
      tournamentEnd: body.tournamentEnd,
      status: body.status && Object.values(TOURNAMENT_STATUS).includes(body.status)
        ? body.status
        : TOURNAMENT_STATUS.DRAFT,
      rules: sanitizeString(body.rules || "", 8000),
      prizes: Array.isArray(body.prizes) ? body.prizes : [],
      scoringRules: body.scoringRules || undefined,
      createdBy: req.user.id,
      moderators: body.moderators || [],
    });

    return sendSuccess(res, 201, "Tournament created", cleanObject(tournament));
  } catch (error) {
    logError({ message: "create_tournament_failed", err: error });
    return sendError(res, "common/server-error");
  }
}

async function updateTournament(req, res) {
  try {
    if (!isObjectId(req.params.id)) return sendError(res, "common/invalid-id");
    const tournament = await tournamentModel.findById(req.params.id);
    if (!tournament) return sendError(res, "tournament/not-found");
    if (!isStaffForTournament(req.user, tournament)) return sendError(res, "auth/forbidden");
    if ([TOURNAMENT_STATUS.COMPLETED, TOURNAMENT_STATUS.CANCELLED].includes(tournament.status) && req.user.role !== "admin") {
      return sendError(res, "tournament/cannot-modify");
    }

    const allowed = [
      "title",
      "description",
      "banner",
      "game",
      "gameMode",
      "map",
      "entryFee",
      "prizePool",
      "maxPlayers",
      "registrationStart",
      "registrationEnd",
      "tournamentStart",
      "tournamentEnd",
      "rules",
      "prizes",
      "scoringRules",
      "moderators",
    ];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) tournament[field] = req.body[field];
    });
    await tournament.save();
    return sendSuccess(res, 200, "Tournament updated", cleanObject(tournament));
  } catch (error) {
    logError({ message: "update_tournament_failed", err: error });
    return sendError(res, "common/server-error");
  }
}

async function updateTournamentStatus(req, res) {
  try {
    if (!isObjectId(req.params.id)) return sendError(res, "common/invalid-id");
    const nextStatus = req.body.status;
    if (!Object.values(TOURNAMENT_STATUS).includes(nextStatus)) {
      return sendError(res, "tournament/invalid-status");
    }

    const tournament = await tournamentModel.findById(req.params.id);
    if (!tournament) return sendError(res, "tournament/not-found");
    if (!isStaffForTournament(req.user, tournament)) return sendError(res, "auth/forbidden");
    if (tournament.status === nextStatus) {
      return sendSuccess(res, 200, "Tournament status unchanged", cleanObject(tournament));
    }
    if (!canTransition(TOURNAMENT_TRANSITIONS, tournament.status, nextStatus)) {
      return sendError(res, "tournament/invalid-transition");
    }

    tournament.status = nextStatus;
    await tournament.save();
    return sendSuccess(res, 200, "Tournament status updated", cleanObject(tournament));
  } catch (error) {
    logError({ message: "update_tournament_status_failed", err: error });
    return sendError(res, "common/server-error");
  }
}

async function cancelTournament(req, res) {
  req.body.status = TOURNAMENT_STATUS.CANCELLED;
  return updateTournamentStatus(req, res);
}

async function registerForTournament(req, res) {
  try {
    if (!isObjectId(req.params.id)) return sendError(res, "common/invalid-id");
    const user = await userModel.findById(req.user.id).select("ffName ffUid isBanned emailVerified");
    if (!user) return sendError(res, "auth/user-not-found");
    if (user.isBanned) return sendError(res, "auth/account-restricted");
    if (!user.ffName || !user.ffUid) return sendError(res, "tournament/ff-profile-required");

    const result = await withTransaction(async (session) => {
      const tournament = await tournamentModel.findById(req.params.id).session(session || undefined);
      if (!tournament) return { error: "tournament/not-found" };
      if (!isRegistrationWindowOpen(tournament)) return { error: "tournament/registration-closed" };
      if (tournament.currentPlayers >= tournament.maxPlayers) return { error: "tournament/full" };

      try {
        await tournamentRegistrationModel.create(
          [
            {
              tournamentId: tournament._id,
              userId: user._id,
              ffName: user.ffName,
              ffUid: user.ffUid,
              status: "registered",
            },
          ],
          session ? { session } : undefined,
        );
      } catch (error) {
        if (error.code === 11000) return { error: "tournament/already-registered" };
        throw error;
      }

      const updated = await tournamentModel.findOneAndUpdate(
        {
          _id: tournament._id,
          currentPlayers: { $lt: tournament.maxPlayers },
          status: TOURNAMENT_STATUS.REGISTRATION_OPEN,
        },
        { $inc: { currentPlayers: 1 } },
        { new: true, session: session || undefined },
      );
      if (!updated) return { error: "tournament/full" };

      await userModel.updateOne(
        { _id: user._id },
        { $inc: { tournamentsPlayed: 1 } },
        session ? { session } : undefined,
      );

      return { tournament: updated };
    });

    if (result.error) return sendError(res, result.error);
    await notifyUser(user._id, {
      title: "Tournament joined",
      message: `You registered for ${result.tournament.title}`,
      type: "tournament",
      data: { tournamentId: String(result.tournament._id) },
    });
    return sendSuccess(res, 201, "Registered for tournament", cleanObject(result.tournament));
  } catch (error) {
    if (error.code === 11000) return sendError(res, "tournament/already-registered");
    logError({ message: "register_tournament_failed", err: error });
    return sendError(res, "common/server-error");
  }
}

async function unregisterFromTournament(req, res) {
  try {
    if (!isObjectId(req.params.id)) return sendError(res, "common/invalid-id");
    const tournament = await tournamentModel.findById(req.params.id);
    if (!tournament) return sendError(res, "tournament/not-found");
    if (!isRegistrationWindowOpen(tournament)) return sendError(res, "tournament/registration-closed");

    const registration = await tournamentRegistrationModel.findOneAndUpdate(
      { tournamentId: tournament._id, userId: req.user.id, status: "registered" },
      { $set: { status: "withdrawn" } },
    );
    if (!registration) return sendError(res, "tournament/not-registered");

    await tournamentModel.updateOne(
      { _id: tournament._id, currentPlayers: { $gt: 0 } },
      { $inc: { currentPlayers: -1 } },
    );
    await tournamentRegistrationModel.deleteOne({ _id: registration._id });
    return sendSuccess(res, 200, "Registration withdrawn");
  } catch (error) {
    logError({ message: "unregister_tournament_failed", err: error });
    return sendError(res, "common/server-error");
  }
}

async function listParticipants(req, res) {
  try {
    if (!isObjectId(req.params.id)) return sendError(res, "common/invalid-id");
    const query = getQuery(req);
    const { page, limit, skip } = parsePagination(query);

    const filter = { tournamentId: req.params.id, status: "registered" };
    const [items, total] = await Promise.all([
      tournamentRegistrationModel
        .find(filter)
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "username ffName ffUid profilePicture avatar totalPoints")
        .lean(),
      tournamentRegistrationModel.countDocuments(filter),
    ]);

    return sendSuccess(res, 200, "Participants fetched", paginated(cleanArray(items), page, limit, total));
  } catch (error) {
    logError({ message: "list_participants_failed", err: error });
    return sendError(res, "common/server-error");
  }
}

async function removeParticipant(req, res) {
  try {
    if (!isObjectId(req.params.id) || !isObjectId(req.params.userId)) {
      return sendError(res, "common/invalid-id");
    }
    const tournament = await tournamentModel.findById(req.params.id);
    if (!tournament) return sendError(res, "tournament/not-found");
    if (!isStaffForTournament(req.user, tournament)) return sendError(res, "auth/forbidden");

    const removed = await tournamentRegistrationModel.findOneAndDelete({
      tournamentId: tournament._id,
      userId: req.params.userId,
    });
    if (!removed) return sendError(res, "tournament/not-registered");
    if (removed.status === "registered") {
      await tournamentModel.updateOne(
        { _id: tournament._id, currentPlayers: { $gt: 0 } },
        { $inc: { currentPlayers: -1 } },
      );
    }
    return sendSuccess(res, 200, "Participant removed");
  } catch (error) {
    logError({ message: "remove_participant_failed", err: error });
    return sendError(res, "common/server-error");
  }
}

module.exports = {
  listTournaments,
  getTournament,
  createTournament,
  updateTournament,
  updateTournamentStatus,
  cancelTournament,
  registerForTournament,
  unregisterFromTournament,
  listParticipants,
  removeParticipant,
  isStaffForTournament,
};
