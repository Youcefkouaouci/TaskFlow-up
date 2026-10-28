"use strict";

const http = require("http");
const app = require("./app");
const env = require("./infrastructure/config/env");
const { connectDatabase } = require("./infrastructure/persistence/database");
const { initSocketServer } = require("./infrastructure/websocket/socketServer");

async function start() {
  try {
    await connectDatabase(env.mongoUri);
    const server = http.createServer(app);
    initSocketServer(server);
    server.listen(env.port, () =>
      console.log(`API & Socket.io sur http://localhost:${env.port}`),
    );
  } catch (error) {
    console.error("Démarrage impossible :", error.message);
    process.exit(1);
  }
}

start();
