const runMiddleware = require("../middlewares/middlewareRunner");
const { protect, optionalAuth, adminOnly } = require("../middlewares/auth.middleware");
const tournamentController = require("../controllers/tournament.controller");
const leaderboardController = require("../controllers/leaderboard.controller");
const { sendError } = require("../utils/response");
const { getPathname, matchRoute } = require("../utils/path");

const routes = async (req, res) => {
  const path = getPathname(req);

  if (path === "/api/tournaments" && req.method === "GET") {
    return runMiddleware([optionalAuth], req, res, tournamentController.listTournaments);
  }

  if (path === "/api/tournaments" && req.method === "POST") {
    return runMiddleware([protect, adminOnly], req, res, tournamentController.createTournament);
  }

  const leaderboard = matchRoute(path, "/api/tournaments/:id/leaderboard");
  if (leaderboard && req.method === "GET") {
    req.params = leaderboard;
    return leaderboardController.tournamentLeaderboard(req, res);
  }

  const participants = matchRoute(path, "/api/tournaments/:id/participants");
  if (participants && req.method === "GET") {
    req.params = participants;
    return runMiddleware([optionalAuth], req, res, tournamentController.listParticipants);
  }

  const removeParticipant = matchRoute(path, "/api/tournaments/:id/participants/:userId");
  if (removeParticipant && req.method === "DELETE") {
    req.params = removeParticipant;
    return runMiddleware([protect, adminOnly], req, res, tournamentController.removeParticipant);
  }

  const register = matchRoute(path, "/api/tournaments/:id/register");
  if (register && req.method === "POST") {
    req.params = register;
    return runMiddleware([protect], req, res, tournamentController.registerForTournament);
  }
  if (register && req.method === "DELETE") {
    req.params = register;
    return runMiddleware([protect], req, res, tournamentController.unregisterFromTournament);
  }

  const status = matchRoute(path, "/api/tournaments/:id/status");
  if (status && req.method === "PATCH") {
    req.params = status;
    return runMiddleware([protect, adminOnly], req, res, tournamentController.updateTournamentStatus);
  }

  const cancel = matchRoute(path, "/api/tournaments/:id/cancel");
  if (cancel && (req.method === "PATCH" || req.method === "POST")) {
    req.params = cancel;
    return runMiddleware([protect, adminOnly], req, res, tournamentController.cancelTournament);
  }

  const byId = matchRoute(path, "/api/tournaments/:id");
  if (byId && req.method === "GET") {
    req.params = byId;
    return runMiddleware([optionalAuth], req, res, tournamentController.getTournament);
  }
  if (byId && req.method === "PATCH") {
    req.params = byId;
    return runMiddleware([protect, adminOnly], req, res, tournamentController.updateTournament);
  }

  sendError(res, "common/not-implemented");
};

module.exports = routes;
