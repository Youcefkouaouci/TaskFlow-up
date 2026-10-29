"use strict";

const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../../src/app");

const TEST_MONGO_URI =
  process.env.MONGO_URI_TEST || "mongodb://localhost:27017/taskflow_test";

// ─── Connexion unique pour toute la suite ────────────────────────────────────

beforeAll(async () => {
  await mongoose.connect(TEST_MONGO_URI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function register(email, password = "password123") {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ email, password });
  return res; // réponse complète pour pouvoir tester les codes HTTP
}

const VALID_TASK = {
  title: "Buy groceries",
  urgent: false,
  important: true,
  status: "todo",
};

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /api/auth/register", () => {
  afterEach(async () => {
    await mongoose.connection.collections.users?.deleteMany({});
  });

  it("201 — crée un utilisateur et retourne token + user", async () => {
    const res = await register("test@example.com");
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("token");
    expect(res.body).toHaveProperty("user.id");
    expect(res.body).toHaveProperty("user.email", "test@example.com");
  });

  it("400 — email manquant", async () => {
    const res = await request(app).post("/api/auth/register").send({ password: "password123" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_INPUT");
  });

  it("400 — mot de passe manquant", async () => {
    const res = await request(app).post("/api/auth/register").send({ email: "test@example.com" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_INPUT");
  });

  it("409 — email déjà utilisé", async () => {
    await register("test@example.com");
    const res = await register("test@example.com");
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EMAIL_ALREADY_USED");
  });

  it("409 — insensible à la casse", async () => {
    await register("Test@Example.com");
    const res = await register("test@example.com");
    expect(res.status).toBe(409);
  });

  it("201 — le mot de passe n'est pas retourné", async () => {
    const res = await register("secure@example.com");
    expect(res.status).toBe(201);
    expect(res.body).not.toHaveProperty("password");
    expect(res.body.user).not.toHaveProperty("password");
  });
});

describe("POST /api/auth/login", () => {
  beforeAll(async () => {
    await register("user@example.com");
  });

  afterAll(async () => {
    await mongoose.connection.collections.users?.deleteMany({});
  });

  it("200 — retourne token + user", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "user@example.com", password: "password123" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body).toHaveProperty("user.id");
    expect(res.body).toHaveProperty("user.email", "user@example.com");
  });

  it("400 — email manquant", async () => {
    const res = await request(app).post("/api/auth/login").send({ password: "password123" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_INPUT");
  });

  it("400 — mot de passe manquant", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "user@example.com" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_INPUT");
  });

  it("401 — mauvais mot de passe", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "user@example.com", password: "wrong" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("401 — utilisateur inexistant", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "nobody@example.com", password: "password123" });
    expect(res.status).toBe(401);
  });

  it("200 — login insensible à la casse", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "USER@EXAMPLE.COM", password: "password123" });
    expect(res.status).toBe(200);
  });

  it("200 — le mot de passe n'est pas retourné", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "user@example.com", password: "password123" });
    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty("password");
    expect(res.body.user).not.toHaveProperty("password");
  });
});

