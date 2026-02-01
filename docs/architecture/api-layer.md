# API Layer Architecture

> **Last Verified:** 2026-01-28
>
> This document defines the required structure for all API code.
> Agents and developers MUST follow this pattern when adding or modifying endpoints.

## Overview

The API uses **Hexagonal Architecture** (Ports & Adapters) with **Hono** as the HTTP framework. All domain code lives in `apps/api/lego-api/domains/`.

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                      PLATFORMS                          │
                    │   ┌─────────┐    ┌─────────┐    ┌─────────┐            │
                    │   │   Bun   │    │ Vercel  │    │ Lambda  │            │
                    │   │ (local) │    │  (edge) │    │  (prod) │            │
                    │   └────┬────┘    └────┬────┘    └────┬────┘            │
                    │        └──────────────┼──────────────┘                 │
                    └───────────────────────┼─────────────────────────────────┘
                                            ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                              DOMAINS                                           │
│  apps/api/lego-api/domains/{domain}/                                          │
│                                                                                │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                   │
│  │  routes.ts   │────▶│ application/ │────▶│   ports/     │                   │
│  │  (HTTP)      │     │ (services)   │     │ (interfaces) │                   │
│  └──────────────┘     └──────────────┘     └──────┬───────┘                   │
│                                                    │                           │
│  ┌──────────────┐                          ┌──────▼───────┐                   │
│  │  types.ts    │                          │  adapters/   │                   │
│  │  (Zod)       │                          │ (repos, s3)  │                   │
│  └──────────────┘                          └──────────────┘                   │
└───────────────────────────────────────────────────────────────────────────────┘
                                            │
                                            ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                            INFRASTRUCTURE                                      │
│         @repo/api-core (DB, S3, Redis, OpenSearch)                            │
└───────────────────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
apps/api/lego-api/
├── domains/                    # Domain modules (hexagonal architecture)
│   ├── gallery/
│   │   ├── application/        # Business logic (services)
│   │   │   ├── index.ts        # Re-exports services
│   │   │   └── services.ts     # Pure business logic
│   │   ├── adapters/           # Infrastructure implementations
│   │   │   ├── index.ts        # Re-exports adapters
│   │   │   ├── repositories.ts # Database adapter (Drizzle)
│   │   │   └── storage.ts      # S3 adapter
│   │   ├── ports/              # Interface definitions
│   │   │   └── index.ts        # Repository/storage interfaces
│   │   ├── __tests__/          # Domain tests
│   │   │   └── services.test.ts
│   │   ├── routes.ts           # Hono HTTP routes (thin adapter)
│   │   └── types.ts            # Zod schemas + type inference
│   │
│   ├── wishlist/               # Full domain with cross-domain deps
│   ├── health/                 # Simplified domain (no adapters/ports)
│   ├── instructions/
│   ├── sets/
│   ├── parts-lists/
│   └── config/
│
├── composition/                # Dependency wiring
│   └── index.ts                # Shared db, schema exports
│
├── middleware/                 # Hono middleware
│   ├── auth.ts
│   └── error-handler.ts
│
├── core/                       # Infrastructure (legacy location)
│   ├── database/
│   ├── storage/
│   └── cache/
│
└── platforms/                  # Platform entry points
    ├── bun/
    ├── vercel/
    └── aws/
```

## Layer Responsibilities

### application/ - Business Logic

Contains pure business logic with **no infrastructure knowledge**. Services receive dependencies through function parameters (dependency injection).

**Key characteristics:**

- Pure functions, no HTTP types
- All I/O through injected ports
- Testable without mocking infrastructure
- Contains domain validation rules

```typescript
// domains/wishlist/application/services.ts

export interface WishlistServiceDeps {
  wishlistRepo: WishlistRepository
  imageStorage?: WishlistImageStorage
  setsService?: SetsService // Cross-domain dependency
}

