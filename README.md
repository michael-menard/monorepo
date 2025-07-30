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
- Playwright (E2E testing)
- Ethereal Email (email testing)

## Monorepo Structure

```
/ (root)
  apps/
    api/         # Backend API (Express/Lambda)
    web/         # Frontend React app
  packages/      # Shared code (auth, UI, utils, etc.)
  scripts/       # Dev scripts
  docs/          # Project documentation
  ...
```

## Quick Start

```sh
# Install dependencies
pnpm install

# Run backend API
cd apps/api/auth-service && pnpm dev

# Run frontend
cd apps/web/lego-moc-instructions-app && pnpm dev

# Run all tests
pnpm test:run
```

## Key Documentation

### Core Documentation
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [API Reference (Swagger)](apps/api/lego-projects-api/__docs__/swagger.yaml)
- [MIGRATION_STRATEGY.md](apps/api/MIGRATION_STRATEGY.md)
- [ERD Diagrams](apps/api/lego-projects-api/src/db/erds/)

### Testing & Development
- [Testing Guide](docs/TESTING_GUIDE.md) - Comprehensive testing procedures
- [Email Testing](docs/EMAIL_TESTING.md) - Ethereal Email setup and usage
- [API Documentation](docs/API_DOCUMENTATION.md) - Complete API reference
- [Playwright Testing](docs/PLAYWRIGHT_TESTING.md) - E2E testing guide
- [Tailwind Setup](docs/TAILWIND_SETUP.md) - UI styling guide

### Service-Specific
- [Auth Service README](apps/api/auth-service/README.md)
- [Email Cleanup Guide](apps/api/auth-service/EMAIL_CLEANUP_GUIDE.md)

---

For more, see [ARCHITECTURE_README.md](ARCHITECTURE_README.md).
