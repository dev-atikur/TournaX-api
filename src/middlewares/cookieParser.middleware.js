const { sendError } = require("../utils/response");

const cookieParser = async (req, res, next) => {
  const cookieHeader = req.headers.cookie;
  req.cookies = {};
  if (!cookieHeader) return next();

  try {
    const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
    for (const cookie of cookies) {
      const [key, ...valueParts] = cookie.split("=");
      if (!key) continue;
      const value = valueParts.join("=");
      req.cookies[key.trim()] = decodeURIComponent(value.trim());
    }
    return next();
  } catch (error) {
    return sendError(res, "common/request-error");
  }
};

module.exports = cookieParser;
