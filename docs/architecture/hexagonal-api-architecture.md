# Hexagonal API Architecture: Express + Lambda Dual-Deployment

## Overview

This document describes the architecture for running the API both locally with Express and in production with AWS Lambda. The goal is to:

1. **Reduce local development costs** - Run against Docker Postgres instead of Aurora
2. **Enable rapid iteration** - Hot-reload Express server vs cold Lambda deploys
3. **Maintain production compatibility** - Same business logic runs in both environments
4. **Enable cloud portability** - Modular architecture supports future cloud migrations

## Architecture Pattern: Hexagonal (Ports & Adapters)

```
                    ┌─────────────────────────────────────────┐
                    │           Transport Layer               │
                    │  ┌─────────────────┬─────────────────┐  │
                    │  │  Lambda Handler │  Express Router │  │
                    │  │   (Production)  │  (Development)  │  │
                    │  └────────┬────────┴────────┬────────┘  │
                    └───────────│─────────────────│───────────┘
                                │                 │
                                ▼                 ▼
                    ┌─────────────────────────────────────────┐
                    │        Shared Services Package          │
                    │     @repo/api-services (NEW)            │
                    │  ┌─────────────────────────────────────┐│
                    │  │  moc-service.ts                     ││
                    │  │  moc-file-service.ts                ││
                    │  │  gallery-service.ts                 ││
                    │  │  wishlist-service.ts                ││
                    │  │  parts-list-service.ts              ││
                    │  └─────────────────────────────────────┘│
                    └───────────────────┬─────────────────────┘
                                        │
                                        ▼
                    ┌─────────────────────────────────────────┐
                    │           Infrastructure Layer          │
                    │  ┌──────────────────────────────────┐   │
                    │  │  @repo/db (Drizzle + PostgreSQL) │   │
                    │  │  @repo/s3-client                 │   │
                    │  │  @repo/search (OpenSearch)       │   │
                    │  │  @repo/rate-limiter              │   │
                    │  └──────────────────────────────────┘   │
                    └─────────────────────────────────────────┘
```

## Package Structure

### New Package: `packages/backend/api-services/`

```
packages/backend/api-services/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── src/
│   ├── index.ts                    # Main exports
│   ├── moc/
│   │   ├── moc-service.ts          # Core MOC CRUD
│   │   ├── moc-file-service.ts     # File operations
│   │   ├── moc-search-service.ts   # OpenSearch with fallback
│   │   ├── parts-list-parser.ts    # CSV/XML parsing
│   │   ├── parts-validators/       # Validation utilities
│   │   └── index.ts
│   ├── gallery/
│   │   ├── gallery-service.ts      # Gallery CRUD
│   │   ├── album-service.ts        # Album operations
│   │   └── index.ts
│   ├── wishlist/
│   │   ├── wishlist-service.ts     # Wishlist CRUD
│   │   └── index.ts
│   ├── websocket/
│   │   ├── broadcast.ts            # Message broadcasting
│   │   ├── message-types.ts        # Message schemas
│   │   └── index.ts
│   └── shared/
│       ├── errors.ts               # Domain errors
│       ├── pagination.ts           # Pagination utilities
│       └── index.ts
```

### New App: `apps/api-express/`

```
apps/api-express/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                    # Server entry point
│   ├── app.ts                      # Express app setup
│   ├── middleware/
│   │   ├── auth.ts                 # Cognito JWT validation
│   │   ├── error-handler.ts        # Global error handling
│   │   ├── cors.ts                 # CORS configuration
│   │   └── request-logger.ts       # Request logging
│   ├── routes/
│   │   ├── index.ts                # Route aggregator
│   │   ├── moc.routes.ts           # MOC endpoints
│   │   ├── gallery.routes.ts       # Gallery endpoints
│   │   ├── wishlist.routes.ts      # Wishlist endpoints
│   │   ├── health.routes.ts        # Health check
│   │   └── upload.routes.ts        # File upload endpoints
│   └── adapters/
│       ├── request-adapter.ts      # Lambda-like request shape
│       └── response-adapter.ts     # Lambda-like response shape
```

