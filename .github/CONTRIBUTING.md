# Conventions de contribution — TaskFlow

## Branches

| Type              | Format                  | Exemple                      |
| ----------------- | ----------------------- | ---------------------------- |
| Fonctionnalité    | `feat/<ticket>-<slug>`  | `feat/YKO-012-task-creation` |
| Correction de bug | `fix/<ticket>-<slug>`   | `fix/YKO-034-health-500`     |
| Chore / config    | `chore/<ticket>-<slug>` | `chore/YKO-001-eslint-setup` |
| Tests             | `test/<ticket>-<slug>`  | `test/YKO-045-task-unit`     |
| Documentation     | `docs/<ticket>-<slug>`  | `docs/YKO-010-api-readme`    |

- Toujours partir de `dev` à jour (`git pull origin dev`)
- Une branche = une PR

## Messages de commit (Conventional Commits)

```
<type>(<scope>): <description courte en impératif>
```

### Types autorisés

| Type       | Usage                                       |
| ---------- | ------------------------------------------- |
| `feat`     | Nouvelle fonctionnalité                     |
| `fix`      | Correction de bug                           |
| `chore`    | Tâche de maintenance (deps, config)         |
| `test`     | Ajout ou modification de tests              |
| `docs`     | Documentation uniquement                    |
| `refactor` | Refactoring sans changement de comportement |
| `style`    | Formatage, lint (sans logique)              |
| `perf`     | Amélioration de performance                 |
| `ci`       | Configuration CI/CD                         |

### Exemples

```
feat(task): add urgent and important fields to Task entity
fix(auth): handle expired JWT without crashing
chore(deps): upgrade mongoose to 9.11.4
test(health): add integration test for GET /api/health
```

## Pull Requests

- Titre au format Conventional Commits : `feat(scope): description`
- Remplir le template PR
- Passer tous les checks CI (lint + tests)
- Squash merge uniquement (historique propre sur `main`)