export function createWishlistService(deps: WishlistServiceDeps) {
  const { wishlistRepo, imageStorage, setsService } = deps

  return {
    async getItem(userId: string, itemId: string): Promise<Result<WishlistItem, WishlistError>> {
      const result = await wishlistRepo.findById(itemId)
      if (!result.ok) return result

      // Business rule: ownership check
      if (result.data.userId !== userId) {
        return err('FORBIDDEN')
      }

      return result
    },
    // ... other methods
  }
}
```

### adapters/ - Infrastructure Implementations

Implements the port interfaces using specific technologies (Drizzle, S3, Redis).

**Key characteristics:**

- Implements port interfaces
- Contains all database queries
- Contains all external service calls
- Isolated from business logic

```typescript
// domains/wishlist/adapters/repositories.ts

export function createWishlistRepository(
  db: NodePgDatabase<Schema>,
  schema: Schema,
): WishlistRepository {
  const { wishlistItems } = schema

  return {
    async findById(id: string): Promise<Result<WishlistItem, 'NOT_FOUND'>> {
      const row = await db.query.wishlistItems.findFirst({
        where: eq(wishlistItems.id, id),
      })

      if (!row) return err('NOT_FOUND')
      return ok(mapRowToWishlistItem(row))
    },
    // ... other methods
  }
}
```

### ports/ - Interface Definitions

Defines contracts between application and adapters. Services depend on these interfaces, not concrete implementations.

**Key characteristics:**

- Pure TypeScript interfaces
- No implementation code
- Defines method signatures and return types
- Uses domain types from types.ts

```typescript
// domains/wishlist/ports/index.ts

import type { Result, PaginatedResult, PaginationInput } from '@repo/api-core'
import type { WishlistItem, UpdateWishlistItemInput } from '../types.js'

export interface WishlistRepository {
  findById(id: string): Promise<Result<WishlistItem, 'NOT_FOUND'>>
  findByUserId(
    userId: string,
    pagination: PaginationInput,
    filters?: FilterOptions,
  ): Promise<PaginatedResult<WishlistItem>>
  insert(data: Omit<WishlistItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<WishlistItem>
  update(
    id: string,
    data: Partial<UpdateWishlistItemInput>,
  ): Promise<Result<WishlistItem, 'NOT_FOUND'>>
  delete(id: string): Promise<Result<void, 'NOT_FOUND'>>
}

export interface WishlistImageStorage {
  generateUploadUrl(
    userId: string,
    fileName: string,
    mimeType: string,
  ): Promise<Result<PresignResponse, PresignError>>
  buildImageUrl(key: string): string
  copyImage(sourceKey: string, destKey: string): Promise<Result<{ url: string }, CopyError>>
  deleteImage(key: string): Promise<Result<void, DeleteError>>
}
```

### routes.ts - HTTP Adapter

Thin HTTP layer that translates HTTP requests to service calls. Routes should be **30-50 lines per endpoint**.

**Key characteristics:**

- Parses and validates requests
- Calls service methods
- Formats responses
- Maps errors to HTTP status codes
- Wires dependencies at module load

```typescript
// domains/wishlist/routes.ts

import { Hono } from 'hono'
import { db, schema } from '../../composition/index.js'
import { createWishlistService } from './application/index.js'
import { createWishlistRepository } from './adapters/index.js'
import { CreateWishlistItemInputSchema } from './types.js'

// Wire dependencies
const wishlistRepo = createWishlistRepository(db, schema)
const wishlistService = createWishlistService({ wishlistRepo })

const wishlist = new Hono()

wishlist.get('/:id', async c => {
  const userId = c.get('userId')
  const itemId = c.req.param('id')

  const result = await wishlistService.getItem(userId, itemId)

  if (!result.ok) {
    const status = result.error === 'NOT_FOUND' ? 404 : 403
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data)
})

wishlist.post('/', async c => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const input = CreateWishlistItemInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await wishlistService.createItem(userId, input.data)
  if (!result.ok) return c.json({ error: result.error }, 500)

  return c.json(result.data, 201)
})