### Docker Compose: `docker/docker-compose.local.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: lego-moc-postgres
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: lego_moc_user
      POSTGRES_PASSWORD: local_dev_password
      POSTGRES_DB: lego_moc_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U lego_moc_user -d lego_moc_db"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Optional: Redis for caching (can skip for initial local dev)
  redis:
    image: redis:7-alpine
    container_name: lego-moc-redis
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## Migration Strategy

### Phase 1: Create api-services Package (Stories 1-3)

1. Create `packages/backend/api-services/` package scaffold
2. Move service files from `apps/api/endpoints/*/_shared/`
3. Update imports in Lambda handlers
4. Ensure all tests pass

**Files to Move:**
| Source | Destination |
|--------|-------------|
| `apps/api/endpoints/moc-instructions/_shared/moc-service.ts` | `packages/backend/api-services/src/moc/moc-service.ts` |
| `apps/api/endpoints/moc-instructions/_shared/moc-file-service.ts` | `packages/backend/api-services/src/moc/moc-file-service.ts` |
| `apps/api/endpoints/moc-instructions/_shared/opensearch-moc.ts` | `packages/backend/api-services/src/moc/moc-search-service.ts` |
| `apps/api/endpoints/moc-instructions/_shared/parts-list-parser.ts` | `packages/backend/api-services/src/moc/parts-list-parser.ts` |
| `apps/api/endpoints/moc-instructions/_shared/parts-validators/*` | `packages/backend/api-services/src/moc/parts-validators/*` |
| `apps/api/endpoints/moc-parts-lists/_shared/parts-list-service.ts` | `packages/backend/api-services/src/moc/parts-list-s3-service.ts` |
| `apps/api/endpoints/websocket/_shared/*` | `packages/backend/api-services/src/websocket/*` |

### Phase 2: Create Docker Development Environment (Stories 4-5)

1. Create `docker/docker-compose.local.yml`
2. Create database initialization scripts
3. Run Drizzle migrations against local Postgres
4. Create `.env.local` template

### Phase 3: Create Express Server (Stories 6-9)

1. Create `apps/api-express/` package
2. Implement Cognito JWT middleware
3. Create route handlers that call shared services
4. Add file upload handling (multer)
5. Test against Docker Postgres

### Phase 4: Refactor Lambda Handlers (Story 10)

1. Update Lambda handlers to import from `@repo/api-services`
2. Thin handlers: parse event → call service → format response
3. Verify production deployment works

## Service Layer Design

### Service Function Signature Pattern

All service functions follow a consistent pattern:

```typescript
// Input: Always typed, validated by caller (Zod in handler/route)
// Output: Always typed, domain objects or DTOs
// Errors: Throw domain errors (NotFoundError, ForbiddenError, etc.)

export async function listMocs(
  userId: string,
  query: MocListQuery,  // Zod-inferred type
): Promise<{ mocs: MocInstruction[]; total: number }> {
  // Implementation
}

export async function getMocDetail(
  mocId: string,
  userId: string,
): Promise<MocDetailResponse> {
  // Check ownership, throw ForbiddenError if not owner
  // Throw NotFoundError if not found
}
```

### Error Handling

Domain errors are thrown by services, caught and transformed by adapters:

```typescript
// packages/backend/api-services/src/shared/errors.ts
export class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`)
    this.name = 'NotFoundError'
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Access denied') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export class ValidationError extends Error {
  constructor(message: string, public details?: Record<string, string>) {
    super(message)
    this.name = 'ValidationError'
  }
}
```

### Lambda Handler (Thin Adapter)

```typescript
// apps/api/endpoints/moc-instructions/list/handler.ts
import { listMocs } from '@repo/api-services/moc'
import { MocListQuerySchema } from '@repo/api-types/moc'

