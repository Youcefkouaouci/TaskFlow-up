# TaskFlow - Guide d'Intégration Frontend & Spécifications API

Ce document détaille l'adaptation des maquettes Stitch ([code.html](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/code.html)) en architecture **React 19 + Tailwind CSS v4**, la liste exhaustive des fonctionnalités frontend des 3 pages, et les spécifications techniques de chaque endpoint API backend attendu.

---

## 1. Vue d'Ensemble & Architecture

L'application TaskFlow s'articule autour de 5 vues interconnectées :
1. **Page 1 : La Matrice d'Eisenhower 2x2 interactive** (Dashboard de productivité & focus).
2. **Page 2 : L'Écran de Création de Tâche Dédié** (Moteur d'évaluation Eisenhower en temps réel).
3. **Page 3 : La Vue Liste & Filtres** (Gestion tabulaire, recherche instantanée, alertes de retard & statut cyclique).
4. **Page 4 : La Vue Partages par Email** (Transmission directe structurée, suggestions de contacts, aperçu du gabarit e-mail et historique).
5. **Page 5 : Le Module Authentification (Connexion & Inscription)** (Écrans de login et d'inscription, gestion dynamique des erreurs et conformité WCAG AAA).

```text
frontend/src/
├── App.jsx                     # Composant racine, orchestration d'état & navigation entre vues
├── index.css                   # Configuration @theme Tailwind v4 & safe-areas
├── pages/
│   ├── CreateTaskPage.jsx      # PAGE 2 : Formulaire complet de création & moteur Eisenhower
│   ├── ListAndFiltersPage.jsx  # PAGE 3 : Vue Liste, filtres dynamiques, alertes de retard
│   ├── SharesPage.jsx          # PAGE 4 : Délégation et partage par e-mail structuré
│   ├── LoginPage.jsx           # PAGE 5A : Module de connexion (carte unique, validation dynamique)
│   ├── RegisterPage.jsx        # PAGE 5B : Module d'inscription (création de compte alternant)
│   └── ForgotPasswordPage.jsx  # PAGE 5C : Réinitialisation de mot de passe & renvoi
├── components/
│   ├── Header.jsx              # En-tête adaptatif, logo 2x2, compteur urgent, accès profil
│   ├── ContextSwitch.jsx       # Bascule Semaine Entreprise / École & bouton nouvelle tâche
│   ├── ProductivityBanner.jsx  # Bannière de charge mentale et tempo
│   ├── Quadrant.jsx            # Affichage d'un quadrant Eisenhower (1 à 4)
│   ├── TaskCard.jsx            # Carte de tâche individuelle (checkbox, badges, actions)
│   ├── MatrixSummary.jsx       # Résumé global & bascule mode "Focus Faire seul"
│   ├── NewTaskModal.jsx        # Dialogue de création rapide
│   ├── BottomNav.jsx           # Barre d'onglets inférieure fixe (4 vues)
│   └── Toast.jsx               # Feedback utilisateur éphémère
├── data/
│   └── initialTasks.js         # Données d'exemple conformes aux maquettes
└── services/
    ├── taskService.js          # Couche d'abstraction API REST des tâches (fallback local)
    └── authService.js          # Couche d'authentification JWT (login, register, forgot-password, me)
```

---

## 2. Inventaire des Fonctionnalités - Page 1 : Matrice d'Eisenhower

### F1. Chargement & Affichage de la Matrice 2x2
* **Fichiers** : [`src/App.jsx`](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/TaskFlow-up/frontend/src/App.jsx), [`src/components/Quadrant.jsx`](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/TaskFlow-up/frontend/src/components/Quadrant.jsx)
* **Description** : Répartition dynamique dans les 4 quadrants :
  1. **Quadrant 1 (FAIRE)** : Urgent & Important (mise en valeur avec bordure bordeaux gauche).
  2. **Quadrant 2 (PLANIFIER)** : Non urgent & Important.
  3. **Quadrant 3 (DÉLÉGUER)** : Urgent & Non important.
  4. **Quadrant 4 (ÉLIMINER)** : Ni urgent ni important.

### F2. Bascule de Contexte d'Alternance (Entreprise / École)
* **Fichier** : [`src/components/ContextSwitch.jsx`](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/TaskFlow-up/frontend/src/components/ContextSwitch.jsx)
* **Description** : Bascule immédiate entre les sphères de travail d'alternance avec indicateur de jours restants.

### F3. Bannière d'Actions Critiques & Rythme
* **Fichier** : [`src/components/ProductivityBanner.jsx`](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/TaskFlow-up/frontend/src/components/ProductivityBanner.jsx)
* **Description** : Avertissement de délai imminent (ex: `avant 18h`) et niveau de tempo (`Rythme soutenu`).

### F4. Interaction Checkbox & Actions Dédiées (Déléguer / Éliminer)
* **Fichier** : [`src/components/TaskCard.jsx`](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/TaskFlow-up/frontend/src/components/TaskCard.jsx)
* **Description** : Coche/décoche immédiate, action de délégation `mailto:` pour le quadrant 3 et suppression pour le quadrant 4.

---

## 3. Inventaire des Fonctionnalités - Page 2 : Création De Tâche

### F5. En-tête de Navigation avec Retour
* **Fichier** : [`src/pages/CreateTaskPage.jsx`](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/TaskFlow-up/frontend/src/pages/CreateTaskPage.jsx)
* **Description** : Bouton retour fléché (`arrow_back`), identité visuelle et navigation sécurisée sans rechargement.

### F6. Moteur Dynamique d'Évaluation Eisenhower (Core Engine)
* **Fichier** : [`src/pages/CreateTaskPage.jsx`](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/TaskFlow-up/frontend/src/pages/CreateTaskPage.jsx)
* **Description** : Deux switches interactifs ("C'est urgent" & "C'est important") avec calcul dynamique du quadrant et mise à jour en temps réel d'une mini-matrice SVG vectorielle.

### F7. Échéances, Statuts, Collaboration & Raccourcis
* **Fichier** : [`src/pages/CreateTaskPage.jsx`](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/TaskFlow-up/frontend/src/pages/CreateTaskPage.jsx)
* **Description** : Raccourcis rapides d'échéance (`Demain 09h00`, `Fin de semaine`), alerte rappel `-1h`, dispatch email du tuteur et raccourci clavier `⌘ + Entrée` / `Ctrl + Entrée`.

---

## 4. Inventaire des Fonctionnalités - Page 3 : Liste & Filtres

### F8. Recherche Textuelle Instantanée (Live Search)
* **Fichier** : [`src/pages/ListAndFiltersPage.jsx`](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/TaskFlow-up/frontend/src/pages/ListAndFiltersPage.jsx)
* **Description** : Champ de recherche avec icône `search` et bouton d'effacement `cancel`. Filtre instantanément par mots-clés sur l'intitulé et les tags de contexte.

### F9. Filtres par Statut avec Compteurs Dynamiques
* **Fichier** : [`src/pages/ListAndFiltersPage.jsx`](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/TaskFlow-up/frontend/src/pages/ListAndFiltersPage.jsx)
* **Description** : Pilules horizontales scrollables affichant le nombre exact d'actions disponibles pour chaque statut :
  * `Toutes` (Total actif)
  * `À faire`
  * `En cours`
  * `Terminées`

### F10. Filtres Contextuels d'Alternance
* **Fichier** : [`src/pages/ListAndFiltersPage.jsx`](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/TaskFlow-up/frontend/src/pages/ListAndFiltersPage.jsx)
* **Description** : Sélecteur de sphère d'alternance (`Tous`, `Entreprise` avec puce rouge, `École` avec puce grise) et bouton `Réinitialiser`.

### F11. Bannière d'Alerte : Tâche en Retard (Overdue Section)
* **Fichier** : [`src/pages/ListAndFiltersPage.jsx`](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/TaskFlow-up/frontend/src/pages/ListAndFiltersPage.jsx)
* **Description** : Mise en avant de la tâche critique en retard avec liseré bordeaux, badge `Alerte Retard · 1 jour`, mention de l'échéance dépassée et de l'attente tuteur.
* **Actions en un clic** :
  * `Terminer` : Clôture instantanée de la tâche avec animation et notification toast.
  * `Reprogrammer` : Reporte l'échéance à demain 09:00.

### F12. Tâches Groupées par Quadrants Eisenhower
* **Fichier** : [`src/pages/ListAndFiltersPage.jsx`](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/TaskFlow-up/frontend/src/pages/ListAndFiltersPage.jsx)
* **Description** : Regroupement visuel sous chaque quadrant avec puces indicatrices :
  * `1. Faire (Urgent & Important)` : puce rouge cerclée.
  * `2. Planifier (Important)` : puce noire cerclée.
  * `3. Déléguer` : puce grise cerclée.
  * `4. Éliminer / Décharger` : puce gris clair cerclée.

### F13. "Tap-to-Change Status" (Cycle de Statut Interactif)
* **Fichier** : [`src/pages/ListAndFiltersPage.jsx`](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/TaskFlow-up/frontend/src/pages/ListAndFiltersPage.jsx)
* **Description** : Un simple clic sur le badge de statut fait progresser la tâche dans son workflow sans ouvrir de modale :
  $$\text{À faire} \longrightarrow \text{En cours} \longrightarrow \text{Terminé} \longrightarrow \text{À faire}$$
* **Comportement visuel** : Pastille de couleur dynamique et notification toast confirmant le nouvel état.

### F14. État Vide Délicat (Empty State)
* **Fichier** : [`src/pages/ListAndFiltersPage.jsx`](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/TaskFlow-up/frontend/src/pages/ListAndFiltersPage.jsx)
* **Description** : Affiché lorsqu'aucune tâche ne correspond aux critères de recherche ou de filtre actifs. Fournit un bouton `Réinitialiser les filtres`.

### F15. Barre de Progression & Synthèse
* **Fichier** : [`src/pages/ListAndFiltersPage.jsx`](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/TaskFlow-up/frontend/src/pages/ListAndFiltersPage.jsx)
* **Description** : Affiche le décompte total, le nombre de retards, les tâches achevées et le pourcentage de complétion global (ex: `22%`).

---

## 5. Inventaire des Fonctionnalités - Page 4 : Partages par Email

### F16. Fiche Descriptive de la Tâche à Déléguer
* **Fichier** : [`src/pages/SharesPage.jsx`](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/TaskFlow-up/frontend/src/pages/SharesPage.jsx)
* **Description** : Présente la tâche sélectionnée pour transmission (badge contextuel `École · Master 2`, statut `DÉLÉGUER` avec pastille bordeaux, échéance `29 oct. 14h`, état `À faire` et livrables requis).

### F17. Saisie du Destinataire & Suggestions Fréquentes
* **Fichier** : [`src/pages/SharesPage.jsx`](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/TaskFlow-up/frontend/src/pages/SharesPage.jsx)
* **Description** : Champ d'e-mail avec validation et sélecteur de contacts fréquents d'alternance (`Sarah D. (Mémoire)`, `Alexandre M. (Tuteur)`, `Thomas L. (Groupe)`) permettant de préremplir l'adresse en un clic.

### F18. Objet et Note d'Accompagnement Réactive
* **Fichier** : [`src/pages/SharesPage.jsx`](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/TaskFlow-up/frontend/src/pages/SharesPage.jsx)
* **Description** : Champ d'objet formaté TaskFlow (`[TaskFlow] Tâche assignée : ...`) et zone de texte pour la note personnalisée dont les saisies se répercutent instantanément dans l'aperçu en direct.

### F19. Copie Conforme Invisible (CCI) Académique
* **Fichier** : [`src/pages/SharesPage.jsx`](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/TaskFlow-up/frontend/src/pages/SharesPage.jsx)
* **Description** : Switch à bascule permettant d'envoyer automatiquement une copie cachée vers la boîte académique ou professionnelle de l'étudiant pour conserver la traçabilité.

### F20. Live Preview Container (Gabarit E-mail Normalisé)
* **Fichier** : [`src/pages/SharesPage.jsx`](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/TaskFlow-up/frontend/src/pages/SharesPage.jsx)
* **Description** : Visualiseur WYSIWYG en temps réel simulant le courriel reçu par le collaborateur :
  * Bannière d'en-tête TaskFlow avec mention `Notification de délégation` et badge `URGENT`.
  * Message personnel de l'alternant inséré en italique.
  * Encadré de la tâche détaillée (Cadran Eisenhower, échéance, contexte de master, statut).
  * Pied de page avec lien direct `Ouvrir dans le navigateur`.

### F21. Action d'Envoi Sécurisé SendGrid / SMTP
* **Fichier** : [`src/pages/SharesPage.jsx`](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/TaskFlow-up/frontend/src/pages/SharesPage.jsx)
* **Description** : Bouton d'action proéminent avec état de chargement dynamique (`Envoi en cours via SendGrid...`), blocage des clics multiples et notification toast de confirmation. Mention du protocole SMTP crypté.

### F22. Historique des Dernières Délégations
* **Fichier** : [`src/pages/SharesPage.jsx`](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/TaskFlow-up/frontend/src/pages/SharesPage.jsx)
* **Description** : Liste récapitulative des partages récents (`2 envois cette semaine`) avec titre, date relative (`Hier à 17h30`, `Il y a 3 jours`), contexte et accusés de réception (`Remis`, `Consulté`, icônes `check` / `done_all`).

---

## 6. Inventaire des Fonctionnalités - Page 5 : Authentification (Connexion & Inscription)

> **Note de conception** : Conformément aux exigences, les grilles de démonstration et sélecteurs de test artificiels ont été retirés pour laisser place à des pages authentiques, centrées et dynamiques, où les états (erreurs 401, 409, 422, chargement, expiration 403) apparaissent naturellement selon les interactions de l'utilisateur.

### F23. Formulaire de Connexion Directe & Sécurisée
* **Fichier** : [`src/pages/LoginPage.jsx`](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/TaskFlow-up/frontend/src/pages/LoginPage.jsx)
* **Description** : Carte de connexion unique épurée au design monochrome avec accent rouge `#E5484D`. Champs email et mot de passe conformes WCAG AAA (cibles 44px, focus outline visible 2px, contraste 13:1).

### F24. Validation de Formulaire & Retours Visuels Dynamiques
* **Fichiers** : [`src/pages/LoginPage.jsx`](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/TaskFlow-up/frontend/src/pages/LoginPage.jsx), [`src/pages/RegisterPage.jsx`](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/TaskFlow-up/frontend/src/pages/RegisterPage.jsx)
* **Description** : Détection des erreurs à la saisie et à la soumission avec liseré d'alerte rouge (`border-2 border-[#E5484D]`), fond teinté `#FFF0F0` et message contextuel sous chaque champ concerné.

### F25. Bascule Visuelle du Mot de Passe (Show / Hide Password)
* **Fichiers** : [`src/pages/LoginPage.jsx`](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/TaskFlow-up/frontend/src/pages/LoginPage.jsx), [`src/pages/RegisterPage.jsx`](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/TaskFlow-up/frontend/src/pages/RegisterPage.jsx)
* **Description** : Boutons tactiles 44x44px avec bascule d'icône SVG œil ouvert / barré. Indépendant pour le mot de passe et sa confirmation sur la page d'inscription.

### F26. Bannières Contextuelles d'Alerte
* **Fichiers** : [`src/pages/LoginPage.jsx`](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/TaskFlow-up/frontend/src/pages/LoginPage.jsx), [`src/pages/RegisterPage.jsx`](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/TaskFlow-up/frontend/src/pages/RegisterPage.jsx)
* **Description** :
  * **Erreur identifiants (401)** : Fond `#FFF0F0`, bordure `#E5484D`, mention `Email ou mot de passe incorrect.`.
  * **Session expirée (403)** : Fond monochrome `#F5F5F5`, bordure `#111111`, mention `Votre session a expiré, reconnectez-vous.`.
  * **Conflit email (409)** : Fond `#FFF0F0`, bordure `#E5484D`, mention `Cette adresse email est déjà associée à un compte.`.

### F27. Module d'Inscription Structuré (Création de Compte)
* **Fichier** : [`src/pages/RegisterPage.jsx`](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/TaskFlow-up/frontend/src/pages/RegisterPage.jsx)
* **Description** : Formulaire complet dédié aux alternants et étudiants :
  * Saisie du Nom complet (minimum 2 caractères).
  * Saisie de l'adresse email académique ou professionnelle.
  * Sélecteur de profil en un clic (`Alternant (Entreprise & École)`, `Étudiant`, `Professionnel`).
  * Double saisie sécurisée du mot de passe avec validation de concordance.
  * Case à cocher obligatoire d'acceptation des CGU et politique de confidentialité.

### F28. États de Chargement Asynchrone avec Spinner
* **Fichiers** : [`src/pages/LoginPage.jsx`](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/TaskFlow-up/frontend/src/pages/LoginPage.jsx), [`src/pages/RegisterPage.jsx`](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/TaskFlow-up/frontend/src/pages/RegisterPage.jsx)
* **Description** : Durant l'appel API, le bouton principal passe en opacité réduite, le libellé affiche un spinner SVG animé `animate-spin` et le curseur d'attente `cursor-wait` est activé pour empêcher les doubles soumissions.

### F29. Navigation Fluide Connexion <-> Inscription
* **Fichiers** : [`src/pages/LoginPage.jsx`](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/TaskFlow-up/frontend/src/pages/LoginPage.jsx), [`src/pages/RegisterPage.jsx`](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/TaskFlow-up/frontend/src/pages/RegisterPage.jsx), [`src/App.jsx`](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/TaskFlow-up/frontend/src/App.jsx)
* **Description** : Bascule instantanée entre la connexion ("Pas encore de compte ? Créer un compte") et l'inscription ("Déjà un compte ? Se connecter") sans perte d'état et avec mise à jour du titre d'en-tête.

### F30. Écran Dédié "Mot de Passe Oublié" & Réinitialisation
* **Fichier** : [`src/pages/ForgotPasswordPage.jsx`](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/TaskFlow-up/frontend/src/pages/ForgotPasswordPage.jsx)
* **Description** : Workflow complet de réinitialisation :
  * Préremplissage avec l'adresse email déjà renseignée sur la page de connexion.
  * Validation dynamique du format email avant appel de l'API.
  * État de confirmation visuel avec icône de coche et résumé clair.
  * Bouton de renvoi avec compte à rebours de sécurité (cooldown de 30 secondes).
  * Bouton principal et lien de retour rapide vers la connexion.

### F31. Vue de Session Active & Déconnexion ("Vous êtes déjà connecté")
* **Fichiers** : [`src/pages/ProfilePage.jsx`](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/TaskFlow-up/frontend/src/pages/ProfilePage.jsx), [`src/App.jsx`](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/TaskFlow-up/frontend/src/App.jsx), [`src/components/Header.jsx`](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/TaskFlow-up/frontend/src/components/Header.jsx)
* **Description** : Gestion ergonomique de l'état connecté :
  * **Masquage des formulaires** : Lorsque l'utilisateur est authentifié (`token` JWT valide dans `localStorage`), les formulaires de connexion, inscription et mot de passe oublié ne sont plus affichés.
  * **Bannière informative** : Affiche un bandeau vert émeraude avec coche de validation indiquant `Vous êtes déjà connecté. Votre compte est authentifié. Vos tâches et délégations sont synchronisées en continu avec la base de données.`.
  * **Carte d'identité de l'alternant** : Affiche l'avatar avec initiales, l'adresse email, le profil et les badges techniques de session active (Docker Backend, JWT Bearer).
  * **Accès direct au travail** : Liens rapides vers la matrice d'Eisenhower et la liste des tâches partagées.
  * **Bouton de déconnexion** : Action stylisée aux couleurs d'alerte (`#E5484D`) permettant de vider le cache d'authentification (`localStorage.removeItem`), réinitialiser l'état et afficher une confirmation toast.
  * **Indicateur Header** : L'avatar de l'en-tête affiche l'initiale de l'utilisateur ainsi qu'une pastille verte pulsée de présence en ligne.

---

## 7. Spécifications des Endpoints API Backend

### 1. Récupération filtrée de la liste des tâches
* **Méthode** : `GET`
* **Route** : `/api/tasks`
* **Query Parameters** :
  * `search` : string (terme de recherche libre)
  * `status` : `todo` | `inprogress` | `done`
  * `context` : `Entreprise` | `École`
* **Headers** : `Authorization: Bearer <jwt_token>`
* **Réponse attendue (`200 OK`)** :
  ```json
  [
    {
      "id": "task-1",
      "title": "Livrable sprint : Maquettes API livret",
      "quadrant": 1,
      "context": "Entreprise",
      "tag": "Entreprise",
      "deadline": "Aujourd'hui, 17h00",
      "status": "inprogress",
      "completed": false
    }
  ]
  ```

---

### 2. Récupération de la tâche en retard prioritaire
* **Méthode** : `GET`
* **Route** : `/api/tasks/overdue`
* **Headers** : `Authorization: Bearer <jwt_token>`
* **Réponse attendue (`200 OK`)** :
  ```json
  {
    "id": "task-overdue-1",
    "title": "Rapport hebdomadaire activité entreprise",
    "quadrant": 1,
    "context": "Entreprise",
    "deadline": "Hier à 18:00",
    "overdueDays": 1,
    "tutorNote": "Tuteur en attente",
    "status": "todo"
  }
  ```

---

### 3. Cycle ou mise à jour du statut d'une tâche
* **Méthode** : `PATCH`
* **Route** : `/api/tasks/:id/status`
* **Headers** :
  ```http
  Content-Type: application/json
  Authorization: Bearer <jwt_token>
  ```
* **Corps (`Body JSON`)** :
  ```json
  {
    "status": "inprogress",
    "completed": false
  }
  ```
* **Réponse (`200 OK`)** :
  ```json
  {
    "id": "task-1",
    "status": "inprogress",
    "completed": false,
    "updatedAt": "2026-10-27T16:20:00.000Z"
  }
  ```

---

### 4. Reprogrammation de l'échéance (Reschedule)
* **Méthode** : `PATCH`
* **Route** : `/api/tasks/:id/reschedule`
* **Headers** :
  ```http
  Content-Type: application/json
  Authorization: Bearer <jwt_token>
  ```
* **Corps (`Body JSON`)** :
  ```json
  {
    "deadline": "Demain, 09:00",
    "rescheduleReason": "Report d'urgence"
  }
  ```
* **Réponse (`200 OK`)** :
  ```json
  {
    "id": "task-overdue-1",
    "deadline": "Demain, 09:00",
    "isOverdue": false
  }
  ```

---

### 5. Création d'une tâche (Page 2)
* **Méthode** : `POST`
* **Route** : `/api/tasks`
* **Corps (`Body JSON`)** :
  ```json
  {
    "title": "Dossier d'évaluation tuteur M1",
    "quadrant": 1,
    "context": "Entreprise",
    "subContext": "TechCorp",
    "isUrgent": true,
    "isImportant": true,
    "deadline": "Aujourd'hui",
    "status": "À faire",
    "notifyEmail": "tuteur@techcorp.fr"
  }
  ```
* **Réponse (`201 Created`)** : `{ "id": "task-...", "title": "..." }`

---

### 6. Statistiques globales d'avancement
* **Méthode** : `GET`
* **Route** : `/api/tasks/stats`
* **Réponse (`200 OK`)** :
  ```json
  {
    "totalTasks": 9,
    "overdueCount": 1,
    "doneCount": 2,
    "completionPercentage": 22
  }
  ```

---

### 7. Partage / Délégation d'une tâche par courriel
* **Méthode** : `POST`
* **Route** : `/api/tasks/:id/share-email`
* **Headers** :
  ```http
  Content-Type: application/json
  Authorization: Bearer <jwt_token>
  ```
* **Corps (`Body JSON`)** :
  ```json
  {
    "taskId": "task-delegated-1",
    "recipientEmail": "sarah.durand@etudiant-ecole.fr",
    "subject": "[TaskFlow] Tâche assignée : Finaliser la partie Analyse Financière du mémoire de groupe",
    "customNote": "Salut Sarah, voici les éléments convenus pour notre rendu de jeudi. Peux-tu t'en charger ? Merci !",
    "sendCci": true
  }
  ```
* **Réponse attendue (`200 OK`)** :
  ```json
  {
    "success": true,
    "messageId": "msg_sendgrid_9821731",
    "sentAt": "2026-10-27T16:30:00.000Z",
    "recipient": "sarah.durand@etudiant-ecole.fr",
    "status": "queued"
  }
  ```

---

### 8. Liste des contacts d'alternance fréquents
* **Méthode** : `GET`
* **Route** : `/api/contacts/frequent`
* **Headers** : `Authorization: Bearer <jwt_token>`
* **Réponse attendue (`200 OK`)** :
  ```json
  [
    {
      "id": "contact-1",
      "name": "Sarah D.",
      "role": "Mémoire",
      "email": "sarah.durand@etudiant-ecole.fr"
    },
    {
      "id": "contact-2",
      "name": "Alexandre M.",
      "role": "Tuteur",
      "email": "alexandre.martin@entreprise-corp.com"
    },
    {
      "id": "contact-3",
      "name": "Thomas L.",
      "role": "Groupe",
      "email": "thomas.lefevre@etudiant-ecole.fr"
    }
  ]
  ```

---

### 9. Historique des délégations envoyées
* **Méthode** : `GET`
* **Route** : `/api/delegations/history`
* **Headers** : `Authorization: Bearer <jwt_token>`
* **Réponse attendue (`200 OK`)** :
  ```json
  [
    {
      "id": "hist-1",
      "taskId": "task-10",
      "title": "Compte-rendu réunion envoyé à Alex",
      "context": "Entreprise",
      "dateText": "Hier à 17h30",
      "status": "Remis",
      "icon": "check"
    },
    {
      "id": "hist-2",
      "taskId": "task-11",
      "title": "Maquettes UI envoyées à Thomas",
      "context": "École",
      "dateText": "Il y a 3 jours",
      "status": "Consulté",
      "icon": "done_all"
    }
  ]
  ```

---

### 10. Connexion & Authentification JWT
* **Méthode** : `POST`
* **Route** : `/api/auth/login`
* **Headers** :
  ```http
  Content-Type: application/json
  ```
* **Corps (`Body JSON`)** :
  ```json
  {
    "email": "lucas.martin@master-gestion.fr",
    "password": "alternance2026!"
  }
  ```
* **Réponses HTTP** :
  * **`200 OK` (Succès)** :
    ```json
    {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "usr-1",
        "email": "lucas.martin@master-gestion.fr",
        "name": "Lucas Martin",
        "role": "Alternant Master 2"
      }
    }
    ```
  * **`401 Unauthorized` (Identifiants invalides)** :
    ```json
    {
      "error": "Email ou mot de passe incorrect."
    }
    ```
  * **`422 Unprocessable Entity` (Erreurs de validation champs)** :
    ```json
    {
      "errors": {
        "email": "Adresse email invalide",
        "password": "8 caractères minimum"
      }
    }
    ```

---

### 11. Inscription / Création de Compte
* **Méthode** : `POST`
* **Route** : `/api/auth/register`
* **Headers** :
  ```http
  Content-Type: application/json
  ```
* **Corps (`Body JSON`)** :
  ```json
  {
    "name": "Lucas Martin",
    "email": "lucas.martin@master-gestion.fr",
    "role": "Alternant (Entreprise & École)",
    "password": "alternance2026!"
  }
  ```
* **Réponses HTTP** :
  * **`201 Created` (Compte créé avec succès)** :
    ```json
    {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "usr-92817",
        "name": "Lucas Martin",
        "email": "lucas.martin@master-gestion.fr",
        "role": "Alternant (Entreprise & École)"
      }
    }
    ```
  * **`409 Conflict` (Email déjà enregistré)** :
    ```json
    {
      "error": "Cette adresse email est déjà associée à un compte."
    }
    ```
  * **`422 Unprocessable Entity` (Erreurs de validation)** :
    ```json
    {
      "errors": {
        "name": "2 caractères minimum requis",
        "email": "Adresse email invalide",
        "password": "8 caractères minimum"
      }
    }
    ```

---

### 12. Demande de Réinitialisation de Mot de Passe
* **Méthode** : `POST`
* **Route** : `/api/auth/forgot-password`
* **Headers** :
  ```http
  Content-Type: application/json
  ```
* **Corps (`Body JSON`)** :
  ```json
  {
    "email": "lucas.martin@master-gestion.fr"
  }
  ```
* **Réponse attendue (`200 OK`)** :
  ```json
  {
    "message": "Un lien de réinitialisation sécurisé a été envoyé par e-mail."
  }
  ```

---

### 13. Profil Utilisateur Actif & Validité de Session
* **Méthode** : `GET`
* **Route** : `/api/auth/me`
* **Headers** :
  ```http
  Authorization: Bearer <jwt_token>
  ```
* **Réponses HTTP** :
  * **`200 OK`** :
    ```json
    {
      "id": "usr-1",
      "email": "lucas.martin@master-gestion.fr",
      "name": "Lucas Martin",
      "currentContext": "Entreprise"
    }
    ```
  * **`403 Forbidden` (Session expirée)** :
    ```json
    {
      "error": "Token expiré. Veuillez vous reconnecter."
    }
    ```

---

### 14. Déconnexion
* **Méthode** : `POST`
* **Route** : `/api/auth/logout`
* **Headers** :
  ```http
  Authorization: Bearer <jwt_token>
  ```
* **Réponse (`200 OK`)** :
  ```json
  {
    "message": "Déconnexion réussie."
  }
  ```

---

## 8. Basculer vers l'API Backend Réelle

Toutes les requêtes passent par les couches de services [`src/services/taskService.js`](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/TaskFlow-up/frontend/src/services/taskService.js) et [`src/services/authService.js`](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/TaskFlow-up/frontend/src/services/authService.js). Dès que les endpoints Express/MongoDB seront codés :
1. Définir l'URL dans `frontend/.env` :
   ```env
   VITE_API_URL=http://localhost:3000/api
   ```
2. Dans [`src/services/taskService.js`](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/TaskFlow-up/frontend/src/services/taskService.js) et [`src/services/authService.js`](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/TaskFlow-up/frontend/src/services/authService.js) :
   ```javascript
   const ENABLE_REAL_API = true;
   ```
