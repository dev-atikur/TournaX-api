const leaderboardController = require("../controllers/leaderboard.controller");
const { sendError } = require("../utils/response");
const { getPathname, matchRoute } = require("../utils/path");

const routes = async (req, res) => {
  const path = getPathname(req);

  if ((path === "/api/leaderboard" || path === "/api/leaderboard/global") && req.method === "GET") {
    return leaderboardController.globalLeaderboard(req, res);
  }

  const tournament = matchRoute(path, "/api/leaderboard/tournaments/:id");
  if (tournament && req.method === "GET") {
    req.params = tournament;
    return leaderboardController.tournamentLeaderboard(req, res);
  }

  sendError(res, "common/not-implemented");
};

module.exports = routes;
