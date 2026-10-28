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
      status: data.status ?? "todo",
      assignedTo,
      dueDate: data.dueDate,
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

    return created.toJSON();
  }

  async createTaskInProject(userId, projectId, data) {
    if (!data || typeof data !== "object") {
      throw new ValidationException("Invalid task payload");
    }
    return this.createTask(userId, { ...data, projectId });
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
      status: updates.status !== undefined ? updates.status : taskDoc.status,
      assignedTo:
        updates.assignedTo !== undefined
          ? updates.assignedTo
          : taskDoc.assignedTo,
      dueDate:
        updates.dueDate !== undefined ? updates.dueDate : taskDoc.dueDate,
      ownerId,
    };

    if (updates.completed !== undefined && updates.status === undefined) {
      merged.status = updates.completed
        ? "done"
        : taskDoc.status === "done"
        ? "todo"
        : taskDoc.status;
    }

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
