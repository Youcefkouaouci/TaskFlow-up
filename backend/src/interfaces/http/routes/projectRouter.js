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
router.delete("/:projectId/members/:userId", projectController.removeMember);

router.get("/:projectId/tasks", projectController.listTasks);
router.post("/:projectId/tasks", projectController.createTask);

module.exports = router;
