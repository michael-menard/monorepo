---
status: uat
---

# STORY-010: MOC Parts Lists Management

## Context

This story migrates the MOC Parts Lists API from AWS Lambda to Vercel serverless functions. Parts lists allow users to track the parts needed for their MOC (My Own Creation) builds, including CSV import, status tracking (built/purchased), and aggregated statistics.

The existing AWS implementation provides 7 endpoints for CRUD operations, status updates, CSV parsing, and user-level summary statistics. This story ports that functionality to Vercel following the established patterns from STORY-002 through STORY-007.

## Goal

Enable full CRUD operations and CSV import for MOC parts lists on Vercel, maintaining feature parity with the existing AWS Lambda implementation.

## Non-Goals

- Image uploads for parts (separate story)
- OpenSearch integration (not needed for parts lists)
- XML parsing (CSV only for this story)
- Real-time WebSocket updates
- Parts list sharing between users
- Integration with external parts databases (Rebrickable, BrickLink)

## Scope

### Endpoints

| Method | Path | Handler |
|--------|------|---------|
| POST | `/api/moc-instructions/{mocId}/parts-lists` | Create parts list |
| GET | `/api/moc-instructions/{mocId}/parts-lists` | Get all parts lists for MOC |
| PUT | `/api/moc-instructions/{mocId}/parts-lists/{id}` | Update parts list metadata |
| PATCH | `/api/moc-instructions/{mocId}/parts-lists/{id}/status` | Update built/purchased flags |
| DELETE | `/api/moc-instructions/{mocId}/parts-lists/{id}` | Delete parts list + cascade parts |
| POST | `/api/moc-instructions/{mocId}/parts-lists/{id}/parse` | Parse and import CSV |
| GET | `/api/user/parts-lists/summary` | Get aggregated user statistics |

### Packages/Apps Affected

| Package/App | Change Type |
|-------------|-------------|
| `packages/backend/moc-parts-lists-core/` | **NEW** - Core business logic |
| `apps/api/platforms/vercel/api/moc-instructions/` | **NEW** - 4 Vercel route files |
| `apps/api/platforms/vercel/api/user/parts-lists/` | **NEW** - 1 Vercel route file |
| `__http__/moc-parts-lists.http` | **NEW** - HTTP test definitions |

## Acceptance Criteria

### Core CRUD Operations

- [ ] **AC-1:** POST `/api/moc-instructions/{mocId}/parts-lists` creates a new parts list with `title` (required), optional `description`, `built`, `purchased` flags. Returns 201 with generated `id`.
- [ ] **AC-2:** POST create endpoint accepts optional `parts` array to initialize with parts. Each part has `partId`, `partName`, `quantity`, `color`.
- [ ] **AC-3:** GET `/api/moc-instructions/{mocId}/parts-lists` returns array of all parts lists for the MOC, each including nested `parts` array.
- [ ] **AC-4:** PUT `/api/moc-instructions/{mocId}/parts-lists/{id}` updates metadata fields (`title`, `description`, `notes`, `costEstimate`, `actualCost`). Returns 200.
- [ ] **AC-5:** DELETE `/api/moc-instructions/{mocId}/parts-lists/{id}` removes the parts list AND cascades delete to associated `moc_parts` records. Returns 204.

### Status Updates

- [ ] **AC-6:** PATCH `/api/moc-instructions/{mocId}/parts-lists/{id}/status` updates `built` and/or `purchased` boolean flags. Returns 200.

### CSV Parsing

- [ ] **AC-7:** POST `/api/moc-instructions/{mocId}/parts-lists/{id}/parse` accepts CSV content and parses it.
- [ ] **AC-8:** CSV must have columns: `Part ID`, `Part Name`, `Quantity`, `Color`. Parser validates structure.
- [ ] **AC-9:** Parse returns 400 with descriptive error if CSV has missing/invalid columns.
- [ ] **AC-10:** Parse returns 400 if CSV exceeds 10,000 rows (row limit enforced).
- [ ] **AC-11:** Parse returns 400 if any quantity is not a positive integer.
- [ ] **AC-12:** Parse operation is atomic (transaction) - partial failures roll back completely.
- [ ] **AC-13:** Parse uses batch insert pattern (1,000 row chunks) for performance.

### User Summary

