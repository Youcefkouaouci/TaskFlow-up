"use strict";

const VALID_STATUSES = ["todo", "doing", "done"];

const VALID_QUADRANTS = ["DO", "PLAN", "DELEGATE", "ELIMINATE"];

const STATUS_ALIASES = {
  doing: "in_progress",
  inprogress: "in_progress",
};

const VALID_QUADRANTS = ["DO", "PLAN", "DELEGATE", "ELIMINATE"];

const STATUS_ALIASES = {
  doing: "in_progress",
  inprogress: "in_progress",
};

const PRIORITY_MAP = {
  "true-true": "critical",
  "false-true": "schedule",
  "true-false": "delegate",
  "false-false": "eliminate",
};

const QUADRANT_MAP = {
  "true-true": "DO",
  "false-true": "PLAN",
  "true-false": "DELEGATE",
  "false-false": "ELIMINATE",
};

function normalizeStatus(status) {
  if (!status) return "todo";
  return STATUS_ALIASES[status] || status;
}

function calculateQuadrant(urgent, important) {
  return QUADRANT_MAP[`${Boolean(urgent)}-${Boolean(important)}`];
}

module.exports = {
  VALID_STATUSES,
  VALID_QUADRANTS,
  STATUS_ALIASES,
  PRIORITY_MAP,
  QUADRANT_MAP,
  normalizeStatus,
  calculateQuadrant,
};
