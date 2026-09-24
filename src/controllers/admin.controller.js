const userModel = require("../models/user.model");
const reportModel = require("../models/report.model");
const sessionModel = require("../models/session.model");
const { sendError, sendSuccess } = require("../utils/response");
const { cleanObject, cleanArray } = require("../utils/cleanData");
const { parsePagination, paginated } = require("../utils/pagination");
const { getQuery } = require("../utils/path");
const { isObjectId, sanitizeString } = require("../utils/validation");
const { logError } = require("../utils/logger");
const { USER_ROLES } = require("../constants/user.constants");
const { notifyUser } = require("../services/notification.service");

async function listUsers(req, res) {
  try {
    const query = getQuery(req);
    const { page, limit, skip } = parsePagination(query);
    const filter = {};
    if (query.role && Object.values(USER_ROLES).includes(query.role)) filter.role = query.role;
    if (query.banned === "true") filter.isBanned = true;
    if (query.search) {
      const escaped = sanitizeString(query.search, 80).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { username: { $regex: escaped, $options: "i" } },
        { email: { $regex: escaped, $options: "i" } },
        { ffName: { $regex: escaped, $options: "i" } },
      ];
    }

    const [items, total] = await Promise.all([
      userModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("-twoFactorSecret -recoveryCodes")
        .lean(),
      userModel.countDocuments(filter),
    ]);

    return sendSuccess(res, 200, "Users fetched", paginated(cleanArray(items), page, limit, total));
  } catch (error) {
    logError({ message: "admin_list_users_failed", err: error });
    return sendError(res, "common/server-error");
  }
}

async function setBan(req, res, banned) {
  try {
    if (!isObjectId(req.params.id)) return sendError(res, "common/invalid-id");
    if (String(req.params.id) === String(req.user.id)) return sendError(res, "auth/forbidden");

    const user = await userModel.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          isBanned: banned,
          banReason: banned ? sanitizeString(req.body.reason || "Violation of PWF rules", 500) : null,
          isDisabled: banned ? true : false,
        },
      },
      { new: true },
    );
    if (!user) return sendError(res, "auth/user-not-found");

    if (banned) {
      await sessionModel.updateMany(
        { userId: user._id, isRevoked: false },
        { $set: { isRevoked: true, expiresAt: new Date() } },
      );
    }

    await notifyUser(user._id, {
      title: banned ? "Account banned" : "Account reinstated",
      message: banned ? user.banReason : "Your account is active again.",
      type: "moderation",
    });

    return sendSuccess(res, 200, banned ? "User banned" : "User unbanned", cleanObject(user));
  } catch (error) {
    logError({ message: "admin_ban_failed", err: error });
    return sendError(res, "common/server-error");
  }
}

async function banUser(req, res) {
  return setBan(req, res, true);
}

async function unbanUser(req, res) {
  return setBan(req, res, false);
}

async function updateUserRole(req, res) {
  try {
    if (!isObjectId(req.params.id)) return sendError(res, "common/invalid-id");
    if (req.user.role !== USER_ROLES.ADMIN) return sendError(res, "auth/forbidden");
    const role = req.body.role;
    if (![USER_ROLES.USER, USER_ROLES.MODERATOR].includes(role)) {
      return sendError(res, "auth/forbidden");
    }

    const user = await userModel.findById(req.params.id);
    if (!user) return sendError(res, "auth/user-not-found");
    if (user.role === USER_ROLES.ADMIN) return sendError(res, "auth/forbidden");

    user.role = role;
    await user.save();
    return sendSuccess(res, 200, "User role updated", cleanObject(user));
  } catch (error) {
    logError({ message: "admin_role_failed", err: error });
    return sendError(res, "common/server-error");
  }
}

async function listReports(req, res) {
  try {
    const query = getQuery(req);
    const { page, limit, skip } = parsePagination(query);
    const filter = {};
    if (query.status) filter.status = query.status;

    const [items, total] = await Promise.all([
      reportModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("reporterId", "username ffName")
        .populate("targetUserId", "username ffName")
        .lean(),
      reportModel.countDocuments(filter),
    ]);

    return sendSuccess(res, 200, "Reports fetched", paginated(cleanArray(items), page, limit, total));
  } catch (error) {
    logError({ message: "list_reports_failed", err: error });
    return sendError(res, "common/server-error");
  }
}

async function updateReport(req, res) {
  try {
    if (!isObjectId(req.params.id)) return sendError(res, "common/invalid-id");
    const status = req.body.status;
    if (!["open", "reviewed", "resolved", "dismissed"].includes(status)) {
      return sendError(res, "auth/missing-fields");
    }

    const report = await reportModel.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status,
          reviewedBy: req.user.id,
          resolution: sanitizeString(req.body.resolution || "", 1000),
        },
      },
      { new: true },
    );
    if (!report) return sendError(res, "report/not-found");
    return sendSuccess(res, 200, "Report updated", cleanObject(report));
  } catch (error) {
    logError({ message: "update_report_failed", err: error });
    return sendError(res, "common/server-error");
  }
}

module.exports = {
  listUsers,
  banUser,
  unbanUser,
  updateUserRole,
  listReports,
  updateReport,
};