export default wishlist
```

### types.ts - Zod Schemas

Contains all Zod schemas for the domain. Types are **always inferred** from schemas using `z.infer<>`.

**Key characteristics:**

- Zod schemas for runtime validation
- Types inferred from schemas
- No TypeScript interfaces (per CLAUDE.md)
- Shared with frontend via @repo/api-client

```typescript
// domains/health/types.ts

import { z } from 'zod'

export const LivenessResponseSchema = z.object({
  status: z.literal('ok'),
})

export type LivenessResponse = z.infer<typeof LivenessResponseSchema>

export const HealthStatusSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  version: z.string(),
  environment: z.string(),
  timestamp: z.string().datetime(),
  services: z.object({
    database: z.enum(['connected', 'disconnected']),
  }),
})

export type HealthStatus = z.infer<typeof HealthStatusSchema>
```

## Hexagonal Architecture

### Why Hexagonal Architecture?

The hexagonal architecture (Ports & Adapters) provides:

1. **Testability** - Business logic can be tested without database or HTTP
2. **Flexibility** - Easy to swap infrastructure (PostgreSQL to DynamoDB)
3. **Maintainability** - Clear separation of concerns
4. **Platform Independence** - Core domain works on any platform

### The Pattern

```
                    ┌─────────────────────────────┐
                    │      Primary Adapters       │
                    │  (HTTP routes, CLI, tests)  │
                    └─────────────┬───────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │     Primary Ports           │
                    │  (Service interfaces)       │
                    └─────────────┬───────────────┘
                                  │
                    ┌─────────────▼───────────────┐
                    │     Application Core        │
                    │   (Business Logic)          │
                    │   Pure, no dependencies     │
                    └─────────────┬───────────────┘
                                  │
                    ┌─────────────▼───────────────┐
                    │    Secondary Ports          │
                    │  (Repository interfaces)    │
                    └─────────────┬───────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │   Secondary Adapters        │
                    │  (DB repos, S3, Redis)      │
                    └─────────────────────────────┘
```

**Primary Adapters** (routes.ts) drive the application - they call the services.

**Secondary Adapters** (adapters/) are driven by the application - services call them through ports.

### Dependency Rule

Dependencies point **inward**:

- Routes depend on services
- Services depend on ports (interfaces)
- Adapters implement ports
- Core domain depends on nothing external

## Real Code Examples

### Health Domain (Simple Example)

The health domain demonstrates the minimal pattern for domains without external infrastructure dependencies.

**Structure:**

```
domains/health/
├── application/
│   ├── index.ts          # Re-exports
│   └── services.ts       # Business logic
├── __tests__/
│   └── services.test.ts
├── routes.ts             # HTTP routes
└── types.ts              # Zod schemas
```

**routes.ts** (thin HTTP adapter):

```typescript
import { Hono } from 'hono'
import {
  getLivenessStatus,
  getReadinessStatus,
  getHealthStatus,
  getApiInfo,
} from './application/index.js'

const health = new Hono()

health.get('/live', c => {
  const status = getLivenessStatus()
  return c.json(status)
})

health.get('/ready', async c => {
  const status = await getReadinessStatus()
  const httpStatus = status.status === 'ready' ? 200 : 503
  return c.json(status, httpStatus)
})

health.get('/', async c => {
  const status = await getHealthStatus()
  return c.json(status)
})

export default health
```

**application/services.ts** (pure business logic):

```typescript
import { testConnection } from '@repo/api-core'
import type { LivenessResponse, ReadinessResponse, HealthStatus } from '../types.js'

export function getLivenessStatus(): LivenessResponse {
  return { status: 'ok' }
}