- [ ] **AC-14:** GET `/api/user/parts-lists/summary` returns aggregated stats across all user's MOCs: `totalLists`, `totalParts`, `listsBuilt`, `listsPurchased`.

### Authentication & Authorization

- [ ] **AC-15:** All endpoints require valid Cognito JWT token. Returns 401 if missing/invalid.
- [ ] **AC-16:** All endpoints verify user owns the MOC. Returns 404 if MOC not found or not owned.
- [ ] **AC-17:** Parts list operations verify parts list belongs to specified MOC. Returns 404 if not found.

### Error Handling

- [ ] **AC-18:** Invalid request body returns 400 with `VALIDATION_ERROR` code and descriptive message.
- [ ] **AC-19:** Database errors return 500 with `INTERNAL_ERROR` code.

## Reuse Plan

### Existing Packages to Reuse

| Package | Usage |
|---------|-------|
| `@repo/logger` | Structured logging in all handlers |
| `@repo/vercel-adapter` | JWT validation, auth bypass for dev |
| `@repo/file-validator` | CSV file validation (magic bytes, size) |
| `drizzle-orm` | Database queries |
| `csv-parser` | CSV parsing (npm) |
| `zod` | Input validation schemas |

### New Package to Create

**`@repo/moc-parts-lists-core`** (under `packages/backend/moc-parts-lists-core/`)

Following the `@repo/gallery-core` pattern, exports:
- `createPartsList(db, input)` - Create with optional initial parts
- `getPartsLists(db, input)` - Get all for MOC
- `getUserPartsSummary(db, input)` - Aggregated user stats
- `updatePartsList(db, input)` - Update metadata
- `updatePartsListStatus(db, input)` - Update flags
- `deletePartsList(db, input)` - Delete with cascade
- `parsePartsCsv(db, input)` - Parse and import CSV

Each function receives a `DbClient` interface (dependency injection) for testability.

### Prohibited Patterns

- NO copying logger initialization per endpoint
- NO duplicating auth/ownership verification logic
- NO inline CSV parsing in Vercel handlers (must be in core package)

## Architecture Notes (Ports & Adapters)

```
┌─────────────────────────────────────────────────────────────┐
│ Vercel Handlers (Adapters)                                  │
│ apps/api/platforms/vercel/api/moc-instructions/.../         │
│ - HTTP request/response handling                            │
│ - JWT extraction via @repo/vercel-adapter                   │
│ - Route parameter extraction                                │
│ - Delegates to core functions                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Core Package (Port)                                         │
│ packages/backend/moc-parts-lists-core/                      │
│ - Business logic                                            │
│ - Zod validation schemas                                    │
│ - Database operations via injected client                   │
│ - CSV parsing logic                                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Database (Infrastructure)                                   │
│ - PostgreSQL via Drizzle ORM                                │
│ - Tables: moc_parts_lists, moc_parts                        │
│ - Transactions for parse atomicity                          │
└─────────────────────────────────────────────────────────────┘
```

