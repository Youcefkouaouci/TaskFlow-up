// Variables d'environnement partagées par toutes les suites de test.
// Forcer NODE_ENV="test" même dans le conteneur Docker où NODE_ENV="development" est défini.
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
process.env.MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/taskflow_test";
if (!process.env.MONGO_URI_TEST) {
  process.env.MONGO_URI_TEST = process.env.MONGO_URI.includes("/taskflow?")
    ? process.env.MONGO_URI.replace("/taskflow?", "/taskflow_test?")
    : process.env.MONGO_URI.endsWith("/taskflow")
    ? `${process.env.MONGO_URI}_test`
    : "mongodb://localhost:27017/taskflow_test";
}
process.env.BCRYPT_ROUNDS = "4"; // 12 rounds en prod, 4 en test (~256x plus rapide)

const path = require("path");

// Fix Node.js 24 + Jest 30 + mongodb driver v7 :
// runtime_adapters.js utilise import('os') dynamique (ESM) qui échoue
// silencieusement dans le contexte VM CommonJS de Jest → makeClientMetadata
// retourne {} → MongoDB 8.0 rejette la connexion ("Missing required sub-document 'driver'").
// Solution : remplacer resolveRuntimeAdapters par une version synchrone.
const runtimeAdapters = require(
  path.resolve(__dirname, "../../node_modules/mongodb/lib/runtime_adapters"),
);

runtimeAdapters.resolveRuntimeAdapters = async (options) => ({
  os: options.runtimeAdapters?.os ?? require("os"),
});
