---
doc_type: plan_exec
title: "WISH — Wishlist Epic Execution Plan"
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

# WISH — Wishlist Epic Execution Plan

## Story Prefix

All stories use the **WISH** prefix. Commands use the full prefixed ID:
- `/elab-story WISH-2000`
- `/dev-implement-story WISH-2000`
- `/qa-verify-story WISH-2000`
- `/scrum-master WISH-2000`

## Story Consolidation

This epic was created from the original wishlist PRD and PLAN, consolidated into 7 focused stories for efficient AI-driven implementation.

| Original Section | New Story ID | New Title |
|------------------|--------------|-----------|
| Phase 1: Foundation | WISH-2000 | Database Schema & Types |
| Phase 1: Foundation | WISH-2007 | Run Migration |
| Phase 2: Vertical Slice | WISH-2001 | Gallery MVP |
| Phase 3: Add Items | WISH-2002 | Add Item Flow |
| Phase 3: Detail & Edit | WISH-2003 | Detail & Edit Pages |
| Phase 3: Delete & Purchase | WISH-2004 | Modals & Transitions |
| Phase 4: UX Polish | WISH-2005 | UX Polish |
| Phase 5: Accessibility | WISH-2006 | Accessibility |

## Artifact Rules

- Each story outputs artifacts under: `plans/stories/WISH-XXX/`
- A story folder is the source of truth for all related documentation
- Story docs MUST include:
  - YAML front matter with status
  - A Token Budget section
  - An append-only Agent Log section

## Artifact Naming Convention

All artifacts use the story prefix (uppercase):

| Artifact | Filename |
|----------|----------|
| Story file | `WISH-XXX.md` |
| Elaboration | `ELAB-WISH-XXX.md` |
| Proof | `PROOF-WISH-XXX.md` |
| Code Review | `CODE-REVIEW-WISH-XXX.md` |
| QA Verify | `QA-VERIFY-WISH-XXX.md` |
| QA Gate | `QA-GATE-WISH-XXX.yaml` |

## Token Budget Rule

- Each story MUST include a `## Token Budget` section
- Before starting a phase, record `/cost` session total
- After completing a phase, record delta

---

## Dependency Graph (Visual)

```
                           ┌─────────────┐
                           │  WISH-2000  │
                           │  DB Schema  │
                           └──────┬──────┘
                                  │
                           ┌──────┴──────┐
                           │             │
                           ▼             ▼
                    ┌─────────────┐  ┌─────────────┐
                    │  WISH-2007  │  │  WISH-2001  │
                    │ Migration   │  │  Gallery    │
                    │             │  │  MVP        │
                    └─────────────┘  └──────┬──────┘
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    │                       │                       │
                    ▼                       ▼                       ▼
            ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
            │   WISH-2002     │  │   WISH-2003     │  │   WISH-2004     │
            │ Add Item Flow   │  │  Detail & Edit  │  │ Modals & Trans  │
            │                 │  │     Pages       │  │                 │
            └────────┬────────┘  └────────┬────────┘  └────────┬────────┘
                     │                    │                    │
                     └────────────────────┼────────────────────┘
                                          │
                                          ▼
                                  ┌─────────────────┐
                                  │   WISH-2005     │
                                  │   UX Polish     │
                                  │ (Drag & Drop)   │
                                  └────────┬────────┘
                                           │
                                           ▼
                                  ┌─────────────────┐
                                  │   WISH-2006     │
                                  │Accessibility    │
                                  │ (Keyboard Nav)  │
                                  └─────────────────┘
```

---

## Execution Phases

### Phase 1: Foundation (2 stories)

Sequential execution required.

| Story | Title | Est. Points | Depends On |
|-------|-------|-------------|------------|
| WISH-2000 | Database Schema & Types | 3 | — |
| WISH-2007 | Run Migration | 1 | WISH-2000 |

**Goals:**
- Drizzle schema for `wishlist_items` table
- Zod schemas for all request/response types
- Database migration to all environments
- Unblocks: All other stories

**Key Deliverables:**
- `apps/api/core/database/schema/wishlist.ts`
- Migration files
- `packages/core/api-client/src/schemas/wishlist.ts`

---

### Phase 2: Vertical Slice - MVP (1 story)

**Critical path** - creates functional read-only gallery.

| Story | Title | Est. Points | Depends On |
|-------|-------|-------------|------------|
| WISH-2001 | Gallery MVP | 8 | WISH-2000, WISH-2007 |

**Goals:**
- Complete read-only flow from API to UI
- Gallery with store filters, search, sorting, pagination
- Detail view
- RTK Query integration
- WishlistCard component

**Key Deliverables:**
- `apps/api/endpoints/wishlist/list/handler.ts`
- `apps/api/endpoints/wishlist/get/handler.ts`
- `packages/core/api-client/src/rtk/wishlist-api.ts`
- `apps/web/app-wishlist-gallery/src/pages/main-page.tsx`
- `apps/web/app-wishlist-gallery/src/pages/item-detail-page.tsx`
- `apps/web/app-wishlist-gallery/src/components/WishlistCard.tsx`

