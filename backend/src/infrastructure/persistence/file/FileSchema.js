"use strict";

const mongoose = require("mongoose");
const { Schema } = mongoose;

const fileSchema = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    filename: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    fileUrl: {
      type: String,
      required: true,
      trim: true,
    },
    fileSize: {
      type: Number,
      required: true,
      min: 0,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: "files",
    toJSON: {
      transform: function (doc, ret) {
        ret.id = ret._id.toString();
        if (ret.projectId) ret.projectId = ret.projectId.toString();
        if (ret.uploadedBy) ret.uploadedBy = ret.uploadedBy.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

module.exports = mongoose.models.File || mongoose.model("File", fileSchema);
