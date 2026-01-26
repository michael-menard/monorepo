# API Restructure: Hexagonal Architecture (MVP)

> **Plan Location:** `plans/API-RESTRUCTURE-HEXAGONAL.md`
> **Status:** Planning complete, ready for implementation

## Progress Tracker

### Foundation (Sequential)
- [x] **Phase 1:** packages/api-core (Slim)
- [x] **Phase 2:** apps/lego-api Scaffold

### Reference Domain (Sequential)
- [x] **Phase 3:** Gallery Domain (establishes pattern)

### Domain Migration (Parallel Workers)
- [x] Instructions domain
- [x] Wishlist domain
- [x] Parts Lists domain
- [x] Sets domain
- [x] Health/Config domain

### Finalization (Sequential)
- [ ] **Phase 5:** Cleanup & Verification

---

## Scope

**Local development only.** Docker Postgres + external AWS (S3, Cognito). Simplest possible implementation - we can add complexity later.

## Decisions

| Decision | Choice |
|----------|--------|
| Environment | Local dev only (Bun + Docker Postgres) |
| External services | AWS S3, AWS Cognito (existing) |
| Core location | `packages/api-core` (slim) |
| Architecture | Hexagonal per domain, but minimal layers |
| Testing | Vitest only (skip Cucumber for MVP) |
| DI | Function parameters |

---

## Target Structure (Simplified)

```
apps/lego-api/
  server.ts                    # Bun entry
  domains/
    gallery/
      routes.ts                # Hono routes (wires deps)
      services.ts              # Business logic (depends on ports)
      ports.ts                 # Interfaces (ImageRepository, ImageStorage)
      repositories.ts          # Implements ImageRepository (Postgres)
      storage.ts               # Implements ImageStorage (S3)
      types.ts                 # Domain types (Zod)
      __tests__/
    instructions/
    wishlist/
    ...

packages/api-core/
  src/
    db.ts                      # Drizzle client (Docker Postgres)
    schema.ts                  # All tables
    s3.ts                      # S3 client
    auth.ts                    # Cognito JWT verify
    types.ts                   # Result<T,E>, Pagination
```

**Note:** Flat file structure with formal port interfaces. Services depend on port interfaces, repositories implement them.

---

## Phase 1: packages/api-core (Slim)

Create minimal shared infrastructure:

```
packages/api-core/
  package.json
  tsconfig.json
  src/
    index.ts                   # Re-exports
    db.ts                      # Drizzle + Docker Postgres connection
    schema.ts                  # Copy from apps/api/core/database/schema
    s3.ts                      # S3 client (simplified)
    auth.ts                    # JWT verification for Cognito
    types.ts                   # Result, PaginationInput, PaginatedResult
```

### db.ts (simplified)

```typescript
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL // Docker: postgres://...
})

export const db = drizzle(pool, { schema })
```

### types.ts

```typescript
export type Result<T, E> =
  | { ok: true; data: T }
  | { ok: false; error: E }

export interface PaginationInput {
  page?: number
  limit?: number
}
```

---

## Phase 2: apps/lego-api Scaffold

```
apps/lego-api/
  package.json
  tsconfig.json
  server.ts
  middleware/
    auth.ts
  domains/
    health/
      routes.ts
```

### server.ts

```typescript
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import health from './domains/health/routes'

const app = new Hono()

app.use('*', logger())
app.use('*', cors())

app.route('/health', health)

export default {
  port: process.env.PORT || 3001,
  fetch: app.fetch,
}
```

### middleware/auth.ts

```typescript
import { createMiddleware } from 'hono/factory'
import { CognitoJwtVerifier } from 'aws-jwt-verify'

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  clientId: process.env.COGNITO_CLIENT_ID!,
  tokenUse: 'access',
})

export const auth = createMiddleware(async (c, next) => {
  // Dev bypass
  if (process.env.AUTH_BYPASS === 'true') {
    c.set('userId', 'dev-user')
    return next()
  }

  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  if (!token) return c.json({ error: 'Unauthorized' }, 401)

  try {
    const payload = await verifier.verify(token)
    c.set('userId', payload.sub)
    return next()
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }
})
```

---

## Phase 3: Gallery Domain (Reference)

Flat structure with formal ports:

```
domains/gallery/
  routes.ts          # HTTP layer (wires deps)
  services.ts        # Business logic (depends on ports)
  ports.ts           # Interfaces (ImageRepository, ImageStorage)
  repositories.ts    # Implements ImageRepository (Postgres)
  storage.ts         # Implements ImageStorage (S3)
  types.ts           # Zod schemas + types
  __tests__/
    services.test.ts
```

### ports.ts

