"use strict";

const cors = require("cors");
const express = require("express");
const healthRouter = require("./interfaces/http/routes/healthRouter");
const authRoutes = require("./interfaces/http/routes/auth");
const errorHandler = require("./interfaces/http/middlewares/errorHandler");

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:5173" }));
app.use(express.json());

app.use("/api", healthRouter);
app.use("/api/auth", authRoutes);

app.use(errorHandler);

module.exports = app;
