const { protect } = require("../middlewares/auth.middleware");
const runMiddleware = require("../middlewares/middlewareRunner");
const userController = require("../controllers/user.controller");
const { sendError } = require("../utils/response");


const routes = async (req, res) => {
  const path = req.url.split("?")[0];
  console.log(path);

  if (path === "/api/user/me" && req.method === "GET") {
    return await runMiddleware([protect], req, res, userController.getCurrentUserData);
  }

  sendError(res, "common/not-implemented");
};


module.exports = routes;