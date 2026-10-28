"use strict";

const TaskModel = require("./TaskSchema");
const { Task } = require("../../../domain/task/Task");
const {
  ValidationException,
  NotFoundException,
} = require("../../../domain/errors");

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

function assertValidId(id) {
  if (!OBJECT_ID_RE.test(id)) {
    throw new ValidationException(`Malformed task id: ${id}`);
  }
}

function docToTask(doc) {
  return new Task({
    id: doc._id.toString(),
    title: doc.title,
    description: doc.description,
    urgent: doc.urgent,
    important: doc.important,
    status: doc.status,
    dueDate: doc.dueDate ?? null,
    ownerId: doc.ownerId ? doc.ownerId.toString() : null,
    createdAt: doc.createdAt,
  });
}

class TaskRepository {
  async create({
    title,
    description,
    urgent,
    important,
    status,
    dueDate,
    ownerId,
  }) {
    const doc = await TaskModel.create({
      title,
      description,
      urgent,
      important,
      status,
      dueDate,
      ownerId,
    });
    return docToTask(doc);
  }

  async findByOwner(ownerId) {
    const docs = await TaskModel.find({ ownerId }).sort({ createdAt: -1 });
    return docs.map(docToTask);
  }

  async findById(id) {
    assertValidId(id);
    const doc = await TaskModel.findById(id);
    if (!doc) throw new NotFoundException("Task not found");
    return docToTask(doc);
  }

  async update(id, updates) {
    assertValidId(id);
    const doc = await TaskModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { returnDocument: "after" },
    );
    if (!doc) throw new NotFoundException("Task not found");
    return docToTask(doc);
  }

  async deleteById(id) {
    assertValidId(id);
    const doc = await TaskModel.findByIdAndDelete(id);
    if (!doc) throw new NotFoundException("Task not found");
  }
}

module.exports = new TaskRepository();