```typescript
import type { Result } from '@repo/api-core'
import type { Image, UploadImageInput } from './types'

// Outbound ports - what the domain needs from infrastructure

export interface ImageRepository {
  findById(id: string): Promise<Result<Image, 'NOT_FOUND'>>
  findByUserId(userId: string): Promise<Image[]>
  insert(data: Omit<Image, 'id' | 'createdAt'>): Promise<Image>
  update(id: string, data: Partial<Image>): Promise<Result<Image, 'NOT_FOUND'>>
  delete(id: string): Promise<Result<void, 'NOT_FOUND'>>
}

export interface ImageStorage {
  upload(key: string, buffer: Buffer, mimetype: string): Promise<Result<{ url: string }, 'UPLOAD_FAILED'>>
  delete(key: string): Promise<Result<void, 'DELETE_FAILED'>>
  getSignedUrl(key: string, expiresIn?: number): Promise<string>
}
```

### types.ts

```typescript
import { z } from 'zod'

export const ImageSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().url(),
  createdAt: z.date(),
})

export type Image = z.infer<typeof ImageSchema>

export const UploadImageInputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
})

export type UploadImageInput = z.infer<typeof UploadImageInputSchema>
```

### repositories.ts (implements ports)

```typescript
import { db } from '@repo/api-core'
import { galleryImages } from '@repo/api-core/schema'
import { eq } from 'drizzle-orm'
import type { ImageRepository } from './ports'
import type { Image } from './types'

export function createImageRepository(): ImageRepository {
  return {
    async findById(id) {
      const row = await db.query.galleryImages.findFirst({ where: eq(galleryImages.id, id) })
      if (!row) return { ok: false, error: 'NOT_FOUND' }
      return { ok: true, data: row }
    },

    async findByUserId(userId) {
      return db.query.galleryImages.findMany({ where: eq(galleryImages.userId, userId) })
    },

    async insert(data) {
      const [row] = await db.insert(galleryImages).values(data).returning()
      return row
    },

    async update(id, data) {
      const [row] = await db.update(galleryImages).set(data).where(eq(galleryImages.id, id)).returning()
      if (!row) return { ok: false, error: 'NOT_FOUND' }
      return { ok: true, data: row }
    },

    async delete(id) {
      const result = await db.delete(galleryImages).where(eq(galleryImages.id, id))
      if (result.rowCount === 0) return { ok: false, error: 'NOT_FOUND' }
      return { ok: true, data: undefined }
    },
  }
}
```

### services.ts (depends on ports via DI)

```typescript
import type { Result } from '@repo/api-core'
import type { ImageRepository, ImageStorage } from './ports'
import type { Image, UploadImageInput } from './types'

// Dependencies injected as function parameters
export interface GalleryDeps {
  imageRepo: ImageRepository
  imageStorage: ImageStorage
}

export function createGalleryService(deps: GalleryDeps) {
  const { imageRepo, imageStorage } = deps

  return {
    async uploadImage(
      userId: string,
      file: { buffer: Buffer; filename: string; mimetype: string },
      input: UploadImageInput
    ): Promise<Result<Image, 'UPLOAD_FAILED' | 'DB_ERROR'>> {
      // 1. Upload to S3
      const key = `gallery/${userId}/${Date.now()}-${file.filename}`
      const uploadResult = await imageStorage.upload(key, file.buffer, file.mimetype)
      if (!uploadResult.ok) return { ok: false, error: 'UPLOAD_FAILED' }

      // 2. Save to DB
      try {
        const image = await imageRepo.insert({
          userId,
          title: input.title,
          description: input.description,
          imageUrl: uploadResult.data.url,
        })
        return { ok: true, data: image }
      } catch {
        return { ok: false, error: 'DB_ERROR' }
      }
    },

    async getImage(id: string) {
      return imageRepo.findById(id)
    },

    async listImages(userId: string) {
      return imageRepo.findByUserId(userId)
    },
  }
}
```

### routes.ts (wires dependencies)

```typescript
import { Hono } from 'hono'
import { auth } from '../../middleware/auth'
import { createGalleryService } from './services'
import { createImageRepository } from './repositories'
import { createImageStorage } from './storage'  // S3 adapter
import { UploadImageInputSchema } from './types'

// Wire up dependencies
const galleryService = createGalleryService({
  imageRepo: createImageRepository(),
  imageStorage: createImageStorage(),
})

const gallery = new Hono()
gallery.use('*', auth)

gallery.get('/images', async (c) => {
  const userId = c.get('userId')
  const images = await galleryService.listImages(userId)
  return c.json(images)
})

gallery.get('/images/:id', async (c) => {
  const result = await galleryService.getImage(c.req.param('id'))
  if (!result.ok) return c.json({ error: 'Not found' }, 404)
  return c.json(result.data)
})

gallery.post('/images', async (c) => {
  const userId = c.get('userId')
  const formData = await c.req.formData()
  const file = formData.get('file') as File
  const body = {
    title: formData.get('title'),
    description: formData.get('description'),
  }

  const parsed = UploadImageInputSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400)
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const result = await galleryService.uploadImage(userId, {
    buffer,
    filename: file.name,
    mimetype: file.type,
  }, parsed.data)

  if (!result.ok) return c.json({ error: result.error }, 500)
  return c.json(result.data, 201)
})

export default gallery
```

