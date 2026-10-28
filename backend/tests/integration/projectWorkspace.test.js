"use strict";

const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../../src/app");

const TEST_MONGO_URI =
  process.env.MONGO_URI_TEST || "mongodb://localhost:27017/taskflow_test";

let leadToken;
let contribToken, contribId;
let viewerToken, viewerId;
let groupId;
let projectId;

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
  const resLead = await request(app)
    .post("/api/auth/register")
    .send({ email: "lead@taskflow.fr", password: "password123", name: "Alice Lead" });
  leadToken = resLead.body.token;

  const resContrib = await request(app)
    .post("/api/auth/register")
    .send({ email: "contrib@taskflow.fr", password: "password123", name: "Bob Contrib" });
  contribToken = resContrib.body.token;
  contribId = resContrib.body.userId;

  const resViewer = await request(app)
    .post("/api/auth/register")
    .send({ email: "viewer@taskflow.fr", password: "password123", name: "Charlie Viewer" });
  viewerToken = resViewer.body.token;
  viewerId = resViewer.body.userId;

  const groupRes = await request(app)
    .post("/api/groups")
    .set("Authorization", `Bearer ${leadToken}`)
    .send({ name: "Groupe Projet M1" });
  groupId = groupRes.body.id;

  await request(app)
    .post(`/api/groups/${groupId}/members`)
    .set("Authorization", `Bearer ${leadToken}`)
    .send({ userId: contribId, role: "member" });

  await request(app)
    .post(`/api/groups/${groupId}/members`)
    .set("Authorization", `Bearer ${leadToken}`)
    .send({ userId: viewerId, role: "member" });

  const projRes = await request(app)
    .post(`/api/groups/${groupId}/projects`)
    .set("Authorization", `Bearer ${leadToken}`)
    .send({ name: "Application Web FullStack", description: "Projet central" });
  projectId = projRes.body.id;

  await request(app)
    .post(`/api/projects/${projectId}/members`)
    .set("Authorization", `Bearer ${leadToken}`)
    .send({ userId: contribId, role: "contributor" });

  await request(app)
    .post(`/api/projects/${projectId}/members`)
    .set("Authorization", `Bearer ${leadToken}`)
    .send({ userId: viewerId, role: "viewer" });
});

describe("Espace Projet : Tâches, Chat (messages) & Partage de fichiers (files)", () => {
  it("permet aux contributors de créer, modifier et supprimer une tâche du projet et bloque les viewers (403)", async () => {
    const createRes = await request(app)
      .post(`/api/projects/${projectId}/tasks`)
      .set("Authorization", `Bearer ${contribToken}`)
      .send({
        title: "Intégrer Socket.io",
        description: "Chat temps réel",
        urgent: true,
        important: true,
        assignedTo: [contribId],
      });

    expect(createRes.status).toBe(201);
    const taskId = createRes.body.id;
    expect(createRes.body.quadrant).toBe("DO");

    // Viewer ne peut pas modifier la tâche (403)
    const viewerPatch = await request(app)
      .patch(`/api/projects/${projectId}/tasks/${taskId}`)
      .set("Authorization", `Bearer ${viewerToken}`)
      .send({ status: "in_progress" });
    expect(viewerPatch.status).toBe(403);

    // Lead ou Contributor peut modifier la tâche (200)
    const leadPatch = await request(app)
      .patch(`/api/projects/${projectId}/tasks/${taskId}`)
      .set("Authorization", `Bearer ${leadToken}`)
      .send({ status: "done", urgent: false, important: true });
    expect(leadPatch.status).toBe(200);
    expect(leadPatch.body.status).toBe("done");
    expect(leadPatch.body.quadrant).toBe("PLAN");

    // Suppression de la tâche du projet (204)
    const delRes = await request(app)
      .delete(`/api/projects/${projectId}/tasks/${taskId}`)
      .set("Authorization", `Bearer ${contribToken}`);
    expect(delRes.status).toBe(204);
  });

  it("gère le chat du projet (GET / POST /api/projects/:projectId/messages) avec RBAC", async () => {
    // Le contributor envoie un message (201)
    const sendRes = await request(app)
      .post(`/api/projects/${projectId}/messages`)
      .set("Authorization", `Bearer ${contribToken}`)
      .send({ content: "Bonjour l'équipe, la matrice est prête !" });

    expect(sendRes.status).toBe(201);
    expect(sendRes.body.content).toBe("Bonjour l'équipe, la matrice est prête !");
    expect(sendRes.body.senderName).toBe("Bob Contrib");

    // Le viewer peut lire les messages (200) mais ne peut pas envoyer (403)
    const listRes = await request(app)
      .get(`/api/projects/${projectId}/messages`)
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0].content).toBe("Bonjour l'équipe, la matrice est prête !");

    const viewerSend = await request(app)
      .post(`/api/projects/${projectId}/messages`)
      .set("Authorization", `Bearer ${viewerToken}`)
      .send({ content: "Message interdit au viewer" });
    expect(viewerSend.status).toBe(403);
  });

  it("gère le partage de fichiers du projet (GET / POST / DELETE /api/projects/:projectId/files) avec RBAC", async () => {
    const base64Sample = Buffer.from("Contenu PDF de test TaskFlow").toString("base64");

    // Le contributor dépose un fichier (201)
    const uploadRes = await request(app)
      .post(`/api/projects/${projectId}/files`)
      .set("Authorization", `Bearer ${contribToken}`)
      .send({
        filename: "architecture.pdf",
        mimeType: "application/pdf",
        contentBase64: base64Sample,
      });

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.filename).toBe("architecture.pdf");
    expect(uploadRes.body.mimeType).toBe("application/pdf");
    expect(uploadRes.body.uploaderName).toBe("Bob Contrib");
    expect(uploadRes.body.fileUrl).toMatch(/^\/uploads\//);

    const fileId = uploadRes.body.id;

    // Le viewer peut lister les fichiers (200) mais ne peut ni déposer ni supprimer (403)
    const listFilesRes = await request(app)
      .get(`/api/projects/${projectId}/files`)
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(listFilesRes.status).toBe(200);
    expect(listFilesRes.body).toHaveLength(1);

    const viewerDelete = await request(app)
      .delete(`/api/projects/${projectId}/files/${fileId}`)
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(viewerDelete.status).toBe(403);

    // Le project_lead supprime le fichier (204)
    const leadDelete = await request(app)
      .delete(`/api/projects/${projectId}/files/${fileId}`)
      .set("Authorization", `Bearer ${leadToken}`);
    expect(leadDelete.status).toBe(204);
  });
});
