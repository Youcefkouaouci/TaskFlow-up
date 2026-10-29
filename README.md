# TaskFlow – Mini-Jira & Matrice d'Eisenhower

> **Plateforme collaborative de gestion de projets et de tâches inspirée de Jira.**  
> Combinant la matrice d'Eisenhower et une organisation par espaces de travail, développée dans le cadre d'un projet d'études (M1 FullStack JS).

---

## 🎯 Vision du Projet & Livrable

### 1. Problématique & Solution
- **Les problèmes constatés :**
  1. Une liste *To-Do* classique n'aide pas à hiérarchiser : la tyrannie de l'urgence prend constamment le dessus sur ce qui est réellement important.
  2. Le travail en équipe et la transmission des tâches se font trop souvent de manière cloisonnée ou via des canaux éparpillés (e-mails isolés, messageries multiples).
- **La solution TaskFlow :**  
  TaskFlow structure le travail en **Groupes** et en **Projets**, tout en classant automatiquement chaque tâche dans l'un des **quatre quadrants d'Eisenhower** (*Faire, Planifier, Déléguer, Éliminer*). La plateforme intègre également le partage collaboratif, les invitations sécurisées par e-mail, un chat par projet en temps réel et le partage de fichiers.

### 2. Cible Utilisateur
TaskFlow s'adresse en priorité aux **étudiants en alternance** et aux équipes agiles qui jonglent simultanément entre les exigences académiques (`École`) et les impératifs professionnels (`Entreprise`).

### 3. Branding & Identité Visuelle
- **Nom :** TaskFlow
- **Accroche :** « *L'important d'abord.* »
- **Style visuel :** Direction minimale monochrome avec accentuation critique, orientée productivité.
- **Typographie :** Inter

---

## 📋 Spécifications Fonctionnelles Implémentées

### 🔴 Indispensable (MVP) — ✅ 100 % Réalisé
- [x] **1. Authentification sécurisée & Profil :** Inscription, connexion via JWT (`Bearer`), hachage `bcrypt`, modification du nom et du mot de passe (`/api/auth/profile`), et réinitialisation de mot de passe par e-mail (`/api/auth/forgot-password` & `/api/auth/reset-password`).
- [x] **2. Gestion des Groupes & Projets :** Création, édition et suppression d'espaces de travail (Groupes) et de sous-projets collaboratifs associés.
- [x] **3. Gestion des tâches (CRUD complet) :** Création, édition complète via modale dédiée (titre, description, urgence, importance, statut, échéance, contexte, projet associé, membres assignés) et suppression.
- [x] **4. Calcul automatique de quadrant & Drag & Drop :** Classification automatique dans la matrice d'Eisenhower (*Q1 Faire, Q2 Planifier, Q3 Déléguer, Q4 Éliminer*) et déplacement des cartes par **Glisser-Déposer (Drag & Drop)** ou menu rapide d'un quadrant à l'autre.
- [x] **5. Suivi d'avancement :** Statut (`todo` / *À faire*, `doing` / `in_progress` / *En cours*, `done` / *Terminé*) modifiable en un clic.

### 🟡 Souhaitable — ✅ 100 % Réalisé
- [x] **6. Invitations par e-mail (SMTP Gmail) :** Envoi d'e-mails HTML avec lien sécurisé (`/invitations/accept?token=...`), vérification d'expiration et acceptation en 1 clic.
- [x] **7. Contrôle d'accès (RBAC) à 2 niveaux :** Gestion des rôles et permissions au niveau des Groupes (`owner`, `admin`, `member`) et des Projets (`project_lead`, `contributor`, `viewer`) directement depuis l'interface, avec protection du dernier `project_lead` et du propriétaire du groupe.
- [x] **8. Gestion des retards, filtres avancés & Vue Calendrier (Agenda) :**
  - Filtrage de la Matrice principale et de la vue Liste par **Contexte** (`Tous`, `Entreprise`, `École`), par **Projet** (`Tous les projets`, `Projet Général`, ou projet spécifique), par **Quadrant** et par **Statut**.
  - **Vue Calendrier / Agenda (Mois & Semaine)** basée sur les `dueDate` des tâches avec code couleur Eisenhower, création rapide à la date sélectionnée et **Drag & Drop** d'une tâche d'un jour à l'autre (ou depuis les tâches sans date) pour la reprogrammer.

