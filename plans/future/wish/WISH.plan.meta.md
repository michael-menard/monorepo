---
doc_type: plan_meta
title: "WISH — Wishlist Epic Meta Plan"
status: active
story_prefix: WISH
epic_source: "plans/future/wishlist"
created_at: "2026-01-24T02:00:00-07:00"
updated_at: "2026-01-24T02:00:00-07:00"
tags:
  - wishlist-gallery
  - lego
  - url-scraping
  - react
  - aws-lambda
---

# WISH — Wishlist Epic Meta Plan

## Story Prefix

All stories in this project use the **WISH** prefix.
- Story IDs: `WISH-2000`, `WISH-2001`, etc.
- Story folders: `plans/stories/WISH-XXX/`
- Artifact files: `ELAB-WISH-XXX.md`, `PROOF-WISH-XXX.md`, etc.

## Project Goal

Enable users to track LEGO and alt-brick sets they want to purchase with URL-based scraping, manual entry, and a "Got it" flow to transition items to their Sets collection.

## PRD Reference

See [Epic 6: Wishlist PRD](./plans/future/wishlist/PRD.md)

## Documentation Structure

- `plans/` contains cross-cutting strategy and execution docs
- `plans/stories/WISH-XXX/` contains all per-story artifacts
- `plans/future/wishlist/` contains the original PLAN and PRD documents (reference)

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
| `apps/api/endpoints/wishlist` | Wishlist API Lambda handlers | WISH-2000, WISH-2001, WISH-2002, WISH-2003, WISH-2004 |
| `apps/web/app-wishlist-gallery` | Wishlist Gallery React feature module | WISH-2001-WISH-2006 |
| `packages/core/api-client` | RTK Query slices and schemas | WISH-2001+ |
| `packages/core/app-component-library` | Shared UI components | WISH-2001 (WishlistCard) |
| `packages/core/accessibility` | Roving tabindex, keyboard shortcuts | WISH-2006 |

### Import Policy

- Shared code MUST be imported via workspace package names
- Use `@repo/app-component-library` for UI primitives
- Use `@repo/api-client` for API hooks and schemas
- Use `@repo/logger` for logging (never console.log)

### Zod-First Types (Required)

All types MUST be defined as Zod schemas with inferred types:

```typescript
import { z } from 'zod'

const WishlistItemSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  title: z.string(),
  store: z.string(),
  // ...
})

type WishlistItem = z.infer<typeof WishlistItemSchema>
```

### UI Component Patterns

- WishlistCard wraps AppGalleryCard from `@repo/app-component-library`
- Gallery pages use consistent filtering and sorting (store tabs, search, sort controls)
- Detail pages show full item metadata
- Use Framer Motion for modal transitions
- Accessibility-first: ARIA labels, keyboard nav, focus management

### Testing Requirements

- API tests for all endpoints
- Component tests for all UI components
- MSW handlers for network mocking
- E2E tests via Playwright in `apps/web/playwright`

---

## Data Model Summary

### Wishlist Items Table

| Column | Type | Required | Default |
|--------|------|----------|---------|
| id | UUID | Yes | random |
| userId | text | Yes | — |
| title | text | Yes | — |
| store | text | Yes | — |
| setNumber | text | No | — |
| sourceUrl | text | No | — |
| imageUrl | text | No | — |
| price | decimal | No | — |
| currency | text | No | — |
| pieceCount | integer | No | — |
| releaseDate | timestamp | No | — |
| tags | text[] | No | [] |
| priority | integer | No | 0 |
| notes | text | No | — |
| sortOrder | integer | No | 0 |
| createdAt | timestamp | Yes | now |
| updatedAt | timestamp | Yes | now |

---

## API Endpoints Summary

| Method | Endpoint | Story | Description |
|--------|----------|-------|-------------|
| GET | /api/wishlist | WISH-2001 | List with filters/pagination/sorting |
| GET | /api/wishlist/:id | WISH-2001 | Get single item |
| POST | /api/wishlist | WISH-2002 | Create new item |
| PATCH | /api/wishlist/:id | WISH-2003 | Update item |
| DELETE | /api/wishlist/:id | WISH-2004 | Hard delete item |
| POST | /api/wishlist/:id/purchased | WISH-2004 | Mark as purchased/"Got it" |
| PATCH | /api/wishlist/reorder | WISH-2005 | Update sortOrder |

---

## Agent Log

Append-only.

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-01-24 02:00 | pm-bootstrap-generation-leader | Initial plan creation | WISH.plan.meta.md |
