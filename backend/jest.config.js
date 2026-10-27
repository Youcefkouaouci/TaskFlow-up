"use strict";

module.exports = {
  testEnvironment: "node",
  testTimeout: 30000,
  testMatch: ["**/tests/**/*.test.js"],
  // Node.js 24 + Jest: le driver mongodb ne peut pas lire son package.json
  // via le système de modules de Jest. On force l'accès direct au filesystem.
  setupFiles: ["./tests/setup/jestSetup.js"],
};
