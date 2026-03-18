# Roadmap API

A Bun + Hono REST API backend for the Workflow Roadmap application. Provides endpoints for managing plans, stories, and roadmap data.

## Quick Start (Running Locally)

### Prerequisites

- **Docker Desktop** running (for PostgreSQL database)
- **Bun** installed - https://bun.sh/
- **pnpm 8+**

### Steps

```bash
# 1. Start Docker Desktop first (required for database)

# 2. Install dependencies (from monorepo root)
pnpm install

# 3. Initialize knowledge-base database (one-time setup)
cd apps/api/knowledge-base
cp .env.example .env
# Edit .env and set OPENAI_API_KEY
pnpm db:init
cd ../..

# 4. Configure this API
cd apps/api/workflow-admin/roadmap-svc
cp .env.example .env
# Edit .env - set KB_DB_PASSWORD to match knowledge-base .env

# 5. Start the API
pnpm dev
```

The API runs on **http://localhost:3004**

## Overview

The Roadmap API serves as the backend for the Workflow Roadmap frontend application. It provides CRUD operations for plans and stories, leveraging the shared knowledge-base infrastructure for data persistence.

## Tech Stack

- **Bun** - JavaScript runtime
- **Hono** - Web framework (similar to Express)
- **Drizzle ORM** - Type-safe database queries
- **PostgreSQL** - Primary database (via knowledge-base)
- **pgvector** - Vector embeddings for semantic search
- **Zod** - Schema validation
- **Vitest** - Unit testing

## Project Structure

```
apps/api/workflow-admin/roadmap-svc/
├── src/
│   ├── index.ts            # Main application entry point
│   └── services/
│       ├── planService.ts         # Plan and story business logic
│       └── __tests__/
│           └── planService.test.ts
├── .env                   # Environment variables
├── .env.example           # Environment template
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── Dockerfile
```

## API Endpoints

### Health Check

| Method | Endpoint  | Description           |
| ------ | --------- | --------------------- |
| GET    | `/health` | Service health status |

### Plans

| Method | Endpoint                  | Description                    |
| ------ | ------------------------- | ------------------------------ |
| GET    | `/api/v1/roadmap`         | List all plans with pagination |
| GET    | `/api/v1/roadmap/:slug`   | Get plan details by slug       |
| PATCH  | `/api/v1/roadmap/:slug`   | Update a plan                  |
| PATCH  | `/api/v1/roadmap/reorder` | Reorder plan priorities        |

### Stories

| Method | Endpoint                        | Description             |
| ------ | ------------------------------- | ----------------------- |
| GET    | `/api/v1/roadmap/:slug/stories` | Get stories for a plan  |
| GET    | `/api/v1/stories/:storyId`      | Get story details by ID |

## Getting Started

### Prerequisites

- **Bun** - JavaScript runtime
  - Install: https://bun.sh/
- **PostgreSQL** - Running knowledge-base database
- **pnpm** - Package manager

### Installation

```bash
# Install dependencies (from monorepo root)
pnpm install
```

### Environment Setup

```bash
# Copy environment template
cp apps/api/workflow-admin/roadmap-svc/.env.example apps/api/workflow-admin/roadmap-svc/.env

# Edit .env with your database credentials
# Note: Uses knowledge-base database (KB_DB_*) variables
```

### Running the API

```bash
# Development mode (with hot reload)
cd apps/api/workflow-admin/roadmap-svc
pnpm dev

# Production mode
pnpm start

# Or with custom port
PORT=3005 pnpm start
```

The API runs on `http://localhost:3004` by default.

## Endpoint Details

### GET /api/v1/roadmap

List all plans with pagination and filtering.

**Query Parameters:**

| Parameter        | Type    | Default | Description                        |
| ---------------- | ------- | ------- | ---------------------------------- |
| page             | number  | 1       | Page number                        |
| limit            | number  | 10      | Items per page                     |
| status           | string  | -       | Filter by status (comma-separated) |
| planType         | string  | -       | Filter by plan type                |
| priority         | string  | -       | Filter by priority                 |
| tags             | string  | -       | Filter by tags                     |
| excludeCompleted | boolean | true    | Exclude completed plans            |
| search           | string  | -       | Search in title/summary            |

**Example:**

```bash
curl "http://localhost:3004/api/v1/roadmap?page=1&limit=20&status=draft,in-progress"
```

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "planSlug": "my-plan",
      "title": "My Plan",
      "status": "draft",
      "priority": "P1",
      ...
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

