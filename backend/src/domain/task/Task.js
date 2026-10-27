"use strict";

const { PRIORITY_MAP, VALID_STATUSES } = require("./taskStatus");
const { ValidationException } = require("../errors");

class Task {
  constructor({
    id,
    title,
    description = "",
    urgent,
    important,
    status = "todo",
    ownerId,
    createdAt,
  }) {
    if (!title || typeof title !== "string" || !title.trim()) {
      throw new ValidationException("Task title is required");
    }
    if (typeof urgent !== "boolean") {
      throw new ValidationException("urgent must be a boolean");
    }
    if (typeof important !== "boolean") {
      throw new ValidationException("important must be a boolean");
    }
    if (!VALID_STATUSES.includes(status)) {
      throw new ValidationException(`Invalid status: ${status}`);
    }

    this.id = id ?? null;
    this.title = title.trim();
    this.description = typeof description === "string" ? description : "";
    this.urgent = urgent;
    this.important = important;
    this.status = status;
    this.ownerId = ownerId ?? null;
    this.createdAt = createdAt instanceof Date ? createdAt : new Date();
  }

  get priority() {
    return PRIORITY_MAP[`${this.urgent}-${this.important}`];
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      urgent: this.urgent,
      important: this.important,
      priority: this.priority,
      status: this.status,
      ownerId: this.ownerId,
      createdAt: this.createdAt,
    };
  }
}

module.exports = { Task, VALID_STATUSES };
