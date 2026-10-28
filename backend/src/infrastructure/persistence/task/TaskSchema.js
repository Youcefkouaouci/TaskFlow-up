"use strict";

const mongoose = require("mongoose");
const { Schema } = mongoose;
const {
  VALID_STATUSES,
  VALID_QUADRANTS,
  calculateQuadrant,
} = require("../../../domain/task/taskStatus");

const taskSchema = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      default: "",
      maxlength: 1000,
    },
    urgent: {
      type: Boolean,
      required: true,
    },
    important: {
      type: Boolean,
      required: true,
    },
    quadrant: {
      type: String,
      enum: VALID_QUADRANTS,
      required: true,
    },
    status: {
      type: String,
      enum: VALID_STATUSES,
      default: "todo",
    },
    assignedTo: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      default: [],
    },
    dueDate: {
      type: Date,
      default: null,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "tasks",
    toJSON: {
      transform: function (doc, ret) {
        ret.id = ret._id.toString();
        if (ret.projectId) ret.projectId = ret.projectId.toString();
        if (ret.ownerId) ret.ownerId = ret.ownerId.toString();
        if (Array.isArray(ret.assignedTo)) {
          ret.assignedTo = ret.assignedTo.map((id) => id.toString());
        }
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

taskSchema.pre("validate", function () {
  if (typeof this.urgent === "boolean" && typeof this.important === "boolean") {
    this.quadrant = calculateQuadrant(this.urgent, this.important);
  }
});

module.exports = mongoose.models.Task || mongoose.model("Task", taskSchema);