### GET /api/v1/roadmap/:slug

Get detailed plan information.

**Example:**

```bash
curl "http://localhost:3004/api/v1/roadmap/my-plan"
```

### PATCH /api/v1/roadmap/:slug

Update plan fields.

**Request Body:**

```json
{
  "title": "New Title",
  "priority": "P2",
  "status": "in-progress"
}
```

**Example:**

```bash
curl -X PATCH "http://localhost:3004/api/v1/roadmap/my-plan" \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Title"}'
```

### GET /api/v1/roadmap/:slug/stories

Get all stories linked to a plan.

**Example:**

```bash
curl "http://localhost:3004/api/v1/roadmap/my-plan/stories"
```

**Response:**

```json
{
  "data": [
    {
      "storyId": "WISH-001",
      "title": "Story Title",
      "state": "in_progress",
      "priority": "P1",
      "currentPhase": "implementation",
      ...
    }
  ]
}
```

### GET /api/v1/stories/:storyId

Get detailed story information.

**Example:**

```bash
curl "http://localhost:3004/api/v1/stories/WISH-001"
```

### PATCH /api/v1/roadmap/reorder

Reorder plan priorities in bulk.

**Request Body:**

```json
{
  "priority": "P1",
  "items": [
    { "id": "uuid-1", "priorityOrder": 1 },
    { "id": "uuid-2", "priorityOrder": 2 }
  ]
}
```

## Database

This service uses the **knowledge-base** database. Ensure the database is initialized before running:

```bash
# Initialize knowledge-base database
cd apps/api/knowledge-base
pnpm db:init
```

### Database Schema

The API uses tables from the knowledge-base:

- `plans` - Plan records
- `stories` - Story records
- `plan_story_links` - Many-to-many relationship between plans and stories

See `apps/api/knowledge-base/README.md` for full schema documentation.

## Testing

```bash
# Run unit tests
cd apps/api/workflow-admin/roadmap-svc
pnpm test

# Run tests in watch mode
pnpm test:watch
```

### Testing Structure

- `src/services/__tests__/` - Service layer tests
- Uses Vitest with mocks for database calls

## Building

```bash
# Type check
pnpm type-check

# Build for production (compiles TypeScript)
pnpm build
```

## Docker

```bash
# Build image
docker build -t roadmap-api .

# Run container
docker run -p 3004:3004 --env-file .env roadmap-api
```

## Environment Variables

| Variable       | Required | Default       | Description       |
| -------------- | -------- | ------------- | ----------------- |
| PORT           | No       | 3004          | Server port       |
| KB_DB_HOST     | Yes\*    | localhost     | Database host     |
| KB_DB_PORT     | No       | 5433          | Database port     |
| KB_DB_NAME     | No       | knowledgebase | Database name     |
| KB_DB_USER     | Yes\*    | -             | Database user     |
| KB_DB_PASSWORD | Yes\*    | -             | Database password |

\*Or use `DATABASE_URL` for direct connection string.

## Common Tasks

### Adding a New Endpoint

1. Add route in `src/index.ts`
2. Add service function in `src/services/planService.ts`
3. Add tests in `src/services/__tests__/`

### Adding a New Plan Field

1. Update service to handle the new field
2. Ensure Zod validation covers the new field
3. Add tests for the new field

### Connecting to Frontend

The frontend proxies to this API. Update `vite.config.ts` in the frontend:

```typescript
proxy: {
  '/api': {
    target: 'http://localhost:3004',
    changeOrigin: true,
  },
}
```

## Troubleshooting

### Connection Refused

- Ensure knowledge-base database is running
- Check `KB_DB_*` environment variables
- Verify firewall/network settings

### 404 Not Found

- Check the slug parameter is correct
- Verify the plan exists in the database

### 500 Internal Server Error

- Check logs for detailed error messages
- Verify database schema is up to date

## Scripts Reference

| Script            | Description                              |
| ----------------- | ---------------------------------------- |
| `pnpm dev`        | Start development server with hot reload |
| `pnpm start`      | Start production server                  |
| `pnpm build`      | Compile TypeScript                       |
| `pnpm test`       | Run unit tests                           |
| `pnpm test:watch` | Run tests in watch mode                  |
| `pnpm type-check` | TypeScript type checking                 |
| `pnpm lint`       | Run ESLint                               |

## Related Documentation

- [Knowledge Base README](../knowledge-base/README.md) - Database setup and schema
- [Workflow Roadmap Frontend README](../web/workflow-roadmap/README.md) - Frontend application
