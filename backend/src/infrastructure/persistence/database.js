"use strict";

const mongoose = require("mongoose");
const models = require("./models");

async function connectDatabase(uri) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });

  // S'assurer que les 7 collections et leurs index sont initialisés dans MongoDB
  await Promise.all(
    Object.values(models).map(async (model) => {
      await model.createCollection();
      await model.syncIndexes();
    })
  );

  console.log("MongoDB connecté (7 collections initialisées)");
}

async function disconnectDatabase() {
  await mongoose.disconnect();
}

module.exports = { connectDatabase, disconnectDatabase, models };