### 🟢 Fonctionnalités Temps Réel & Collaboratives — ✅ 100 % Réalisé
- [x] **9. Chat en temps réel par projet :** Espace de discussion instantané par projet via **Socket.io** avec persistance MongoDB (`messages`).
- [x] **10. Partage de fichiers :** Upload de pièces jointes (PDF, images, archives, documents jusqu'à 5 Mo), téléchargement et suppression synchronisés en temps réel.

---

## 🔐 Modèle de Permissions (RBAC)

TaskFlow implémente une sécurité par rôles à deux niveaux :

| Niveau | Rôle | Droits / Permissions |
| :--- | :--- | :--- |
| **Groupe** | `owner` | Propriétaire du groupe : tous les droits (gestion des membres, invitations, création de projets, suppression du groupe). |
| **Groupe** | `admin` | Gestion globale du groupe, modification des rôles (`admin` / `member`), invitation par e-mail, création et suppression de projets. |
| **Groupe** | `member` | Accès au groupe et participation aux projets autorisés. |
| **Projet** | `project_lead` | Administration du projet (nom/description, suppression), assignation des tâches, gestion des membres et des rôles du projet. |
| **Projet** | `contributor` | Création, édition et déplacement (Drag & Drop) des tâches, participation au chat en direct, dépôt de fichiers. |
| **Projet** | `viewer` | Consultation en lecture seule (matrice du projet, chat, fichiers). |

---

## 🛠️ Stack Technique

- **Frontend :** React 19 (Vite 8), React Router v7, Tailwind CSS v4, Socket.io Client
- **Backend :** Node.js 20 / Express 5 (Architecture Hexagonale)
- **Base de données :** MongoDB 7 (Mongoose 8) + Mongo Express
- **Temps réel & Mails :** Socket.io 4 · Nodemailer (Gmail SMTP avec fallback automatique en développement)
- **Tests & Qualité :** Jest & Supertest (**11 suites · 124 tests unitaires et d'intégration**), ESLint
- **Conteneurisation :** Docker & Docker Compose (4 services orchestrés)

---

## 📐 Architecture Hexagonale (Backend)

Le backend respecte l'architecture hexagonale pour garantir un découplage total entre la logique métier et les adaptateurs techniques :

```text
backend/
├── src/
│   ├── domain/                  # Règles métier pures (Entités & erreurs métier sans dépendances Express)
│   │   ├── identity/User.js
│   │   ├── task/Task.js
│   │   ├── group/Group.js
│   │   ├── project/Project.js
│   │   ├── invitation/Invitation.js
│   │   ├── message/Message.js
│   │   ├── file/ProjectFile.js
│   │   └── errors.js
│   ├── application/             # Cas d'utilisation (Use Cases orchestrant le domaine)
│   │   ├── identity/AuthUseCases.js
│   │   ├── task/TaskUseCases.js
│   │   ├── group/GroupUseCases.js
│   │   ├── project/ProjectUseCases.js
│   │   ├── invitation/InvitationUseCases.js
│   │   ├── message/MessageUseCases.js
│   │   └── file/FileUseCases.js
│   ├── infrastructure/          # Adaptateurs techniques (Mongoose, SMTP, Socket.io, Config)
│   │   ├── config/env.js
│   │   ├── database/mongoConnection.js
│   │   ├── email/EmailService.js
│   │   ├── persistence/         # Schémas Mongoose & Repositories
│   │   └── websocket/socketServer.js
│   └── interfaces/http/         # Contrôleurs, routes Express, middlewares JWT & validation
│       ├── controllers/
│       ├── middlewares/
│       └── routes/
└── tests/
    ├── unit/                    # Tests unitaires de la couche Domaine & Middlewares
    └── integration/             # Tests d'intégration API REST, RBAC, Invitations & Workspace
```

---

## 🔌 Principaux Endpoints API REST

| Domaine | Méthode & Route | Description |
| :--- | :--- | :--- |
| **Santé** | `GET /api/health` | Vérification de l'état du serveur et de MongoDB |
| **Auth & Profil** | `POST /api/auth/register` | Création de compte utilisateur + retour JWT |
| | `POST /api/auth/login` | Authentification + retour JWT |
| | `POST /api/auth/forgot-password` | Envoi d'un lien de réinitialisation par e-mail SMTP |
| | `POST /api/auth/reset-password` | Réinitialisation du mot de passe via jeton sécurisé |
| | `GET /api/auth/me` | Récupération du profil connecté |
| | `PATCH /api/auth/profile` | Modification du nom et/ou du mot de passe |
| **Tâches (Matrice)** | `GET /api/tasks` | Liste des tâches de l'utilisateur (filtrable par `projectId`) |
| | `POST /api/tasks` | Création d'une tâche (calcul automatique du quadrant) |
| | `PATCH /api/tasks/:id` | Mise à jour partielle (titre, quadrant, statut, contexte, projet, échéance) |
| | `DELETE /api/tasks/:id` | Suppression d'une tâche |
| **Groupes** | `GET / POST /api/groups` | Liste et création de groupes |
| | `GET / PATCH / DELETE /api/groups/:groupId` | Détails, renommage et suppression d'un groupe |
| | `POST / PATCH / DELETE /api/groups/:groupId/members/:userId` | Ajout, changement de rôle (`admin`/`member`) et retrait d'un membre |
| **Invitations** | `GET / POST /api/groups/:groupId/invitations` | Liste et envoi d'invitations par e-mail |
| | `DELETE /api/groups/:groupId/invitations/:invitationId` | Révocation d'une invitation en attente |
| | `GET /api/invitations/:token` | Vérification publique d'un jeton d'invitation |
| | `POST /api/invitations/:token/accept` | Acceptation d'une invitation et intégration au groupe |
| **Projets & Workspace** | `GET / POST /api/groups/:groupId/projects` | Liste et création de sous-projets dans un groupe |
| | `GET / PATCH / DELETE /api/projects/:projectId` | Détails enrichis, modification et suppression d'un projet |
| | `POST / PATCH / DELETE /api/projects/:projectId/members/:userId` | Gestion de l'équipe projet (`project_lead`, `contributor`, `viewer`) |
| | `GET / POST / PATCH / DELETE /api/projects/:projectId/tasks` | Gestion des tâches collaboratives du projet |
| | `GET / POST /api/projects/:projectId/messages` | Historique et envoi de messages dans le chat du projet |
| | `GET / POST / DELETE /api/projects/:projectId/files` | Liste, dépôt et suppression de fichiers partagés |

### Événements Temps Réel (Socket.io)
Lorsqu'un membre rejoint la salle d'un projet (`project:join`), son interface se met à jour instantanément sur réception des événements :
- `project:task_created`, `project:task_updated`, `project:task_deleted`
- `project:message_created`
- `project:file_uploaded`, `project:file_deleted`
- `project:members_updated`, `project:updated`

---

## 🚀 Installation & Lancement Rapide (Docker)

### 1. Prérequis
- **Docker** et **Docker Compose** installés sur votre machine.
- Un fichier `.env` à la racine du projet (un modèle [`.env.example`](file:///home/nboulad/M1/FullStack-JS/TaskFlow-up/.env.example) est fourni).

### 2. Démarrer l'ensemble de la stack
```bash
docker compose up -d --build
```

Les 4 services sont alors accessibles sur :
- **Frontend (React / Vite) :** `http://localhost:5173`
- **Backend (API Express & Socket.io) :** `http://localhost:3000/api`
- **Mongo Express (Interface d'administration MongoDB) :** `http://localhost:8081`
- **MongoDB :** `mongodb://localhost:27017`

### 3. Exécuter les tests et le linter
```bash
# Lancer les 11 suites de tests (124 tests unitaires + intégration) dans le conteneur Backend
docker exec taskflow-backend npm test

# Vérifier le linter Backend & Frontend
docker exec taskflow-backend npm run lint
docker exec taskflow-frontend npm run lint

# Vérifier le build de production Frontend
docker exec taskflow-frontend npm run build
```

---

## ⚙️ Directives de Développement

- **TDD (Test-Driven Development) :** Respect strict du cycle *Test rouge ➔ Test vert ➔ Refactor*.
- **Git Workflow :**
  - Une branche dédiée par fonctionnalité (`feature/...`).
  - Pull Request (PR) obligatoirement relue et validée avant tout merge sur la branche principale.
