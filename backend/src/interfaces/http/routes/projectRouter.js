"use strict";

const { Router } = require("express");
const authenticate = require("../middlewares/authenticate");
const projectController = require("../controllers/projectController");

const router = Router();

router.use(authenticate);

router.get("/", projectController.list);
router.get("/:projectId", projectController.getById);
router.patch("/:projectId", projectController.update);
router.delete("/:projectId", projectController.deleteProject);

router.post("/:projectId/members", projectController.addOrUpdateMember);
router.patch("/:projectId/members/:userId", projectController.updateMemberRole);
router.delete("/:projectId/members/:userId", projectController.removeMember);

router.get("/:projectId/tasks", projectController.listTasks);
router.post("/:projectId/tasks", projectController.createTask);
router.patch("/:projectId/tasks/:taskId", projectController.updateTask);
router.delete("/:projectId/tasks/:taskId", projectController.deleteTask);

router.get("/:projectId/messages", projectController.listMessages);
router.post("/:projectId/messages", projectController.sendMessage);

router.get("/:projectId/files", projectController.listFiles);
router.post("/:projectId/files", projectController.uploadFile);
router.delete("/:projectId/files/:fileId", projectController.deleteFile);

router.get("/:projectId/activities", projectController.listActivities);

module.exports = router;
