"use strict";

const { Message } = require("../../domain/message/Message");
const { ValidationException } = require("../../domain/errors");
const MessageModel = require("../../infrastructure/persistence/message/MessageSchema");
const UserModel = require("../../infrastructure/persistence/user/UserSchema");
const taskUseCases = require("../task/TaskUseCases");
const { emitToProject } = require("../../infrastructure/websocket/socketServer");
const notificationUseCases = require("../notification/NotificationUseCases");

class MessageUseCases {
  async listProjectMessages(userId, projectId) {
    await taskUseCases.verifyProjectAccess(userId, projectId, false);

    const messages = await MessageModel.find({ projectId })
      .sort({ createdAt: 1 })
      .limit(200);

    const senderIds = [...new Set(messages.map((m) => m.senderId.toString()))];
    const users = await UserModel.find({ _id: { $in: senderIds } });
    const userMap = new Map(
      users.map((u) => [
        u._id.toString(),
        { name: u.name || u.email.split("@")[0], email: u.email },
      ])
    );

    return messages.map((m) => {
      const json = m.toJSON();
      const sender = userMap.get(json.senderId) || {
        name: "Membre",
        email: "",
      };
      return {
        ...json,
        senderName: sender.name,
        senderEmail: sender.email,
      };
    });
  }

  async sendProjectMessage(userId, projectId, data) {
    if (!data || typeof data !== "object") {
      throw new ValidationException("Invalid message payload");
    }

    // RBAC : Seuls project_lead, contributor ou owner/admin du groupe peuvent poster dans le chat
    await taskUseCases.verifyProjectAccess(userId, projectId, true);

    const messageEntity = new Message({
      projectId,
      senderId: userId,
      content: data.content,
    });

    const created = await MessageModel.create({
      projectId: messageEntity.projectId,
      senderId: messageEntity.senderId,
      content: messageEntity.content,
    });

    const senderDoc = await UserModel.findById(userId);
    const enriched = {
      ...created.toJSON(),
      senderName: senderDoc
        ? senderDoc.name || senderDoc.email.split("@")[0]
        : "Membre",
      senderEmail: senderDoc ? senderDoc.email : "",
    };

    emitToProject(projectId, "project:message", enriched);
    const preview =
      enriched.content.length > 65
        ? `${enriched.content.slice(0, 62)}...`
        : enriched.content;
    await notificationUseCases.notifyProjectMembers({
      projectId,
      actorId: userId,
      type: "chat_message",
      title: "Nouveau message dans le chat",
      message: `a écrit : « ${preview} »`,
    });
    return enriched;
  }
}

module.exports = new MessageUseCases();