describe("POST /api/auth/forgot-password & /api/auth/reset-password", () => {
  const emailService = require("../../src/infrastructure/email/EmailService");

  beforeAll(async () => {
    await register("reset.user@example.com", "oldPassword123");
  });

  afterAll(async () => {
    await mongoose.connection.collections.users?.deleteMany({});
  });

  it("400 — refuse un forgot-password sans email valide", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "invalide" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_INPUT");
  });

  it("200 — génère un jeton de réinitialisation par e-mail et permet de changer le mot de passe via /api/auth/reset-password", async () => {
    emailService.sentEmails = [];

    const forgotRes = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "reset.user@example.com" });

    expect(forgotRes.status).toBe(200);
    expect(forgotRes.body.emailSent).toBe(true);
    expect(emailService.sentEmails).toHaveLength(1);
    const sentToken = emailService.sentEmails[0].token;
    expect(sentToken).toBeDefined();

    // Réinitialiser le mot de passe avec le jeton reçu par mail
    const resetRes = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: sentToken, password: "newSecurePassword456" });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body).toHaveProperty("token");
    expect(resetRes.body).toHaveProperty("user.email", "reset.user@example.com");

    // Le jeton ne peut pas être réutilisé une seconde fois (400)
    const reuseRes = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: sentToken, password: "anotherPassword789" });
    expect(reuseRes.status).toBe(400);
    expect(reuseRes.body.error.code).toBe("INVALID_OR_EXPIRED_TOKEN");

    // L'ancien mot de passe ne marche plus (401), le nouveau fonctionne (200)
    const oldLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "reset.user@example.com", password: "oldPassword123" });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "reset.user@example.com", password: "newSecurePassword456" });
    expect(newLogin.status).toBe(200);
  });

  it("permet de modifier son nom et son mot de passe via PATCH /api/auth/profile", async () => {
    const reg = await request(app)
      .post("/api/auth/register")
      .send({
        email: "profile.user@example.com",
        password: "initialPassword123",
        name: "Ancien Nom",
      });
    expect(reg.status).toBe(201);
    const userToken = reg.body.token;

    // 1. Modifier le nom
    const nameRes = await request(app)
      .patch("/api/auth/profile")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ name: "Nouveau Nom" });
    expect(nameRes.status).toBe(200);
    expect(nameRes.body.user.name).toBe("Nouveau Nom");

    // 2. Échec du changement de mot de passe si currentPassword est erroné
    const badPwdRes = await request(app)
      .patch("/api/auth/profile")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        currentPassword: "wrongPassword",
        newPassword: "updatedPassword456",
      });
    expect(badPwdRes.status).toBe(400);
    expect(badPwdRes.body.error.code).toBe("INVALID_CURRENT_PASSWORD");

    // 3. Changement de mot de passe réussi avec le bon currentPassword
    const okPwdRes = await request(app)
      .patch("/api/auth/profile")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        currentPassword: "initialPassword123",
        newPassword: "updatedPassword456",
      });
    expect(okPwdRes.status).toBe(200);

    // 4. Connexion avec le nouveau mot de passe
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: "profile.user@example.com",
        password: "updatedPassword456",
      });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.name).toBe("Nouveau Nom");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TASKS — deux utilisateurs créés une seule fois pour toute la suite
// ═══════════════════════════════════════════════════════════════════════════════

