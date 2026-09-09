const { sendError } = require("../utils/response");

const requests = new Map();

const rateLimiter = async (req, res, next) => {
  const ip = req.socket.remoteAddress;
  const now = Date.now();

  const LIMIT = 10;
  const WINDOW = 60 * 1000;

  const user = requests.get(ip);

  if (!user || now - user.start >= WINDOW) {
    requests.set(ip, {
      count: 1,
      start: now,
    });

    return next();
  }

  if (user.count >= LIMIT) {
    return sendError(res, "common/too-many-requests");
  }

  user.count++;
  next();
};

module.exports = rateLimiter;