export async function getReadinessStatus(): Promise<ReadinessResponse> {
  let databaseStatus: 'ok' | 'error' = 'error'

  try {
    const dbOk = await testConnection()
    databaseStatus = dbOk ? 'ok' : 'error'
  } catch {
    databaseStatus = 'error'
  }

  return {
    status: databaseStatus === 'ok' ? 'ready' : 'not_ready',
    checks: { database: databaseStatus },
  }
}
```

### Wishlist Domain (Complex Example with Cross-Domain Dependencies)

The wishlist domain demonstrates the full pattern including cross-domain service injection.

**Structure:**

```
domains/wishlist/
├── application/
│   ├── index.ts
│   └── services.ts        # Business logic with injected deps
├── adapters/
│   ├── index.ts
│   ├── repositories.ts    # Drizzle implementation
│   └── storage.ts         # S3 implementation
├── ports/
│   └── index.ts           # Repository & storage interfaces
├── __tests__/
│   ├── services.test.ts
│   └── purchase.test.ts
├── routes.ts
└── types.ts
```

**routes.ts** (dependency wiring + HTTP adapter):

```typescript
import { Hono } from 'hono'
import { db, schema } from '../../composition/index.js'
import { createSetsService } from '../sets/application/index.js'
import { createSetRepository } from '../sets/adapters/index.js'
import { createWishlistService } from './application/index.js'
import { createWishlistRepository, createWishlistImageStorage } from './adapters/index.js'

// Wire dependencies
const wishlistRepo = createWishlistRepository(db, schema)
const imageStorage = createWishlistImageStorage()

// Cross-domain: inject SetsService for purchase flow
const setRepo = createSetRepository(db, schema)
const setsService = createSetsService({ setRepo })

const wishlistService = createWishlistService({
  wishlistRepo,
  imageStorage,
  setsService, // Injected cross-domain dependency
})

const wishlist = new Hono()

// POST /:id/purchased - Uses cross-domain setsService
wishlist.post('/:id/purchased', async c => {
  const userId = c.get('userId')
  const itemId = c.req.param('id')
  const input = MarkAsPurchasedInputSchema.safeParse(await c.req.json())

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  // Service call uses injected setsService internally
  const result = await wishlistService.markAsPurchased(userId, itemId, input.data)

  if (!result.ok) {
    const status = result.error === 'NOT_FOUND' ? 404 : result.error === 'FORBIDDEN' ? 403 : 500
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data, 201)
})

export default wishlist
```

## Creating a New Domain

### Step-by-Step Guide

1. **Create directory structure:**

```bash
mkdir -p apps/api/lego-api/domains/{domain-name}/{application,adapters,ports,__tests__}
```

2. **Create types.ts first** (defines the data contract):

```typescript
// domains/{domain}/types.ts
import { z } from 'zod'

export const ItemSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type Item = z.infer<typeof ItemSchema>

export const CreateItemInputSchema = ItemSchema.omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
})

export type CreateItemInput = z.infer<typeof CreateItemInputSchema>
```

3. **Define ports** (interfaces for infrastructure):

```typescript
// domains/{domain}/ports/index.ts
import type { Result } from '@repo/api-core'
import type { Item, CreateItemInput } from '../types.js'

export interface ItemRepository {
  findById(id: string): Promise<Result<Item, 'NOT_FOUND'>>
  insert(userId: string, input: CreateItemInput): Promise<Item>
  delete(id: string): Promise<Result<void, 'NOT_FOUND'>>
}
```

4. **Implement adapters:**

```typescript
// domains/{domain}/adapters/repositories.ts
import type { ItemRepository } from '../ports/index.js'

export function createItemRepository(db: Database, schema: Schema): ItemRepository {
  return {
    async findById(id) {
      /* Drizzle query */
    },
    async insert(userId, input) {
      /* Drizzle insert */
    },
    async delete(id) {
      /* Drizzle delete */
    },
  }
}

// domains/{domain}/adapters/index.ts
export { createItemRepository } from './repositories.js'
```

5. **Create application services:**

```typescript
// domains/{domain}/application/services.ts
import type { ItemRepository } from '../ports/index.js'

export interface ItemServiceDeps {
  itemRepo: ItemRepository
}

