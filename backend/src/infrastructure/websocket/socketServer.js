"use strict";

const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const env = require("../config/env");

let ioInstance = null;

function initSocketServer(httpServer) {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
      methods: ["GET", "POST"],
    },
  });

  ioInstance.use((socket, next) => {
    const token =
      socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next();
    }
    try {
      const payload = jwt.verify(token, env.jwtSecret);
      socket.userId = payload.sub;
    } catch {
      // Connexion anonyme tolérée mais sans userId
    }
    return next();
  });

  ioInstance.on("connection", (socket) => {
    socket.on("project:join", (projectId) => {
      if (projectId) {
        socket.join(`project:${projectId}`);
      }
    });

    socket.on("project:leave", (projectId) => {
      if (projectId) {
        socket.leave(`project:${projectId}`);
      }
    });
  });

  return ioInstance;
}

function emitToProject(projectId, event, payload) {
  if (ioInstance && projectId) {
    ioInstance.to(`project:${projectId.toString()}`).emit(event, payload);
  }
}

module.exports = {
  initSocketServer,
  emitToProject,
};
