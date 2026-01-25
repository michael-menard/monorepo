---
doc_type: plan_meta
title: "sets — Sets Gallery Epic Meta Plan"
status: active
story_prefix: "sets"
epic_source: "docs/stories.bak/epic-7-sets"
created_at: "2026-01-24T23:00:00-07:00"
updated_at: "2026-01-24T23:00:00-07:00"
tags:
  - sets-gallery
  - lego
  - collection-management
  - react
  - aws-lambda
---

# sets — Sets Gallery Epic Meta Plan

## Story Prefix

All stories in this project use the **sets** prefix (lowercase).
- Story IDs: `sets-1000`, `sets-2000`, `sets-2001`, etc.
- Story folders: `plans/stories/sets-XXX/`
- Artifact files: `elab-sets-XXX.md`, `proof-sets-XXX.md`, etc.

## Project Goal

Implement a comprehensive Sets Gallery feature that allows users to manage their LEGO set collection. The feature includes gallery views, CRUD operations, image uploads, build status tracking, wishlist integration, and MOC linking.

## PRD Reference

See [Epic 7: Sets Gallery PRD](/docs/prd/epic-7-sets-gallery.md)

## Documentation Structure

- `plans/` contains cross-cutting strategy and execution docs
- `plans/stories/sets-XXX/` contains all per-story artifacts
- `docs/stories.bak/epic-7-sets/` contains the original story documents (reference)

## Naming Rule (timestamps in filenames)

All docs MUST include a timestamp in the filename:
- Format: `YYYYMMDD-HHMM` (America/Denver)

## Principles

### Story folders are atomic and self-contained
Each story folder contains all artifacts for that story:
- Story document
- Elaboration
- Proof
- Code review
- QA verification
- QA gate

### Documentation structure must be automation-friendly
- YAML front matter for metadata
- Consistent section headers
- Machine-parseable artifact references

### Stories represent units of intent, validation, and evidence
- Intent: What should be built
- Validation: How to verify it works
- Evidence: Proof that it was built correctly

## Principles (Project-Specific)

### Reuse First (Non-Negotiable)

- Prefer reusing existing workspace packages under `packages/**`
- No per-story one-off utilities
- If capability missing: extend existing package or create new shared package

### Package Boundary Rules

| Package | Purpose | Stories |
|---------|---------|---------|
| `apps/api/endpoints/sets` | Sets API Lambda handlers | sets-2000, sets-2001, sets-2002, sets-2003, sets-2004 |
| `apps/web/app-sets-gallery` | Sets Gallery React feature module | sets-2001-sets-2010 |
| `packages/core/api-client` | RTK Query slices and schemas | sets-2001+ |
| `packages/core/app-component-library` | Shared UI components | sets-2001 (AppGalleryCard) |

### Import Policy

- Shared code MUST be imported via workspace package names
- Use `@repo/app-component-library` for UI primitives
- Use `@repo/api-client` for API hooks and schemas
- Use `@repo/logger` for logging (never console.log)

### Zod-First Types (Required)

All types MUST be defined as Zod schemas with inferred types:

```typescript
import { z } from 'zod'

const SetSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  setNumber: z.string().optional(),
  // ...
})

type Set = z.infer<typeof SetSchema>
```

### UI Component Patterns

- SetGalleryCard wraps AppGalleryCard from `@repo/app-component-library`
- Detail pages use consistent two-column layout (images left, metadata right)
- Use Framer Motion for animations (build status celebrations, etc.)
- Accessibility-first: ARIA labels, keyboard nav, focus management

### Testing Requirements

- API tests for all endpoints
- Component tests for all UI components
- MSW handlers for network mocking (no direct mock API imports)
- E2E tests via Playwright in `apps/web/playwright`

---

## Data Model Summary

### Sets Table

| Column | Type | Required | Default |
|--------|------|----------|---------|
| id | UUID | Yes | random |
| userId | text | Yes | - |
| title | text | Yes | - |
| setNumber | text | No | - |
| store | text | No | - |
| sourceUrl | text | No | - |
| pieceCount | integer | No | - |
| releaseDate | timestamp | No | - |
| theme | text | No | - |
| tags | text[] | No | [] |
| notes | text | No | - |
| isBuilt | boolean | Yes | false |
| quantity | integer | Yes | 1 |
| purchasePrice | decimal | No | - |
| tax | decimal | No | - |
| shipping | decimal | No | - |
| purchaseDate | timestamp | No | - |
| wishlistItemId | UUID | No | - |
| createdAt | timestamp | Yes | now |
| updatedAt | timestamp | Yes | now |

### Set Images Table

| Column | Type | Required | Default |
|--------|------|----------|---------|
| id | UUID | Yes | random |
| setId | UUID | Yes | - |
| imageUrl | text | Yes | - |
| thumbnailUrl | text | No | - |
| position | integer | Yes | 0 |
| createdAt | timestamp | Yes | now |

### Set MOC Links Table (sets-2007)

| Column | Type | Required | Default |
|--------|------|----------|---------|
| id | UUID | Yes | random |
| setId | UUID | Yes | - |
| mocId | UUID | Yes | - |
| createdAt | timestamp | Yes | now |

---

## API Endpoints Summary

| Method | Endpoint | Story | Description |
|--------|----------|-------|-------------|
| GET | /api/sets | sets-2001 | List user's sets with filtering |
| GET | /api/sets/:id | sets-2001 | Get single set with images |
| POST | /api/sets | sets-2002 | Create new set |
| POST | /api/sets/:id/images/presign | sets-2002 | Get presigned S3 URL |
| POST | /api/sets/:id/images | sets-2002 | Register uploaded image |
| DELETE | /api/sets/:id/images/:imageId | sets-2002 | Delete image |
| PATCH | /api/sets/:id | sets-2003 | Update set fields |
| DELETE | /api/sets/:id | sets-2004 | Delete set |
| GET | /api/sets/check-duplicate | sets-2006 | Check for duplicate by setNumber |
| POST | /api/wishlist/:id/got-it | sets-2006 | Convert wishlist to set |
| POST | /api/sets/:id/undo-got-it | sets-2006 | Undo got-it conversion |
| POST | /api/sets/:id/mocs | sets-2007 | Link MOC to set |
| DELETE | /api/sets/:id/mocs/:mocId | sets-2007 | Unlink MOC from set |

---

## Agent Log

Append-only.

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-01-24 23:00 | bootstrap | Initial plan creation | sets.plan.meta.md, sets.plan.exec.md |