export function createItemService(deps: ItemServiceDeps) {
  const { itemRepo } = deps

  return {
    async getItem(userId: string, itemId: string) {
      const result = await itemRepo.findById(itemId)
      if (!result.ok) return result
      if (result.data.userId !== userId) return err('FORBIDDEN')
      return result
    },
    // ...
  }
}

// domains/{domain}/application/index.ts
export { createItemService, type ItemServiceDeps } from './services.js'
```

6. **Create routes.ts** (wire everything):

```typescript
// domains/{domain}/routes.ts
import { Hono } from 'hono'
import { auth } from '../../middleware/auth.js'
import { db, schema } from '../../composition/index.js'
import { createItemService } from './application/index.js'
import { createItemRepository } from './adapters/index.js'
import { CreateItemInputSchema } from './types.js'

const itemRepo = createItemRepository(db, schema)
const itemService = createItemService({ itemRepo })

const items = new Hono()
items.use('*', auth)

items.get('/:id', async c => {
  const result = await itemService.getItem(c.get('userId'), c.req.param('id'))
  if (!result.ok) return c.json({ error: result.error }, result.error === 'NOT_FOUND' ? 404 : 403)
  return c.json(result.data)
})

export default items
```

7. **Add tests:**

```typescript
// domains/{domain}/__tests__/services.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createItemService } from '../application/services.js'
import type { ItemRepository } from '../ports/index.js'

function createMockRepo(): ItemRepository {
  return {
    findById: vi.fn().mockResolvedValue({ ok: true, data: mockItem }),
    insert: vi.fn().mockResolvedValue(mockItem),
    delete: vi.fn().mockResolvedValue({ ok: true }),
  }
}

describe('ItemService', () => {
  let repo: ItemRepository
  let service: ReturnType<typeof createItemService>

  beforeEach(() => {
    repo = createMockRepo()
    service = createItemService({ itemRepo: repo })
  })

  it('returns item when user owns it', async () => {
    const result = await service.getItem('user-123', 'item-id')
    expect(result.ok).toBe(true)
  })
})
```

8. **Mount in main router:**

```typescript
// routes/index.ts
import items from '../domains/{domain}/routes.js'
app.route('/{domain}', items)
```

### Checklist

- [ ] types.ts with Zod schemas
- [ ] ports/index.ts with interfaces (if needed)
- [ ] adapters/ with implementations (if needed)
- [ ] application/services.ts with business logic
- [ ] routes.ts with thin HTTP adapter
- [ ] **tests**/ with unit tests
- [ ] Mount in main router

## Hono Framework Patterns

### Route Definition

```typescript
const domain = new Hono()

// Apply middleware to all routes
domain.use('*', auth)

// Route definitions
domain.get('/', async c => {
  /* list */
})
domain.get('/:id', async c => {
  /* get by id */
})
domain.post('/', async c => {
  /* create */
})
domain.put('/:id', async c => {
  /* update */
})
domain.delete('/:id', async c => {
  /* delete */
})

export default domain
```

### Request Validation with Zod

```typescript
import { CreateItemInputSchema } from './types.js'

domain.post('/', async c => {
  const body = await c.req.json()
  const input = CreateItemInputSchema.safeParse(body)

  if (!input.success) {
    return c.json(
      {
        error: 'Validation failed',
        details: input.error.flatten(),
      },
      400,
    )
  }

  // input.data is typed and validated
  const result = await service.create(input.data)
  return c.json(result, 201)
})
```

### Response Formatting

```typescript
// Success responses
return c.json(data)                    // 200 OK
return c.json(data, 201)               // 201 Created
return c.body(null, 204)               // 204 No Content

