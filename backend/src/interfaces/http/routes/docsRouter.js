"use strict";

const { Router } = require("express");
const swaggerUi = require("swagger-ui-express");
const openapiSpec = require("../docs/openapiSpec");

const docsRouter = Router();

docsRouter.get("/openapi.json", (_req, res) => {
  res.status(200).json(openapiSpec);
});

docsRouter.use(
  "/",
  swaggerUi.serve,
  swaggerUi.setup(openapiSpec, {
    customSiteTitle: "TaskFlow — Documentation API (Swagger / OpenAPI 3.0)",
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: "list",
      filter: true,
    },
  })
);

module.exports = docsRouter;
