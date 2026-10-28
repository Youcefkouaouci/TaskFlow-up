"use strict";

const mongoose = require("mongoose");
const {
  User,
  Group,
  GroupInvitation,
  Project,
  Task,
  Message,
  File,
} = require("../../../src/infrastructure/persistence/models");

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

describe("Schémas MongoDB (7 collections)", () => {
  it("crée et relie correctement users, groups, group_invitations, projects, tasks, messages et files", async () => {
    // 1. users
    const owner = await User.create({
      email: "owner@taskflow.fr",
      password: "Password123!",
      name: "Alice Martin",
      avatarUrl: "https://example.com/alice.png",
    });
    expect(owner._id).toBeDefined();
    expect(owner.name).toBe("Alice Martin");
    expect(owner.avatarUrl).toBe("https://example.com/alice.png");
    expect(owner.createdAt).toBeInstanceOf(Date);
    expect(owner.updatedAt).toBeInstanceOf(Date);

    // 2. groups
    const group = await Group.create({
      name: "Promo M1 FullStack",
      ownerId: owner._id,
      members: [
        {
          userId: owner._id,
          role: "owner",
          joinedAt: new Date(),
        },
      ],
    });
    expect(group.collection.collectionName).toBe("groups");
    expect(group.members).toHaveLength(1);
    expect(group.members[0].role).toBe("owner");

    // 3. group_invitations
    const invitation = await GroupInvitation.create({
      groupId: group._id,
      invitedBy: owner._id,
      email: "bob@taskflow.fr",
      role: "member",
      token: "secure-unique-token-123",
      status: "pending",
      expiresAt: new Date(Date.now() + 86400000),
    });
    expect(invitation.collection.collectionName).toBe("group_invitations");
    expect(invitation.status).toBe("pending");
    expect(invitation.role).toBe("member");

    // 4. projects
    const project = await Project.create({
      groupId: group._id,
      name: "TaskFlow Sprint 1",
      description: "Mise en place de l'architecture et de la BDD",
      members: [
        {
          userId: owner._id,
          role: "project_lead",
        },
      ],
    });
    expect(project.collection.collectionName).toBe("projects");
    expect(project.members[0].role).toBe("project_lead");

    // 5. tasks (calcul automatique du quadrant Eisenhower)
    const task = await Task.create({
      projectId: project._id,
      title: "Configurer MongoDB sous Docker",
      description: "Créer les 7 collections",
      urgent: true,
      important: true,
      status: "in_progress",
      assignedTo: [owner._id],
      dueDate: new Date("2026-11-01T18:00:00.000Z"),
    });
    expect(task.collection.collectionName).toBe("tasks");
    expect(task.quadrant).toBe("DO");
    expect(task.status).toBe("in_progress");
    expect(task.assignedTo).toHaveLength(1);
    expect(task.dueDate).toBeInstanceOf(Date);

    // 6. messages
    const message = await Message.create({
      projectId: project._id,
      senderId: owner._id,
      content: "La base de données est prête !",
    });
    expect(message.collection.collectionName).toBe("messages");
    expect(message.content).toBe("La base de données est prête !");

    // 7. files
    const file = await File.create({
      projectId: project._id,
      uploadedBy: owner._id,
      filename: "cahier-des-charges.pdf",
      fileUrl: "/uploads/cahier-des-charges.pdf",
      fileSize: 204800,
      mimeType: "application/pdf",
    });
    expect(file.collection.collectionName).toBe("files");
    expect(file.fileSize).toBe(204800);
    expect(file.mimeType).toBe("application/pdf");
  });
});
