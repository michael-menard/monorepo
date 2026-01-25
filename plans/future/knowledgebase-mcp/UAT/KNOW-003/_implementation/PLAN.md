# KNOW-003 Implementation Plan

## Overview

Implement 5 CRUD operations for the knowledge base with dependency injection pattern, Zod validation, and integration with existing EmbeddingClient and DrizzleDB.

## Implementation Order

```
1. errors.ts           → Custom error classes (no dependencies)
2. schemas.ts          → Zod input schemas (no dependencies)
3. kb-add.ts           → Depends on: errors.ts, schemas.ts
4. kb-get.ts           → Depends on: schemas.ts
5. kb-update.ts        → Depends on: errors.ts, schemas.ts, kb-get.ts (for existence check)
6. kb-delete.ts        → Depends on: schemas.ts
7. kb-list.ts          → Depends on: schemas.ts
8. index.ts            → Exports all operations
```

## File Specifications

### 1. `errors.ts` - Custom Error Classes

```typescript
// Purpose: Typed error classes for domain-specific errors
// Exports: NotFoundError

export class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} with id '${id}' not found`)
    this.name = 'NotFoundError'
  }
}
```

### 2. `schemas.ts` - Zod Input Schemas

```typescript
// Purpose: Validate all CRUD operation inputs
// Exports: KbAddInputSchema, KbGetInputSchema, KbUpdateInputSchema,
//          KbDeleteInputSchema, KbListInputSchema, and inferred types

// Content length limit: 30000 chars (safety margin for OpenAI 8191 token limit)
const MAX_CONTENT_LENGTH = 30000

const KbAddInputSchema = z.object({
  content: z.string().min(1).max(MAX_CONTENT_LENGTH),
  role: KnowledgeRoleSchema,
  tags: z.array(z.string()).optional().nullable(),
})

const KbGetInputSchema = z.object({
  id: z.string().uuid(),
})

const KbUpdateInputSchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(1).max(MAX_CONTENT_LENGTH).optional(),
  role: KnowledgeRoleSchema.optional(),
  tags: z.array(z.string()).optional().nullable(),
}).refine(
  data => data.content !== undefined || data.role !== undefined || data.tags !== undefined,
  { message: 'At least one field must be provided for update' }
)

const KbDeleteInputSchema = z.object({
  id: z.string().uuid(),
})

const KbListInputSchema = z.object({
  role: KnowledgeRoleSchema.optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().int().positive().max(100).default(10),
}).optional()
```

### 3. `kb-add.ts` - Add Knowledge Entry

```typescript
// Flow:
// 1. Validate input with Zod
// 2. Generate embedding via EmbeddingClient (BEFORE db operation)
// 3. Insert into knowledge_entries table
// 4. Return UUID of created entry
// 5. Log success with cache hit/miss metric

async function kb_add(
  input: KbAddInput,
  deps: { db: DrizzleClient; embeddingClient: EmbeddingClient }
): Promise<string>
```

### 4. `kb-get.ts` - Retrieve Knowledge Entry

```typescript
// Flow:
// 1. Validate UUID format
// 2. Query knowledge_entries by ID
// 3. Return entry or null if not found
// 4. Log query at debug level

async function kb_get(
  input: KbGetInput,
  deps: { db: DrizzleClient }
): Promise<KnowledgeEntry | null>
```

### 5. `kb-update.ts` - Update Knowledge Entry

```typescript
// Flow:
// 1. Validate input with Zod
// 2. Fetch existing entry (throw NotFoundError if missing)
// 3. If content changed:
//    a. Compute content hash
//    b. Compare with existing content hash
//    c. If different, generate new embedding
// 4. Update entry with new fields + updatedAt timestamp
// 5. Return updated entry
// 6. Log update with re-embedding indicator

async function kb_update(
  input: KbUpdateInput,
  deps: { db: DrizzleClient; embeddingClient: EmbeddingClient }
): Promise<KnowledgeEntry>
```

### 6. `kb-delete.ts` - Delete Knowledge Entry

```typescript
// Flow:
// 1. Validate UUID format
// 2. Delete from knowledge_entries (no-op if doesn't exist)
// 3. Return void (idempotent - success even if entry didn't exist)
// 4. Log deletion at info level

