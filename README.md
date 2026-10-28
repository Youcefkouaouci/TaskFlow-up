# TaskFlow – Mini-Jira & Matrice d'Eisenhower

> **Plateforme collaborative de gestion de projets et de tâches inspirée de Jira.**  
> Combinant la matrice d'Eisenhower et une organisation par espaces de travail, développée dans le cadre d'un projet d'études.

---

## 🎯 Vision du Projet & Livrable

### 1. Problématique & Solution
- **Les problèmes constatés :**
  1. Une liste *To-Do* classique n'aide pas à hiérarchiser : la tyrannie de l'urgence prend constamment le dessus sur ce qui est réellement important.
  2. Le travail en équipe et la transmission des tâches se font trop souvent de manière cloisonnée ou via des canaux éparpillés (e-mails isolés, messageries multiples).
- **La solution TaskFlow :**  
  TaskFlow structure le travail en **Groupes** et en **Projets**, tout en classant automatiquement chaque tâche dans l'un des **quatre quadrants d'Eisenhower** (*Faire, Planifier, Déléguer, Éliminer*). La plateforme intègre également le partage collaboratif, les invitations sécurisées par e-mail, un chat par projet et le partage de fichiers.

### 2. Cible Utilisateur
TaskFlow s'adresse en priorité aux **étudiants en alternance** et aux équipes agiles qui jonglent simultanément entre les exigences académiques et les impératifs professionnels.

### 3. Branding & Identité Visuelle
- **Nom :** TaskFlow
- **Accroche :** « *L'important d'abord.* »
- **Style visuel :** Direction minimale monochrome, orientée productivité.
- **Typographie :** Inter

---

## 📋 Spécifications Fonctionnelles (Roadmap)

### 🔴 Indispensable (MVP)
1. **Authentification sécurisée :** Inscription et connexion via JWT, mots de passe hachés (`bcrypt`).
2. **Gestion des Groupes & Projets :** Création d'espaces de travail et de sous-projets associés.
3. **Gestion des tâches (CRUD) :** API RESTful pour la manipulation des tâches au sein des projets.
4. **Calcul de quadrant :** Cases *Urgent* et *Important* permettant la classification automatique dans la matrice d'Eisenhower.
5. **Suivi d'avancement :** Statut (`À faire`, `En cours`, `Terminé`) modifiable dynamiquement.

### 🟡 Souhaitable
6. **Invitations par e-mail :** Envoi de liens d'invitation sécurisés (avec jeton et expiration) pour rejoindre un groupe.
7. **Contrôle d'accès (RBAC) :** Gestion fine des rôles et permissions au niveau des groupes et des projets.
8. **Gestion des retards & filtres :** Mise en avant visuelle des tâches en retard et tri par statut.

### 🟢 Si le temps le permet
9. **Chat en temps réel :** Espace de discussion instantané par projet (via Socket.io).
10. **Partage de fichiers :** Association de pièces jointes aux projets et aux tâches.

---

## 🔐 Modèle de Permissions (RBAC)

TaskFlow implémente une sécurité par rôles à deux niveaux :

| Niveau | Rôle | Droits / Permissions |
| :--- | :--- | :--- |
| **Groupe** | `Owner` / `Admin` | Gestion globale du groupe, invitation des membres par e-mail, création de projets. |
| **Groupe** | `Member` | Accès au groupe et participation aux projets autorisés. |
| **Projet** | `Project Lead` | Administration du projet, assignation des tâches, gestion de l'équipe projet. |
| **Projet** | `Contributor` | Création et modification des tâches, participation au chat, dépôt de fichiers. |
| **Projet** | `Viewer` | Consultation en lecture seule (matrice, chat, fichiers). |

---

## 🛠️ Stack Technique

- **Frontend :** React (Vite)
- **Backend :** Node.js / Express
- **Base de données :** MongoDB (Mongoose)
- **Temps réel & Mails :** Socket.io · Nodemailer / Resend
- **Tests :** Jest & Supertest

---

## 📐 Architecture Hexagonale (Backend)

Le backend respecte l'architecture hexagonale pour garantir un découplage total entre la logique métier et les adaptateurs techniques :

```text
backend/src/
├── domain/            # Règles métier pures (Entités et logique sans dépendances Express/Mongoose)
├── application/       # Cas d'utilisation (Use Cases : Auth, Tasks, Groups, Invitations)
├── infrastructure/    # Implémentations Mongoose, services d'e-mail, WebSockets
└── interfaces/http/   # Contrôleurs, routes Express, middlewares d'authentification et RBAC

backend/tests/
├── unit/              # Tests unitaires de la couche Domaine
└── integration/       # Tests d'intégration de l'API

⚙️ Directives de Développement

    TDD (Test-Driven Development) : Respect strict du cycle Test rouge ➔ Test vert ➔ Refactor.

    Git Workflow :

        Une branche dédiée par fonctionnalité (feature/...).

        Pull Request (PR) obligatoirement relue et validée avant tout merge sur la branche principale.