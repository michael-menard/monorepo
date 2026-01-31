# Migrate API Endpoint to Hono + Services Pattern

## Overview

This prompt guides the migration of a single API endpoint from the legacy pattern (business logic inline in platform handlers) to the new ports & adapters pattern (Hono routes + services).

**Reference:** `docs/architecture/api-layer.md`

## Target Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  platforms/bun/index.ts     → Just exports app.fetch        │
│  platforms/vercel/api/...   → Just exports app.fetch        │
│  platforms/aws/handler.ts   → Just uses handle(app)         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  routes/{domain}.ts         → Thin HTTP adapter (30-50 LOC) │
│  - Parse request                                            │
│  - Call service                                             │
│  - Return response                                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  services/{domain}/{operation}.ts  → Pure business logic    │
│  - No HTTP types                                            │
│  - Zod schemas for input/output                             │
│  - Database/S3/Redis calls                                  │
└─────────────────────────────────────────────────────────────┘
```

## Input Required

Before starting, identify:
- **Domain**: e.g., `gallery`, `moc`, `wishlist`, `sets`
- **Operation**: e.g., `upload-image`, `list`, `create`, `delete`
- **Source files**:
  - AWS: `platforms/aws/endpoints/{domain}/{operation}/handler.ts`
  - Vercel: `platforms/vercel/api/{domain}/{operation}.ts`

## Migration Steps

### Step 1: Analyze the Existing Endpoint

Read the existing handler(s) and identify:

1. **HTTP concerns** (stay in route):
   - Request parsing (`event.body`, `req.body`)
   - Path/query parameters
   - Authentication extraction
   - Response status codes
   - Error response formatting

2. **Business logic** (move to service):
   - Validation beyond basic parsing
   - Database queries
   - S3 operations
   - Redis/cache operations
   - OpenSearch indexing
   - Business rule enforcement
   - Data transformation

3. **Schemas** (define in service):
   - Input schema (request body)
   - Output schema (response body)
   - Any intermediate types

### Step 2: Create the Service

Create `apps/api/services/{domain}/{operation}.ts`:

```typescript
/**
 * {Domain} Service: {Operation}
 *
 * Migrated from:
 * - platforms/aws/endpoints/{domain}/{operation}/handler.ts
 * - platforms/vercel/api/{domain}/{operation}.ts
 */

import { z } from 'zod'
// Import from core - NOT from platform-specific code
import { db } from '../../core/database/client'
import { logger } from '@repo/logger'

// ============================================================================
// Schemas (Zod-first)
// ============================================================================

export const {Operation}InputSchema = z.object({
  // Extract from existing validation logic
})

export type {Operation}Input = z.infer<typeof {Operation}InputSchema>

export const {Operation}OutputSchema = z.object({
  // Extract from existing response structure
})

export type {Operation}Output = z.infer<typeof {Operation}OutputSchema>

// ============================================================================
// Service Function
// ============================================================================

export async function {operation}(
  userId: string,  // If auth required
  input: {Operation}Input,
): Promise<{Operation}Output> {
  // Move ALL business logic here
  // NO HTTP types (Request, Response, APIGatewayEvent, etc.)
}
```

### Step 3: Create the Route

If the domain route doesn't exist, create `apps/api/routes/{domain}.ts`:

```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { {operation}, {Operation}InputSchema } from '../services/{domain}/{operation}'

const {domain} = new Hono()

// Add auth middleware if needed
// {domain}.use('*', authMiddleware)

{domain}.{method}('/{path}', zValidator('json', {Operation}InputSchema), async (c) => {
  const userId = c.get('userId')
  const input = c.req.valid('json')

  const result = await {operation}(userId, input)

  return c.json(result, {statusCode})
})

export default {domain}
```

If the domain route exists, add the new endpoint to it.

### Step 4: Mount the Route

Add to `apps/api/routes/index.ts`:

```typescript
import {domain} from './{domain}'

// In the routes section:
app.route('/{domain}', {domain})
```

### Step 5: Create Service Tests

Create `apps/api/services/{domain}/__tests__/{operation}.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { {operation} } from '../{operation}'

