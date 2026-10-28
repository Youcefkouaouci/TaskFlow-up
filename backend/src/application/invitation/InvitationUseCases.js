"use strict";

const mongoose = require("mongoose");
const { Group } = require("../../domain/group/Group");
const { GroupInvitation } = require("../../domain/invitation/GroupInvitation");
const {
  ValidationException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} = require("../../domain/errors");
const GroupModel = require("../../infrastructure/persistence/group/GroupSchema");
const GroupInvitationModel = require("../../infrastructure/persistence/invitation/GroupInvitationSchema");
const UserModel = require("../../infrastructure/persistence/user/UserSchema");
const emailService = require("../../infrastructure/email/EmailService");
const env = require("../../infrastructure/config/env");

class InvitationUseCases {
  async createInvitation(actorId, groupId, data) {
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      throw new ValidationException("Invalid group ID format");
    }
    if (!data || typeof data !== "object") {
      throw new ValidationException("Invalid invitation payload");
    }

    const groupDoc = await GroupModel.findById(groupId);
    if (!groupDoc) {
      throw new NotFoundException("Group not found");
    }

    const groupEntity = new Group({
      id: groupDoc._id,
      name: groupDoc.name,
      ownerId: groupDoc.ownerId,
      members: groupDoc.members,
    });

    if (!groupEntity.canManageGroup(actorId)) {
      throw new ForbiddenException(
        "Only group owner or admin can send invitations"
      );
    }

    const expiresInHours =
      data.expiresInHours !== undefined ? Number(data.expiresInHours) : 168; // 7 jours par défaut
    if (Number.isNaN(expiresInHours) || expiresInHours <= 0) {
      throw new ValidationException("expiresInHours must be a positive number");
    }

    const expiresAt = data.expiresAt
      ? new Date(data.expiresAt)
      : new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    const invitationEntity = new GroupInvitation({
      groupId: groupDoc._id,
      invitedBy: actorId,
      email: data.email,
      role: data.role || "member",
      expiresAt,
    });

    // Vérifier si l'utilisateur avec cet email est déjà membre du groupe
    const existingUser = await UserModel.findOne({
      email: invitationEntity.email,
    });
    if (existingUser && groupEntity.isMember(existingUser._id)) {
      throw new ConflictException("User is already a member of this group");
    }

    // Vérifier s'il existe déjà une invitation active (pending et non expirée)
    const activeInvite = await GroupInvitationModel.findOne({
      groupId: groupDoc._id,
      email: invitationEntity.email,
      status: "pending",
    });

    if (activeInvite) {
      if (activeInvite.expiresAt.getTime() > Date.now()) {
        throw new ConflictException(
          "An active invitation already exists for this email in this group"
        );
      } else {
        activeInvite.status = "expired";
        await activeInvite.save();
      }
    }

    const created = await GroupInvitationModel.create({
      groupId: invitationEntity.groupId,
      invitedBy: invitationEntity.invitedBy,
      email: invitationEntity.email,
      role: invitationEntity.role,
      token: invitationEntity.token,
      status: invitationEntity.status,
      expiresAt: invitationEntity.expiresAt,
    });

    const inviter = await UserModel.findById(actorId);
    const mailResult = await emailService.sendGroupInvitationEmail({
      to: invitationEntity.email,
      groupName: groupDoc.name,
      inviterName: inviter ? inviter.name || inviter.email : "TaskFlow",
      role: invitationEntity.role,
      token: invitationEntity.token,
      expiresAt: invitationEntity.expiresAt,
    });

