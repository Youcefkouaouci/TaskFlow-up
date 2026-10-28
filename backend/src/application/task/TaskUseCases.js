"use strict";

const mongoose = require("mongoose");
const { Task, VALID_QUADRANTS } = require("../../domain/task/Task");
const { Project } = require("../../domain/project/Project");
const { Group } = require("../../domain/group/Group");
const { normalizeStatus } = require("../../domain/task/taskStatus");
const {
  ValidationException,
  ForbiddenException,
  NotFoundException,
} = require("../../domain/errors");
const TaskModel = require("../../infrastructure/persistence/task/TaskSchema");
const GroupModel = require("../../infrastructure/persistence/group/GroupSchema");
const ProjectModel = require("../../infrastructure/persistence/project/ProjectSchema");
const { emitToProject } = require("../../infrastructure/websocket/socketServer");
const activityUseCases = require("../activity/ActivityUseCases");
const notificationUseCases = require("../notification/NotificationUseCases");

const QUADRANT_LABELS_FR = {
  DO: "Faire (Q1)",
  PLAN: "Planifier (Q2)",
  DELEGATE: "Déléguer (Q3)",
  ELIMINATE: "Éliminer (Q4)",
};

const STATUS_LABELS_FR = {
  todo: "À faire",
  doing: "En cours",
  in_progress: "En cours",
  done: "Terminé",
};

const ALLOWED_UPDATE_FIELDS = [
  "title",
  "description",
  "urgent",
  "important",
  "status",
  "dueDate",
  "assignedTo",
  "projectId",
  "completed",
];

function toDomainStatus(status) {
  if (!status) return "todo";
  if (status === "in_progress" || status === "inprogress") return "doing";
  return status;
}

function toDomainDueDate(dueDate) {
  if (!dueDate) return null;
  if (dueDate instanceof Date) {
    return dueDate.toISOString().slice(0, 10);
  }
  if (typeof dueDate === "string" && dueDate.includes("T")) {
    return dueDate.slice(0, 10);
  }
  return dueDate;
}

class TaskUseCases {
  async ensureDefaultProject(ownerId) {
    let project = await ProjectModel.findOne({ "members.userId": ownerId });
    if (project) return project._id;

    let group = await GroupModel.findOne({ ownerId });
    if (!group) {
      group = await GroupModel.create({
        name: "Espace Personnel",
        ownerId,
        members: [{ userId: ownerId, role: "owner", joinedAt: new Date() }],
      });
    }

    project = await ProjectModel.create({
      groupId: group._id,
      name: "Projet Général",
      description: "Projet par défaut",
      members: [{ userId: ownerId, role: "project_lead" }],
    });

    return project._id;
  }

  async verifyProjectAccess(userId, projectId, requireWrite = false) {
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

    if (requireWrite) {
      if (!projectEntity.canWriteTasks(userId) && !isGroupAdmin) {
        throw new ForbiddenException(
          "Insufficient permissions to create or modify tasks in this project"
        );
      }
    } else {
      if (!projectEntity.canView(userId) && !isGroupAdmin) {
        throw new ForbiddenException("Access denied to this project");
      }
    }

    return projectDoc;
  }

