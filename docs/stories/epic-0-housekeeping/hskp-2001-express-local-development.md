# Story HSKP-2001: Express Local Development Server

## Status

Draft

## Story

**As a** developer,
**I want** to run the API locally using Express with Docker PostgreSQL,
**so that** I can iterate quickly without deploying to AWS Lambda.

## Epic Context

This story enables local development workflow. It depends on HSKP-2000 (API Service Extraction) which provides the portable handlers this server will use.

## Priority

P0 - Critical for developer productivity

## Estimated Effort

2-3 days

## Dependencies

- HSKP-2000: API Service Extraction (must be completed first)

## Acceptance Criteria

1. Docker Compose configuration creates PostgreSQL container with correct schema
2. `apps/api-express` created with Express server exposing all API routes
3. Cognito JWT middleware validates tokens correctly
4. Environment configuration documented for local development
5. Frontend can connect to local API at `localhost:4000`
6. Hot reload works for API changes
7. README documents complete setup process

## Tasks / Subtasks

- [ ] **Task 1: Create Docker Compose Configuration** (AC: 1)
  - [ ] Create `docker/docker-compose.local.yml`
  - [ ] Configure PostgreSQL 16 container
  - [ ] Configure volume persistence
  - [ ] Add healthcheck configuration
  - [ ] Create init scripts directory

- [ ] **Task 2: Create Database Migration Scripts** (AC: 1)
  - [ ] Create `docker/init-scripts/` directory
  - [ ] Add script to apply Drizzle migrations
  - [ ] Add optional seed data script
  - [ ] Document migration commands

- [ ] **Task 3: Create Express App Package** (AC: 2)
  - [ ] Create `apps/api-express/` folder structure
  - [ ] Create package.json with Express, cors, helmet dependencies
  - [ ] Create tsconfig.json extending workspace base
  - [ ] Add to turbo.json for dev command

- [ ] **Task 4: Create Express Server** (AC: 2)
  - [ ] Create `src/index.ts` - server entry point
  - [ ] Create `src/app.ts` - Express app configuration
  - [ ] Configure CORS for local development
  - [ ] Configure JSON body parsing
  - [ ] Configure request logging

- [ ] **Task 5: Implement Cognito JWT Middleware** (AC: 3)
  - [ ] Create `src/middleware/auth.ts`
  - [ ] Verify JWT signature against Cognito public keys
  - [ ] Extract user claims from token
  - [ ] Attach user to request object
  - [ ] Handle expired/invalid tokens with 401

- [ ] **Task 6: Create Request/Response Adapters** (AC: 2)
  - [ ] Create `src/lib/adapters.ts`
  - [ ] Implement `toRequest(ExpressRequest): Request`
  - [ ] Implement `fromResponse(ExpressResponse, Response): void`
  - [ ] Handle multipart form data
  - [ ] Handle streaming responses

- [ ] **Task 7: Create Route Files** (AC: 2)
  - [ ] Create `src/routes/index.ts` - route aggregator
  - [ ] Create `src/routes/moc.routes.ts` - MOC endpoints
  - [ ] Create `src/routes/gallery.routes.ts` - Gallery endpoints
  - [ ] Create `src/routes/wishlist.routes.ts` - Wishlist endpoints
  - [ ] Create `src/routes/parts-list.routes.ts` - Parts list endpoints
  - [ ] Create `src/routes/health.routes.ts` - Health check

- [ ] **Task 8: Create Error Handling Middleware** (AC: 2)
  - [ ] Create `src/middleware/error-handler.ts`
  - [ ] Map domain errors to HTTP status codes
  - [ ] Log errors appropriately
  - [ ] Return consistent error responses

- [ ] **Task 9: Add File Upload Support** (AC: 2)
  - [ ] Add multer for multipart handling
  - [ ] Configure temp file storage
  - [ ] Create file upload middleware
  - [ ] Handle S3 upload proxying

- [ ] **Task 10: Configure Environment** (AC: 4)
  - [ ] Create `.env.local.example` template
  - [ ] Document all required environment variables
  - [ ] Configure database connection string
  - [ ] Configure Cognito settings
  - [ ] Configure S3 settings (real S3 or MinIO)

- [ ] **Task 11: Add Development Scripts** (AC: 5, 6)
  - [ ] Add `pnpm dev:local` script to root package.json
  - [ ] Configure nodemon/tsx for hot reload
  - [ ] Add `pnpm db:local:migrate` for database setup
  - [ ] Add `pnpm db:local:seed` for test data

- [ ] **Task 12: Create Documentation** (AC: 7)
  - [ ] Create `apps/api-express/README.md`
  - [ ] Document Docker setup
  - [ ] Document environment configuration
  - [ ] Document daily development workflow
  - [ ] Document troubleshooting tips

- [ ] **Task 13: Integration Testing** (AC: 5)
  - [ ] Start Docker and Express server
  - [ ] Configure frontend to use local API
  - [ ] Test authentication flow
  - [ ] Test CRUD operations
  - [ ] Test file uploads

## Dev Notes

### Docker Compose Configuration

```yaml
# docker/docker-compose.local.yml
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

  # Optional: Redis for caching
  redis:
    image: redis:7-alpine
    container_name: lego-moc-redis
    ports:
      - "6379:6379"
    profiles:
      - with-cache

  # Optional: MinIO for S3-compatible storage
  minio:
    image: minio/minio
    container_name: lego-moc-minio
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"
    profiles:
      - with-storage

volumes:
  postgres_data:
```

### Express App Structure

