const notificationModel = require("../models/notification.model");

async function notifyUser(userId, { title, message, type = "system", data = {} }) {
  if (!userId) return null;
  return notificationModel.create({ userId, title, message, type, data });
}

async function notifyUsers(userIds, payload) {
  const unique = [...new Set((userIds || []).map((id) => String(id)))];
  if (!unique.length) return;
  await notificationModel.insertMany(
    unique.map((userId) => ({ userId, ...payload })),
  );
}

module.exports = { notifyUser, notifyUsers };
