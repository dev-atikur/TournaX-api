const jwt = require("jsonwebtoken");
const { sendError } = require("../utils/response");
const userModel = require("../models/user.model");
const sessionModel = require("../models/session.model");

const USER_SAFE_SELECT = "username email role isActive isDisabled isBanned emailVerified ffName twoFactorEnabled";

async function attachUser(req, decoded) {
  const user = await userModel.findById(decoded.id).select(USER_SAFE_SELECT).lean();
  if (!user) return "auth/user-not-found";
  if (user.isBanned || user.isDisabled) return "auth/account-restricted";

  if (decoded.sessionId) {
    const session = await sessionModel
      .findOne({
        _id: decoded.sessionId,
        userId: user._id,
        isRevoked: false,
        expiresAt: { $gt: new Date() },
      })
      .select("_id")
      .lean();
    if (!session) return "auth/session-expired";
  }

  req.user = {
    id: String(user._id),
    role: user.role,
    sessionId: decoded.sessionId || null,
    emailVerified: user.emailVerified,
    ffName: user.ffName,
  };
  req.authUser = user;
  return null;
}

const protect = async (req, res, next) => {
  const accessId = req.cookies?.accessId;
  if (!accessId) return sendError(res, "auth/unauthorized");

  try {
    const decoded = jwt.verify(accessId, process.env.ACCESS_ID_SECRET);
    const errorCode = await attachUser(req, decoded);
    if (errorCode) return sendError(res, errorCode);
    return next();
  } catch (error) {
    return sendError(res, "auth/unauthorized");
  }
};

const optionalAuth = async (req, res, next) => {
  const accessId = req.cookies?.accessId;
  if (!accessId) return next();
  try {
    const decoded = jwt.verify(accessId, process.env.ACCESS_ID_SECRET);
    await attachUser(req, decoded);
  } catch (error) {
    req.user = null;
  }
  return next();
};

const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return sendError(res, "auth/forbidden");
  }
  return next();
};

const staffOnly = (req, res, next) => {
  if (!req.user || !["admin", "moderator"].includes(req.user.role)) {
    return sendError(res, "auth/forbidden");
  }
  return next();
};

const moderatorOnly = (req, res, next) => {
  if (!req.user || !["admin", "moderator"].includes(req.user.role)) {
    return sendError(res, "auth/forbidden");
  }
  return next();
};

module.exports = { protect, optionalAuth, adminOnly, staffOnly, moderatorOnly };