```
apps/api-express/
├── src/
│   ├── index.ts           # Server entry
│   ├── app.ts             # Express app
│   ├── middleware/
│   │   ├── auth.ts        # Cognito JWT
│   │   ├── error-handler.ts
│   │   └── cors.ts
│   ├── routes/
│   │   ├── index.ts
│   │   ├── moc.routes.ts
│   │   ├── gallery.routes.ts
│   │   ├── wishlist.routes.ts
│   │   └── health.routes.ts
│   └── lib/
│       └── adapters.ts    # Express to web Request/Response
├── package.json
├── tsconfig.json
└── README.md
```

### Express Adapter Implementation

```typescript
// apps/api-express/src/lib/adapters.ts
import { Request as ExpressRequest, Response as ExpressResponse } from 'express'

export function toRequest(req: ExpressRequest): Request {
  const protocol = req.protocol
  const host = req.get('host') || 'localhost'
  const url = new URL(req.originalUrl, `${protocol}://${host}`)

  const headers = new Headers()
  Object.entries(req.headers).forEach(([key, value]) => {
    if (typeof value === 'string') {
      headers.set(key, value)
    } else if (Array.isArray(value)) {
      value.forEach(v => headers.append(key, v))
    }
  })

  const init: RequestInit = {
    method: req.method,
    headers,
  }

  if (req.body && req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = typeof req.body === 'string'
      ? req.body
      : JSON.stringify(req.body)
  }

  return new Request(url, init)
}

export async function fromResponse(
  res: ExpressResponse,
  response: Response
): Promise<void> {
  res.status(response.status)

  response.headers.forEach((value, key) => {
    res.setHeader(key, value)
  })

  const contentType = response.headers.get('content-type')
  if (contentType?.includes('application/json')) {
    const json = await response.json()
    res.json(json)
  } else {
    const text = await response.text()
    res.send(text)
  }
}
```

### Route Pattern

```typescript
// apps/api-express/src/routes/moc.routes.ts
import { Router } from 'express'
import { handleListMocs, handleGetMoc, handleCreateMoc } from '@repo/api-handlers/moc'
import { toRequest, fromResponse } from '../lib/adapters'
import { authMiddleware } from '../middleware/auth'

const router = Router()

router.get('/mocs', authMiddleware, async (req, res, next) => {
  try {
    const request = toRequest(req)
    const response = await handleListMocs(request, { userId: req.user.sub })
    await fromResponse(res, response)
  } catch (error) {
    next(error)
  }
})

router.get('/mocs/:mocId', authMiddleware, async (req, res, next) => {
  try {
    const request = toRequest(req)
    const response = await handleGetMoc(request, { userId: req.user.sub })
    await fromResponse(res, response)
  } catch (error) {
    next(error)
  }
})

export default router
```

### Cognito JWT Middleware

```typescript
// apps/api-express/src/middleware/auth.ts
import { CognitoJwtVerifier } from 'aws-jwt-verify'
import { Request, Response, NextFunction } from 'express'

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  tokenUse: 'access',
  clientId: process.env.COGNITO_CLIENT_ID!,
})

declare global {
  namespace Express {
    interface Request {
      user?: {
        sub: string
        email: string
        emailVerified: boolean
      }
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' })
  }

  const token = authHeader.substring(7)

  try {
    const payload = await verifier.verify(token)
    req.user = {
      sub: payload.sub,
      email: payload.email as string,
      emailVerified: payload.email_verified === true,
    }
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}
```

### Environment Configuration

```bash
# .env.local (for Express development)

# Database (Docker)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USERNAME=lego_moc_user
POSTGRES_PASSWORD=local_dev_password
POSTGRES_DATABASE=lego_moc_db

# Auth (real Cognito - it's free for 1 user)
COGNITO_USER_POOL_ID=us-east-1_xxxxx
COGNITO_CLIENT_ID=xxxxxxxxx
COGNITO_REGION=us-east-1

# S3 (options: real S3, MinIO, or mock)
S3_BUCKET=lego-moc-files-dev
S3_ENDPOINT=http://localhost:9000  # MinIO
# S3_ENDPOINT=                      # Real S3 (comment out for AWS)

# Server
PORT=4000
NODE_ENV=development
```

### Development Workflow

```bash
# One-time setup
docker compose -f docker/docker-compose.local.yml up -d
pnpm --filter @repo/db migrate:local
pnpm --filter @repo/db seed:local  # Optional: seed test data

# Daily development
pnpm dev:local  # Starts Express API + Frontend concurrently

# Or start individually
docker compose -f docker/docker-compose.local.yml up -d
pnpm --filter api-express dev
pnpm --filter main-app dev
```

## Testing

### Test Location
- `apps/api-express/src/__tests__/` - Express-specific tests
- Integration testing via manual or E2E tests

### Test Requirements
- Integration: All routes respond correctly
- Integration: Auth middleware blocks unauthenticated requests
- Integration: Error handling returns proper format
- Integration: File uploads work
- Manual: Frontend can complete full workflows

### Running Tests

```bash
# Start local environment
docker compose -f docker/docker-compose.local.yml up -d
pnpm --filter api-express dev

# In another terminal, run frontend
pnpm --filter main-app dev

# Test auth flow
# Test CRUD operations
# Test file uploads
```

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Cognito JWT verification differs | Low | Medium | Use official aws-jwt-verify package |
| Local PostgreSQL differs from Aurora | Low | Low | Use same PG version; Drizzle abstracts |
| File upload handling differs | Medium | Medium | Test thoroughly; consider S3 for dev too |
| Environment config complexity | Medium | Low | Clear documentation and examples |

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft from API Portability PRD | SM Agent |
