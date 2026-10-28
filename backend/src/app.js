"use strict";

const path = require("path");
const cors = require("cors");
const express = require("express");

const healthRouter = require("./interfaces/http/routes/healthRouter");
const docsRouter = require("./interfaces/http/routes/docsRouter");
const authRoutes = require("./interfaces/http/routes/auth");
const groupRouter = require("./interfaces/http/routes/groupRouter");
const projectRouter = require("./interfaces/http/routes/projectRouter");
const invitationRouter = require("./interfaces/http/routes/invitationRouter");
const notificationRouter = require("./interfaces/http/routes/notificationRouter");
const tasksRoutes = require("./interfaces/http/routes/tasks");
const errorHandler = require("./interfaces/http/middlewares/errorHandler");

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:5173" }));
app.use(express.json({ limit: "15mb" }));

app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

app.use("/api", healthRouter);
app.use("/api/docs", docsRouter);
app.use("/api/auth", authRoutes);
app.use("/api/groups", groupRouter);
app.use("/api/projects", projectRouter);
app.use("/api/invitations", invitationRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/tasks", tasksRoutes);

app.use(errorHandler);

module.exports = app;