## Required Vercel / Infra Notes

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_BYPASS` | Set to `true` for local dev |
| `DEV_USER_SUB` | User ID for auth bypass mode |
| `COGNITO_USER_POOL_ID` | For JWT validation (prod) |
| `COGNITO_CLIENT_ID` | For JWT validation (prod) |

### Vercel Configuration

Add routes to `apps/api/platforms/vercel/vercel.json`:
```json
{
  "rewrites": [
    { "source": "/api/moc-instructions/:mocId/parts-lists", "destination": "/api/moc-instructions/[mocId]/parts-lists/index" },
    { "source": "/api/moc-instructions/:mocId/parts-lists/:id", "destination": "/api/moc-instructions/[mocId]/parts-lists/[id]" },
    { "source": "/api/moc-instructions/:mocId/parts-lists/:id/status", "destination": "/api/moc-instructions/[mocId]/parts-lists/[id]/status" },
    { "source": "/api/moc-instructions/:mocId/parts-lists/:id/parse", "destination": "/api/moc-instructions/[mocId]/parts-lists/[id]/parse" },
    { "source": "/api/user/parts-lists/summary", "destination": "/api/user/parts-lists/summary" }
  ]
}
```

### Performance Constraints

- **Parse endpoint:** Vercel Pro tier recommended (60s timeout). Hobby tier has 10s limit which may be insufficient for large CSV files.
- **Batch inserts:** 1,000 row chunks to avoid memory/timeout issues.
- **Row limit:** 10,000 max rows per CSV enforced server-side.

## HTTP Contract Plan

### Required `.http` Requests

All test requests defined in: `/__http__/moc-parts-lists.http`

| Request Name | Description |
|--------------|-------------|
| `createPartsList` | POST create with title only |
| `createPartsListWithParts` | POST create with initial parts array |
| `getPartsLists` | GET all for MOC |
| `updatePartsList` | PUT update metadata |
| `updatePartsListStatus` | PATCH update built/purchased |
| `deletePartsList` | DELETE with cascade |
| `parseCsv` | POST CSV content |
| `parseCsvInvalid` | POST invalid CSV (error case) |
| `parseCsvOverLimit` | POST > 10k rows (error case) |
| `getUserSummary` | GET user aggregated stats |
| `createPartsListUnauth` | POST without auth (401 test) |
| `createPartsListNotFound` | POST with invalid MOC ID (404 test) |

### Required Evidence

For proof document:
- Each `.http` request executed
- Response status code + key JSON fields captured
- Before/after database state for mutations

## Seed Requirements

### Required Test Data

For local testing and QA verification:

1. **MOC Instructions** - At least 1 MOC owned by test user (`DEV_USER_SUB`)
2. **Parts Lists** - At least 1 existing parts list for GET/UPDATE/DELETE tests
3. **Parts** - Sample parts in existing parts list

### Seed Implementation

Seed code must exist at: `apps/api/core/database/seeds/`

Seed must be:
- **Deterministic:** Same output on every run
- **Idempotent:** Safe to run multiple times (upsert or delete+insert)

Run with: `pnpm seed`

### Sample CSV for Parse Tests

Create test CSV at: `apps/api/core/database/seeds/test-parts-list.csv`

```csv
Part ID,Part Name,Quantity,Color
3001,Brick 2 x 4,25,Red
3002,Brick 2 x 3,15,Blue
3003,Brick 2 x 2,30,White
3004,Brick 1 x 2,50,Black
3005,Plate 1 x 1,100,Yellow
```

## Test Plan (Happy Path / Error Cases / Edge Cases)

*Synthesized from `_pm/TEST-PLAN.md`*

### Happy Path Tests

| ID | Test | Endpoint | Expected |
|----|------|----------|----------|
| HP-1 | Create parts list (title only) | POST create | 201, generated ID |
| HP-2 | Create with initial parts array | POST create | 201, parts in DB |
| HP-3 | Get all parts lists for MOC | GET list | 200, array with nested parts |
| HP-4 | Get user summary stats | GET summary | 200, aggregated counts |
| HP-5 | Update parts list metadata | PUT update | 200, updatedAt changed |
| HP-6 | Update status flags | PATCH status | 200, flags updated |
| HP-7 | Delete parts list | DELETE | 204, cascade verified |
| HP-8 | Parse valid CSV | POST parse | 200, parts inserted |

### Error Cases

| ID | Test | Expected |
|----|------|----------|
| E-1 | No auth token | 401 UNAUTHORIZED |
| E-2 | MOC not found | 404 NOT_FOUND |
| E-3 | MOC not owned by user | 404 NOT_FOUND |
| E-4 | Missing required title | 400 VALIDATION_ERROR |
| E-5 | Parts list not found | 404 NOT_FOUND |
| E-6 | CSV missing columns | 400 VALIDATION_ERROR |
| E-7 | CSV exceeds 10k rows | 400 row limit error |
| E-8 | CSV invalid quantity | 400 VALIDATION_ERROR |

### Edge Cases

| ID | Test | Expected |
|----|------|----------|
| ED-1 | Create with empty parts array | 201, zero parts |
| ED-2 | Update replaces all parts | Old parts removed |
| ED-3 | Duplicate part ID + color in CSV | Separate rows (not aggregated) |
| ED-4 | User summary with zero lists | 200, zeroed stats |
| ED-5 | Special characters in part names | Preserved correctly |
| ED-6 | Large CSV (9,999 rows) | Success within timeout |
| ED-7 | Concurrent updates | No corruption |

### Evidence Requirements

- All `.http` requests executed via `/__http__/moc-parts-lists.http`
- Unit tests for Zod schemas in core package
- Integration tests for each core function
- Transaction rollback test for parse failures
