# API Layer Architecture

> **This document defines the required structure for all API code.**
> Agents and developers MUST follow this pattern when adding or modifying endpoints.

## Overview

The API uses **Hexagonal Architecture** (Ports & Adapters) with **Hono** as the HTTP framework.

```
┌─────────────────────────────────────────────────────────────────┐
│                        PLATFORMS                                 │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐                     │
│   │   Bun   │    │ Vercel  │    │ Lambda  │  Entry points       │
│   │ (local) │    │  (edge) │    │  (prod) │  (5-10 lines each)  │
│   └────┬────┘    └────┬────┘    └────┬────┘                     │
│        └──────────────┼──────────────┘                          │
│                       ▼                                          │
│              ┌─────────────────┐                                 │
│              │   Hono Routes   │  PRIMARY ADAPTER                │
│              │   (/routes)     │  HTTP → Service calls           │
│              └────────┬────────┘                                 │
└───────────────────────┼─────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CORE DOMAIN                                  │
│              ┌─────────────────┐                                 │
│              │    Services     │  BUSINESS LOGIC                 │
│              │   (/services)   │  Pure functions, no HTTP        │
│              └────────┬────────┘                                 │
└───────────────────────┼─────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                   INFRASTRUCTURE                                 │
│              ┌─────────────────┐                                 │
│              │      Core       │  SECONDARY ADAPTERS             │
│              │    (/core)      │  DB, S3, Redis, OpenSearch      │
│              └─────────────────┘                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
apps/api/
├── services/              # Business logic (REQUIRED for all endpoints)
│   ├── gallery/
│   │   ├── index.ts       # Exports: uploadImage, listImages, etc.
│   │   └── __tests__/
│   ├── moc/
│   │   ├── index.ts       # Exports: createMoc, getMoc, listMocs, etc.
│   │   └── __tests__/
│   └── health/
│       └── index.ts
│
├── routes/                # Hono routes (thin HTTP adapters)
│   ├── index.ts           # Main app, mounts all routes
│   ├── health.ts
│   ├── gallery.ts
│   └── moc.ts
│
├── core/                  # Infrastructure (existing)
│   ├── database/
│   ├── storage/
│   ├── cache/
│   └── search/
│
└── platforms/             # Platform entry points
    ├── bun/
    │   └── index.ts       # Bun.serve(app)
    ├── vercel/
    │   └── api/[...route].ts
    └── aws/
        └── handler.ts     # Lambda adapter
```

## Rules

### 1. Services First

**NEVER** create a route without a corresponding service.

```typescript
// ❌ WRONG - Business logic in route
app.post('/gallery/upload', async (c) => {
  const file = await c.req.file()
  const processed = await sharp(file).resize(2048).webp().toBuffer()
  const key = `images/${userId}/${uuid()}.webp`
  await s3.upload(key, processed)
  await db.insert(galleryImages).values({ ... })
  return c.json(result)
})

// ✅ CORRECT - Route calls service
app.post('/gallery/upload', async (c) => {
  const userId = c.get('userId')
  const file = await c.req.file()
  const result = await galleryService.uploadImage(userId, file)
  return c.json(result, 201)
})
```

### 2. Routes Are Thin

Routes should be **30-50 lines max**. They handle:
- Request parsing
- Authentication extraction
- Calling the service
- Response formatting

```typescript
// routes/gallery.ts - GOOD (thin)
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { authMiddleware } from '../middleware/auth'
import * as galleryService from '../services/gallery'
import { UploadImageSchema } from '../services/gallery'

const gallery = new Hono()

gallery.use('*', authMiddleware)

gallery.post('/upload', zValidator('form', UploadImageSchema), async (c) => {
  const userId = c.get('userId')
  const input = c.req.valid('form')
  const result = await galleryService.uploadImage(userId, input)
  return c.json(result, 201)
})

export default gallery
```

### 3. Services Are Pure

Services contain business logic with **no HTTP knowledge**:

