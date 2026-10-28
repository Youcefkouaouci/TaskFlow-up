"use strict";

const groupUseCases = require("../../../application/group/GroupUseCases");
const projectUseCases = require("../../../application/project/ProjectUseCases");
const invitationUseCases = require("../../../application/invitation/InvitationUseCases");

async function create(req, res, next) {
  try {
    const group = await groupUseCases.createGroup(req.user.id, req.body);
    return res.status(201).json(group);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const groups = await groupUseCases.listUserGroups(req.user.id);
    return res.status(200).json(groups);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const group = await groupUseCases.getGroupById(
      req.user.id,
      req.params.groupId
    );
    return res.status(200).json(group);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const group = await groupUseCases.updateGroup(
      req.user.id,
      req.params.groupId,
      req.body
    );
    return res.status(200).json(group);
  } catch (err) {
    next(err);
  }
}

async function deleteGroup(req, res, next) {
  try {
    await groupUseCases.deleteGroup(req.user.id, req.params.groupId);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function addOrUpdateMember(req, res, next) {
  try {
    const group = await groupUseCases.addOrUpdateMember(
      req.user.id,
      req.params.groupId,
      req.body
    );
    return res.status(200).json(group);
  } catch (err) {
    next(err);
  }
}

async function removeMember(req, res, next) {
  try {
    const group = await groupUseCases.removeMember(
      req.user.id,
      req.params.groupId,
      req.params.userId
    );
    return res.status(200).json(group);
  } catch (err) {
    next(err);
  }
}

async function createProject(req, res, next) {
  try {
    const project = await projectUseCases.createProject(
      req.user.id,
      req.params.groupId,
      req.body
    );
    return res.status(201).json(project);
  } catch (err) {
    next(err);
  }
}

async function listProjects(req, res, next) {
  try {
    const projects = await projectUseCases.listProjectsByGroup(
      req.user.id,
      req.params.groupId
    );
    return res.status(200).json(projects);
  } catch (err) {
    next(err);
  }
}

async function createInvitation(req, res, next) {
  try {
    const invitation = await invitationUseCases.createInvitation(
      req.user.id,
      req.params.groupId,
      req.body
    );
    return res.status(201).json(invitation);
  } catch (err) {
    next(err);
  }
}

async function listInvitations(req, res, next) {
  try {
    const invitations = await invitationUseCases.listGroupInvitations(
      req.user.id,
      req.params.groupId
    );
    return res.status(200).json(invitations);
  } catch (err) {
    next(err);
  }
}

async function revokeInvitation(req, res, next) {
  try {
    await invitationUseCases.revokeInvitation(
      req.user.id,
      req.params.groupId,
      req.params.invitationId
    );
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  create,
  list,
  getById,
  update,
  deleteGroup,
  addOrUpdateMember,
  removeMember,
  createProject,
  listProjects,
  createInvitation,
  listInvitations,
  revokeInvitation,
};
