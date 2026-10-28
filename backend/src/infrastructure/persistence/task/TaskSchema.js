"use strict";

const { Schema, model } = require("mongoose");
const { VALID_STATUSES } = require("../../../domain/task/taskStatus");

const taskSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    urgent: { type: Boolean, required: true },
    important: { type: Boolean, required: true },
    status: {
      type: String,
      enum: VALID_STATUSES,
      default: "todo",
    },
    dueDate: { type: String, default: null },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

module.exports = model("Task", taskSchema);
