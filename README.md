# Project Name

> Short project tagline or mission statement.

## Overview

This project is a modern, full-stack monorepo designed as a portfolio piece for tech lead roles. It demonstrates scalable architecture, best practices, and clear documentation for team onboarding and collaboration.

## Architecture Diagram

```
[Insert Mermaid or image diagram here]
```

## Tech Stack
- Node.js / TypeScript
- Express / AWS Lambda (Serverless-ready)
- PostgreSQL (Drizzle ORM)
- S3 (file storage)
- React (frontend)
- RTK Query (state management)
- Vitest/Jest (testing)

## Monorepo Structure

```
/ (root)
  apps/
    api/         # Backend API (Express/Lambda)
    web/         # Frontend React app
  packages/      # Shared code (auth, UI, utils, etc.)
  scripts/       # Dev scripts
  ...
```

## Quick Start

```sh
# Install dependencies
pnpm install

# Run backend API
cd apps/api && pnpm dev

# Run frontend
cd apps/web/lego-projects-ui && pnpm dev

# Run all tests
pnpm test:run
```

## Key Documentation
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [API Reference (Swagger)](apps/api/lego-projects-api/__docs__/swagger.yaml)
- [MIGRATION_STRATEGY.md](apps/api/MIGRATION_STRATEGY.md)
- [ERD Diagrams](apps/api/lego-projects-api/src/db/erds/)

---

For more, see [ARCHITECTURE_README.md](ARCHITECTURE_README.md).
