"use strict";

const mongoose = require("mongoose");
const NotificationModel = require("../../infrastructure/persistence/notification/NotificationSchema");
const UserModel = require("../../infrastructure/persistence/user/UserSchema");
const ProjectModel = require("../../infrastructure/persistence/project/ProjectSchema");
const {
  ValidationException,
  NotFoundException,
} = require("../../domain/errors");
const { emitToUser } = require("../../infrastructure/websocket/socketServer");

class NotificationUseCases {
  async notifyUser({
    recipientId,
    actorId = null,
    type,
    title,
    message,
    projectId = null,
  }) {
    try {
      if (!recipientId || !type || !title || !message) return null;
      if (actorId && recipientId.toString() === actorId.toString()) {
        return null;
      }

      let actorName = "TaskFlow";
      if (actorId && mongoose.Types.ObjectId.isValid(actorId)) {
        const actorDoc = await UserModel.findById(actorId).select("name email");
        if (actorDoc) {
          actorName = actorDoc.name || actorDoc.email.split("@")[0];
        }
      }

      const created = await NotificationModel.create({
        recipientId,
        actorId,
        actorName,
        type,
        title,
        message,
        projectId,
        read: false,
      });

      const json = created.toJSON();
      emitToUser(recipientId, "notification:new", json);
      return json;
    } catch {
      return null;
    }
  }

  async notifyProjectMembers({
    projectId,
    actorId,
    type,
    title,
    message,
    recipientIds = null,
  }) {
    try {
      if (!projectId) return [];

      let targets = recipientIds;
      if (!Array.isArray(targets)) {
        const projectDoc = await ProjectModel.findById(projectId).select(
          "members"
        );
        if (!projectDoc) return [];
        targets = (projectDoc.members || []).map((m) => m.userId.toString());
      }

      const uniqueTargets = [...new Set(targets.map((id) => id.toString()))].filter(
        (id) => !actorId || id !== actorId.toString()
      );

      const results = await Promise.all(
        uniqueTargets.map((uid) =>
          this.notifyUser({
            recipientId: uid,
            actorId,
            type,
            title,
            message,
            projectId,
          })
        )
      );

      return results.filter(Boolean);
    } catch {
      return [];
    }
  }

  async listUserNotifications(userId, limit = 40) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ValidationException("Invalid user ID");
    }

    const [items, unreadCount] = await Promise.all([
      NotificationModel.find({ recipientId: userId })
        .sort({ createdAt: -1 })
        .limit(Math.min(Number(limit) || 40, 100)),
      NotificationModel.countDocuments({ recipientId: userId, read: false }),
    ]);

    return {
      items: items.map((doc) => doc.toJSON()),
      unreadCount,
    };
  }

  async markAsRead(userId, notificationId) {
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      throw new ValidationException("Invalid notification ID");
    }

    const notif = await NotificationModel.findOneAndUpdate(
      { _id: notificationId, recipientId: userId },
      { $set: { read: true } },
      { new: true }
    );

    if (!notif) {
      throw new NotFoundException("Notification not found");
    }

    return notif.toJSON();
  }

  async markAllAsRead(userId) {
    await NotificationModel.updateMany(
      { recipientId: userId, read: false },
      { $set: { read: true } }
    );
    return { success: true };
  }

  async deleteNotification(userId, notificationId) {
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      throw new ValidationException("Invalid notification ID");
    }

    const deleted = await NotificationModel.findOneAndDelete({
      _id: notificationId,
      recipientId: userId,
    });

    if (!deleted) {
      throw new NotFoundException("Notification not found");
    }

    return true;
  }
}

module.exports = new NotificationUseCases();
