"use strict";

const request = require("supertest");
const app = require("../../src/app");

describe("GET /api/health", () => {
  it("renvoie 200 et le statut ok", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("expose la documentation interactive OpenAPI 3.0 sur /api/docs et /api/docs/openapi.json", async () => {
    const specRes = await request(app).get("/api/docs/openapi.json");
    expect(specRes.status).toBe(200);
    expect(specRes.body.openapi).toBe("3.0.3");
    expect(specRes.body.paths["/api/tasks"]).toBeDefined();
    expect(specRes.body.paths["/api/notifications"]).toBeDefined();

    const uiRes = await request(app).get("/api/docs/");
    expect(uiRes.status).toBe(200);
    expect(uiRes.text).toContain("swagger-ui");
    expect(uiRes.text).toContain("TaskFlow — Documentation API");
  });
});
