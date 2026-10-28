"use strict";

const { Task } = require("../../../domain/task/Task");
const taskRepository = require("../../../infrastructure/persistence/task/TaskRepository");
const {
  ValidationException,
  NotFoundException,
} = require("../../../domain/errors");

const ALLOWED = new Set([
  "title",
  "description",
  "urgent",
  "important",
  "status",
  "dueDate",
  "projectId",
  "context",
]);

function assertValidBody(body, allowEmpty = false) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ValidationException("Invalid task body");
  }

  if (!allowEmpty && Object.keys(body).length === 0) {
    throw new ValidationException("Request body must contain at least one field");
  }

  const unknown = Object.keys(body).filter((key) => !ALLOWED.has(key));
  if (unknown.length > 0) {
    throw new ValidationException(
      `Unknown or forbidden fields: ${unknown.join(", ")}`,
    );
  }
}

async function getOwnedTask(id, ownerId) {
  const task = await taskRepository.findById(id);

  if (task.ownerId !== ownerId) {
    throw new NotFoundException("Task not found");
  }

  return task;
}

async function create(req, res, next) {
  try {
    const body = req.body ?? {};
    assertValidBody(body, true);

    const task = new Task({
      projectId: body.projectId ?? null,
      title: body.title,
      description: body.description,
      urgent: body.urgent,
      important: body.important,
      status: body.status,
      dueDate: body.dueDate ?? null,
      context: body.context ?? "Entreprise",
      ownerId: req.user.id,
    });

    const saved = await taskRepository.create({
      projectId: task.projectId,
      title: task.title,
      description: task.description,
      urgent: task.urgent,
      important: task.important,
      status: task.status,
      dueDate: task.dueDate,
      context: task.context,
      ownerId: req.user.id,
    });

    return res.status(201).json(saved.toJSON());
  } catch (err) {
    return next(err);
  }
}

async function list(req, res, next) {
  try {
    const tasks = await taskRepository.findByOwner(req.user.id);
    return res.status(200).json({ items: tasks.map((task) => task.toJSON()) });
  } catch (err) {
    return next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const task = await getOwnedTask(req.params.id, req.user.id);
    return res.status(200).json(task.toJSON());
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const body = req.body ?? {};
    assertValidBody(body);

    const existing = await getOwnedTask(req.params.id, req.user.id);
    const merged = new Task({
      id: existing.id,
      projectId:
        body.projectId === undefined ? existing.projectId : body.projectId,
      title: body.title ?? existing.title,
      description: body.description ?? existing.description,
      urgent: body.urgent ?? existing.urgent,
      important: body.important ?? existing.important,
      status: body.status ?? existing.status,
      dueDate: body.dueDate === undefined ? existing.dueDate : body.dueDate,
      context: body.context ?? existing.context,
      ownerId: existing.ownerId,
      createdAt: existing.createdAt,
    });

    const updates = {};
    for (const key of Object.keys(body)) {
      updates[key] = merged[key];
    }

    const updated = await taskRepository.update(req.params.id, updates);
    return res.status(200).json(updated.toJSON());
  } catch (err) {
    return next(err);
  }
}

async function remove(req, res, next) {
  try {
    await getOwnedTask(req.params.id, req.user.id);
    await taskRepository.deleteById(req.params.id);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  create,
  list,
  getOne,
  getById: getOne,
  update,
  updateStatus: update,
  remove,
  deleteTask: remove,
};
