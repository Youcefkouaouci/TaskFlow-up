"use strict";

const VALID_STATUSES = ["todo", "in_progress", "done"];

const PRIORITY_MAP = {
  "true-true": "critical",
  "false-true": "schedule",
  "true-false": "delegate",
  "false-false": "eliminate",
};

module.exports = { VALID_STATUSES, PRIORITY_MAP };
