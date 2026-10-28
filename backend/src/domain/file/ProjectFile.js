"use strict";

const { ValidationException } = require("../errors");

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

class ProjectFile {
  constructor({
    id = null,
    projectId,
    uploadedBy,
    filename,
    fileUrl,
    fileSize,
    mimeType,
    createdAt,
    updatedAt,
  }) {
    if (!projectId) {
      throw new ValidationException("File projectId is required");
    }
    if (!uploadedBy) {
      throw new ValidationException("File uploadedBy is required");
    }
    if (!filename || typeof filename !== "string" || !filename.trim()) {
      throw new ValidationException("File filename is required");
    }
    if (!fileUrl || typeof fileUrl !== "string" || !fileUrl.trim()) {
      throw new ValidationException("File fileUrl is required");
    }
    const size = Number(fileSize);
    if (Number.isNaN(size) || size < 0) {
      throw new ValidationException("File fileSize must be a positive number");
    }
    if (size > MAX_FILE_SIZE_BYTES) {
      throw new ValidationException("File size must not exceed 10 MB");
    }
    if (!mimeType || typeof mimeType !== "string" || !mimeType.trim()) {
      throw new ValidationException("File mimeType is required");
    }

    this.id = id ? id.toString() : null;
    this.projectId = projectId.toString();
    this.uploadedBy = uploadedBy.toString();
    this.filename = filename.trim();
    this.fileUrl = fileUrl.trim();
    this.fileSize = size;
    this.mimeType = mimeType.trim();
    this.createdAt = createdAt instanceof Date ? createdAt : new Date();
    this.updatedAt = updatedAt instanceof Date ? updatedAt : this.createdAt;
  }
}

module.exports = { ProjectFile, MAX_FILE_SIZE_BYTES };
