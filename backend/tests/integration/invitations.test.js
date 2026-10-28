"use strict";

const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../../src/app");
const emailService = require("../../src/infrastructure/email/EmailService");
const GroupInvitationModel = require("../../src/infrastructure/persistence/invitation/GroupInvitationSchema");

const TEST_MONGO_URI =
  process.env.MONGO_URI_TEST || "mongodb://localhost:27017/taskflow_test";

let ownerToken;
let memberToken;
let invitedUserToken;
let wrongUserToken;
let groupId;

beforeAll(async () => {
  await mongoose.connect(TEST_MONGO_URI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

afterEach(async () => {
  emailService.sentEmails = [];
  const { collections } = mongoose.connection;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

beforeEach(async () => {
  const resOwner = await request(app)
    .post("/api/auth/register")
    .send({ email: "owner@taskflow.fr", password: "password123", name: "Owner" });
  ownerToken = resOwner.body.token;

  const resMember = await request(app)
    .post("/api/auth/register")
    .send({ email: "member@taskflow.fr", password: "password123", name: "Member" });
  memberToken = resMember.body.token;
  const memberId = resMember.body.userId;

  const resInvited = await request(app)
    .post("/api/auth/register")
    .send({ email: "sarah@taskflow.fr", password: "password123", name: "Sarah" });
  invitedUserToken = resInvited.body.token;

  const resWrong = await request(app)
    .post("/api/auth/register")
    .send({ email: "intrus@taskflow.fr", password: "password123", name: "Intrus" });
  wrongUserToken = resWrong.body.token;

  const groupRes = await request(app)
    .post("/api/groups")
    .set("Authorization", `Bearer ${ownerToken}`)
    .send({ name: "Groupe Alternance M1" });
  groupId = groupRes.body.id;

  await request(app)
    .post(`/api/groups/${groupId}/members`)
    .set("Authorization", `Bearer ${ownerToken}`)
    .send({ userId: memberId, role: "member" });
});

describe("API Invitations par e-mail (group_invitations)", () => {
  it("permet à un owner/admin d'envoyer une invitation par e-mail avec token unique (201) et bloque un simple member (403)", async () => {
    const forbiddenRes = await request(app)
      .post(`/api/groups/${groupId}/invitations`)
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ email: "sarah@taskflow.fr", role: "member" });
    expect(forbiddenRes.status).toBe(403);

    const inviteRes = await request(app)
      .post(`/api/groups/${groupId}/invitations`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: "sarah@taskflow.fr", role: "admin" });

    expect(inviteRes.status).toBe(201);
    expect(inviteRes.body.email).toBe("sarah@taskflow.fr");
    expect(inviteRes.body.role).toBe("admin");
    expect(inviteRes.body.status).toBe("pending");
    expect(inviteRes.body.token).toBeDefined();
    expect(inviteRes.body.inviteUrl).toContain(inviteRes.body.token);

    // Vérifie que EmailService a bien été déclenché
    expect(emailService.sentEmails).toHaveLength(1);
    expect(emailService.sentEmails[0].to).toBe("sarah@taskflow.fr");
    expect(emailService.sentEmails[0].token).toBe(inviteRes.body.token);
  });

  it("empêche d'envoyer une invitation en doublon ou à un membre déjà dans le groupe (409)", async () => {
    // 1. Déjà membre du groupe
    const alreadyMemberRes = await request(app)
      .post(`/api/groups/${groupId}/invitations`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: "member@taskflow.fr", role: "member" });
    expect(alreadyMemberRes.status).toBe(409);

    // 2. Première invitation valide
    const firstInvite = await request(app)
      .post(`/api/groups/${groupId}/invitations`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: "sarah@taskflow.fr", role: "member" });
    expect(firstInvite.status).toBe(201);

    // 3. Doublon d'invitation active
    const duplicateInvite = await request(app)
      .post(`/api/groups/${groupId}/invitations`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: "sarah@taskflow.fr", role: "member" });
    expect(duplicateInvite.status).toBe(409);
  });

  it("permet de consulter une invitation via GET /api/invitations/:token et de l'accepter via POST /api/invitations/:token/accept", async () => {
    const createRes = await request(app)
      .post(`/api/groups/${groupId}/invitations`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: "sarah@taskflow.fr", role: "admin" });

    const { token } = createRes.body;

    // 1. Consultation publique du token
    const checkRes = await request(app).get(`/api/invitations/${token}`);
    expect(checkRes.status).toBe(200);
    expect(checkRes.body.groupName).toBe("Groupe Alternance M1");
    expect(checkRes.body.role).toBe("admin");

    // 2. Un autre utilisateur (intrus@taskflow.fr) ne peut pas accepter l'invitation de sarah@taskflow.fr (403)
    const wrongAccept = await request(app)
      .post(`/api/invitations/${token}/accept`)
      .set("Authorization", `Bearer ${wrongUserToken}`);
    expect(wrongAccept.status).toBe(403);

    // 3. Sarah accepte l'invitation (200) et rejoint le groupe avec le rôle 'admin'
    const acceptRes = await request(app)
      .post(`/api/invitations/${token}/accept`)
      .set("Authorization", `Bearer ${invitedUserToken}`);
    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.invitation.status).toBe("accepted");
    expect(acceptRes.body.group.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: "admin" }),
      ])
    );

    // 4. Impossible d'accepter une seconde fois (409)
    const secondAccept = await request(app)
      .post(`/api/invitations/${token}/accept`)
      .set("Authorization", `Bearer ${invitedUserToken}`);
    expect(secondAccept.status).toBe(409);
  });

  it("refuse d'accepter une invitation expirée (400) et met son statut à 'expired'", async () => {
    const createRes = await request(app)
      .post(`/api/groups/${groupId}/invitations`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: "sarah@taskflow.fr", role: "member" });

    const { token, id } = createRes.body;

    // Forcer l'expiration en base de données
    await GroupInvitationModel.findByIdAndUpdate(id, {
      expiresAt: new Date(Date.now() - 60000),
    });

    const expiredAccept = await request(app)
      .post(`/api/invitations/${token}/accept`)
      .set("Authorization", `Bearer ${invitedUserToken}`);
    expect(expiredAccept.status).toBe(400);

    const updatedInDb = await GroupInvitationModel.findById(id);
    expect(updatedInDb.status).toBe("expired");
  });
});
