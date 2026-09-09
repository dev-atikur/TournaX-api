const runMiddleware = require("./middlewares/middlewareRunner");
const logger = require("./middlewares/logger.middleware");
const cors = require("./middlewares/cors.middleware");
const cookieParser = require("./middlewares/cookieParser.middleware");
const json = require("./middlewares/json.middleware");
const rateLimiter = require("./middlewares/rateLimiter.middleware");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const { sendError } = require("./utils/response");

const router = async (req, res) => {
  if (req.url.startsWith("/api/auth")) return await authRoutes(req, res);

  if (req.url.startsWith("/api/user")) return await userRoutes(req, res);


  sendError(res, "common/not-implemented");
};

const app = (req, res) => runMiddleware([logger, cors, cookieParser, json, rateLimiter], req, res, router);


module.exports = app;