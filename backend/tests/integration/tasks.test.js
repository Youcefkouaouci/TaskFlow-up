
const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../../src/app");
const Task = require("../../src/infrastructure/persistence/task/TaskSchema");

const TEST_MONGO_URI =
  process.env.MONGO_URI_TEST || "mongodb://localhost:27017/taskflow_test";

let tokenA;
let taskA;
let taskB;

async function registerAndGetToken(email) {
  const response = await request(app)
    .post("/api/auth/register")
    .send({ email, password: "password123" });

  expect(response.status).toBe(201);
  return response.body.token;
}

beforeAll(async () => {
  await mongoose.connect(TEST_MONGO_URI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  tokenA = await registerAndGetToken("user-a@example.com");
  await registerAndGetToken("user-b@example.com");

  taskA = await Task.create({
    title: "Tâche utilisateur A",
    description: "",
    urgent: false,
    important: false,
    status: "todo",
    ownerId: new mongoose.Types.ObjectId(
      (await mongoose.model("User").findOne({
        email: "user-a@example.com",
      }))._id,
    ),
  });

  taskB = await Task.create({
    title: "Tâche utilisateur B",
    description: "",
    urgent: false,
    important: false,
    status: "todo",
    ownerId: new mongoose.Types.ObjectId(
      (await mongoose.model("User").findOne({
        email: "user-b@example.com",
      }))._id,
    ),
  });
});

afterEach(async () => {
  const { collections } = mongoose.connection;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe("Isolation des comptes", () => {
  it("ne renvoie que les tâches de l'utilisateur connecté", async () => {
    const response = await request(app)
      .get("/api/tasks")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]._id).toBe(taskA._id.toString());
  });

  it("refuse à un utilisateur de lire la tâche d'un autre", async () => {
    const response = await request(app)
      .get(`/api/tasks/${taskB._id}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(response.status).toBe(404);
  });

  it("refuse à un utilisateur de modifier la tâche d'un autre", async () => {
    const response = await request(app)
      .patch(`/api/tasks/${taskB._id}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ title: "Titre modifié" });

    expect(response.status).toBe(404);

    const unchangedTask = await Task.findById(taskB._id);
    expect(unchangedTask.title).toBe("Tâche utilisateur B");
  });

  it("refuse à un utilisateur de supprimer la tâche d'un autre", async () => {
    const response = await request(app)
      .delete(`/api/tasks/${taskB._id}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(response.status).toBe(404);
    expect(await Task.findById(taskB._id)).not.toBeNull();
  });
});
