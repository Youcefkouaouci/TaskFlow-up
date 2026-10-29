"use strict";

const {
  PRIORITY_MAP,
  QUADRANT_MAP,
  VALID_STATUSES,
  VALID_QUADRANTS,
  calculateQuadrant,
} = require("./taskStatus");
const { ValidationException } = require("../errors");

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
    context = "Entreprise",
    createdAt,
    updatedAt,
  }) {
    if (!title || typeof title !== "string" || !title.trim()) {
      throw new ValidationException("Task title is required");
    }
    const cleanTitle = title.trim();
    if (cleanTitle.length > 120) {
      throw new ValidationException("Task title must be at most 120 characters");
    }

    if (typeof description !== "string") {
      throw new ValidationException("description must be a string");
    }
    if (description.length > 1000) {
      throw new ValidationException("description must be at most 1000 characters");
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

    if (dueDate !== null && dueDate !== undefined) {
      if (typeof dueDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
        throw new ValidationException("dueDate must be in YYYY-MM-DD format");
      }
      const [y, m, d] = dueDate.split("-").map(Number);
      const date = new Date(Date.UTC(y, m - 1, d));
      if (
        date.getUTCFullYear() !== y ||
        date.getUTCMonth() !== m - 1 ||
        date.getUTCDate() !== d
      ) {
        throw new ValidationException("dueDate must be a valid calendar date");
      }
    }

    this.id = id ? id.toString() : null;
    this.projectId = projectId ? projectId.toString() : null;
    this.title = cleanTitle;
    this.description = description;
    this.urgent = urgent;
    this.important = important;
    this.status = status;
    this.assignedTo = Array.isArray(assignedTo)
      ? assignedTo.map((u) => u.toString())
      : [];
    this.ownerId = ownerId ? ownerId.toString() : null;
    this.dueDate = dueDate ?? null;
    this.context =
      typeof context === "string" && context.trim()
        ? context.trim()
        : "Entreprise";
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
      priority: this.priority,
      quadrant: this.quadrant,
      status: this.status,
      assignedTo: this.assignedTo,
      ownerId: this.ownerId,
      dueDate: this.dueDate,
      context: this.context,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

module.exports = { Task, VALID_STATUSES, VALID_QUADRANTS, QUADRANT_MAP };