export async function handler(event: APIGatewayEvent): Promise<APIGatewayProxyResult> {
  try {
    const userId = event.requestContext.authorizer?.claims?.sub
    if (!userId) return unauthorizedResponse()

    const query = MocListQuerySchema.parse(event.queryStringParameters)
    const result = await listMocs(userId, query)

    return successResponse(200, result)
  } catch (error) {
    return handleError(error) // Transforms domain errors to HTTP responses
  }
}
```

### Express Route (Thin Adapter)

```typescript
// apps/api-express/src/routes/moc.routes.ts
import { Router } from 'express'
import { listMocs } from '@repo/api-services/moc'
import { MocListQuerySchema } from '@repo/api-types/moc'

const router = Router()

router.get('/mocs', async (req, res, next) => {
  try {
    const userId = req.user.sub // From Cognito JWT middleware
    const query = MocListQuerySchema.parse(req.query)
    const result = await listMocs(userId, query)

    res.json(result)
  } catch (error) {
    next(error) // Express error handler transforms to HTTP response
  }
})

export default router
```

## Authentication

### Cognito JWT Validation (Express)

```typescript
// apps/api-express/src/middleware/auth.ts
import { CognitoJwtVerifier } from 'aws-jwt-verify'

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  tokenUse: 'access',
  clientId: process.env.COGNITO_CLIENT_ID!,
})

export async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }

  try {
    const payload = await verifier.verify(token)
    req.user = {
      sub: payload.sub,
      email: payload.email,
      // ... other claims
    }
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}
```

## Local Development Workflow

```bash
# 1. Start local infrastructure
docker compose -f docker/docker-compose.local.yml up -d

# 2. Run database migrations
pnpm --filter @repo/db migrate:local

# 3. Seed development data (optional)
pnpm --filter @repo/db seed:local

# 4. Start Express server (with hot reload)
pnpm --filter api-express dev

# 5. Frontend dev server (separate terminal)
pnpm --filter main-app dev
```

## Environment Configuration

### `.env.local` (Express Development)

```bash
# Database (Docker)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USERNAME=lego_moc_user
POSTGRES_PASSWORD=local_dev_password
POSTGRES_DATABASE=lego_moc_db

# AWS (real Cognito, mock S3)
COGNITO_USER_POOL_ID=us-east-1_xxxxx
COGNITO_CLIENT_ID=xxxxxxxxx
AWS_REGION=us-east-1

# S3 (LocalStack or MinIO for local, or real S3)
S3_BUCKET=lego-moc-files-dev
S3_ENDPOINT=http://localhost:4566  # LocalStack

# Search (skip OpenSearch, use PostgreSQL fallback)
OPENSEARCH_ENABLED=false

# Redis (optional for local)
REDIS_ENABLED=false

# Server
PORT=4000
NODE_ENV=development
```

## Testing Strategy

| Layer | Test Type | Tools |
|-------|-----------|-------|
| Services | Unit + Integration | Vitest, test containers |
| Lambda Handlers | Unit | Vitest, mocked services |
| Express Routes | Integration | Supertest |
| E2E | End-to-end | Playwright |

## Cost Comparison

| Component | Lambda + VPC + Aurora | Local Express + Docker |
|-----------|----------------------|----------------------|
| Database | Aurora + RDS Proxy (~$50+/month) | Docker Postgres ($0) |
| Compute | Lambda + NAT Gateway (~$30+/month) | Local process ($0) |
| Search | OpenSearch (~$20+/month) | PostgreSQL ILIKE ($0) |
| Total Dev Cost | ~$100+/month | $0 |

## Future Cloud Portability

The hexagonal architecture enables deployment to other platforms:

- **Vercel/Netlify**: Edge functions with same services
- **Google Cloud Run**: Container with Express server
- **Cloudflare Workers**: Adapt services for Workers runtime
- **Railway/Render**: Container deployment

No business logic changes required - only new transport adapters.

## Decision Log

| Decision | Rationale |
|----------|-----------|
| Keep Cognito for auth | Works with both Lambda and Express, not expensive |
| Skip OpenSearch locally | PostgreSQL ILIKE fallback already exists |
| Docker Postgres for local | Matches Aurora compatibility |
| Single api-services package | Simpler than per-domain packages initially |
| Express for local dev | Mature ecosystem, easy debugging |