    return {
      ...created.toJSON(),
      inviteUrl: `${env.frontendUrl}/invitations/accept?token=${invitationEntity.token}`,
      emailSent: mailResult.sent,
    };
  }

  async listGroupInvitations(actorId, groupId) {
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      throw new ValidationException("Invalid group ID format");
    }

    const groupDoc = await GroupModel.findById(groupId);
    if (!groupDoc) {
      throw new NotFoundException("Group not found");
    }

    const groupEntity = new Group({
      id: groupDoc._id,
      name: groupDoc.name,
      ownerId: groupDoc.ownerId,
      members: groupDoc.members,
    });

    if (!groupEntity.canManageGroup(actorId)) {
      throw new ForbiddenException(
        "Only group owner or admin can view invitations"
      );
    }

    // Marquer automatiquement comme expirées les invitations dépassées
    await GroupInvitationModel.updateMany(
      {
        groupId: groupDoc._id,
        status: "pending",
        expiresAt: { $lte: new Date() },
      },
      { $set: { status: "expired" } }
    );

    const invitations = await GroupInvitationModel.find({
      groupId: groupDoc._id,
    }).sort({ createdAt: -1 });

    return invitations.map((inv) => inv.toJSON());
  }

  async getInvitationByToken(token) {
    if (!token || typeof token !== "string") {
      throw new ValidationException("Invitation token is required");
    }

    const invitationDoc = await GroupInvitationModel.findOne({ token });
    if (!invitationDoc) {
      throw new NotFoundException("Invitation not found");
    }

    if (
      invitationDoc.status === "pending" &&
      invitationDoc.expiresAt.getTime() <= Date.now()
    ) {
      invitationDoc.status = "expired";
      await invitationDoc.save();
    }

    if (invitationDoc.status === "expired") {
      throw new ValidationException("Invitation has expired");
    }

    const groupDoc = await GroupModel.findById(invitationDoc.groupId);

    return {
      ...invitationDoc.toJSON(),
      groupName: groupDoc ? groupDoc.name : null,
    };
  }

  async acceptInvitation(userId, token) {
    if (!token || typeof token !== "string") {
      throw new ValidationException("Invitation token is required");
    }

    const invitationDoc = await GroupInvitationModel.findOne({ token });
    if (!invitationDoc) {
      throw new NotFoundException("Invitation not found");
    }

    if (invitationDoc.status === "accepted") {
      throw new ConflictException("Invitation has already been accepted");
    }

    if (
      invitationDoc.status === "expired" ||
      invitationDoc.expiresAt.getTime() <= Date.now()
    ) {
      if (invitationDoc.status !== "expired") {
        invitationDoc.status = "expired";
        await invitationDoc.save();
      }
      throw new ValidationException("Invitation has expired");
    }

    const userDoc = await UserModel.findById(userId);
    if (!userDoc) {
      throw new NotFoundException("Authenticated user not found");
    }

    if (userDoc.email.toLowerCase() !== invitationDoc.email.toLowerCase()) {
      throw new ForbiddenException(
        "This invitation belongs to a different email address"
      );
    }

    const groupDoc = await GroupModel.findById(invitationDoc.groupId);
    if (!groupDoc) {
      throw new NotFoundException("Target group no longer exists");
    }

    const alreadyMember = groupDoc.members.some(
      (m) => m.userId.toString() === userId.toString()
    );

    if (!alreadyMember) {
      groupDoc.members.push({
        userId: userDoc._id,
        role: invitationDoc.role,
        joinedAt: new Date(),
      });
      await groupDoc.save();
    }

    invitationDoc.status = "accepted";
    await invitationDoc.save();

    return {
      invitation: invitationDoc.toJSON(),
      group: groupDoc.toJSON(),
    };
  }

  async revokeInvitation(actorId, groupId, invitationId) {
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      throw new ValidationException("Invalid group ID format");
    }
    if (!mongoose.Types.ObjectId.isValid(invitationId)) {
      throw new ValidationException("Invalid invitation ID format");
    }

    const groupDoc = await GroupModel.findById(groupId);
    if (!groupDoc) {
      throw new NotFoundException("Group not found");
    }

    const groupEntity = new Group({
      id: groupDoc._id,
      name: groupDoc.name,
      ownerId: groupDoc.ownerId,
      members: groupDoc.members,
    });

    if (!groupEntity.canManageGroup(actorId)) {
      throw new ForbiddenException(
        "Only group owner or admin can revoke invitations"
      );
    }

    const deleted = await GroupInvitationModel.findOneAndDelete({
      _id: invitationId,
      groupId: groupDoc._id,
    });

    if (!deleted) {
      throw new NotFoundException("Invitation not found");
    }

    return true;
  }
}

module.exports = new InvitationUseCases();
