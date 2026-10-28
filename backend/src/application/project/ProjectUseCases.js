"use strict";

const mongoose = require("mongoose");
const { Group } = require("../../domain/group/Group");
const { Project, VALID_PROJECT_ROLES } = require("../../domain/project/Project");
const {
  ValidationException,
  ForbiddenException,
  NotFoundException,
} = require("../../domain/errors");
const GroupModel = require("../../infrastructure/persistence/group/GroupSchema");
const ProjectModel = require("../../infrastructure/persistence/project/ProjectSchema");
const TaskModel = require("../../infrastructure/persistence/task/TaskSchema");

class ProjectUseCases {
  async createProject(userId, groupId, data) {
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      throw new ValidationException("Invalid group ID format");
    }
    if (!data || typeof data !== "object") {
      throw new ValidationException("Invalid project payload");
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

    if (!groupEntity.canCreateProject(userId)) {
      throw new ForbiddenException(
        "Only group owner or admin can create projects"
      );
    }

    const projectEntity = new Project({
      groupId: groupDoc._id,
      name: data.name,
      description: data.description ?? "",
      members: [{ userId, role: "project_lead" }],
    });

    const created = await ProjectModel.create({
      groupId: projectEntity.groupId,
      name: projectEntity.name,
      description: projectEntity.description,
      members: projectEntity.members,
    });

    return created.toJSON();
  }

  async listProjectsByGroup(userId, groupId) {
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

    if (!groupEntity.isMember(userId)) {
      throw new ForbiddenException("Access denied to this group");
    }

    const query = groupEntity.canManageGroup(userId)
      ? { groupId }
      : { groupId, "members.userId": userId };

    const projects = await ProjectModel.find(query).sort({ createdAt: -1 });
    return projects.map((p) => p.toJSON());
  }

  async listUserProjects(userId) {
    const projects = await ProjectModel.find({
      "members.userId": userId,
    }).sort({ createdAt: -1 });

    return projects.map((p) => p.toJSON());
  }

  async getProjectById(userId, projectId) {
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      throw new ValidationException("Invalid project ID format");
    }

    const projectDoc = await ProjectModel.findById(projectId);
    if (!projectDoc) {
      throw new NotFoundException("Project not found");
    }

    const projectEntity = new Project({
      id: projectDoc._id,
      groupId: projectDoc.groupId,
      name: projectDoc.name,
      description: projectDoc.description,
      members: projectDoc.members,
    });

    if (!projectEntity.canView(userId)) {
      const groupDoc = await GroupModel.findById(projectDoc.groupId);
      const isGroupAdmin =
        groupDoc &&
        new Group({
          id: groupDoc._id,
          name: groupDoc.name,
          ownerId: groupDoc.ownerId,
          members: groupDoc.members,
        }).canManageGroup(userId);

      if (!isGroupAdmin) {
        throw new ForbiddenException("Access denied to this project");
      }
    }

    return projectDoc.toJSON();
  }

  async canUserAdministerProject(userId, projectDoc) {
    const projectEntity = new Project({
      id: projectDoc._id,
      groupId: projectDoc.groupId,
      name: projectDoc.name,
      description: projectDoc.description,
      members: projectDoc.members,
    });

    if (projectEntity.canManageProject(userId)) {
      return true;
    }

    const groupDoc = await GroupModel.findById(projectDoc.groupId);
    if (!groupDoc) return false;

    const groupEntity = new Group({
      id: groupDoc._id,
      name: groupDoc.name,
      ownerId: groupDoc.ownerId,
      members: groupDoc.members,
    });

    return groupEntity.canManageGroup(userId);
  }

  async updateProject(userId, projectId, updates) {
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      throw new ValidationException("Invalid project ID format");
    }
    if (
      !updates ||
      typeof updates !== "object" ||
      Object.keys(updates).length === 0
    ) {
      throw new ValidationException("No update data provided");
    }

    const projectDoc = await ProjectModel.findById(projectId);
    if (!projectDoc) {
      throw new NotFoundException("Project not found");
    }

    const isAllowed = await this.canUserAdministerProject(userId, projectDoc);
    if (!isAllowed) {
      throw new ForbiddenException(
        "Only project_lead or group admin can update this project"
      );
    }

    const validated = new Project({
      id: projectDoc._id,
      groupId: projectDoc.groupId,
      name: updates.name !== undefined ? updates.name : projectDoc.name,
      description:
        updates.description !== undefined
          ? updates.description
          : projectDoc.description,
      members: projectDoc.members,
    });

    projectDoc.name = validated.name;
    projectDoc.description = validated.description;
    await projectDoc.save();

    return projectDoc.toJSON();
  }

  async deleteProject(userId, projectId) {
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      throw new ValidationException("Invalid project ID format");
    }

    const projectDoc = await ProjectModel.findById(projectId);
    if (!projectDoc) {
      throw new NotFoundException("Project not found");
    }

    const isAllowed = await this.canUserAdministerProject(userId, projectDoc);
    if (!isAllowed) {
      throw new ForbiddenException(
        "Only project_lead or group admin can delete this project"
      );
    }

    await TaskModel.deleteMany({ projectId: projectDoc._id });
    await ProjectModel.findByIdAndDelete(projectId);

    return true;
  }

  async addOrUpdateMember(
    actorId,
    projectId,
    { userId, role = "contributor" }
  ) {
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      throw new ValidationException("Invalid project ID format");
    }
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new ValidationException("Valid userId is required");
    }
    if (!VALID_PROJECT_ROLES.includes(role)) {
      throw new ValidationException(
        `Invalid project role: must be one of ${VALID_PROJECT_ROLES.join(", ")}`
      );
    }

    const projectDoc = await ProjectModel.findById(projectId);
    if (!projectDoc) {
      throw new NotFoundException("Project not found");
    }

    const isAllowed = await this.canUserAdministerProject(actorId, projectDoc);
    if (!isAllowed) {
      throw new ForbiddenException(
        "Only project_lead or group admin can manage project members"
      );
    }

    const groupDoc = await GroupModel.findById(projectDoc.groupId);
    if (!groupDoc) {
      throw new NotFoundException("Parent group not found");
    }

    const groupEntity = new Group({
      id: groupDoc._id,
      name: groupDoc.name,
      ownerId: groupDoc.ownerId,
      members: groupDoc.members,
    });

    if (!groupEntity.isMember(userId)) {
      throw new ValidationException(
        "User must be a member of the parent group before joining the project"
      );
    }

    const existingIdx = projectDoc.members.findIndex(
      (m) => m.userId.toString() === userId.toString()
    );

    if (existingIdx >= 0) {
      projectDoc.members[existingIdx].role = role;
    } else {
      projectDoc.members.push({ userId, role });
    }

    await projectDoc.save();
    return projectDoc.toJSON();
  }

  async removeMember(actorId, projectId, targetUserId) {
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      throw new ValidationException("Invalid project ID format");
    }
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      throw new ValidationException("Invalid target userId format");
    }

    const projectDoc = await ProjectModel.findById(projectId);
    if (!projectDoc) {
      throw new NotFoundException("Project not found");
    }

    const isAllowed = await this.canUserAdministerProject(actorId, projectDoc);
    if (!isAllowed) {
      throw new ForbiddenException(
        "Only project_lead or group admin can remove project members"
      );
    }

    projectDoc.members = projectDoc.members.filter(
      (m) => m.userId.toString() !== targetUserId.toString()
    );

    await projectDoc.save();
    return projectDoc.toJSON();
  }
}

module.exports = new ProjectUseCases();
