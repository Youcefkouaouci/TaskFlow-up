"use strict";

const { ValidationException } = require("../errors");

const VALID_PROJECT_ROLES = ["project_lead", "contributor", "viewer"];

class Project {
  constructor({
    id = null,
    groupId,
    name,
    description = "",
    members = [],
    createdAt,
    updatedAt,
  }) {
    if (!groupId) {
      throw new ValidationException("Project groupId is required");
    }

    if (!name || typeof name !== "string" || !name.trim()) {
      throw new ValidationException("Project name is required");
    }
    const cleanName = name.trim();
    if (cleanName.length > 120) {
      throw new ValidationException("Project name must not exceed 120 characters");
    }

    if (typeof description !== "string") {
      throw new ValidationException("Project description must be a string");
    }
    if (description.length > 1000) {
      throw new ValidationException(
        "Project description must not exceed 1000 characters"
      );
    }

    if (!Array.isArray(members)) {
      throw new ValidationException("Project members must be an array");
    }

    const normalizedMembers = members.map((m) => {
      if (!m || !m.userId) {
        throw new ValidationException("Each project member must have a userId");
      }
      const role = m.role || "contributor";
      if (!VALID_PROJECT_ROLES.includes(role)) {
        throw new ValidationException(`Invalid project role: ${role}`);
      }
      return {
        userId: m.userId.toString(),
        role,
      };
    });

    this.id = id ? id.toString() : null;
    this.groupId = groupId.toString();
    this.name = cleanName;
    this.description = description.trim();
    this.members = normalizedMembers;
    this.createdAt = createdAt instanceof Date ? createdAt : new Date();
    this.updatedAt = updatedAt instanceof Date ? updatedAt : this.createdAt;
  }

  getMemberRole(userId) {
    if (!userId) return null;
    const uid = userId.toString();
    const found = this.members.find((m) => m.userId === uid);
    return found ? found.role : null;
  }

  isMember(userId) {
    return this.getMemberRole(userId) !== null;
  }

  canManageProject(userId) {
    return this.getMemberRole(userId) === "project_lead";
  }

  canWriteTasks(userId) {
    const role = this.getMemberRole(userId);
    return role === "project_lead" || role === "contributor";
  }

  canView(userId) {
    return this.isMember(userId);
  }
}

module.exports = { Project, VALID_PROJECT_ROLES };
