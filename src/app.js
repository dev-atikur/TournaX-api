const runMiddleware = require("./middlewares/middlewareRunner");
const logger = require("./middlewares/logger.middleware");
const cors = require("./middlewares/cors.middleware");
const cookieParser = require("./middlewares/cookieParser.middleware");
const json = require("./middlewares/json.middleware");
const rateLimiter = require("./middlewares/rateLimiter.middleware");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const tournamentRoutes = require("./routes/tournament.routes");
const matchRoutes = require("./routes/match.routes");
const leaderboardRoutes = require("./routes/leaderboard.routes");
const notificationRoutes = require("./routes/notification.routes");
const adminRoutes = require("./routes/admin.routes");
const { sendError, sendSuccess } = require("./utils/response");
const { getPathname } = require("./utils/path");

const router = async (req, res) => {
  const path = getPathname(req);

  if (path === "/health" && req.method === "GET") {
    return sendSuccess(res, 200, "Play With Fair API is running", { name: "PWF" });
  }

  if (path.startsWith("/api/auth")) return authRoutes(req, res);
  if (path.startsWith("/api/user")) return userRoutes(req, res);
  if (path.startsWith("/api/tournaments")) return tournamentRoutes(req, res);
  if (path.startsWith("/api/matches")) return matchRoutes(req, res);
  if (path.startsWith("/api/leaderboard")) return leaderboardRoutes(req, res);
  if (path.startsWith("/api/notifications")) return notificationRoutes(req, res);
  if (path.startsWith("/api/admin")) return adminRoutes(req, res);

  return sendError(res, "common/not-implemented");
};

const app = (req, res) => runMiddleware([logger, cors, cookieParser, json, rateLimiter], req, res, router);

module.exports = app;
