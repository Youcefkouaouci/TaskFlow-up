# TaskFlow – Mini Jira + Eisenhower

Stack : React (Vite) · Express · MongoDB · Jest/Supertest

## Démarrer

git clone <https://github.com/Youcefkouaouci/TaskFlow-up.git> && cd taskflow
cd backend && cp .env.example .env && npm install && npm run dev
cd ../frontend && npm install && npm run dev

## Architecture (hexagonale)

backend/src/
domain/ règles métier pures (aucune dépendance Express/Mongoose)
application/ use cases
infrastructure/ Mongoose, email, config
interfaces/http/ routes, contrôleurs, middlewares
backend/tests/ unit (domaine) · integration (API)

## Règles

- TDD : test rouge → vert → refactor
- Une branche par fonctionnalité, PR relue avant merge
