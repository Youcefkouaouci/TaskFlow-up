"use strict";

const invitationUseCases = require("../../../application/invitation/InvitationUseCases");

async function getByToken(req, res, next) {
  try {
    const invitation = await invitationUseCases.getInvitationByToken(
      req.params.token
    );
    return res.status(200).json(invitation);
  } catch (err) {
    next(err);
  }
}

async function accept(req, res, next) {
  try {
    const result = await invitationUseCases.acceptInvitation(
      req.user.id,
      req.params.token
    );
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getByToken,
  accept,
};
