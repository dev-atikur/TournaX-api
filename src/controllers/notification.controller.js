const notificationModel = require("../models/notification.model");
const { sendError, sendSuccess } = require("../utils/response");
const { cleanArray, cleanObject } = require("../utils/cleanData");
const { parsePagination, paginated } = require("../utils/pagination");
const { getQuery } = require("../utils/path");
const { isObjectId } = require("../utils/validation");
const { logError } = require("../utils/logger");

async function listNotifications(req, res) {
  try {
    const query = getQuery(req);
    const { page, limit, skip } = parsePagination(query);
    const filter = { userId: req.user.id };
    if (query.unread === "true") filter.isRead = false;

    const [items, total] = await Promise.all([
      notificationModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      notificationModel.countDocuments(filter),
    ]);

    return sendSuccess(res, 200, "Notifications fetched", paginated(cleanArray(items), page, limit, total));
  } catch (error) {
    logError({ message: "list_notifications_failed", err: error });
    return sendError(res, "common/server-error");
  }
}

async function markRead(req, res) {
  try {
    if (!isObjectId(req.params.id)) return sendError(res, "common/invalid-id");
    const notification = await notificationModel.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: { isRead: true } },
      { new: true },
    );
    if (!notification) return sendError(res, "notification/not-found");
    return sendSuccess(res, 200, "Notification marked as read", cleanObject(notification));
  } catch (error) {
    logError({ message: "mark_notification_failed", err: error });
    return sendError(res, "common/server-error");
  }
}

async function markAllRead(req, res) {
  try {
    await notificationModel.updateMany({ userId: req.user.id, isRead: false }, { $set: { isRead: true } });
    return sendSuccess(res, 200, "All notifications marked as read");
  } catch (error) {
    logError({ message: "mark_all_notifications_failed", err: error });
    return sendError(res, "common/server-error");
  }
}

module.exports = { listNotifications, markRead, markAllRead };
