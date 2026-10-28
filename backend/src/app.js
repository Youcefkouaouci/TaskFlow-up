"use strict";

const path = require("path");
const cors = require("cors");
const express = require("express");

const healthRouter = require("./interfaces/http/routes/healthRouter");
const authRoutes = require("./interfaces/http/routes/auth");
const groupRouter = require("./interfaces/http/routes/groupRouter");
const projectRouter = require("./interfaces/http/routes/projectRouter");
const invitationRouter = require("./interfaces/http/routes/invitationRouter");
const taskRouter = require("./interfaces/http/routes/taskRouter");
const errorHandler = require("./interfaces/http/middlewares/errorHandler");

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:5173" }));
app.use(express.json({ limit: "15mb" }));

app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

app.use("/api", healthRouter);
app.use("/api/auth", authRoutes);
app.use("/api/groups", groupRouter);
app.use("/api/projects", projectRouter);
app.use("/api/invitations", invitationRouter);
app.use("/api/tasks", taskRouter);

app.use(errorHandler);

module.exports = app;
