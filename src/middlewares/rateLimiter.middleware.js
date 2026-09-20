const { sendError } = require("../utils/response");
const parseClientIp = require("../utils/parseClientIp");

const requests = new Map();
const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60 * 1000);
const GENERAL_LIMIT = Number(process.env.RATE_LIMIT_GENERAL || 120);
const AUTH_LIMIT = Number(process.env.RATE_LIMIT_AUTH || 10);

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of requests.entries()) {
    if (now - entry.start >= WINDOW_MS * 2) requests.delete(key);
  }
}, WINDOW_MS).unref();

function getLimit(url = "") {
  const path = url.split("?")[0];
  if (
    path.startsWith("/api/auth/login") ||
    path.startsWith("/api/auth/register") ||
    path.startsWith("/api/auth/forgot-password") ||
    path.startsWith("/api/auth/reset-password") ||
    path.startsWith("/api/auth/2fa") ||
    path.startsWith("/api/auth/resend-verification") ||
    path.startsWith("/api/auth/verify-email")
  ) {
    return AUTH_LIMIT;
  }
  return GENERAL_LIMIT;
}

const rateLimiter = (req, res, next) => {
  const ip = parseClientIp(req) || req.socket.remoteAddress || "unknown";
  const path = (req.url || "").split("?")[0];
  const bucket = path.startsWith("/api/auth") ? "auth" : "api";
  const key = `${ip}:${bucket}`;
  const now = Date.now();
  const limit = getLimit(req.url);

  const current = requests.get(key);
  if (!current || now - current.start >= WINDOW_MS) {
    requests.set(key, { count: 1, start: now });
    return next();
  }

  if (current.count >= limit) {
    res.setHeader("Retry-After", "60");
    return sendError(res, "common/too-many-requests");
  }

  current.count += 1;
  return next();
};

module.exports = rateLimiter;
