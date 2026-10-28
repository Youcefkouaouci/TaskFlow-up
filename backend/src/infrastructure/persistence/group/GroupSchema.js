"use strict";

const mongoose = require("mongoose");
const { Schema } = mongoose;

const groupMemberSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["owner", "admin", "member"],
      default: "member",
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const groupSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    members: {
      type: [groupMemberSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: "groups",
    toJSON: {
      transform: function (doc, ret) {
        ret.id = ret._id.toString();
        if (ret.ownerId) ret.ownerId = ret.ownerId.toString();
        if (Array.isArray(ret.members)) {
          ret.members = ret.members.map((m) => ({
            userId: m.userId ? m.userId.toString() : null,
            role: m.role,
            joinedAt: m.joinedAt,
          }));
        }
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

groupSchema.index({ "members.userId": 1 });

module.exports = mongoose.models.Group || mongoose.model("Group", groupSchema);
