const runMiddleware = require("../middlewares/middlewareRunner");
const { protect } = require("../middlewares/auth.middleware");
const notificationController = require("../controllers/notification.controller");
const { sendError } = require("../utils/response");
const { getPathname, matchRoute } = require("../utils/path");

const routes = async (req, res) => {
  const path = getPathname(req);

  if (path === "/api/notifications" && req.method === "GET") {
    return runMiddleware([protect], req, res, notificationController.listNotifications);
  }

  if (path === "/api/notifications/read-all" && req.method === "PATCH") {
    return runMiddleware([protect], req, res, notificationController.markAllRead);
  }

  const read = matchRoute(path, "/api/notifications/:id/read");
  if (read && req.method === "PATCH") {
    req.params = read;
    return runMiddleware([protect], req, res, notificationController.markRead);
  }

  sendError(res, "common/not-implemented");
};

module.exports = routes;