// Error responses
return c.json({ error: 'NOT_FOUND' }, 404)
return c.json({ error: 'FORBIDDEN' }, 403)
return c.json({ error: 'Validation failed', details: {...} }, 400)
return c.json({ error: 'Internal server error' }, 500)
```

### Error Handling Pattern

```typescript
domain.get('/:id', async c => {
  const userId = c.get('userId')
  const itemId = c.req.param('id')

  const result = await service.getItem(userId, itemId)

  if (!result.ok) {
    // Map domain errors to HTTP status codes
    const status = result.error === 'NOT_FOUND' ? 404 : result.error === 'FORBIDDEN' ? 403 : 500

    return c.json({ error: result.error }, status)
  }

  return c.json(result.data)
})
```

## Shared Schema Patterns

### Backend Owns Schemas

All Zod schemas are defined in `domains/{domain}/types.ts`. The backend is the source of truth.

### Frontend Imports via @repo/api-client

Schemas are re-exported in `packages/core/api-client/src/schemas/`:

```typescript
// packages/core/api-client/src/schemas/wishlist.ts
import { z } from 'zod'

export const WishlistItemSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(1),
  store: z.enum(['LEGO', 'Barweer', 'Cata', 'BrickLink', 'Other']),
  // ...
})

export type WishlistItem = z.infer<typeof WishlistItemSchema>
```

Frontend apps import:

```typescript
import { WishlistItemSchema, type WishlistItem } from '@repo/api-client'
```

### Schema Versioning

When schemas change:

1. Update backend types.ts
2. Update @repo/api-client schemas
3. Update frontend consumers
4. Consider backward compatibility for API responses

## Cross-Domain Dependencies

### Pattern: Service Injection

When one domain needs functionality from another, inject the dependent service.

**Example: Wishlist -> Sets (Purchase Flow)**

```typescript
// domains/wishlist/application/services.ts
export interface WishlistServiceDeps {
  wishlistRepo: WishlistRepository
  imageStorage?: WishlistImageStorage
  setsService?: SetsService // Optional cross-domain dependency
}

export function createWishlistService(deps: WishlistServiceDeps) {
  const { wishlistRepo, setsService } = deps

  return {
    async markAsPurchased(userId: string, itemId: string, input: MarkAsPurchasedInput) {
      // Get wishlist item
      const wishlistResult = await wishlistRepo.findById(itemId)
      if (!wishlistResult.ok) return wishlistResult

      // Use cross-domain service to create Set
      if (!setsService) return err('SET_CREATION_FAILED')

      const setResult = await setsService.createSet(userId, {
        title: wishlistResult.data.title,
        purchasePrice: input.pricePaid,
        // ...
      })

      if (!setResult.ok) return err('SET_CREATION_FAILED')

      // Optionally delete wishlist item
      if (!input.keepOnWishlist) {
        await wishlistRepo.delete(itemId)
      }

      return ok(setResult.data)
    },
  }
}
```

**Wiring in routes.ts:**

```typescript
// domains/wishlist/routes.ts
import { createSetsService } from '../sets/application/index.js'
import { createSetRepository } from '../sets/adapters/index.js'

// Create Sets infrastructure
const setRepo = createSetRepository(db, schema)
const setsService = createSetsService({ setRepo })

// Inject into Wishlist service
const wishlistService = createWishlistService({
  wishlistRepo,
  imageStorage,
  setsService, // Cross-domain injection
})
```

### Guidelines

1. **Inject at route level** - Wire cross-domain deps in routes.ts
2. **Use interfaces** - Depend on service types, not implementations
3. **Make optional** - Use `?` for cross-domain deps that aren't always needed
4. **Avoid cycles** - Domain A can depend on B, but B shouldn't depend on A

## Testing Strategy

### Unit Tests (application/)

Test business logic with mock repositories:

```typescript
// domains/wishlist/__tests__/services.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createWishlistService } from '../application/services.js'
import type { WishlistRepository } from '../ports/index.js'

function createMockRepo(): WishlistRepository {
  return {
    findById: vi.fn().mockResolvedValue({ ok: true, data: mockItem }),
    // ...
  }
}

