const { protect } = require("../middlewares/auth.middleware");
const runMiddleware = require("../middlewares/middlewareRunner");
const userController = require("../controllers/user.controller");
const { sendError } = require("../utils/response");
const { getPathname } = require("../utils/path");

const routes = async (req, res) => {
  const path = getPathname(req);

  if (path === "/api/user/me" && req.method === "GET") {
    return runMiddleware([protect], req, res, userController.getCurrentUserData);
  }

  if (path === "/api/user/me" && req.method === "PATCH") {
    return runMiddleware([protect], req, res, userController.updateProfile);
  }

  if (path === "/api/user/reports" && req.method === "POST") {
    return runMiddleware([protect], req, res, userController.createReport);
  }

  sendError(res, "common/not-implemented");
};

module.exports = routes;
