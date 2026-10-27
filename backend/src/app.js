const express = require("express");

const app = express();

app.use(express.json());

// Vérifie que l'API fonctionne
app.get("/api/health", (_request, response) => {
  response.status(200).json({ status: "ok" });
});

module.exports = app;
