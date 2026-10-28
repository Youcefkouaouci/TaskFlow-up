"use strict";

const crypto = require("crypto");
const { ValidationException } = require("../errors");

const VALID_INVITATION_ROLES = ["admin", "member"];
const VALID_INVITATION_STATUSES = ["pending", "accepted", "expired"];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class GroupInvitation {
  constructor({
    id = null,
    groupId,
    invitedBy,
    email,
    role = "member",
    token = null,
    status = "pending",
    expiresAt = null,
    createdAt,
    updatedAt,
  }) {
    if (!groupId) {
      throw new ValidationException("Invitation groupId is required");
    }
    if (!invitedBy) {
      throw new ValidationException("Invitation invitedBy is required");
    }

    if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
      throw new ValidationException("A valid recipient email is required");
    }

    if (!VALID_INVITATION_ROLES.includes(role)) {
      throw new ValidationException(
        `Invalid invitation role: must be 'admin' or 'member'`
      );
    }

    if (!VALID_INVITATION_STATUSES.includes(status)) {
      throw new ValidationException(
        `Invalid invitation status: ${status}`
      );
    }

    const defaultExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const resolvedExpiresAt =
      expiresAt instanceof Date
        ? expiresAt
        : expiresAt
        ? new Date(expiresAt)
        : defaultExpires;

    if (Number.isNaN(resolvedExpiresAt.getTime())) {
      throw new ValidationException("Invalid expiresAt date");
    }

    this.id = id ? id.toString() : null;
    this.groupId = groupId.toString();
    this.invitedBy = invitedBy.toString();
    this.email = email.trim().toLowerCase();
    this.role = role;
    this.token = token || crypto.randomBytes(32).toString("hex");
    this.status = status;
    this.expiresAt = resolvedExpiresAt;
    this.createdAt = createdAt instanceof Date ? createdAt : new Date();
    this.updatedAt = updatedAt instanceof Date ? updatedAt : this.createdAt;
  }

  isExpired(now = new Date()) {
    return (
      this.status === "expired" || this.expiresAt.getTime() <= now.getTime()
    );
  }

  canBeAccepted(now = new Date()) {
    return this.status === "pending" && !this.isExpired(now);
  }
}

module.exports = {
  GroupInvitation,
  VALID_INVITATION_ROLES,
  VALID_INVITATION_STATUSES,
};
