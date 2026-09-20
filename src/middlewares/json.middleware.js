const { sendError } = require("../utils/response");

const MAX_BODY_SIZE = Number(process.env.MAX_BODY_SIZE || 1024 * 1024);
const METHODS_WITH_BODY = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const json = (req, res, next) => {
  if (!METHODS_WITH_BODY.has(req.method)) {
    req.body = {};
    return next();
  }

  const chunks = [];
  let size = 0;
  let tooLarge = false;

  req.on("data", (chunk) => {
    size += chunk.length;
    if (size > MAX_BODY_SIZE) {
      tooLarge = true;
      req.destroy();
      if (!res.writableEnded) sendError(res, "common/payload-too-large");
      return;
    }
    chunks.push(chunk);
  });

  req.on("end", () => {
    if (tooLarge || res.writableEnded) return;

    const raw = Buffer.concat(chunks).toString("utf8").trim();
    if (!raw) {
      req.body = {};
      return next();
    }

    const contentType = req.headers["content-type"] || "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return sendError(res, "common/invalid-json");
    }

    try {
      req.body = JSON.parse(raw);
      if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
        return sendError(res, "common/invalid-json");
      }
      return next();
    } catch (error) {
      return sendError(res, "common/invalid-json");
    }
  });

  req.on("error", () => {
    if (!res.writableEnded) sendError(res, "common/request-error");
  });
};

module.exports = json;
