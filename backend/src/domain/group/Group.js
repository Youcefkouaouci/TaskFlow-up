"use strict";

const { ValidationException } = require("../errors");

const VALID_GROUP_ROLES = ["owner", "admin", "member"];

class Group {
  constructor({ id = null, name, ownerId, members = [], createdAt, updatedAt }) {
    if (!name || typeof name !== "string" || !name.trim()) {
      throw new ValidationException("Group name is required");
    }
    const cleanName = name.trim();
    if (cleanName.length > 100) {
      throw new ValidationException("Group name must not exceed 100 characters");
    }

    if (!ownerId) {
      throw new ValidationException("Group ownerId is required");
    }

    if (!Array.isArray(members)) {
      throw new ValidationException("Group members must be an array");
    }

    const normalizedMembers = members.map((m) => {
      if (!m || !m.userId) {
        throw new ValidationException("Each group member must have a userId");
      }
      const role = m.role || "member";
      if (!VALID_GROUP_ROLES.includes(role)) {
        throw new ValidationException(`Invalid group role: ${role}`);
      }
      return {
        userId: m.userId.toString(),
        role,
        joinedAt: m.joinedAt instanceof Date ? m.joinedAt : new Date(),
      };
    });

    const ownerStr = ownerId.toString();
    if (!normalizedMembers.some((m) => m.userId === ownerStr)) {
      normalizedMembers.unshift({
        userId: ownerStr,
        role: "owner",
        joinedAt: new Date(),
      });
    }

    this.id = id ? id.toString() : null;
    this.name = cleanName;
    this.ownerId = ownerStr;
    this.members = normalizedMembers;
    this.createdAt = createdAt instanceof Date ? createdAt : new Date();
    this.updatedAt = updatedAt instanceof Date ? updatedAt : this.createdAt;
  }

  getMemberRole(userId) {
    if (!userId) return null;
    const uid = userId.toString();
    if (this.ownerId === uid) return "owner";
    const found = this.members.find((m) => m.userId === uid);
    return found ? found.role : null;
  }

  isMember(userId) {
    return this.getMemberRole(userId) !== null;
  }

  isOwner(userId) {
    return this.getMemberRole(userId) === "owner";
  }

  canManageGroup(userId) {
    const role = this.getMemberRole(userId);
    return role === "owner" || role === "admin";
  }

  canCreateProject(userId) {
    return this.canManageGroup(userId);
  }
}

module.exports = { Group, VALID_GROUP_ROLES };
