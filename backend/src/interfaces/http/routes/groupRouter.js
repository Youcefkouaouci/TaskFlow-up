"use strict";

const { Router } = require("express");
const authenticate = require("../middlewares/authenticate");
const groupController = require("../controllers/groupController");

const router = Router();

router.use(authenticate);

router.post("/", groupController.create);
router.get("/", groupController.list);
router.get("/:groupId", groupController.getById);
router.patch("/:groupId", groupController.update);
router.delete("/:groupId", groupController.deleteGroup);

router.post("/:groupId/members", groupController.addOrUpdateMember);
router.patch("/:groupId/members/:userId", groupController.updateMemberRole);
router.delete("/:groupId/members/:userId", groupController.removeMember);

router.post("/:groupId/projects", groupController.createProject);
router.get("/:groupId/projects", groupController.listProjects);

router.post("/:groupId/invitations", groupController.createInvitation);
router.get("/:groupId/invitations", groupController.listInvitations);
router.delete(
  "/:groupId/invitations/:invitationId",
  groupController.revokeInvitation
);

module.exports = router;