**MVP Scope:** Phase 1 + Phase 2 creates a functional read-only Wishlist Gallery.

---

### Phase 3: Core Features (3 stories - can run in parallel)

| Story | Title | Est. Points | Depends On |
|-------|-------|-------------|------------|
| WISH-2002 | Add Item Flow | 5 | WISH-2001 |
| WISH-2003 | Detail & Edit Pages | 5 | WISH-2001 |
| WISH-2004 | Modals & Transitions | 8 | WISH-2001 |

**Goals:**
- Complete CRUD operations: add, edit, delete, purchase
- Add item form with all fields, image upload via S3
- Edit page with pre-populated data
- Delete confirmation modal
- "Got it" modal with purchase details form
- Atomic transaction for purchase (create Set before delete Wishlist)

**Parallel Execution:** These stories have independent features but can run in parallel after gallery MVP completes.

**Key Deliverables:**
- `apps/api/endpoints/wishlist/create/handler.ts`
- `apps/api/endpoints/wishlist/update/handler.ts`
- `apps/api/endpoints/wishlist/delete/handler.ts`
- `apps/api/endpoints/wishlist/purchased/handler.ts`
- `apps/web/app-wishlist-gallery/src/pages/add-item-page.tsx`
- `apps/web/app-wishlist-gallery/src/pages/edit-item-page.tsx`
- `apps/web/app-wishlist-gallery/src/components/WishlistForm.tsx`
- `apps/web/app-wishlist-gallery/src/components/DeleteConfirmModal.tsx`
- `apps/web/app-wishlist-gallery/src/components/GotItModal.tsx`

---

### Phase 4: UX Polish (1 story)

| Story | Title | Est. Points | Depends On |
|-------|-------|-------------|------------|
| WISH-2005 | UX Polish | 5 | WISH-2002, WISH-2003, WISH-2004 |

**Goals:**
- Drag-and-drop reordering with dnd-kit
- Empty states and loading skeletons
- Optimistic updates with undo
- Polish visual feedback

**Key Deliverables:**
- `apps/api/endpoints/wishlist/reorder/handler.ts`
- `apps/web/app-wishlist-gallery/src/components/DraggableWishlistCard.tsx`
- `apps/web/app-wishlist-gallery/src/components/EmptyStates.tsx`

---

### Phase 5: Accessibility (1 story)

| Story | Title | Est. Points | Depends On |
|-------|-------|-------------|------------|
| WISH-2006 | Accessibility | 5 | WISH-2005 |

**Goals:**
- Full keyboard navigation with roving tabindex
- Keyboard shortcuts (A for add, G for "Got it", Delete to remove)
- Screen reader announcements
- WCAG AA compliance
- Modal focus trap

**Key Deliverables:**
- Accessibility utilities and hooks
- Keyboard event handlers
- ARIA announcements
- Axe accessibility audit

---

## Recommended Execution Order

For maximum parallelism:

| Wave | Stories | Can Start After |
|------|---------|-----------------|
| 1 | WISH-2000 | — |
| 2 | WISH-2007 | Wave 1 |
| 3 | WISH-2001 | Wave 2 |
| 4 | WISH-2002, WISH-2003, WISH-2004 | Wave 3 |
| 5 | WISH-2005 | Wave 4 |
| 6 | WISH-2006 | Wave 5 |

---

## MVP Scope

**Minimum Viable Product includes:**
- WISH-2000: Database Schema & Types
- WISH-2007: Run Migration
- WISH-2001: Gallery MVP
- WISH-2002: Add Item Flow
- WISH-2004: Modals & Transitions (Delete + Purchase flows)

This gives users the ability to:
- Add items to their wishlist
- View their collection in a gallery with filtering/sorting
- See item details
- Delete items
- Mark items as purchased/"Got it"

**Post-MVP enhancements:**
- WISH-2003: Edit Item Flow
- WISH-2005: UX Polish (Drag-and-drop, empty states)
- WISH-2006: Accessibility (Keyboard navigation)

---

## Artifact Rules (Project-Specific)

### Reuse Gate (Required for QA PASS)

For each story:
- PM story doc MUST include: `## Reuse Plan`
- Dev proof MUST include: `## Reuse Verification`

### Prohibited Patterns

- `console.log` - use `@repo/logger`
- TypeScript interfaces without Zod - use `z.infer<>`
- Barrel files (index.ts re-exports)
- Per-story one-off utilities - extend shared packages
- Direct shadcn imports - use `@repo/app-component-library`

### Story Acceptance Rule

A story may be marked "Done" only if:
- It reuses shared packages where applicable, OR
- It documents why reuse was not possible and creates the shared package instead

---

## Definition of Done (Epic)

Epic 6 is complete when:

- [ ] All 7 stories are implemented
- [ ] All API endpoints return correct data with proper error handling
- [ ] All UI components render correctly
- [ ] All tests pass (unit, integration, E2E)
- [ ] Accessibility audit passes (WCAG AA)
- [ ] Code reviewed and merged
- [ ] Documentation updated

---

## Agent Log

Append-only.

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-01-24 02:00 | pm-bootstrap-generation-leader | Initial execution plan | WISH.plan.exec.md |
