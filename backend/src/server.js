const app = require("./app");
const env = require("./infrastructure/config/env");
const { connectDatabase } = require("./infrastructure/persistence/database");

async function start() {
  try {
    await connectDatabase(env.mongoUri);
    app.listen(env.port, () =>
      console.log(`API sur http://localhost:${env.port}`),
    );
  } catch (error) {
    console.error("Démarrage impossible :", error.message);
    process.exit(1);
  }
}

start();
