"use strict";

const mongoose = require("mongoose");
const ActivityModel = require("../../infrastructure/persistence/activity/ActivitySchema");
const UserModel = require("../../infrastructure/persistence/user/UserSchema");
const ProjectModel = require("../../infrastructure/persistence/project/ProjectSchema");
const GroupModel = require("../../infrastructure/persistence/group/GroupSchema");
const { Project } = require("../../domain/project/Project");
const { Group } = require("../../domain/group/Group");
const {
  ValidationException,
  ForbiddenException,
  NotFoundException,
} = require("../../domain/errors");
const { emitToProject } = require("../../infrastructure/websocket/socketServer");

class ActivityUseCases {
  async recordActivity({
    projectId,
    actorId,
    action,
    description,
    metadata = {},
  }) {
    try {
      if (!projectId || !actorId || !action || !description) return null;

      const userDoc = await UserModel.findById(actorId).select("name email");
      const actorName = userDoc
        ? userDoc.name || userDoc.email.split("@")[0]
        : "Membre";

      const created = await ActivityModel.create({
        projectId,
        actorId,
        actorName,
        action,
        description,
        metadata,
      });

      const json = created.toJSON();
      emitToProject(projectId, "project:activity_created", json);
      return json;
    } catch {
      return null;
    }
  }

  async listProjectActivities(userId, projectId, limit = 50) {
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

    const items = await ActivityModel.find({ projectId })
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit) || 50, 100));

    return items.map((doc) => doc.toJSON());
  }
}

module.exports = new ActivityUseCases();
