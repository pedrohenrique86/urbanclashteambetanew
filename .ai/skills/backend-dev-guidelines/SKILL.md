---
name: backend-dev-guidelines
description: "Use when managing the backend structure and database in the UrbanClash Team project."
category: backend-dev
risk: low
source: workspace
date_added: "2026-04-02"
metadata:
  triggers: backend, node, express, postgres, redis, jwt, auth, services, middleware
---

# Backend Dev Guidelines (UrbanClash Team)

General backend architectural rules for the UrbanClash Team project.

## 🏗️ Architecture and Standards

### Node.js ESM
- The project uses **ECMAScript Modules (ESM)**.
- **IMPORTANT**: All imports must include the `.js` file extension (e.g., `import { db } from './config/db.js';`).
- Use `const` and `let` according to scope and immutability.

### Service-Based Architecture
- Encapsulate all business logic in the `services/` directory.
- Controllers/Routes should only handle request parsing and calling services.
- Services should be modular and reusable.

```javascript
// Example Service Logic
import { db } from '../config/db.js';

export const updatePlayerXP = async (playerId, xpAmount) => {
    return await db.query('UPDATE players SET xp = xp + $1 WHERE id = $2', [xpAmount, playerId]);
};
```

### Database (PostgreSQL & pg)
- Use the `pg` client directly for maximum control over SQL queries.
- **DO NOT** use an ORM (like Prisma or Sequelize) unless explicitly requested.
- Use parameterized queries to prevent SQL injection (`$1, $2, ...`).
- All schema changes must be done through migrations in the `backend/migrations/` folder using `node-pg-migrate`.

### Cache (Redis)
- Use `@upstash/redis` for fast, volatile data (e.g., sessions, current action points if not stored in DB, or global game stats).
- Configuration is in `backend/config/redis.js`.

## 🛡️ Authentication and Middleware

### JWT
- Use `JSON Web Tokens` for authentication.
- Secrets are stored in `.env` variables (`JWT_SECRET`).
- Authentication middleware is located in `backend/middleware/auth.js`.

### Validation
- Always validate request bodies and parameters using `express-validator`.
- Define validation schemas for each route.

## 🚀 Real-time (Socket.IO)
- Use `socket.io` for events like player level-ups, clan chat, or timer updates.
- Centralize socket logic if possible to avoid state leaks.

## 📂 Directory Structure
- `backend/config/`: Configuration files (DB, Redis, etc.).
- `backend/middleware/`: Express middlewares (Auth, Validation, Logger).
- `backend/migrations/`: Database schema versioning.
- `backend/routes/`: Route definitions and controllers.
- `backend/services/`: Core business logic and database interactions.
- `backend/server.js`: Application entry point.
