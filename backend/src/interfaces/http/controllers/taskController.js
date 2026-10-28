"use strict";

const { Task } = require("../../../domain/task/Task");
const {
  ValidationException,
  NotFoundException,
} = require("../../../domain/errors");
const taskRepository = require("../../../infrastructure/persistence/task/TaskRepository");

const ALLOWED = new Set([
  "title",
  "description",
  "urgent",
  "important",
  "status",
  "dueDate",
]);

function assertNoForbiddenFields(body) {
  const unknown = Object.keys(body).filter((k) => !ALLOWED.has(k));
  if (unknown.length > 0) {
    throw new ValidationException(
      `Unknown or forbidden fields: ${unknown.join(", ")}`,
    );
  }
}

async function create(req, res, next) {
  try {
    const body = req.body ?? {};
    assertNoForbiddenFields(body);

    const task = new Task({
      title: body.title,
      description: body.description,
      urgent: body.urgent,
      important: body.important,
      status: body.status,
      dueDate: body.dueDate ?? null,
      ownerId: req.user.id,
    });

    const saved = await taskRepository.create({
      ...task,
      ownerId: req.user.id,
    });
    res.status(201).json(saved.toJSON());
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const tasks = await taskRepository.findByOwner(req.user.id);
    res.json({ items: tasks.map((t) => t.toJSON()) });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const task = await taskRepository.findById(req.params.id);
    if (task.ownerId !== req.user.id)
      throw new NotFoundException("Task not found");
    res.json(task.toJSON());
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const body = req.body ?? {};
    assertNoForbiddenFields(body);

    if (Object.keys(body).length === 0) {
      throw new ValidationException(
        "Request body must contain at least one field",
      );
    }

    const existing = await taskRepository.findById(req.params.id);
    if (existing.ownerId !== req.user.id)
      throw new NotFoundException("Task not found");

    // Re-validate full entity with merged values (domain invariant check)
    const merged = new Task({ ...existing.toJSON(), ...body });

    const updates = {};
    for (const key of Object.keys(body)) {
      updates[key] = merged[key];
    }

    const updated = await taskRepository.update(req.params.id, updates);
    res.json(updated.toJSON());
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const task = await taskRepository.findById(req.params.id);
    if (task.ownerId !== req.user.id)
      throw new NotFoundException("Task not found");
    await taskRepository.deleteById(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, getOne, update, remove };
