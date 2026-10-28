"use strict";

const {
  PRIORITY_MAP,
  QUADRANT_MAP,
  VALID_STATUSES,
  VALID_QUADRANTS,
  normalizeStatus,
  calculateQuadrant,
} = require("./taskStatus");
const { ValidationException } = require("../errors");

function parseDueDate(val) {
  if (val === undefined || val === null) return null;
  if (val instanceof Date) {
    if (Number.isNaN(val.getTime())) {
      throw new ValidationException("dueDate must be a valid Date");
    }
    return val;
  }
  if (typeof val === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const [year, month, day] = val.split("-").map(Number);
      const date = new Date(Date.UTC(year, month - 1, day));
      if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
      ) {
        throw new ValidationException("dueDate must be a valid calendar date");
      }
      return date;
    }
    const parsed = new Date(val);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  throw new ValidationException("dueDate must be a valid date");
}

class Task {
  constructor({
    id,
    projectId = null,
    title,
    description = "",
    urgent,
    important,
    status = "todo",
    assignedTo = [],
    ownerId = null,
    dueDate = null,
    createdAt,
    updatedAt,
  }) {
    if (!title || typeof title !== "string" || !title.trim()) {
      throw new ValidationException("Task title is required");
    }
    const cleanTitle = title.trim();
    if (cleanTitle.length > 120) {
      throw new ValidationException("Title must not exceed 120 characters");
    }

    if (typeof description !== "string") {
      throw new ValidationException("description must be a string");
    }
    if (description.length > 1000) {
      throw new ValidationException("description must not exceed 1000 characters");
    }

    if (typeof urgent !== "boolean") {
      throw new ValidationException("urgent must be a boolean");
    }
    if (typeof important !== "boolean") {
      throw new ValidationException("important must be a boolean");
    }

    const normStatus = normalizeStatus(status);
    if (!VALID_STATUSES.includes(normStatus)) {
      throw new ValidationException(`Invalid status: ${status}`);
    }

    const parsedDueDate = parseDueDate(dueDate);

    this.id = id ? id.toString() : null;
    this.projectId = projectId ? projectId.toString() : null;
    this.title = cleanTitle;
    this.description = description;
    this.urgent = urgent;
    this.important = important;
    this.status = normStatus;
    this.assignedTo = Array.isArray(assignedTo)
      ? assignedTo.map((u) => u.toString())
      : [];
    this.ownerId = ownerId ? ownerId.toString() : null;
    this.dueDate = parsedDueDate;
    this.createdAt = createdAt instanceof Date ? createdAt : new Date();
    this.updatedAt = updatedAt instanceof Date ? updatedAt : this.createdAt;
  }

  get quadrant() {
    return calculateQuadrant(this.urgent, this.important);
  }

  get priority() {
    return PRIORITY_MAP[`${this.urgent}-${this.important}`];
  }

  toJSON() {
    return {
      id: this.id,
      projectId: this.projectId,
      title: this.title,
      description: this.description,
      urgent: this.urgent,
      important: this.important,
      quadrant: this.quadrant,
      priority: this.priority,
      status: this.status,
      assignedTo: this.assignedTo,
      ownerId: this.ownerId,
      dueDate: this.dueDate,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

module.exports = { Task, VALID_STATUSES, VALID_QUADRANTS, QUADRANT_MAP };
