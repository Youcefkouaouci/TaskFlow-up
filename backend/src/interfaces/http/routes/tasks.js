"use strict";

const { Router } = require("express");
const authenticate = require("../middlewares/authenticate");
const {
  create,
  list,
  getOne,
  update,
  remove,
} = require("../controllers/taskController");

const router = Router();

router.use(authenticate);

router.post("/", create);
router.get("/", list);
router.get("/:id", getOne);
router.patch("/:id", update);
router.delete("/:id", remove);

module.exports = router;
