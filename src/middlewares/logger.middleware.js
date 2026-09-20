const crypto = require("crypto");
const { logInfo } = require("../utils/logger");

const logger = async (req, res, next) => {
  const startedAt = Date.now();
  req.requestId = req.headers["x-request-id"] || crypto.randomUUID();
  res.setHeader("X-Request-Id", req.requestId);

  const originalEnd = res.end.bind(res);
  res.end = (...args) => {
    if (!res._logged) {
      res._logged = true;
      logInfo({
        requestId: req.requestId,
        method: req.method,
        url: req.url ? req.url.split("?")[0] : "/",
        status: res.statusCode,
        ms: Date.now() - startedAt,
      });
    }
    return originalEnd(...args);
  };

  next();
};

module.exports = logger;
