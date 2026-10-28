
"use strict";

const mongoose = require("mongoose");
const Task = require("../../../infrastructure/persistence/task/TaskSchema");
const { validateTask } = require("../../../domain/task/validateTask");
const {
  ValidationException,
  NotFoundException,
} = require("../../../domain/errors");

const ALLOWED_FIELDS = [
  "title",
  "description",
  "urgent",
  "important",
  "status",
];

async function listTasks(request, response, next) {
  try {
    const tasks = await Task.find({ ownerId: request.user.id });
    return response.status(200).json(tasks);
  } catch (error) {
    return next(error);
  }
}

async function getTask(request, response, next) {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) {
      throw new ValidationException("Identifiant de tâche invalide");
    }

    const task = await Task.findOne({
      _id: request.params.id,
      ownerId: request.user.id,
    });

    if (!task) {
      throw new NotFoundException("Tâche introuvable");
    }

    return response.status(200).json(task);
  } catch (error) {
    return next(error);
  }
}

async function createTask(request, response, next) {
  try {
    const data = request.body;

    if (
      !data ||
      typeof data !== "object" ||
      Array.isArray(data) ||
      Object.keys(data).some((key) => !ALLOWED_FIELDS.includes(key))
    ) {
      throw new ValidationException("Champs de tâche invalides");
    }

    const errors = validateTask(data);
    if (errors.length > 0) {
      throw new ValidationException(errors.join(" "));
    }

    if (typeof data.urgent !== "boolean" ||
        typeof data.important !== "boolean") {
      throw new ValidationException(
        "Les champs urgent et important doivent être des booléens",
      );
    }

    const task = await Task.create({
      title: data.title.trim(),
      description: data.description ?? "",
      urgent: data.urgent,
      important: data.important,
      status: data.status,
      ownerId: request.user.id,
    });

    return response.status(201).json(task);
  } catch (error) {
    return next(error);
  }
}

async function updateTask(request, response, next) {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) {
      throw new ValidationException("Identifiant de tâche invalide");
    }

    const data = request.body;

    if (
      !data ||
      typeof data !== "object" ||
      Array.isArray(data) ||
      Object.keys(data).length === 0 ||
      Object.keys(data).some((key) => !ALLOWED_FIELDS.includes(key))
    ) {
      throw new ValidationException("Modification de tâche invalide");
    }

    const task = await Task.findOne({
      _id: request.params.id,
      ownerId: request.user.id,
    });

    if (!task) {
      throw new NotFoundException("Tâche introuvable");
    }

    const updatedData = {
      title: data.title ?? task.title,
      description: data.description ?? task.description,
      urgent: data.urgent ?? task.urgent,
      important: data.important ?? task.important,
      status: data.status ?? task.status,
    };

    if (
      data.description === null ||
      data.urgent === null ||
      data.important === null ||
      data.status === null ||
      data.title === null
    ) {
      throw new ValidationException("Valeur de modification invalide");
    }

    const errors = validateTask(updatedData);
    if (errors.length > 0) {
      throw new ValidationException(errors.join(" "));
    }

    if (
      typeof updatedData.urgent !== "boolean" ||
      typeof updatedData.important !== "boolean"
    ) {
      throw new ValidationException(
        "Les champs urgent et important doivent être des booléens",
      );
    }

    Object.assign(task, updatedData);
    await task.save();

    return response.status(200).json(task);
  } catch (error) {
    return next(error);
  }
}

async function deleteTask(request, response, next) {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) {
      throw new ValidationException("Identifiant de tâche invalide");
    }

    const task = await Task.findOneAndDelete({
      _id: request.params.id,
      ownerId: request.user.id,
    });

    if (!task) {
      throw new NotFoundException("Tâche introuvable");
    }

    return response.status(204).send();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
};
