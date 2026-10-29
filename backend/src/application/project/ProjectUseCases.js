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
const UserModel = require("../../infrastructure/persistence/user/UserSchema");
const { emitToProject } = require("../../infrastructure/websocket/socketServer");
const activityUseCases = require("../activity/ActivityUseCases");
const notificationUseCases = require("../notification/NotificationUseCases");

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

    const groupDoc = await GroupModel.findById(projectDoc.groupId);
    const isGroupAdmin =
      groupDoc &&
      new Group({
        id: groupDoc._id,
        name: groupDoc.name,
        ownerId: groupDoc.ownerId,
        members: groupDoc.members,
      }).canManageGroup(userId);

    if (!projectEntity.canView(userId) && !isGroupAdmin) {
      throw new ForbiddenException("Access denied to this project");
    }

    const allUserIds = new Set();
    for (const m of projectDoc.members) {
      if (m.userId) allUserIds.add(m.userId.toString());
    }
    if (groupDoc && Array.isArray(groupDoc.members)) {
      for (const gm of groupDoc.members) {
        if (gm.userId) allUserIds.add(gm.userId.toString());
      }
    }

    const users = await UserModel.find({ _id: { $in: [...allUserIds] } });
    const userMap = new Map(
      users.map((u) => [
        u._id.toString(),
        { name: u.name || u.email.split("@")[0], email: u.email },
      ])
    );

    const json = projectDoc.toJSON();
    json.groupName = groupDoc ? groupDoc.name : null;
    json.myRole = projectEntity.getMemberRole(userId) || (isGroupAdmin ? "project_lead" : "viewer");
    json.members = json.members.map((m) => ({
      ...m,
      name: userMap.get(m.userId)?.name || "Membre",
      email: userMap.get(m.userId)?.email || "",
    }));
    json.groupMembers = groupDoc
      ? groupDoc.toJSON().members.map((gm) => ({
          ...gm,
          name: userMap.get(gm.userId)?.name || "Membre",
          email: userMap.get(gm.userId)?.email || "",
        }))
      : [];

    return json;
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

    emitToProject(projectId, "project:updated", {
      projectId,
      name: projectDoc.name,
      description: projectDoc.description,
    });
    await activityUseCases.recordActivity({
      projectId,
      actorId: userId,
      action: "project_updated",
      description: `a mis à jour les informations du projet « ${projectDoc.name} »`,
      metadata: { name: projectDoc.name },
    });

    return this.getProjectById(userId, projectId);
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
    { userId, email, role = "contributor" } = {}
  ) {
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      throw new ValidationException("Invalid project ID format");
    }

    let resolvedUserId = userId;
    if (!resolvedUserId && email && typeof email === "string") {
      const targetUser = await UserModel.findOne({
        email: email.trim().toLowerCase(),
      });
      if (!targetUser) {
        throw new NotFoundException("User with this email not found");
      }
      resolvedUserId = targetUser._id.toString();
    }

    if (!resolvedUserId || !mongoose.Types.ObjectId.isValid(resolvedUserId)) {
      throw new ValidationException("Valid userId or email is required");
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

    if (!groupEntity.isMember(resolvedUserId)) {
      if (email && groupEntity.canManageGroup(actorId)) {
        groupDoc.members.push({
          userId: resolvedUserId,
          role: "member",
          joinedAt: new Date(),
        });
        await groupDoc.save();
      } else {
        throw new ValidationException(
          "User must be a member of the parent group before joining the project"
        );
      }
    }

    const existingIdx = projectDoc.members.findIndex(
      (m) => m.userId.toString() === resolvedUserId.toString()
    );

    if (existingIdx >= 0) {
      const currentRole = projectDoc.members[existingIdx].role;
      if (currentRole === "project_lead" && role !== "project_lead") {
        const leadCount = projectDoc.members.filter(
          (m) => m.role === "project_lead"
        ).length;
        if (leadCount <= 1) {
          throw new ValidationException(
            "Cannot demote the last project_lead of the project"
          );
        }
      }
      projectDoc.members[existingIdx].role = role;
    } else {
      projectDoc.members.push({ userId: resolvedUserId, role });
    }

    await projectDoc.save();
    emitToProject(projectId, "project:members_updated", {
      projectId: projectDoc._id.toString(),
    });
    const targetUserDoc = await UserModel.findById(resolvedUserId).select(
      "name email"
    );
    const targetLabel = targetUserDoc
      ? targetUserDoc.name || targetUserDoc.email
      : "un membre";
    await activityUseCases.recordActivity({
      projectId,
      actorId,
      action: existingIdx >= 0 ? "member_role_updated" : "member_added",
      description:
        existingIdx >= 0
          ? `a changé le rôle de ${targetLabel} en « ${role} »`
          : `a ajouté ${targetLabel} au projet avec le rôle « ${role} »`,
      metadata: { targetUserId: resolvedUserId, role },
    });
    await notificationUseCases.notifyUser({
      recipientId: resolvedUserId,
      actorId,
      type: existingIdx >= 0 ? "member_role_updated" : "member_added",
      title:
        existingIdx >= 0
          ? "Rôle mis à jour dans un projet"
          : "Ajouté à un projet",
      message:
        existingIdx >= 0
          ? `a défini votre rôle sur « ${role} » dans le projet « ${projectDoc.name} »`
          : `vous a ajouté au projet « ${projectDoc.name} » (${role})`,
      projectId,
    });
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

    const targetMember = projectDoc.members.find(
      (m) => m.userId.toString() === targetUserId.toString()
    );
    if (targetMember && targetMember.role === "project_lead") {
      const leadCount = projectDoc.members.filter(
        (m) => m.role === "project_lead"
      ).length;
      if (leadCount <= 1) {
        throw new ValidationException(
          "Cannot remove the last project_lead of the project"
        );
      }
    }

    projectDoc.members = projectDoc.members.filter(
      (m) => m.userId.toString() !== targetUserId.toString()
    );

    await projectDoc.save();
    emitToProject(projectId, "project:members_updated", {
      projectId: projectDoc._id.toString(),
    });
    await activityUseCases.recordActivity({
      projectId,
      actorId,
      action: "member_removed",
      description: `a retiré un membre de l'équipe du projet`,
      metadata: { targetUserId },
    });
    return projectDoc.toJSON();
  }
}

module.exports = new ProjectUseCases();