async function kb_delete(
  input: KbDeleteInput,
  deps: { db: DrizzleClient }
): Promise<void>
```

### 7. `kb-list.ts` - List Knowledge Entries

```typescript
// Flow:
// 1. Validate input (or use defaults)
// 2. Build query with filters:
//    - role filter: WHERE role = ?
//    - tags filter: WHERE tags && ARRAY[?] (array overlap)
// 3. Order by createdAt DESC
// 4. Limit to min(input.limit, 100)
// 5. Return array of entries
// 6. Log query at debug level

async function kb_list(
  input?: KbListInput,
  deps?: { db: DrizzleClient }
): Promise<KnowledgeEntry[]>
```

### 8. `index.ts` - Exports

```typescript
// Re-export all operations and schemas
export { kb_add } from './kb-add.js'
export { kb_get } from './kb-get.js'
export { kb_update } from './kb-update.js'
export { kb_delete } from './kb-delete.js'
export { kb_list } from './kb-list.js'
export { NotFoundError } from './errors.js'
export * from './schemas.js'
```

## Dependencies Structure

```
                 ┌─────────────┐
                 │  errors.ts  │
                 └──────┬──────┘
                        │
    ┌───────────────────┼───────────────────┐
    ▼                   ▼                   │
┌─────────┐       ┌───────────┐            │
│ kb-add  │       │ kb-update │            │
└─────────┘       └───────────┘            │
                                           │
                 ┌─────────────┐            │
                 │ schemas.ts  │◄───────────┤
                 └──────┬──────┘            │
                        │                   │
    ┌───────────┬───────┼───────┬──────────┘
    ▼           ▼       ▼       ▼
┌─────────┐ ┌─────────┐ ┌──────────┐ ┌─────────┐
│ kb-add  │ │ kb-get  │ │ kb-delete│ │ kb-list │
└─────────┘ └─────────┘ └──────────┘ └─────────┘
```

## External Dependencies

| Dependency | Import Path | Usage |
|------------|-------------|-------|
| DrizzleClient | `../db/client.js` | Database operations |
| knowledgeEntries | `../db/schema.js` | Table reference |
| EmbeddingClient | `../embedding-client/index.js` | Embedding generation |
| logger | `@repo/logger` | Logging |
| z (Zod) | `zod` | Input validation |
| KnowledgeRoleSchema | `../__types__/index.js` | Role enum |

## Database Operations

### kb_add
```sql
INSERT INTO knowledge_entries (id, content, embedding, role, tags, created_at, updated_at)
VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())
RETURNING id
```

### kb_get
```sql
SELECT * FROM knowledge_entries WHERE id = $1
```

### kb_update
```sql
UPDATE knowledge_entries
SET content = COALESCE($2, content),
    embedding = COALESCE($3, embedding),
    role = COALESCE($4, role),
    tags = COALESCE($5, tags),
    updated_at = NOW()
WHERE id = $1
RETURNING *
```

### kb_delete
```sql
DELETE FROM knowledge_entries WHERE id = $1
```

### kb_list
```sql
SELECT * FROM knowledge_entries
WHERE ($1::text IS NULL OR role = $1)
  AND ($2::text[] IS NULL OR tags && $2)
ORDER BY created_at DESC
LIMIT $3
```

## Test Strategy

Each operation gets its own test file with:
1. Happy path tests
2. Validation error tests
3. Edge case tests

Test helpers provide:
- Mock EmbeddingClient (returns fixed 1536-dim vector)
- Mock DrizzleClient (in-memory or real DB)
- Cleanup utilities

## Content Hash Comparison (kb_update)

For detecting content changes without fetching embedding:
```typescript
import { createHash } from 'crypto'

function computeContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex')
}
```

Note: EmbeddingClient already has `computeContentHash` in cache-manager.ts - reuse that.

## Logging Strategy

| Operation | Level | Message Template |
|-----------|-------|------------------|
| kb_add success | info | "Knowledge entry created" with { id, role, tags, cacheHit } |
| kb_get | debug | "Knowledge entry query" with { id, found } |
| kb_update success | info | "Knowledge entry updated" with { id, reEmbedded } |
| kb_delete success | info | "Knowledge entry deleted" with { id } |
| kb_list | debug | "Knowledge entries listed" with { role, tags, count } |
| All errors | error | Error message with sanitized context |

## Timestamp
Generated: 2026-01-25
