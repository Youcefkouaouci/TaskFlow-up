"use strict";

const mongoose = require("mongoose");
const { Schema } = mongoose;

const groupInvitationSchema = new Schema(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["admin", "member"],
      default: "member",
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "expired"],
      default: "pending",
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "group_invitations",
    toJSON: {
      transform: function (doc, ret) {
        ret.id = ret._id.toString();
        if (ret.groupId) ret.groupId = ret.groupId.toString();
        if (ret.invitedBy) ret.invitedBy = ret.invitedBy.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

module.exports =
  mongoose.models.GroupInvitation ||
  mongoose.model("GroupInvitation", groupInvitationSchema);
