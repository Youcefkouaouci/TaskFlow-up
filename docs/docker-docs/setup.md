# Docker — Setup & démarrage

## Prérequis

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installé et lancé

## Démarrage rapide

```bash
# 1. Copier les variables d'environnement
cp .env.example .env

# 2. Lancer tous les services
docker compose up
```

C'est tout. Les 4 services démarrent automatiquement dans le bon ordre.

## Services & ports

| Service | URL | Description |
|---|---|---|
| Frontend (React) | http://localhost:5173 | Interface utilisateur avec hot reload |
| Backend (API) | http://localhost:3000 | API REST Express — `GET /api/health` pour tester |
| MongoDB | localhost:27017 | Base de données |
| Mongo Express | http://localhost:8081 | Admin UI MongoDB (dev uniquement) |

## Commandes courantes

```bash
# Démarrer en arrière-plan
docker compose up -d

# Voir les logs d'un service
docker compose logs -f backend

# Reconstruire après changement de dépendances (package.json)
docker compose build --no-cache && docker compose up

# Arrêter
docker compose down

# Reset complet (supprime aussi les données MongoDB)
docker compose down -v
```

## Production

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

> En prod, MongoDB n'est pas exposé, Mongo Express est absent, et le frontend est servi par Nginx sur le port 80.

## Variables d'environnement

Voir `.env.example` à la racine pour la liste complète.
`JWT_SECRET` doit être changé en production.
