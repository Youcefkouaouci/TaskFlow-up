"use strict";

const projectUseCases = require("../../../application/project/ProjectUseCases");
const taskUseCases = require("../../../application/task/TaskUseCases");

async function list(req, res, next) {
  try {
    const projects = await projectUseCases.listUserProjects(req.user.id);
    return res.status(200).json(projects);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const project = await projectUseCases.getProjectById(
      req.user.id,
      req.params.projectId
    );
    return res.status(200).json(project);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const project = await projectUseCases.updateProject(
      req.user.id,
      req.params.projectId,
      req.body
    );
    return res.status(200).json(project);
  } catch (err) {
    next(err);
  }
}

async function deleteProject(req, res, next) {
  try {
    await projectUseCases.deleteProject(req.user.id, req.params.projectId);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function addOrUpdateMember(req, res, next) {
  try {
    const project = await projectUseCases.addOrUpdateMember(
      req.user.id,
      req.params.projectId,
      req.body
    );
    return res.status(200).json(project);
  } catch (err) {
    next(err);
  }
}

async function removeMember(req, res, next) {
  try {
    const project = await projectUseCases.removeMember(
      req.user.id,
      req.params.projectId,
      req.params.userId
    );
    return res.status(200).json(project);
  } catch (err) {
    next(err);
  }
}

async function listTasks(req, res, next) {
  try {
    const tasks = await taskUseCases.listTasksByProject(
      req.user.id,
      req.params.projectId,
      req.query
    );
    return res.status(200).json(tasks);
  } catch (err) {
    next(err);
  }
}

async function createTask(req, res, next) {
  try {
    const task = await taskUseCases.createTaskInProject(
      req.user.id,
      req.params.projectId,
      req.body
    );
    return res.status(201).json(task);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  getById,
  update,
  deleteProject,
  addOrUpdateMember,
  removeMember,
  listTasks,
  createTask,
};
