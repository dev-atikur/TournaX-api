const { sendError } = require("../utils/response");

const json = async (req, res, next) => {
  if (req.method !== "POST" && req.method !== "PUT" && req.method !== "PATCH") {
    req.body = {};
    return next();
  }

  let raw = "";

  req.on("data", (chunk) => (raw += chunk.toString()));

  req.on("end", () => {
    try {
      req.body = raw ? JSON.parse(raw) : {};
      next();
    } catch (error) {
      sendError(res, "common/invalid-json");
    }
  });

  req.on("error", () => sendError(res, "common/request-error"));
};


module.exports = json;