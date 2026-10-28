"use strict";

const { ValidationException } = require("../errors");

class Message {
  constructor({ id = null, projectId, senderId, content, createdAt, updatedAt }) {
    if (!projectId) {
      throw new ValidationException("Message projectId is required");
    }
    if (!senderId) {
      throw new ValidationException("Message senderId is required");
    }
    if (!content || typeof content !== "string" || !content.trim()) {
      throw new ValidationException("Message content is required");
    }
    const cleanContent = content.trim();
    if (cleanContent.length > 2000) {
      throw new ValidationException(
        "Message content must not exceed 2000 characters"
      );
    }

    this.id = id ? id.toString() : null;
    this.projectId = projectId.toString();
    this.senderId = senderId.toString();
    this.content = cleanContent;
    this.createdAt = createdAt instanceof Date ? createdAt : new Date();
    this.updatedAt = updatedAt instanceof Date ? updatedAt : this.createdAt;
  }
}

module.exports = { Message };
