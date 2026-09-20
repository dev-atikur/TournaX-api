const { sendError } = require("../utils/response");
const { logError } = require("../utils/logger");

const runMiddleware = async (middlewares, req, res, router) => {
  let index = 0;

  const next = async (err) => {
    if (res.writableEnded) return;

    if (err) {
      logError({ message: "middleware_error", err, method: req.method, url: req.url, requestId: req.requestId });
      return sendError(res, "common/server-error");
    }

    const middleware = middlewares[index++];
    if (!middleware) {
      try {
        await router(req, res);
      } catch (error) {
        logError({ message: "router_error", err: error, method: req.method, url: req.url, requestId: req.requestId });
        if (!res.writableEnded) sendError(res, "common/server-error");
      }
      return;
    }

    try {
      await middleware(req, res, next);
    } catch (error) {
      logError({ message: "middleware_error", err: error, method: req.method, url: req.url, requestId: req.requestId });
      if (!res.writableEnded) sendError(res, "common/server-error");
    }
  };

  await next();
};

module.exports = runMiddleware;
