"use strict";

const express = require("express");
const authenticate = require("../middlewares/authenticate");
const taskController = require("../controllers/taskController");

const router = express.Router();

router.use(authenticate);

router.post("/", taskController.create);
router.get("/", taskController.list);
router.get("/:id", taskController.getById);
router.patch("/:id", taskController.update);
router.patch("/:id/status", taskController.updateStatus);
router.delete("/:id", taskController.deleteTask);
router.post("/:id/share", taskController.share);

module.exports = router;