### storage.ts (implements ImageStorage port)

```typescript
import { s3Client } from '@repo/api-core'
import type { ImageStorage } from './ports'

export function createImageStorage(): ImageStorage {
  return {
    async upload(key, buffer, mimetype) {
      try {
        await s3Client.putObject({ Key: key, Body: buffer, ContentType: mimetype })
        const url = `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${key}`
        return { ok: true, data: { url } }
      } catch {
        return { ok: false, error: 'UPLOAD_FAILED' }
      }
    },

    async delete(key) {
      try {
        await s3Client.deleteObject({ Key: key })
        return { ok: true, data: undefined }
      } catch {
        return { ok: false, error: 'DELETE_FAILED' }
      }
    },

    async getSignedUrl(key, expiresIn = 3600) {
      return s3Client.getSignedUrl(key, expiresIn)
    },
  }
}
```

---

## Phase 4: Migrate Remaining Domains

Same flat pattern with ports for each:

1. **Gallery** (done in Phase 3)
2. **Instructions** (MOCs) - largest
3. **Wishlist**
4. **Parts Lists**
5. **Sets**
6. **Health/Config** - utility

Each domain: `routes.ts` + `services.ts` + `ports.ts` + `repositories.ts` + `storage.ts` (if needed) + `types.ts`

---

## Phase 5: Cleanup

1. Delete `apps/api/platforms/`
2. Delete `apps/api/` once all domains migrated
3. Update root `pnpm dev` to run `apps/lego-api`

---

## Verification

```bash
# Start Docker Postgres
docker-compose up -d postgres

# Run dev server
pnpm --filter lego-api dev

# Test
curl http://localhost:3001/health
curl http://localhost:3001/gallery/images -H "Authorization: Bearer $TOKEN"
```

---

## What We're NOT Doing (for MVP)

- No Cucumber/Gherkin (just Vitest)
- No X-Ray tracing
- No CloudWatch metrics
- No deep folder nesting (flat files with formal ports)
- No OpenSearch (use Postgres full-text for now)
- No Redis caching
- No deployment configs

---

---

## Execution Strategy: Multi-Agent Orchestration

**This is a large refactor.** Use orchestrators, leaders, and parallel worker agents to maximize efficiency.

### Agent Structure

```
Orchestrator (you)
  │
  ├── Phase 1: api-core package
  │     └── Single agent (sequential - foundation must be solid)
  │
  ├── Phase 2: lego-api scaffold
  │     └── Single agent (sequential - depends on Phase 1)
  │
  ├── Phase 3+4: Domain Migration (PARALLEL)
  │     ├── Leader Agent (coordinates)
  │     │
  │     ├── Worker: Gallery domain
  │     ├── Worker: Instructions domain
  │     ├── Worker: Wishlist domain
  │     ├── Worker: Parts Lists domain
  │     ├── Worker: Sets domain
  │     └── Worker: Health/Config domain
  │
  └── Phase 5: Cleanup
        └── Single agent (sequential - final verification)
```

### Parallelization Opportunities

| Task | Parallel? | Notes |
|------|-----------|-------|
| Create `packages/api-core` | No | Foundation - must complete first |
| Create `apps/lego-api` scaffold | No | Depends on api-core |
| Migrate Gallery domain | Yes | Reference implementation first, then others can parallel |
| Migrate Instructions domain | Yes | Can run after Gallery pattern established |
| Migrate Wishlist domain | Yes | Independent |
| Migrate Parts Lists domain | Yes | Independent |
| Migrate Sets domain | Yes | Independent |
| Migrate Health/Config domain | Yes | Independent |
| Final cleanup & verification | No | Must wait for all domains |

### Recommended Execution

1. **Phase 1-2:** Single agent, sequential
2. **Phase 3 (Gallery):** Single agent - establish the pattern
3. **Phase 4 (Remaining):** Spawn 5 parallel worker agents, each migrating one domain
4. **Phase 5:** Single agent, verify everything works

### Worker Agent Prompt Template

For each domain worker:

```
You are migrating the [DOMAIN] domain to hexagonal architecture.

Reference: plans/API-RESTRUCTURE-HEXAGONAL.md (Phase 3 Gallery example)

Source files:
- apps/api/routes/[domain].ts
- apps/api/services/[domain]/

Target:
- apps/lego-api/domains/[domain]/
  - routes.ts
  - services.ts
  - ports.ts
  - repositories.ts
  - storage.ts (if needed)
  - types.ts

Follow the Gallery pattern exactly. When done, update the progress tracker.
```

---

## Resume Instructions

If this conversation is lost, start a new session and say:

> "Resume the API restructure plan at `plans/API-RESTRUCTURE-HEXAGONAL.md`. Check the progress tracker and continue from the next incomplete phase. Use parallel worker agents for domain migration."
