"use strict";

const mongoose = require("mongoose");
const { Group } = require("../../domain/group/Group");
const {
  ValidationException,
  ForbiddenException,
  NotFoundException,
} = require("../../domain/errors");
const GroupModel = require("../../infrastructure/persistence/group/GroupSchema");
const ProjectModel = require("../../infrastructure/persistence/project/ProjectSchema");
const TaskModel = require("../../infrastructure/persistence/task/TaskSchema");
const UserModel = require("../../infrastructure/persistence/user/UserSchema");

class GroupUseCases {
  async createGroup(userId, data) {
    if (!data || typeof data !== "object") {
      throw new ValidationException("Invalid group payload");
    }

    const groupEntity = new Group({
      name: data.name,
      ownerId: userId,
      members: [{ userId, role: "owner", joinedAt: new Date() }],
    });

    const created = await GroupModel.create({
      name: groupEntity.name,
      ownerId: groupEntity.ownerId,
      members: groupEntity.members,
    });

    return created.toJSON();
  }

  async listUserGroups(userId) {
    const groups = await GroupModel.find({
      $or: [{ ownerId: userId }, { "members.userId": userId }],
    }).sort({ createdAt: -1 });

    return groups.map((g) => g.toJSON());
  }

  async getGroupById(userId, groupId) {
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
      createdAt: groupDoc.createdAt,
      updatedAt: groupDoc.updatedAt,
    });

    if (!groupEntity.isMember(userId)) {
      throw new ForbiddenException("Access denied to this group");
    }

    return groupDoc.toJSON();
  }

  async updateGroup(userId, groupId, updates) {
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      throw new ValidationException("Invalid group ID format");
    }
    if (!updates || typeof updates !== "object" || !updates.name) {
      throw new ValidationException("Group name is required for update");
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

    if (!groupEntity.canManageGroup(userId)) {
      throw new ForbiddenException("Only owner or admin can update this group");
    }

    const validated = new Group({
      id: groupDoc._id,
      name: updates.name,
      ownerId: groupDoc.ownerId,
      members: groupDoc.members,
    });

    groupDoc.name = validated.name;
    await groupDoc.save();

    return groupDoc.toJSON();
  }

  async deleteGroup(userId, groupId) {
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

    if (!groupEntity.isOwner(userId)) {
      throw new ForbiddenException("Only the group owner can delete the group");
    }

    const projects = await ProjectModel.find({ groupId: groupDoc._id }).select(
      "_id"
    );
    const projectIds = projects.map((p) => p._id);

    if (projectIds.length > 0) {
      await TaskModel.deleteMany({ projectId: { $in: projectIds } });
      await ProjectModel.deleteMany({ groupId: groupDoc._id });
    }

    await GroupModel.findByIdAndDelete(groupId);
    return true;
  }

  async addOrUpdateMember(actorId, groupId, { userId, role = "member" }) {
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      throw new ValidationException("Invalid group ID format");
    }
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new ValidationException("Valid userId is required");
    }
    if (!["admin", "member"].includes(role)) {
      throw new ValidationException("Role must be 'admin' or 'member'");
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
      throw new ForbiddenException("Only owner or admin can manage members");
    }

    if (groupDoc.ownerId.toString() === userId.toString()) {
      throw new ValidationException("Cannot modify the group owner role");
    }

    const targetUser = await UserModel.findById(userId);
    if (!targetUser) {
      throw new NotFoundException("Target user not found");
    }

    const existingIdx = groupDoc.members.findIndex(
      (m) => m.userId.toString() === userId.toString()
    );

    if (existingIdx >= 0) {
      groupDoc.members[existingIdx].role = role;
    } else {
      groupDoc.members.push({
        userId,
        role,
        joinedAt: new Date(),
      });
    }

    await groupDoc.save();
    return groupDoc.toJSON();
  }

  async removeMember(actorId, groupId, targetUserId) {
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      throw new ValidationException("Invalid group ID format");
    }
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      throw new ValidationException("Invalid target userId format");
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
      throw new ForbiddenException("Only owner or admin can remove members");
    }

    if (groupDoc.ownerId.toString() === targetUserId.toString()) {
      throw new ValidationException("Cannot remove the group owner");
    }

    groupDoc.members = groupDoc.members.filter(
      (m) => m.userId.toString() !== targetUserId.toString()
    );

    await groupDoc.save();
    return groupDoc.toJSON();
  }
}

module.exports = new GroupUseCases();
