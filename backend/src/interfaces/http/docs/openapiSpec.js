"use strict";

const openapiSpec = {
  openapi: "3.0.3",
  info: {
    title: "TaskFlow Collaborative — API REST & Temps Réel",
    version: "1.0.0",
    description:
      "Documentation interactive OpenAPI 3.0 de la plateforme **TaskFlow** (Matrice d'Eisenhower Collaborative, Groupes, Projets, RBAC, Chat & Fichiers temps réel, Journal d'Audit et Notifications In-App).\n\n" +
      "### Authentification JWT\n" +
      "1. Utilisez `POST /api/auth/login` ou `POST /api/auth/register` pour récupérer un `token`.\n" +
      "2. Cliquez sur le bouton **Authorize** en haut à droite et collez le token JWT pour tester toutes les routes protégées.",
  },
  servers: [
    {
      url: "/",
      description: "Serveur courant (Local ou Production HTTPS)",
    },
    {
      url: "http://localhost:3000",
      description: "Serveur local (Port 3000)",
    },
  ],
  tags: [
    { name: "Health", description: "État de santé du serveur et de MongoDB" },
    {
      name: "Auth",
      description:
        "Inscription, connexion JWT, profil et réinitialisation de mot de passe (SMTP)",
    },
    {
      name: "Tasks",
      description: "CRUD des tâches de la Matrice d'Eisenhower (Q1 à Q4)",
    },
    {
      name: "Groups",
      description:
        "Gestion des groupes de travail, des membres (owner, admin, member) et des invitations",
    },
    {
      name: "Projects",
      description:
        "Espaces projets collaboratifs (tâches, membres RBAC, chat temps réel, fichiers, journal d'activité)",
    },
    {
      name: "Invitations",
      description:
        "Vérification et acceptation des invitations par lien/token e-mail",
    },
    {
      name: "Notifications",
      description:
        "Centre de notifications In-App temps réel (lecture, marquage et suppression)",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Entrez votre JWT obtenu via /api/auth/login",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          error: { type: "string", example: "Validation error" },
          message: { type: "string", example: "Invalid payload" },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c0d" },
          name: { type: "string", example: "Alice Martin" },
          email: { type: "string", example: "alice@taskflow.fr" },
        },
      },
      Task: {
        type: "object",
        properties: {
          id: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c11" },
          projectId: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c22" },
          ownerId: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c0d" },
          title: {
            type: "string",
            example: "Préparer la soutenance FullStack JS",
          },
          description: {
            type: "string",
            example: "Vérifier la démo Docker, Socket.io et Swagger",
          },
          urgent: { type: "boolean", example: true },
          important: { type: "boolean", example: true },
          quadrant: {
            type: "string",
            enum: ["DO", "PLAN", "DELEGATE", "ELIMINATE"],
            example: "DO",
          },
          status: {
            type: "string",
            enum: ["todo", "doing", "done"],
            example: "todo",
          },
          dueDate: {
            type: "string",
            nullable: true,
            example: "2026-11-15",
          },
          assignedTo: {
            type: "array",
            items: { type: "string" },
            example: ["665f1a2b3c4d5e6f7a8b9c0d"],
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      TaskInput: {
        type: "object",
        required: ["title", "urgent", "important"],
        properties: {
          title: {
            type: "string",
            example: "Finaliser les tests d'intégration",
          },
          description: {
            type: "string",
            example: "Couvrir les cas nominaux et erreurs 403",
          },
          urgent: { type: "boolean", example: true },
          important: { type: "boolean", example: true },
          status: {
            type: "string",
            enum: ["todo", "doing", "done"],
            default: "todo",
          },
          dueDate: {
            type: "string",
            nullable: true,
            example: "2026-11-20",
          },
          projectId: {
            type: "string",
            nullable: true,
            example: "665f1a2b3c4d5e6f7a8b9c22",
          },
          assignedTo: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
      Group: {
        type: "object",
        properties: {
          id: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c30" },
          name: { type: "string", example: "Équipe Master 1 FullStack" },
          ownerId: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c0d" },
          myRole: {
            type: "string",
            enum: ["owner", "admin", "member"],
            example: "owner",
          },
          members: {
            type: "array",
            items: {
              type: "object",
              properties: {
                userId: { type: "string" },
                name: { type: "string" },
                email: { type: "string" },
                role: { type: "string", enum: ["owner", "admin", "member"] },
              },
            },
          },
        },
      },
      Project: {
        type: "object",
        properties: {
          id: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c22" },
          groupId: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c30" },
          name: { type: "string", example: "Plateforme TaskFlow v2" },
          description: {
            type: "string",
            example: "Refonte collaborative avec WebSockets",
          },
          myRole: {
            type: "string",
            enum: ["project_lead", "contributor", "viewer"],
            example: "project_lead",
          },
          members: {
            type: "array",
            items: {
              type: "object",
              properties: {
                userId: { type: "string" },
                name: { type: "string" },
                email: { type: "string" },
                role: {
                  type: "string",
                  enum: ["project_lead", "contributor", "viewer"],
                },
              },
            },
          },
        },
      },
      Notification: {
        type: "object",
        properties: {
          id: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c99" },
          recipientId: { type: "string" },
          actorId: { type: "string", nullable: true },
          actorName: { type: "string", example: "Alice Lead" },
          type: {
            type: "string",
            example: "task_assigned",
            enum: [
              "task_assigned",
              "chat_message",
              "file_uploaded",
              "member_added",
              "member_role_updated",
            ],
          },
          title: { type: "string", example: "Nouvelle tâche assignée" },
          message: {
            type: "string",
            example: "vous a assigné la tâche « Préparer la démo »",
          },
          projectId: { type: "string", nullable: true },
          read: { type: "boolean", example: false },
          createdAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
  paths: {
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "Vérifier l'état du serveur API et de la connexion MongoDB",
        responses: {
          200: {
            description: "Serveur opérationnel",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ok" },
                    database: { type: "string", example: "connected" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Inscrire un nouvel utilisateur",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  name: { type: "string", example: "Alice Martin" },
                  email: { type: "string", example: "alice@taskflow.fr" },
                  password: { type: "string", example: "password123" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Compte créé et JWT retourné" },
          400: { description: "Données invalides" },
          409: { description: "Email déjà utilisé" },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Authentifier un utilisateur et obtenir un token JWT",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", example: "alice@taskflow.fr" },
                  password: { type: "string", example: "password123" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Authentification réussie (retourne token JWT)" },
          401: { description: "Identifiants invalides" },
        },
      },
    },
    "/api/auth/forgot-password": {
      post: {
        tags: ["Auth"],
        summary: "Envoyer un lien de réinitialisation de mot de passe par e-mail",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: {
                  email: { type: "string", example: "alice@taskflow.fr" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "E-mail envoyé si le compte existe" },
        },
      },
    },
    "/api/auth/reset-password": {
      post: {
        tags: ["Auth"],
        summary: "Réinitialiser le mot de passe via le jeton reçu par e-mail",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["token", "password"],
                properties: {
                  token: { type: "string" },
                  password: { type: "string", example: "newPassword123" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Mot de passe mis à jour avec succès" },
          400: { description: "Jeton invalide ou expiré" },
        },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Récupérer le profil de l'utilisateur connecté",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Profil de l'utilisateur",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/User" },
              },
            },
          },
          401: { description: "Non authentifié" },
        },
      },
    },
    "/api/auth/profile": {
      patch: {
        tags: ["Auth"],
        summary: "Mettre à jour son nom ou son mot de passe",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", example: "Alice Martin-Dupont" },
                  currentPassword: { type: "string", example: "password123" },
                  newPassword: { type: "string", example: "newSecret456" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Profil mis à jour" },
          400: { description: "Validation échouée" },
          401: { description: "Mot de passe actuel incorrect" },
        },
      },
    },
    "/api/tasks": {
      get: {
        tags: ["Tasks"],
        summary: "Lister les tâches de l'utilisateur connecté",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "status",
            in: "query",
            schema: { type: "string", enum: ["todo", "doing", "done"] },
            description: "Filtrer par statut",
          },
          {
            name: "quadrant",
            in: "query",
            schema: {
              type: "string",
              enum: ["DO", "PLAN", "DELEGATE", "ELIMINATE"],
            },
            description: "Filtrer par quadrant d'Eisenhower",
          },
          {
            name: "projectId",
            in: "query",
            schema: { type: "string" },
            description: "Filtrer par identifiant de projet",
          },
        ],
        responses: {
          200: {
            description: "Liste des tâches",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Task" },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Tasks"],
        summary: "Créer une nouvelle tâche (calcul automatique du quadrant)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/TaskInput" },
            },
          },
        },
        responses: {
          201: {
            description: "Tâche créée",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Task" },
              },
            },
          },
          400: { description: "Erreur de validation" },
        },
      },
    },
    "/api/tasks/{id}": {
      get: {
        tags: ["Tasks"],
        summary: "Obtenir le détail d'une tâche par son ID",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: {
            description: "Détail de la tâche",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Task" },
              },
            },
          },
          404: { description: "Tâche introuvable" },
        },
      },
      patch: {
        tags: ["Tasks"],
        summary:
          "Modifier une tâche (titre, description, quadrant urgent/important, statut, échéance)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/TaskInput" },
            },
          },
        },
        responses: {
          200: { description: "Tâche mise à jour" },
          404: { description: "Tâche introuvable" },
        },
      },
      delete: {
        tags: ["Tasks"],
        summary: "Supprimer une tâche",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          204: { description: "Tâche supprimée" },
          404: { description: "Tâche introuvable" },
        },
      },
    },
    "/api/groups": {
      get: {
        tags: ["Groups"],
        summary: "Lister les groupes dont l'utilisateur est membre",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Liste des groupes",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Group" },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Groups"],
        summary: "Créer un nouveau groupe collaboratif",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", example: "Équipe Produit" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Groupe créé" },
        },
      },
    },
    "/api/groups/{groupId}": {
      get: {
        tags: ["Groups"],
        summary: "Récupérer les détails d'un groupe et ses membres",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "groupId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Détails du groupe" },
          403: { description: "Accès refusé" },
        },
      },
      patch: {
        tags: ["Groups"],
        summary: "Renommer un groupe (owner ou admin)",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "groupId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: { name: { type: "string" } },
              },
            },
          },
        },
        responses: {
          200: { description: "Groupe mis à jour" },
        },
      },
      delete: {
        tags: ["Groups"],
        summary: "Supprimer un groupe et ses projets (owner uniquement)",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "groupId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          204: { description: "Groupe supprimé" },
        },
      },
    },
    "/api/groups/{groupId}/members/{userId}": {
      patch: {
        tags: ["Groups"],
        summary: "Modifier le rôle d'un membre du groupe (admin / member)",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "groupId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "userId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["role"],
                properties: {
                  role: { type: "string", enum: ["admin", "member"] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Rôle mis à jour" },
        },
      },
      delete: {
        tags: ["Groups"],
        summary: "Retirer un membre du groupe",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "groupId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "userId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Membre retiré" },
        },
      },
    },
    "/api/groups/{groupId}/projects": {
      get: {
        tags: ["Groups"],
        summary: "Lister les projets rattachés à un groupe",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "groupId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Liste des projets du groupe" },
        },
      },
      post: {
        tags: ["Groups"],
        summary: "Créer un projet dans le groupe (owner ou admin)",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "groupId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", example: "Sprint Architecture" },
                  description: {
                    type: "string",
                    example: "Mise en place Hexagonale + Docker",
                  },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Projet créé" },
        },
      },
    },
    "/api/groups/{groupId}/invitations": {
      get: {
        tags: ["Groups"],
        summary: "Lister les invitations du groupe",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "groupId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Liste des invitations" },
        },
      },
      post: {
        tags: ["Groups"],
        summary: "Envoyer une invitation par e-mail pour rejoindre le groupe",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "groupId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: {
                  email: { type: "string", example: "invite@taskflow.fr" },
                  role: {
                    type: "string",
                    enum: ["admin", "member"],
                    default: "member",
                  },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Invitation créée et envoyée par SMTP" },
        },
      },
    },
    "/api/projects": {
      get: {
        tags: ["Projects"],
        summary: "Lister tous les projets accessibles par l'utilisateur",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Liste des projets",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Project" },
                },
              },
            },
          },
        },
      },
    },
    "/api/projects/{projectId}": {
      get: {
        tags: ["Projects"],
        summary: "Obtenir les détails complets d'un projet et de ses membres",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "projectId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Détails du projet",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Project" },
              },
            },
          },
        },
      },
      patch: {
        tags: ["Projects"],
        summary: "Modifier le nom et la description d'un projet (project_lead)",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "projectId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Projet mis à jour" },
        },
      },
      delete: {
        tags: ["Projects"],
        summary: "Supprimer un projet et ses tâches (project_lead)",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "projectId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          204: { description: "Projet supprimé" },
        },
      },
    },
    "/api/projects/{projectId}/members": {
      post: {
        tags: ["Projects"],
        summary:
          "Ajouter un membre au projet ou modifier son rôle (project_lead)",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "projectId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  userId: { type: "string" },
                  email: { type: "string" },
                  role: {
                    type: "string",
                    enum: ["project_lead", "contributor", "viewer"],
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Membre ajouté ou mis à jour" },
        },
      },
    },
    "/api/projects/{projectId}/tasks": {
      get: {
        tags: ["Projects"],
        summary: "Lister les tâches d'un projet",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "projectId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Tâches du projet" },
        },
      },
      post: {
        tags: ["Projects"],
        summary:
          "Créer une tâche collaborative dans le projet (project_lead ou contributor)",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "projectId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/TaskInput" },
            },
          },
        },
        responses: {
          201: { description: "Tâche créée et diffusée via Socket.io" },
          403: { description: "Rôle viewer (lecture seule)" },
        },
      },
    },
    "/api/projects/{projectId}/messages": {
      get: {
        tags: ["Projects"],
        summary: "Lister l'historique des messages du chat du projet",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "projectId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Historique des messages" },
        },
      },
      post: {
        tags: ["Projects"],
        summary: "Envoyer un message dans le chat temps réel du projet",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "projectId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["content"],
                properties: {
                  content: {
                    type: "string",
                    example: "Bonjour l'équipe, la release est prête !",
                  },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Message enregistré et diffusé via Socket.io" },
        },
      },
    },
    "/api/projects/{projectId}/files": {
      get: {
        tags: ["Projects"],
        summary: "Lister les fichiers partagés dans le projet",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "projectId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Liste des fichiers du projet" },
        },
      },
      post: {
        tags: ["Projects"],
        summary: "Partager un fichier dans le projet (Base64 ou URL)",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "projectId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["filename"],
                properties: {
                  filename: { type: "string", example: "cahier-charges.pdf" },
                  mimeType: { type: "string", example: "application/pdf" },
                  fileSize: { type: "number", example: 24500 },
                  contentBase64: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Fichier enregistré et diffusé via Socket.io" },
        },
      },
    },
    "/api/projects/{projectId}/activities": {
      get: {
        tags: ["Projects"],
        summary:
          "Consulter le journal d'activité chronologique (Audit Log) du projet",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "projectId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Liste chronologique des activités du projet" },
        },
      },
    },
    "/api/invitations/{token}": {
      get: {
        tags: ["Invitations"],
        summary: "Vérifier la validité d'un jeton d'invitation public",
        parameters: [
          {
            name: "token",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Détails de l'invitation" },
          404: { description: "Invitation introuvable" },
        },
      },
    },
    "/api/invitations/{token}/accept": {
      post: {
        tags: ["Invitations"],
        summary: "Accepter une invitation et rejoindre le groupe",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "token",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Invitation acceptée" },
        },
      },
    },
    "/api/notifications": {
      get: {
        tags: ["Notifications"],
        summary:
          "Lister les notifications In-App de l'utilisateur et le nombre de non-lues",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 40 },
          },
        ],
        responses: {
          200: {
            description: "Notifications et compteur unreadCount",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    items: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Notification" },
                    },
                    unreadCount: { type: "integer", example: 2 },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/notifications/read-all": {
      patch: {
        tags: ["Notifications"],
        summary: "Marquer toutes les notifications de l'utilisateur comme lues",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Toutes les notifications ont été marquées lues" },
        },
      },
    },
    "/api/notifications/{notificationId}/read": {
      patch: {
        tags: ["Notifications"],
        summary: "Marquer une notification spécifique comme lue",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "notificationId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Notification marquée comme lue" },
        },
      },
    },
    "/api/notifications/{notificationId}": {
      delete: {
        tags: ["Notifications"],
        summary: "Supprimer une notification",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "notificationId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          204: { description: "Notification supprimée" },
        },
      },
    },
  },
};

module.exports = openapiSpec;