describe("Gestion des tâches", () => {
  let token;   // propriétaire des tâches de test
  let token2;  // utilisateur tiers (isolation)

  // Deux bcrypt au lieu de ~35 : création unique en beforeAll
  beforeAll(async () => {
    const r1 = await register("owner@tasks.test");
    token = r1.body.token;
    const r2 = await register("other@tasks.test");
    token2 = r2.body.token;
  });

  afterAll(async () => {
    await mongoose.connection.collections.users?.deleteMany({});
  });

  // Seules les tâches sont nettoyées entre les tests ; les users persistent
  afterEach(async () => {
    await mongoose.connection.collections.tasks?.deleteMany({});
  });

  // ── Authentification ──────────────────────────────────────────────────────

  describe("Authentification", () => {
    it("refuse de lister les tâches sans token JWT", async () => {
      expect((await request(app).get("/api/tasks")).status).toBe(401);
    });

    it("refuse de créer une tâche sans token JWT", async () => {
      expect((await request(app).post("/api/tasks").send(VALID_TASK)).status).toBe(401);
    });

    it("refuse de modifier une tâche sans token JWT", async () => {
      expect(
        (await request(app).patch("/api/tasks/000000000000000000000001").send({ title: "x" })).status
      ).toBe(401);
    });

    it("refuse de supprimer une tâche sans token JWT", async () => {
      expect((await request(app).delete("/api/tasks/000000000000000000000001")).status).toBe(401);
    });
  });

  // ── POST /api/tasks ───────────────────────────────────────────────────────

  describe("POST /api/tasks", () => {
    it("201 — crée une tâche valide", async () => {
      const res = await request(app).post("/api/tasks").set("Authorization", `Bearer ${token}`).send(VALID_TASK);
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ title: "Buy groceries", urgent: false, important: true, status: "todo", priority: "schedule" });
      expect(res.body).toHaveProperty("id");
      expect(res.body).not.toHaveProperty("_id");
    });

    it("400 — titre vide", async () => {
      const res = await request(app).post("/api/tasks").set("Authorization", `Bearer ${token}`).send({ ...VALID_TASK, title: "" });
      expect(res.status).toBe(400);
    });

    it("400 — titre composé d'espaces", async () => {
      const res = await request(app).post("/api/tasks").set("Authorization", `Bearer ${token}`).send({ ...VALID_TASK, title: "   " });
      expect(res.status).toBe(400);
    });

    it("400 — titre > 120 caractères", async () => {
      const res = await request(app).post("/api/tasks").set("Authorization", `Bearer ${token}`).send({ ...VALID_TASK, title: "a".repeat(121) });
      expect(res.status).toBe(400);
    });

    it("400 — statut invalide", async () => {
      const res = await request(app).post("/api/tasks").set("Authorization", `Bearer ${token}`).send({ ...VALID_TASK, status: "invalid" });
      expect(res.status).toBe(400);
    });

    it("400 — description > 1000 caractères", async () => {
      const res = await request(app).post("/api/tasks").set("Authorization", `Bearer ${token}`).send({ ...VALID_TASK, description: "a".repeat(1001) });
      expect(res.status).toBe(400);
    });

    it("400 — date invalide", async () => {
      const res = await request(app).post("/api/tasks").set("Authorization", `Bearer ${token}`).send({ ...VALID_TASK, dueDate: "not-a-date" });
      expect(res.status).toBe(400);
    });

    it("201 — dueDate null accepté", async () => {
      const res = await request(app).post("/api/tasks").set("Authorization", `Bearer ${token}`).send({ ...VALID_TASK, dueDate: null });
      expect(res.status).toBe(201);
      expect(res.body.dueDate).toBeNull();
    });

    it("400 — champ id refusé", async () => {
      const res = await request(app).post("/api/tasks").set("Authorization", `Bearer ${token}`).send({ ...VALID_TASK, id: "fake" });
      expect(res.status).toBe(400);
    });

    it("400 — champ ownerId refusé", async () => {
      const res = await request(app).post("/api/tasks").set("Authorization", `Bearer ${token}`).send({ ...VALID_TASK, ownerId: "fake" });
      expect(res.status).toBe(400);
    });
  });

  // ── GET /api/tasks ────────────────────────────────────────────────────────

  describe("GET /api/tasks", () => {
    it('200 — liste vide {"items":[]}', async () => {
      const res = await request(app).get("/api/tasks").set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ items: [] });
    });

    it("200 — retourne uniquement les tâches du propriétaire", async () => {
      await request(app).post("/api/tasks").set("Authorization", `Bearer ${token}`).send(VALID_TASK);
      await request(app).post("/api/tasks").set("Authorization", `Bearer ${token2}`).send({ ...VALID_TASK, title: "Other user task" });

      const res = await request(app).get("/api/tasks").set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].title).toBe("Buy groceries");
    });
  });

  // ── GET /api/tasks/:id ────────────────────────────────────────────────────

  describe("GET /api/tasks/:id", () => {
    let taskId;

    beforeEach(async () => {
      const res = await request(app).post("/api/tasks").set("Authorization", `Bearer ${token}`).send(VALID_TASK);
      taskId = res.body.id;
    });

    it("200 — retourne la tâche du propriétaire", async () => {
      const res = await request(app).get(`/api/tasks/${taskId}`).set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(taskId);
    });

    it("404 — tâche inexistante", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app).get(`/api/tasks/${fakeId}`).set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(404);
    });

    it("400 — id malformé", async () => {
      const res = await request(app).get("/api/tasks/bad-id").set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(400);
    });

    it("404 — tâche appartenant à un autre utilisateur", async () => {
      const res = await request(app).get(`/api/tasks/${taskId}`).set("Authorization", `Bearer ${token2}`);
      expect(res.status).toBe(404);
    });
  });

  // ── PATCH /api/tasks/:id ──────────────────────────────────────────────────

  describe("PATCH /api/tasks/:id", () => {
    let taskId;

    beforeEach(async () => {
      const res = await request(app).post("/api/tasks").set("Authorization", `Bearer ${token}`).send(VALID_TASK);
      taskId = res.body.id;
    });

    it("200 — modification partielle", async () => {
      const res = await request(app).patch(`/api/tasks/${taskId}`).set("Authorization", `Bearer ${token}`).send({ title: "Updated" });
      expect(res.status).toBe(200);
      expect(res.body.title).toBe("Updated");
      expect(res.body.urgent).toBe(false);
    });

    it("400 — body vide", async () => {
      const res = await request(app).patch(`/api/tasks/${taskId}`).set("Authorization", `Bearer ${token}`).send({});
      expect(res.status).toBe(400);
    });

    it("400 — champ inconnu", async () => {
      const res = await request(app).patch(`/api/tasks/${taskId}`).set("Authorization", `Bearer ${token}`).send({ unknownField: "x" });
      expect(res.status).toBe(400);
    });

    it("400 — champ id refusé", async () => {
      const res = await request(app).patch(`/api/tasks/${taskId}`).set("Authorization", `Bearer ${token}`).send({ id: "new-id" });
      expect(res.status).toBe(400);
    });

    it("400 — champ ownerId refusé", async () => {
      const res = await request(app).patch(`/api/tasks/${taskId}`).set("Authorization", `Bearer ${token}`).send({ ownerId: "x" });
      expect(res.status).toBe(400);
    });

    it("400 — données invalides", async () => {
      const res = await request(app).patch(`/api/tasks/${taskId}`).set("Authorization", `Bearer ${token}`).send({ title: "" });
      expect(res.status).toBe(400);
    });

    it("404 — tâche appartenant à un autre utilisateur", async () => {
      const res = await request(app).patch(`/api/tasks/${taskId}`).set("Authorization", `Bearer ${token2}`).send({ title: "Hijack" });
      expect(res.status).toBe(404);
    });

    it("400 — id malformé", async () => {
      const res = await request(app).patch("/api/tasks/bad-id").set("Authorization", `Bearer ${token}`).send({ title: "x" });
      expect(res.status).toBe(400);
    });
  });

  // ── DELETE /api/tasks/:id ─────────────────────────────────────────────────

  describe("DELETE /api/tasks/:id", () => {
    let taskId;

    beforeEach(async () => {
      const res = await request(app).post("/api/tasks").set("Authorization", `Bearer ${token}`).send(VALID_TASK);
      taskId = res.body.id;
    });

    it("204 — supprime et renvoie sans corps", async () => {
      const res = await request(app).delete(`/api/tasks/${taskId}`).set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(204);
      expect(res.body).toEqual({});
    });

    it("404 — GET sur tâche supprimée", async () => {
      await request(app).delete(`/api/tasks/${taskId}`).set("Authorization", `Bearer ${token}`);
      const res = await request(app).get(`/api/tasks/${taskId}`).set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(404);
    });

    it("404 — suppression d'une tâche inexistante", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app).delete(`/api/tasks/${fakeId}`).set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(404);
    });

    it("404 — suppression de la tâche d'un autre utilisateur", async () => {
      const res = await request(app).delete(`/api/tasks/${taskId}`).set("Authorization", `Bearer ${token2}`);
      expect(res.status).toBe(404);
    });
  });
});
