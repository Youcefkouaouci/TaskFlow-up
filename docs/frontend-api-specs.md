# Documentation Frontend & Spécifications API Backend

La documentation détaillée de l'intégration frontend (React 19, Tailwind CSS v4) et le dictionnaire complet des endpoints API REST attendus se trouvent dans le fichier :

👉 [frontend/docs/API_AND_FEATURES_GUIDE.md](file:///c:/Users/steef/OneDrive/Documents/TaskFlow/TaskFlow-up/frontend/docs/API_AND_FEATURES_GUIDE.md)

### Sommaire rapide :
1. **Architecture des Composants React** (`Header`, `ContextSwitch`, `ProductivityBanner`, `Quadrant`, `TaskCard`, `MatrixSummary`, `NewTaskModal`, `BottomNav`, `Toast`).
2. **Fonctionnalités Frontend** (Matrice 2x2, bascule Entreprise/École, checkboxes avec statuts, modale d'ajout, délégation, suppression, mode Focus Faire seul).
3. **Endpoints API Backend requis** :
   - `GET /api/tasks` (liste des tâches)
   - `POST /api/tasks` (création)
   - `PATCH /api/tasks/:id/status` (toggle complété)
   - `DELETE /api/tasks/:id` (suppression)
   - `POST /api/tasks/:id/delegate` (délégation)
   - `GET /api/users/me/stats` (statistiques et charge mentale)
   - `POST /api/users/current-context` (contexte actif)
4. **Basculement Backend Réel** (via `VITE_API_URL` et `ENABLE_REAL_API` dans `src/services/taskService.js`).
