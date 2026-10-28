"use strict";

const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../../src/app");

const TEST_MONGO_URI =
  process.env.MONGO_URI_TEST || "mongodb://localhost:27017/taskflow_test";

let ownerToken, ownerId;
let adminToken, adminId;
let memberToken, memberId;
let outsiderToken;

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

beforeEach(async () => {
  const resOwner = await request(app)
    .post("/api/auth/register")
    .send({ email: "owner@example.com", password: "password123", name: "Owner" });
  ownerToken = resOwner.body.token;
  ownerId = resOwner.body.userId;

  const resAdmin = await request(app)
    .post("/api/auth/register")
    .send({ email: "admin@example.com", password: "password123", name: "Admin" });
  adminToken = resAdmin.body.token;
  adminId = resAdmin.body.userId;

  const resMember = await request(app)
    .post("/api/auth/register")
    .send({ email: "member@example.com", password: "password123", name: "Member" });
  memberToken = resMember.body.token;
  memberId = resMember.body.userId;

  const resOutsider = await request(app)
    .post("/api/auth/register")
    .send({ email: "outsider@example.com", password: "password123", name: "Outsider" });
  outsiderToken = resOutsider.body.token;
});

describe("API Groupes & Projets (CRUD + RBAC)", () => {
  describe("Gestion des Groupes (/api/groups)", () => {
    it("crée un groupe et définit le créateur comme owner (201)", async () => {
      const res = await request(app)
        .post("/api/groups")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ name: "Master 1 Alternance" });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe("Master 1 Alternance");
      expect(res.body.ownerId).toBe(ownerId);
      expect(res.body.members).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ userId: ownerId, role: "owner" }),
        ])
      );
    });

    it("permet à l'owner d'ajouter des membres (admin/member) et bloque les non-membres (403)", async () => {
      const groupRes = await request(app)
        .post("/api/groups")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ name: "Groupe Entreprise" });
      const groupId = groupRes.body.id;

      // Ajout de admin et member
      const addAdminRes = await request(app)
        .post(`/api/groups/${groupId}/members`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ userId: adminId, role: "admin" });
      expect(addAdminRes.status).toBe(200);

      const addMemberRes = await request(app)
        .post(`/api/groups/${groupId}/members`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ userId: memberId, role: "member" });
      expect(addMemberRes.status).toBe(200);
      expect(addMemberRes.body.members).toHaveLength(3);
      expect(addMemberRes.body.members).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            userId: memberId,
            role: "member",
            name: "Member",
            email: "member@example.com",
          }),
        ])
      );

      // PATCH /api/groups/:groupId/members/:userId permet de promouvoir member -> admin
      const patchRoleRes = await request(app)
        .patch(`/api/groups/${groupId}/members/${memberId}`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ role: "admin" });
      expect(patchRoleRes.status).toBe(200);
      expect(
        patchRoleRes.body.members.find((m) => m.userId === memberId).role
      ).toBe("admin");

      // Remettre en member pour tester les restrictions RBAC
      await request(app)
        .patch(`/api/groups/${groupId}/members/${memberId}`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ role: "member" });

      // Un simple member ne peut pas modifier le nom du groupe (403)
      const forbiddenUpdate = await request(app)
        .patch(`/api/groups/${groupId}`)
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ name: "Tentative renommage" });
      expect(forbiddenUpdate.status).toBe(403);

      // Un admin peut modifier le nom du groupe (200)
      const allowedUpdate = await request(app)
        .patch(`/api/groups/${groupId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Groupe Renommé" });
      expect(allowedUpdate.status).toBe(200);
      expect(allowedUpdate.body.name).toBe("Groupe Renommé");

      // Un outsider ne peut pas voir le groupe (403)
      const outsiderGet = await request(app)
        .get(`/api/groups/${groupId}`)
        .set("Authorization", `Bearer ${outsiderToken}`);
      expect(outsiderGet.status).toBe(403);

      // Seul l'owner peut supprimer le groupe (admin -> 403, owner -> 204)
      const adminDelete = await request(app)
        .delete(`/api/groups/${groupId}`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(adminDelete.status).toBe(403);

      const ownerDelete = await request(app)
        .delete(`/api/groups/${groupId}`)
        .set("Authorization", `Bearer ${ownerToken}`);
      expect(ownerDelete.status).toBe(204);
    });
  });

  describe("Gestion des Projets & RBAC Projet (/api/groups/:groupId/projects & /api/projects)", () => {
    let groupId;

    beforeEach(async () => {
      const groupRes = await request(app)
        .post("/api/groups")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ name: "Groupe Agile" });
      groupId = groupRes.body.id;

      await request(app)
        .post(`/api/groups/${groupId}/members`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ userId: adminId, role: "admin" });

      await request(app)
        .post(`/api/groups/${groupId}/members`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ userId: memberId, role: "member" });
    });

    it("autorise owner/admin à créer un projet (201) et refuse un simple member (403)", async () => {
      const forbiddenRes = await request(app)
        .post(`/api/groups/${groupId}/projects`)
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ name: "Projet Non Autorisé" });
      expect(forbiddenRes.status).toBe(403);

      const projectRes = await request(app)
        .post(`/api/groups/${groupId}/projects`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Sprint Backend",
          description: "Architecture Hexagonale",
        });

      expect(projectRes.status).toBe(201);
      expect(projectRes.body.name).toBe("Sprint Backend");
      expect(projectRes.body.groupId).toBe(groupId);
      expect(projectRes.body.members).toEqual([
        { userId: adminId, role: "project_lead" },
      ]);
    });

    it("applique les permissions projet (project_lead, contributor, viewer) sur les tâches", async () => {
      const projectRes = await request(app)
        .post(`/api/groups/${groupId}/projects`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ name: "Projet Matrice" });
      const projectId = projectRes.body.id;

      // Ajouter memberId en tant que viewer
      const addViewerRes = await request(app)
        .post(`/api/projects/${projectId}/members`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ userId: memberId, role: "viewer" });
      expect(addViewerRes.status).toBe(200);

      // Le viewer peut lire les tâches du projet (200) mais NE PEUT PAS créer de tâche (403)
      const viewerList = await request(app)
        .get(`/api/projects/${projectId}/tasks`)
        .set("Authorization", `Bearer ${memberToken}`);
      expect(viewerList.status).toBe(200);

      const viewerCreate = await request(app)
        .post(`/api/projects/${projectId}/tasks`)
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ title: "Tâche interdite", urgent: true, important: true });
      expect(viewerCreate.status).toBe(403);

      // Promouvoir memberId en contributor via PATCH /:projectId/members/:userId
      const patchRoleRes = await request(app)
        .patch(`/api/projects/${projectId}/members/${memberId}`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ role: "contributor" });
      expect(patchRoleRes.status).toBe(200);

      // Le contributor peut maintenant créer une tâche dans le projet (201)
      const contribCreate = await request(app)
        .post(`/api/projects/${projectId}/tasks`)
        .set("Authorization", `Bearer ${memberToken}`)
        .send({
          title: "Tâche autorisée",
          urgent: true,
          important: false,
          assignedTo: [memberId],
        });
      expect(contribCreate.status).toBe(201);
      expect(contribCreate.body.projectId).toBe(projectId);
      expect(contribCreate.body.quadrant).toBe("DELEGATE");
      expect(contribCreate.body.assignedTo).toEqual([memberId]);

      // Ajouter un membre au projet directement via son adresse e-mail
      const addByEmailRes = await request(app)
        .post(`/api/projects/${projectId}/members`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ email: "admin@example.com", role: "project_lead" });
      expect(addByEmailRes.status).toBe(200);
      expect(addByEmailRes.body.members).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ userId: adminId, role: "project_lead" }),
        ])
      );
    });
  });
});
