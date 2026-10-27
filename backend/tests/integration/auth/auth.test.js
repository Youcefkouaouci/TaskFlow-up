const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../../../src/app");

// MONGO_URI_TEST permet de surcharger la DB depuis l'environnement CI
const TEST_MONGO_URI =
  process.env.MONGO_URI_TEST || "mongodb://localhost:27017/taskflow_test";

beforeAll(async () => {
  await mongoose.connect(TEST_MONGO_URI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

afterEach(async () => {
  const { collections } = mongoose.connection;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe("POST /api/auth/register", () => {
  it("201 - crée un utilisateur et retourne un token", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ email: "test@example.com", password: "password123" });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("token");
    expect(response.body).toHaveProperty("userId");
  });

  it("400 - email manquant", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ password: "password123" });

    expect(response.status).toBe(400);
  });

  it("400 - mot de passe manquant", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ email: "test@example.com" });

    expect(response.status).toBe(400);
  });

  it("409 - email déjà utilisé", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ email: "test@example.com", password: "password123" });

    const response = await request(app)
      .post("/api/auth/register")
      .send({ email: "test@example.com", password: "autre123" });

    expect(response.status).toBe(409);
  });

  it("409 - insensible à la casse", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ email: "Test@Example.com", password: "password123" });

    const response = await request(app)
      .post("/api/auth/register")
      .send({ email: "test@example.com", password: "autre123" });

    expect(response.status).toBe(409);
  });

  it("201 - le mot de passe n'est pas retourné dans la réponse", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ email: "secure@example.com", password: "password123" });

    expect(response.status).toBe(201);
    expect(response.body).not.toHaveProperty("password");
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ email: "user@example.com", password: "password123" });
  });

  it("200 - retourne un token avec les bons identifiants", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "user@example.com", password: "password123" });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("token");
  });

  it("400 - email manquant", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ password: "password123" });

    expect(response.status).toBe(400);
  });

  it("400 - mot de passe manquant", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "user@example.com" });

    expect(response.status).toBe(400);
  });

  it("401 - mauvais mot de passe", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "user@example.com", password: "wrong" });

    expect(response.status).toBe(401);
  });

  it("401 - utilisateur inexistant", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "password123" });

    expect(response.status).toBe(401);
  });

  it("200 - login insensible à la casse", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "USER@EXAMPLE.COM", password: "password123" });

    expect(response.status).toBe(200);
  });

  it("200 - le mot de passe n'est pas retourné dans la réponse", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "user@example.com", password: "password123" });

    expect(response.status).toBe(200);
    expect(response.body).not.toHaveProperty("password");
  });
});
