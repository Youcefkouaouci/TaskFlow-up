"use strict";

const taskUseCases = require("../../../application/task/TaskUseCases");
const emailService = require("../../../infrastructure/email/EmailService");
const { ValidationException } = require("../../../domain/errors");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function create(req, res, next) {
  try {
    const ownerId = req.user.id;
    const task = await taskUseCases.createTask(ownerId, req.body);
    return res.status(201).json(task);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const ownerId = req.user.id;
    const tasks = await taskUseCases.listTasks(ownerId, req.query);
    return res.status(200).json(tasks);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const ownerId = req.user.id;
    const task = await taskUseCases.getTaskById(ownerId, req.params.id);
    return res.status(200).json(task);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const ownerId = req.user.id;
    const task = await taskUseCases.updateTask(ownerId, req.params.id, req.body);
    return res.status(200).json(task);
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const ownerId = req.user.id;
    const task = await taskUseCases.updateTask(ownerId, req.params.id, req.body);
    return res.status(200).json(task);
  } catch (err) {
    next(err);
  }
}

async function deleteTask(req, res, next) {
  try {
    const ownerId = req.user.id;
    await taskUseCases.deleteTask(ownerId, req.params.id);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function share(req, res, next) {
  try {
    const email = req.body?.email;

    if (!email || typeof email !== "string" || !email.trim()) {
      throw new ValidationException("email is required");
    }
    if (!EMAIL_RE.test(email.trim())) {
      throw new ValidationException("email format is invalid");
    }

    const ownerId = req.user.id;
    const task = await taskUseCases.getTaskById(ownerId, req.params.id);
    await emailService.sendTaskShareEmail({ to: email.trim(), task });

    return res.status(200).json({ shared: true, to: email.trim() });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  create,
  list,
  getById,
  update,
  updateStatus,
  deleteTask,
  share,
};
