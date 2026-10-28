"use strict";

const notificationUseCases = require("../../../application/notification/NotificationUseCases");

async function listMyNotifications(req, res, next) {
  try {
    const result = await notificationUseCases.listUserNotifications(
      req.user.id,
      Number(req.query.limit) || 40
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

async function markNotificationAsRead(req, res, next) {
  try {
    const notification = await notificationUseCases.markAsRead(
      req.user.id,
      req.params.notificationId
    );
    return res.status(200).json(notification);
  } catch (err) {
    return next(err);
  }
}

async function markAllNotificationsAsRead(req, res, next) {
  try {
    const result = await notificationUseCases.markAllAsRead(req.user.id);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

async function deleteNotification(req, res, next) {
  try {
    await notificationUseCases.deleteNotification(
      req.user.id,
      req.params.notificationId
    );
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
};