  async createTask(ownerId, data) {
    if (!data || typeof data !== "object") {
      throw new ValidationException("Invalid task payload");
    }

    if (
      data.id !== undefined ||
      data._id !== undefined ||
      data.ownerId !== undefined
    ) {
      throw new ValidationException("Client cannot provide id or ownerId");
    }

    let projectId = data.projectId;
    if (projectId !== undefined && projectId !== null) {
      await this.verifyProjectAccess(ownerId, projectId, true);
    } else {
      projectId = await this.ensureDefaultProject(ownerId);
    }

    const assignedTo = Array.isArray(data.assignedTo) ? data.assignedTo : [];
    for (const userId of assignedTo) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ValidationException("Invalid userId in assignedTo");
      }
    }

    const taskEntity = new Task({
      projectId,
      title: data.title,
      description: data.description ?? "",
      urgent: data.urgent,
      important: data.important,
      status: toDomainStatus(data.status ?? "todo"),
      assignedTo,
      dueDate: toDomainDueDate(data.dueDate),
      ownerId,
    });

    const created = await TaskModel.create({
      projectId: taskEntity.projectId,
      title: taskEntity.title,
      description: taskEntity.description,
      urgent: taskEntity.urgent,
      important: taskEntity.important,
      quadrant: taskEntity.quadrant,
      status: taskEntity.status,
      assignedTo: taskEntity.assignedTo,
      dueDate: taskEntity.dueDate,
      ownerId,
    });

    const json = created.toJSON();
    emitToProject(projectId, "project:task_created", json);
    await activityUseCases.recordActivity({
      projectId,
      actorId: ownerId,
      action: "task_created",
      description: `a créé la tâche « ${json.title} » dans ${
        QUADRANT_LABELS_FR[json.quadrant] || json.quadrant
      }`,
      metadata: { taskId: json.id, title: json.title, quadrant: json.quadrant },
    });
    if (Array.isArray(json.assignedTo) && json.assignedTo.length > 0) {
      await notificationUseCases.notifyProjectMembers({
        projectId,
        actorId: ownerId,
        type: "task_assigned",
        title: "Nouvelle tâche assignée",
        message: `vous a assigné la tâche « ${json.title} »`,
        recipientIds: json.assignedTo,
      });
    }
    return json;
  }

  async createTaskInProject(userId, projectId, data) {
    if (!data || typeof data !== "object") {
      throw new ValidationException("Invalid task payload");
    }
    return this.createTask(userId, { ...data, projectId });
  }

  async updateTaskInProject(userId, projectId, taskId, updates) {
    await this.verifyProjectAccess(userId, projectId, true);
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      throw new ValidationException("Invalid task ID format");
    }

    const taskDoc = await TaskModel.findOne({ _id: taskId, projectId });
    if (!taskDoc) {
      throw new NotFoundException("Task not found in this project");
    }

    const previousQuadrant = taskDoc.quadrant;
    const previousStatus = taskDoc.status;
    const previousAssigned = (taskDoc.assignedTo || []).map((id) =>
      id.toString()
    );

    const rawStatus =
      updates.completed !== undefined && updates.status === undefined
        ? updates.completed
          ? "done"
          : taskDoc.status === "done"
          ? "todo"
          : taskDoc.status
        : updates.status !== undefined
        ? updates.status
        : taskDoc.status;

    const merged = {
      projectId: taskDoc.projectId,
      title: updates.title !== undefined ? updates.title : taskDoc.title,
      description:
        updates.description !== undefined
          ? updates.description
          : taskDoc.description,
      urgent: updates.urgent !== undefined ? updates.urgent : taskDoc.urgent,
      important:
        updates.important !== undefined ? updates.important : taskDoc.important,
      status: toDomainStatus(rawStatus),
      assignedTo:
        updates.assignedTo !== undefined
          ? updates.assignedTo
          : taskDoc.assignedTo,
      dueDate: toDomainDueDate(
        updates.dueDate !== undefined ? updates.dueDate : taskDoc.dueDate
      ),
      ownerId: taskDoc.ownerId,
    };

    const validatedEntity = new Task(merged);

    taskDoc.title = validatedEntity.title;
    taskDoc.description = validatedEntity.description;
    taskDoc.urgent = validatedEntity.urgent;
    taskDoc.important = validatedEntity.important;
    taskDoc.quadrant = validatedEntity.quadrant;
    taskDoc.status = validatedEntity.status;
    taskDoc.assignedTo = validatedEntity.assignedTo;
    taskDoc.dueDate = validatedEntity.dueDate;

    await taskDoc.save();
    const json = taskDoc.toJSON();
    emitToProject(projectId, "project:task_updated", json);

    if (previousQuadrant !== json.quadrant) {
      await activityUseCases.recordActivity({
        projectId,
        actorId: userId,
        action: "task_moved",
        description: `a déplacé la tâche « ${json.title} » vers « ${
          QUADRANT_LABELS_FR[json.quadrant] || json.quadrant
        } »`,
        metadata: {
          taskId: json.id,
          title: json.title,
          fromQuadrant: previousQuadrant,
          toQuadrant: json.quadrant,
        },
      });
    } else if (previousStatus !== json.status) {
      await activityUseCases.recordActivity({
        projectId,
        actorId: userId,
        action: "task_status_changed",
        description: `a passé la tâche « ${json.title} » à l'état « ${
          STATUS_LABELS_FR[json.status] || json.status
        } »`,
        metadata: {
          taskId: json.id,
          title: json.title,
          status: json.status,
        },
      });
    } else {
      await activityUseCases.recordActivity({
        projectId,
        actorId: userId,
        action: "task_updated",
        description: `a modifié les détails de la tâche « ${json.title} »`,
        metadata: { taskId: json.id, title: json.title },
      });
    }

    const newlyAssigned = (json.assignedTo || []).filter(
      (uid) => !previousAssigned.includes(uid.toString())
    );
    if (newlyAssigned.length > 0) {
      await notificationUseCases.notifyProjectMembers({
        projectId,
        actorId: userId,
        type: "task_assigned",
        title: "Tâche assignée",
        message: `vous a assigné la tâche « ${json.title} »`,
        recipientIds: newlyAssigned,
      });
    }

    return json;
  }

  async deleteTaskInProject(userId, projectId, taskId) {
    await this.verifyProjectAccess(userId, projectId, true);
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      throw new ValidationException("Invalid task ID format");
    }

    const deleted = await TaskModel.findOneAndDelete({ _id: taskId, projectId });
    if (!deleted) {
      throw new NotFoundException("Task not found in this project");
    }

    emitToProject(projectId, "project:task_deleted", { id: taskId });
    await activityUseCases.recordActivity({
      projectId,
      actorId: userId,
      action: "task_deleted",
      description: `a supprimé la tâche « ${deleted.title} »`,
      metadata: { taskId, title: deleted.title },
    });
    return true;
  }

  async listTasksByProject(userId, projectId, filters = {}) {
    await this.verifyProjectAccess(userId, projectId, false);

    const query = { projectId };
    if (filters.status) {
      query.status = normalizeStatus(filters.status);
    }
    if (filters.quadrant && VALID_QUADRANTS.includes(filters.quadrant)) {
      query.quadrant = filters.quadrant;
    }

    const tasks = await TaskModel.find(query).sort({ createdAt: -1 });
    return tasks.map((t) => t.toJSON());
  }

  async listTasks(ownerId, filters = {}) {
    const query = { ownerId };

    if (
      filters.projectId &&
      mongoose.Types.ObjectId.isValid(filters.projectId)
    ) {
      query.projectId = filters.projectId;
    }
    if (filters.status) {
      query.status = normalizeStatus(filters.status);
    }
    if (filters.quadrant && VALID_QUADRANTS.includes(filters.quadrant)) {
      query.quadrant = filters.quadrant;
    }

    const tasks = await TaskModel.find(query).sort({ createdAt: -1 });
    return tasks.map((t) => t.toJSON());
  }

  async getTaskById(ownerId, taskId) {
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      throw new ValidationException("Invalid task ID format");
    }

    const task = await TaskModel.findOne({ _id: taskId, ownerId });
    if (!task) {
      throw new NotFoundException("Task not found");
    }

    return task.toJSON();
  }

  async updateTask(ownerId, taskId, updates) {
    if (
      !updates ||
      typeof updates !== "object" ||
      Object.keys(updates).length === 0
    ) {
      throw new ValidationException("No update data provided");
    }

    if (
      updates.id !== undefined ||
      updates._id !== undefined ||
      updates.ownerId !== undefined
    ) {
      throw new ValidationException("Client cannot provide id or ownerId");
    }

    const keys = Object.keys(updates);
    const hasForbiddenKey = keys.some((k) => !ALLOWED_UPDATE_FIELDS.includes(k));
    if (hasForbiddenKey) {
      throw new ValidationException("Unknown field in update payload");
    }

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      throw new ValidationException("Invalid task ID format");
    }

    const taskDoc = await TaskModel.findOne({ _id: taskId, ownerId });
    if (!taskDoc) {
      throw new NotFoundException("Task not found");
    }

    const rawStatus =
      updates.completed !== undefined && updates.status === undefined
        ? updates.completed
          ? "done"
          : taskDoc.status === "done"
          ? "todo"
          : taskDoc.status
        : updates.status !== undefined
        ? updates.status
        : taskDoc.status;

    const merged = {
      projectId:
        updates.projectId !== undefined ? updates.projectId : taskDoc.projectId,
      title: updates.title !== undefined ? updates.title : taskDoc.title,
      description:
        updates.description !== undefined
          ? updates.description
          : taskDoc.description,
      urgent: updates.urgent !== undefined ? updates.urgent : taskDoc.urgent,
      important:
        updates.important !== undefined ? updates.important : taskDoc.important,
      status: toDomainStatus(rawStatus),
      assignedTo:
        updates.assignedTo !== undefined
          ? updates.assignedTo
          : taskDoc.assignedTo,
      dueDate: toDomainDueDate(
        updates.dueDate !== undefined ? updates.dueDate : taskDoc.dueDate
      ),
      ownerId,
    };

    const validatedEntity = new Task(merged);

    taskDoc.projectId = validatedEntity.projectId;
    taskDoc.title = validatedEntity.title;
    taskDoc.description = validatedEntity.description;
    taskDoc.urgent = validatedEntity.urgent;
    taskDoc.important = validatedEntity.important;
    taskDoc.quadrant = validatedEntity.quadrant;
    taskDoc.status = validatedEntity.status;
    taskDoc.assignedTo = validatedEntity.assignedTo;
    taskDoc.dueDate = validatedEntity.dueDate;

    await taskDoc.save();

    return taskDoc.toJSON();
  }

  async deleteTask(ownerId, taskId) {
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      throw new ValidationException("Invalid task ID format");
    }

    const deleted = await TaskModel.findOneAndDelete({ _id: taskId, ownerId });
    if (!deleted) {
      throw new NotFoundException("Task not found");
    }

    return true;
  }
}

module.exports = new TaskUseCases();
