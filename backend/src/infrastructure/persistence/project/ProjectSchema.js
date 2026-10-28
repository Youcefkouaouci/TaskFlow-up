"use strict";

const mongoose = require("mongoose");
const { Schema } = mongoose;

const projectMemberSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["project_lead", "contributor", "viewer"],
      default: "contributor",
      required: true,
    },
  },
  { _id: false }
);

const projectSchema = new Schema(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },
    members: {
      type: [projectMemberSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: "projects",
    toJSON: {
      transform: function (doc, ret) {
        ret.id = ret._id.toString();
        if (ret.groupId) ret.groupId = ret.groupId.toString();
        if (Array.isArray(ret.members)) {
          ret.members = ret.members.map((m) => ({
            userId: m.userId ? m.userId.toString() : null,
            role: m.role,
          }));
        }
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

projectSchema.index({ "members.userId": 1 });

module.exports =
  mongoose.models.Project || mongoose.model("Project", projectSchema);
