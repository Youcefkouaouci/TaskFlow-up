// ============================================================================
// TaskFlow - Script d'initialisation MongoDB (Docker)
// Crée les 7 collections et leurs index associés
// ============================================================================

const dbName = process.env.MONGO_INITDB_DATABASE || "taskflow";
const targetDb = db.getSiblingDB(dbName);

const existingCollections = targetDb.getCollectionNames();

function ensureCollection(name) {
  if (!existingCollections.includes(name)) {
    targetDb.createCollection(name);
    print(`[TaskFlow Init] Collection '${name}' créée.`);
  } else {
    print(`[TaskFlow Init] Collection '${name}' déjà présente.`);
  }
}

// 1. users (Utilisateurs)
ensureCollection("users");
targetDb.users.createIndex({ email: 1 }, { unique: true });

// 2. groups (Groupes / Organisations)
ensureCollection("groups");
targetDb.groups.createIndex({ ownerId: 1 });
targetDb.groups.createIndex({ "members.userId": 1 });

// 3. group_invitations (Invitations par mail)
ensureCollection("group_invitations");
targetDb.group_invitations.createIndex({ token: 1 }, { unique: true });
targetDb.group_invitations.createIndex({ groupId: 1 });
targetDb.group_invitations.createIndex({ email: 1 });

// 4. projects (Projets)
ensureCollection("projects");
targetDb.projects.createIndex({ groupId: 1 });
targetDb.projects.createIndex({ "members.userId": 1 });

// 5. tasks (Tâches & Matrice d'Eisenhower)
ensureCollection("tasks");
targetDb.tasks.createIndex({ projectId: 1 });
targetDb.tasks.createIndex({ ownerId: 1 });
targetDb.tasks.createIndex({ assignedTo: 1 });
targetDb.tasks.createIndex({ quadrant: 1, status: 1 });

// 6. messages (Chat par projet)
ensureCollection("messages");
targetDb.messages.createIndex({ projectId: 1, createdAt: 1 });
targetDb.messages.createIndex({ senderId: 1 });

// 7. files (Fichiers partagés)
ensureCollection("files");
targetDb.files.createIndex({ projectId: 1 });
targetDb.files.createIndex({ uploadedBy: 1 });

print("[TaskFlow Init] Les 7 collections et leurs index sont prêts :", JSON.stringify(targetDb.getCollectionNames()));
