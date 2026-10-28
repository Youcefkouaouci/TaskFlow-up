"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");
const { ProjectFile } = require("../../domain/file/ProjectFile");
const {
  ValidationException,
  NotFoundException,
} = require("../../domain/errors");
const FileModel = require("../../infrastructure/persistence/file/FileSchema");
const UserModel = require("../../infrastructure/persistence/user/UserSchema");
const taskUseCases = require("../task/TaskUseCases");
const { emitToProject } = require("../../infrastructure/websocket/socketServer");

const UPLOADS_DIR = path.resolve(__dirname, "../../../uploads");

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

class FileUseCases {
  async listProjectFiles(userId, projectId) {
    await taskUseCases.verifyProjectAccess(userId, projectId, false);

    const files = await FileModel.find({ projectId }).sort({ createdAt: -1 });
    const uploaderIds = [
      ...new Set(files.map((f) => f.uploadedBy.toString())),
    ];
    const users = await UserModel.find({ _id: { $in: uploaderIds } });
    const userMap = new Map(
      users.map((u) => [
        u._id.toString(),
        { name: u.name || u.email.split("@")[0], email: u.email },
      ])
    );

    return files.map((f) => {
      const json = f.toJSON();
      const uploader = userMap.get(json.uploadedBy) || {
        name: "Membre",
        email: "",
      };
      return {
        ...json,
        uploaderName: uploader.name,
        uploaderEmail: uploader.email,
      };
    });
  }

  async uploadProjectFile(userId, projectId, data) {
    if (!data || typeof data !== "object") {
      throw new ValidationException("Invalid file payload");
    }

    // RBAC : Seuls project_lead, contributor ou owner/admin du groupe peuvent déposer des fichiers
    await taskUseCases.verifyProjectAccess(userId, projectId, true);

    let fileUrl = data.fileUrl;
    let computedSize = Number(data.fileSize ?? 0);

    if (data.contentBase64 && typeof data.contentBase64 === "string") {
      ensureUploadsDir();
      const cleanBase64 = data.contentBase64.replace(
        /^data:[^;]+;base64,/,
        ""
      );
      const buffer = Buffer.from(cleanBase64, "base64");
      computedSize = buffer.length;
      const safeExt = path
        .extname(data.filename || "")
        .replace(/[^a-zA-Z0-9.]/g, "");
      const storedFilename = `${Date.now()}-${crypto
        .randomBytes(8)
        .toString("hex")}${safeExt}`;
      const fullPath = path.join(UPLOADS_DIR, storedFilename);
      fs.writeFileSync(fullPath, buffer);
      fileUrl = `/uploads/${storedFilename}`;
    }

    const fileEntity = new ProjectFile({
      projectId,
      uploadedBy: userId,
      filename: data.filename,
      fileUrl: fileUrl || `/uploads/${Date.now()}-${data.filename || "file"}`,
      fileSize: computedSize,
      mimeType: data.mimeType || "application/octet-stream",
    });

    const created = await FileModel.create({
      projectId: fileEntity.projectId,
      uploadedBy: fileEntity.uploadedBy,
      filename: fileEntity.filename,
      fileUrl: fileEntity.fileUrl,
      fileSize: fileEntity.fileSize,
      mimeType: fileEntity.mimeType,
    });

    const uploaderDoc = await UserModel.findById(userId);
    const enriched = {
      ...created.toJSON(),
      uploaderName: uploaderDoc
        ? uploaderDoc.name || uploaderDoc.email.split("@")[0]
        : "Membre",
      uploaderEmail: uploaderDoc ? uploaderDoc.email : "",
    };

    emitToProject(projectId, "project:file_uploaded", enriched);
    return enriched;
  }

  async deleteProjectFile(userId, projectId, fileId) {
    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      throw new ValidationException("Invalid file ID format");
    }

    await taskUseCases.verifyProjectAccess(userId, projectId, true);

    const deleted = await FileModel.findOneAndDelete({
      _id: fileId,
      projectId,
    });

    if (!deleted) {
      throw new NotFoundException("File not found");
    }

    if (deleted.fileUrl && deleted.fileUrl.startsWith("/uploads/")) {
      const localPath = path.join(
        UPLOADS_DIR,
        path.basename(deleted.fileUrl)
      );
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }
    }

    emitToProject(projectId, "project:file_deleted", { id: fileId });
    return true;
  }
}

module.exports = new FileUseCases();
