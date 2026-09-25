const runMiddleware = require("../middlewares/middlewareRunner");
const { protect, optionalAuth, adminOnly } = require("../middlewares/auth.middleware");
const matchController = require("../controllers/match.controller");
const { sendError } = require("../utils/response");
const { getPathname, matchRoute } = require("../utils/path");

const routes = async (req, res) => {
  const path = getPathname(req);

  if (path === "/api/matches" && req.method === "GET") {
    return runMiddleware([optionalAuth], req, res, matchController.listMatches);
  }

  if (path === "/api/matches" && req.method === "POST") {
    return runMiddleware([protect, adminOnly], req, res, matchController.createMatch);
  }

  const results = matchRoute(path, "/api/matches/:id/results");
  if (results && req.method === "POST") {
    req.params = results;
    return runMiddleware([protect, adminOnly], req, res, matchController.submitResults);
  }

  const verify = matchRoute(path, "/api/matches/:id/results/verify");
  if (verify && req.method === "PATCH") {
    req.params = verify;
    return runMiddleware([protect, adminOnly], req, res, matchController.verifyResults);
  }

  const byId = matchRoute(path, "/api/matches/:id");
  if (byId && req.method === "GET") {
    req.params = byId;
    return runMiddleware([optionalAuth], req, res, matchController.getMatch);
  }
  if (byId && req.method === "PATCH") {
    req.params = byId;
    return runMiddleware([protect, adminOnly], req, res, matchController.updateMatch);
  }

  sendError(res, "common/not-implemented");
};

module.exports = routes;
