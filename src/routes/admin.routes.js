const runMiddleware = require("../middlewares/middlewareRunner");
const { protect, adminOnly } = require("../middlewares/auth.middleware");
const adminController = require("../controllers/admin.controller");
const tournamentController = require("../controllers/tournament.controller");
const matchController = require("../controllers/match.controller");
const { sendError } = require("../utils/response");
const { getPathname, matchRoute } = require("../utils/path");

const routes = async (req, res) => {
  const path = getPathname(req);

  if (path === "/api/admin/users" && req.method === "GET") {
    return runMiddleware([protect, adminOnly], req, res, adminController.listUsers);
  }

  const ban = matchRoute(path, "/api/admin/users/:id/ban");
  if (ban && req.method === "PATCH") {
    req.params = ban;
    return runMiddleware([protect, adminOnly], req, res, adminController.banUser);
  }

  const unban = matchRoute(path, "/api/admin/users/:id/unban");
  if (unban && req.method === "PATCH") {
    req.params = unban;
    return runMiddleware([protect, adminOnly], req, res, adminController.unbanUser);
  }

  const role = matchRoute(path, "/api/admin/users/:id/role");
  if (role && req.method === "PATCH") {
    req.params = role;
    return runMiddleware([protect, adminOnly], req, res, adminController.updateUserRole);
  }

  if (path === "/api/admin/reports" && req.method === "GET") {
    return runMiddleware([protect, adminOnly], req, res, adminController.listReports);
  }

  const report = matchRoute(path, "/api/admin/reports/:id");
  if (report && req.method === "PATCH") {
    req.params = report;
    return runMiddleware([protect, adminOnly], req, res, adminController.updateReport);
  }

  if (path === "/api/admin/tournaments" && req.method === "POST") {
    return runMiddleware([protect, adminOnly], req, res, tournamentController.createTournament);
  }

  const tournament = matchRoute(path, "/api/admin/tournaments/:id");
  if (tournament && req.method === "PATCH") {
    req.params = tournament;
    return runMiddleware([protect, adminOnly], req, res, tournamentController.updateTournament);
  }

  if (path === "/api/admin/matches" && req.method === "POST") {
    return runMiddleware([protect, adminOnly], req, res, matchController.createMatch);
  }

  const match = matchRoute(path, "/api/admin/matches/:id");
  if (match && req.method === "PATCH") {
    req.params = match;
    return runMiddleware([protect, adminOnly], req, res, matchController.updateMatch);
  }

  sendError(res, "common/not-implemented");
};

module.exports = routes;
