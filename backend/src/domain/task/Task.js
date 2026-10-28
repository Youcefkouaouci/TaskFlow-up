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
    dueDate = null,
    createdAt,
  }) {
    if (!title || typeof title !== "string" || !title.trim()) {
      throw new ValidationException("Task title is required");
    }
    if (title.trim().length > 120) {
      throw new ValidationException(
        "Task title must be at most 120 characters",
      );
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
    if (typeof description === "string" && description.length > 1000) {
      throw new ValidationException(
        "description must be at most 1000 characters",
      );
    }
    if (dueDate !== null && dueDate !== undefined) {
      if (typeof dueDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
        throw new ValidationException("dueDate must be in YYYY-MM-DD format");
      }
      const [y, m, d] = dueDate.split("-").map(Number);
      const date = new Date(Date.UTC(y, m - 1, d));
      if (date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
        throw new ValidationException("dueDate must be a valid calendar date");
      }
    }

    this.id = id ?? null;
    this.title = title.trim();
    this.description = typeof description === "string" ? description : "";
    this.urgent = urgent;
    this.important = important;
    this.status = status;
    this.ownerId = ownerId ?? null;
    this.dueDate = dueDate ?? null;
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
      dueDate: this.dueDate,
      createdAt: this.createdAt,
    };
  }
}

module.exports = { Task, VALID_STATUSES };