```typescript
// services/gallery/index.ts - GOOD (pure)
import { db } from '../../core/database/client'
import { uploadToS3 } from '../../core/storage/s3'
import { processImage } from '@repo/image-processing'

export async function uploadImage(
  userId: string,
  input: UploadImageInput
): Promise<GalleryImage> {
  // Validate business rules
  // Process image
  // Store in S3
  // Insert into database
  // Return result
}
```

### 4. Platform Entry Points Are Trivial

Each platform should be < 20 lines:

```typescript
// platforms/bun/index.ts
import app from '../../routes'
export default { port: 3001, fetch: app.fetch }

// platforms/vercel/api/[...route].ts
import app from '../../../routes'
export default app.fetch

// platforms/aws/handler.ts
import app from '../../routes'
import { handle } from 'hono/aws-lambda'
export const handler = handle(app)
```

## Adding a New Endpoint

Use the generator:

```bash
pnpm turbo gen api-endpoint
```

This creates:
1. `services/{domain}/{operation}.ts` - Business logic
2. Adds route to `routes/{domain}.ts` - HTTP adapter

**Manual creation checklist:**
- [ ] Service file exists in `/services`
- [ ] Service exports pure functions (no HTTP types)
- [ ] Service has Zod schemas for input/output
- [ ] Route file imports from service
- [ ] Route is < 50 lines
- [ ] Route only handles HTTP concerns
- [ ] Tests exist for service (unit) and route (integration)

## What Goes Where

| Concern | Location | Example |
|---------|----------|---------|
| HTTP parsing | Route | `c.req.json()`, `c.req.param()` |
| Auth extraction | Middleware | `authMiddleware` |
| Input validation | Route (with Zod) | `zValidator('json', Schema)` |
| Business rules | Service | `if (user.quota > limit) throw` |
| Database queries | Service | `db.select().from(table)` |
| External API calls | Service | `await openai.complete()` |
| Response formatting | Route | `c.json(result, 201)` |
| Error codes | Service | `throw new NotFoundError()` |
| HTTP status mapping | Route | `catch (e) { return c.json(..., 404) }` |

## Anti-Patterns to Avoid

### ❌ Inline Database Schema

```typescript
// WRONG - Schema duplicated in handler
const galleryImages = pgTable('gallery_images', { ... })

export default async function handler(req, res) {
  await db.insert(galleryImages).values(...)
}
```

### ❌ Business Logic in Route

```typescript
// WRONG - Validation, processing, storage all in route
app.post('/upload', async (c) => {
  if (file.size > 10 * 1024 * 1024) return c.json({ error: 'Too large' }, 400)
  const processed = await sharp(file).resize(2048).toBuffer()
  await s3.upload(...)
  await db.insert(...)
})
```

### ❌ HTTP Types in Service

```typescript
// WRONG - Service knows about HTTP
export async function uploadImage(req: Request): Promise<Response> {
  const body = await req.json()
  // ...
  return new Response(JSON.stringify(result))
}
```

### ❌ Platform-Specific Code in Shared Layers

```typescript
// WRONG - Lambda types in shared service
import { APIGatewayProxyEvent } from 'aws-lambda'

export async function processEvent(event: APIGatewayProxyEvent) { ... }
```

## Migration Path for Existing Code

Existing handlers in `platforms/aws/endpoints/` and `platforms/vercel/api/` should be migrated as they're touched:

1. Extract business logic to `services/{domain}/`
2. Create thin route in `routes/{domain}.ts`
3. Platform handlers can temporarily call service directly
4. Eventually, platform handlers will just mount the shared Hono app

**Priority:** New endpoints MUST use the new pattern. Existing endpoints migrate incrementally.

## Verification

The elaboration phase checks for "Ports & Adapters Compliance" by verifying:

1. Service file exists for any new endpoint
2. Route file is thin (< 50 lines)
3. No HTTP types in service layer
4. No business logic in route layer

Code review agents will reject PRs that violate these rules.
