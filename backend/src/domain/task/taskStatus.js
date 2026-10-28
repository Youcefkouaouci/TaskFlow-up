"use strict";

const VALID_STATUSES = ["todo", "doing", "done"];

const PRIORITY_MAP = {
  "true-true": "critical",
  "false-true": "schedule",
  "true-false": "delegate",
  "false-false": "eliminate",
};

module.exports = { VALID_STATUSES, PRIORITY_MAP };