describe('WishlistService', () => {
  let repo: WishlistRepository
  let service: ReturnType<typeof createWishlistService>

  beforeEach(() => {
    repo = createMockRepo()
    service = createWishlistService({ wishlistRepo: repo })
  })

  it('returns FORBIDDEN when user does not own item', async () => {
    const result = await service.getItem('other-user', mockItem.id)
    expect(result.ok).toBe(false)
    expect(result.error).toBe('FORBIDDEN')
  })
})
```

### Integration Tests (adapters/)

Test database operations with test database:

```typescript
// Integration tests use real database (in test environment)
describe('WishlistRepository', () => {
  it('inserts and retrieves item', async () => {
    const repo = createWishlistRepository(testDb, schema)
    const item = await repo.insert(testUserId, { title: 'Test', store: 'LEGO' })
    const result = await repo.findById(item.id)
    expect(result.ok).toBe(true)
    expect(result.data.title).toBe('Test')
  })
})
```

### Route Tests

Test HTTP layer with Hono test client:

```typescript
import { testClient } from 'hono/testing'
import wishlist from '../routes.js'

describe('Wishlist Routes', () => {
  it('returns 404 for non-existent item', async () => {
    const client = testClient(wishlist)
    const res = await client.get('/nonexistent-id')
    expect(res.status).toBe(404)
  })
})
```

## Migration Notes

### Old Pattern (Deprecated)

```
apps/api/
├── services/              # ❌ DEPRECATED
│   ├── gallery/
│   │   └── index.ts
│   └── wishlist/
│       └── index.ts
└── routes/
    ├── gallery.ts
    └── wishlist.ts
```

### New Pattern (Canonical)

```
apps/api/lego-api/
└── domains/               # ✅ USE THIS
    ├── gallery/
    │   ├── application/
    │   ├── adapters/
    │   ├── ports/
    │   ├── routes.ts
    │   └── types.ts
    └── wishlist/
        └── ...
```

### Migration Steps

When touching legacy code:

1. **Create domain directory** under `apps/api/lego-api/domains/`
2. **Move types** to `types.ts` (ensure Zod schemas)
3. **Extract interfaces** to `ports/index.ts`
4. **Move infrastructure** to `adapters/`
5. **Move business logic** to `application/services.ts`
6. **Create thin routes.ts** with dependency wiring
7. **Update imports** in consuming code
8. **Add tests** for services

### When to Migrate

- When adding features to existing domain
- When fixing bugs in domain code
- When refactoring for performance
- **Do NOT** migrate just for consistency - only when files are touched

## Anti-Patterns to Avoid

### Business Logic in Routes

```typescript
// ❌ WRONG - Business logic in route
app.post('/wishlist', async c => {
  const maxSortOrder = await db.query(...)  // Should be in service
  if (user.quota > limit) return c.json({ error: 'Quota exceeded' }, 400)  // Business rule
  await db.insert(...)
})

// ✅ CORRECT - Route calls service
app.post('/wishlist', async c => {
  const result = await wishlistService.createItem(userId, input)
  if (!result.ok) return c.json({ error: result.error }, 400)
  return c.json(result.data, 201)
})
```

### HTTP Types in Services

```typescript
// ❌ WRONG - Service knows about HTTP
export async function createItem(req: Request): Promise<Response> {
  const body = await req.json()
  return new Response(JSON.stringify(result))
}

// ✅ CORRECT - Service is pure
export async function createItem(
  userId: string,
  input: CreateItemInput,
): Promise<Result<Item, ItemError>> {
  // Pure business logic
  return ok(item)
}
```

### Direct Infrastructure in Services

```typescript
// ❌ WRONG - Direct database call in service
export async function getItem(id: string) {
  const item = await db.query.items.findFirst({ where: eq(items.id, id) })
  return item
}

// ✅ CORRECT - Use injected repository
export function createItemService({ itemRepo }: ItemServiceDeps) {
  return {
    async getItem(id: string) {
      return itemRepo.findById(id)
    },
  }
}
```

## Verification

Code review agents will verify:

1. Service file exists for any new endpoint
2. Route file is thin (< 50 lines per endpoint)
3. No HTTP types in service layer
4. No business logic in route layer
5. Types use Zod schemas with `z.infer<>`
6. No TypeScript interfaces for domain types
