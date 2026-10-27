"use strict";

module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  globalSetup: "./tests/setup/globalSetup.js",
  globalTeardown: "./tests/setup/globalTeardown.js",
};