describe('{operation}', () => {
  it('should handle valid input', async () => {
    // Test the service directly - no HTTP mocking needed
  })

  it('should enforce business rules', async () => {
    // Test validation, permissions, etc.
  })
})
```

### Step 6: Verify

1. **Type check**: `pnpm check-types --filter lego-api-serverless`
2. **Test service**: `pnpm test --filter lego-api-serverless`
3. **Manual test**:
   ```bash
   pnpm dev:bun --filter lego-api-serverless
   curl http://localhost:3001/{domain}/{path}
   ```

### Step 7: Delete Legacy Handlers

Remove the old platform-specific handlers completely. No need to maintain deprecated code.

**Delete AWS handler:**
```bash
rm -rf apps/api/platforms/aws/endpoints/{domain}/{operation}/
```

**Delete Vercel handler (if exists):**
```bash
rm -f apps/api/platforms/vercel/api/{domain}/{operation}.ts
```

**Example for `gallery/upload-image`:**
```bash
rm -rf apps/api/platforms/aws/endpoints/gallery/upload-image/
rm -f apps/api/platforms/vercel/api/gallery/upload-image.ts
```

After deletion, verify no orphaned imports remain:
```bash
pnpm check-types --filter lego-api-serverless
```

## Checklist

For each endpoint migration:

- [ ] Service file created at `services/{domain}/{operation}.ts`
- [ ] Service has Zod schemas for input/output
- [ ] Service has NO HTTP types (Request, Response, APIGatewayEvent, etc.)
- [ ] Service imports from `core/` not `platforms/`
- [ ] Route file exists at `routes/{domain}.ts`
- [ ] Route is thin (< 50 lines)
- [ ] Route only handles: parsing, auth extraction, calling service, formatting response
- [ ] Route mounted in `routes/index.ts`
- [ ] Service tests created
- [ ] Manual test passes with Bun dev server
- [ ] Legacy AWS handler deleted (`platforms/aws/endpoints/{domain}/{operation}/`)
- [ ] Legacy Vercel handler deleted (if exists)
- [ ] No orphaned imports (type check passes after deletion)

## Domains Overview

| Domain | Description | Endpoint Count | Priority |
|--------|-------------|----------------|----------|
| `health` | Health checks, liveness/readiness probes | 1 | ✅ Done |
| `gallery` | Image uploads, albums, gallery management | 13 | High |
| `moc-instructions` | MOC creation, editing, file management | 17 | High |
| `moc-parts-lists` | Parts list CRUD and parsing | 7 | Medium |
| `wishlist` | Wishlist item management | 9 | Medium |
| `sets` | LEGO set data and images | 4 | Low |
| `config` | App configuration | 1 | Low |
| `moc-uploads` | Multipart upload sessions | 1 | Low |
| `cleanup` | Scheduled cleanup tasks | 1 | Low |
| `websocket` | Real-time WebSocket handlers | 3 | Special |

**Total: 57 endpoints across 10 domains**

---

## Endpoints to Migrate

### Health Domain ✅ (Already Migrated)
- [x] `GET /health` - Full health status
- [x] `GET /health/live` - Liveness probe
- [x] `GET /health/ready` - Readiness probe

---

### Gallery Domain (13 endpoints)
**Source:** `platforms/aws/endpoints/gallery/`

#### Images
- [ ] `POST /gallery/images/upload` - Upload image (`upload-image/`)
- [ ] `GET /gallery/images` - List images (`list-images/`)
- [ ] `GET /gallery/images/:id` - Get image (`get-image/`)
- [ ] `PUT /gallery/images/:id` - Update image (`update-image/`)
- [ ] `DELETE /gallery/images/:id` - Delete image (`delete-image/`)
- [ ] `GET /gallery/images/search` - Search images (`search-images/`)
- [ ] `POST /gallery/images/:id/flag` - Flag image (`flag-image/`)

#### Albums
- [ ] `POST /gallery/albums` - Create album (`create-album/`)
- [ ] `GET /gallery/albums` - List albums (`list-albums/`)
- [ ] `GET /gallery/albums/:id` - Get album (`get-album/`)
- [ ] `PUT /gallery/albums/:id` - Update album (`update-album/`)
- [ ] `DELETE /gallery/albums/:id` - Delete album (`delete-album/`)

---

### MOC Instructions Domain (17 endpoints)
**Source:** `platforms/aws/endpoints/moc-instructions/`
**Note:** Has existing `_shared/moc-service.ts` - move to `services/moc/`

#### Core CRUD
- [ ] `POST /mocs/initialize` - Initialize MOC with files (`initialize-with-files/`)
- [ ] `GET /mocs` - List MOCs (`list/`)
- [ ] `GET /mocs/:id` - Get MOC detail (`get/`)
- [ ] `PUT /mocs/:id` - Edit MOC (`edit/`)
- [ ] `POST /mocs/:id/finalize` - Finalize MOC (`finalize-with-files/`)

#### File Management
- [ ] `POST /mocs/:id/files` - Upload file (`upload-file/`)
- [ ] `GET /mocs/:id/files/:fileId/download` - Download file (`download-file/`)
- [ ] `DELETE /mocs/:id/files/:fileId` - Delete file (`delete-file/`)
- [ ] `POST /mocs/:id/presign` - Get presigned URL for edit (`edit-presign/`)
- [ ] `POST /mocs/:id/edit-finalize` - Finalize edit (`edit-finalize/`)

#### Parts Lists
- [ ] `POST /mocs/:id/parts-list` - Upload parts list (`upload-parts-list/`)

#### Gallery Integration
- [ ] `GET /mocs/:id/gallery-images` - Get linked gallery images (`get-gallery-images/`)
- [ ] `POST /mocs/:id/gallery-images/:imageId` - Link gallery image (`link-gallery-image/`)
- [ ] `DELETE /mocs/:id/gallery-images/:imageId` - Unlink gallery image (`unlink-gallery-image/`)

#### Import
- [ ] `POST /mocs/import` - Import from URL (`import-from-url/`)

#### Stats
- [ ] `GET /mocs/stats` - Get stats (`get-stats/`)
- [ ] `GET /mocs/uploads-over-time` - Get upload timeline (`get-uploads-over-time/`)

---

### MOC Parts Lists Domain (7 endpoints)
**Source:** `platforms/aws/endpoints/moc-parts-lists/`

- [ ] `POST /parts-lists` - Create parts list (`create/`)
- [ ] `GET /parts-lists/:id` - Get parts list (`get/`)
- [ ] `PUT /parts-lists/:id` - Update parts list (`update/`)
- [ ] `DELETE /parts-lists/:id` - Delete parts list (`delete/`)
- [ ] `PUT /parts-lists/:id/status` - Update status (`update-status/`)
- [ ] `POST /parts-lists/parse` - Parse parts list file (`parse/`)
- [ ] `GET /parts-lists/user-summary` - Get user summary (`get-user-summary/`)

---

### Wishlist Domain (9 endpoints)
**Source:** `platforms/aws/endpoints/wishlist/`

- [ ] `POST /wishlist` - Create wishlist item (`create-item/`)
- [ ] `GET /wishlist` - List wishlist items (`list/`)
- [ ] `GET /wishlist/:id` - Get wishlist item (`get-item/`)
- [ ] `PUT /wishlist/:id` - Update wishlist item (`update-item/`)
- [ ] `DELETE /wishlist/:id` - Delete wishlist item (`delete-item/`)
- [ ] `PUT /wishlist/reorder` - Reorder wishlist (`reorder/`)
- [ ] `GET /wishlist/search` - Search wishlist (`search/`)
- [ ] `POST /wishlist/:id/image` - Upload wishlist image (`upload-image/`)

---

### Sets Domain (4 endpoints)
**Source:** `platforms/aws/endpoints/sets/`

- [ ] `POST /sets` - Create set (`create/`)
- [ ] `GET /sets` - List sets (`list/`)
- [ ] `GET /sets/:id` - Get set (`get/`)
- [ ] `GET /sets/:id/images` - Get set images (`images/`)

---

### Config Domain (1 endpoint)
**Source:** `platforms/aws/endpoints/config/`

- [ ] `GET /config/upload` - Get upload config (`upload/`)

---

### MOC Uploads Domain (1 endpoint)
**Source:** `platforms/aws/endpoints/moc-uploads/`

- [ ] `POST /uploads/sessions` - Create upload session (`sessions/`)

---

### Cleanup Domain (1 endpoint)
**Source:** `platforms/aws/endpoints/cleanup/`

- [ ] `POST /cleanup/orphans` - Edit orphaned records (`edit-orphans/`)

---

### WebSocket Domain (3 endpoints) ✅ (Services Migrated)
**Source:** `platforms/aws/endpoints/websocket/`
**Note:** WebSocket handlers remain in `platforms/aws/` because they respond to API Gateway WebSocket lifecycle events (not HTTP). Business logic moved to `services/websocket/`.

- [x] `$connect` - WebSocket connect handler (`connect/`) → services/websocket/connections.ts
- [x] `$disconnect` - WebSocket disconnect handler (`disconnect/`) → services/websocket/connections.ts
- [x] `$default` - WebSocket default message handler (`default/`) → handler stays thin (no business logic)
- [x] Broadcast utilities → services/websocket/broadcast.ts
- [x] Message types → services/websocket/message-types.ts, schemas.ts

**TODO:** Delete `platforms/aws/endpoints/websocket/_shared/` after verification

---

## Notes

- **Migrate incrementally**: One endpoint at a time, verify it works, delete legacy, then move on
- **Delete immediately**: Don't accumulate deprecated code - delete legacy handlers as soon as migration is verified
- **Existing `moc-service.ts`**: Already exists at `platforms/aws/endpoints/moc-instructions/_shared/moc-service.ts` - move this to `services/moc/` and refactor
- **Don't duplicate**: If a service function already exists somewhere, move it rather than rewrite
