---
doc_type: plan_exec
title: "sets — Sets Gallery Epic Execution Plan"
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

# sets — Sets Gallery Epic Execution Plan

## Story Prefix

All stories use the **sets** prefix (lowercase). Commands use the full prefixed ID:
- `/pm-generate-story sets-2000`
- `/elab-story sets-2000`
- `/dev-implement-story sets-2000`

## Story Consolidation

This epic was consolidated from 22 granular stories into 11 cohesive stories for efficient AI-driven implementation.

| Old Story ID | Old Title | New Story ID | New Title |
|--------------|-----------|--------------|-----------|
| sets-1000 | Database Schema | sets-2000 | Database Schema & Shared Types |
| sets-1001 | Zod Schemas | sets-2000 | Database Schema & Shared Types |
| sets-1002 | List Sets Endpoint | sets-2001 | Sets Gallery MVP |
| sets-1003 | Get Set Endpoint | sets-2001 | Sets Gallery MVP |
| sets-1007 | Gallery Page | sets-2001 | Sets Gallery MVP |
| sets-1008 | Set Card | sets-2001 | Sets Gallery MVP |
| sets-1009 | Detail Page | sets-2001 | Sets Gallery MVP |
| sets-1004 | Create Set Endpoint | sets-2002 | Add Set Flow |
| sets-1010 | Add Set Form | sets-2002 | Add Set Flow |
| sets-1012 | Image Upload | sets-2002 | Add Set Flow |
| sets-1005 | Update Set Endpoint | sets-2003 | Edit Set Flow |
| sets-1011 | Edit Set Form | sets-2003 | Edit Set Flow |
| sets-1006 | Delete Set Endpoint | sets-2004 | Delete Set Flow |
| sets-1015 | Delete Confirmation | sets-2004 | Delete Set Flow |
| sets-1013 | Build Status Toggle | sets-2005 | Build Status & Quantity Controls |
| sets-1014 | Quantity Stepper | sets-2005 | Build Status & Quantity Controls |
| sets-1017 | Wishlist Integration | sets-2006 | Wishlist "Got It" Integration |
| sets-1020 | Duplicate Detection | sets-2006 | Wishlist "Got It" Integration |
| sets-1016 | MOC Linking | sets-2007 | MOC Linking |
| sets-1018 | Empty States | sets-2008 | Empty States & Loading |
| sets-1019 | Accessibility | sets-2009 | Keyboard & Accessibility |
| sets-1021 | E2E Tests | sets-2010 | E2E Test Suite |

## Artifact Rules

- Each story outputs artifacts under: `plans/stories/sets-XXX/`
- A story folder is the source of truth for all related documentation
- Story docs MUST include:
  - YAML front matter with status
  - A Token Budget section
  - An append-only Agent Log section

## Artifact Naming Convention

All artifacts use the story prefix (lowercase):

| Artifact | Filename |
|----------|----------|
| Story file | `sets-XXX.md` |
| Elaboration | `elab-sets-XXX.md` |
| Proof | `proof-sets-XXX.md` |
| Code Review | `code-review-sets-XXX.md` |
| QA Verify | `qa-verify-sets-XXX.md` |
| QA Gate | `qa-gate-sets-XXX.yaml` |

## Token Budget Rule

- Each story MUST include a `## Token Budget` section
- Before starting a phase, record `/cost` session total
- After completing a phase, record delta

---

## Dependency Graph (Visual)

```
                           ┌─────────────┐
                           │  sets-2000  │
                           │  DB Schema  │
                           └──────┬──────┘
                                  │
                 ┌────────────────┼────────────────┐
                 │                │                │
                 ▼                ▼                ▼
          ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
          │  sets-2001  │  │  sets-2002  │  │  sets-2004  │
          │  Gallery    │  │  Add Flow   │  │  Delete     │
          │  MVP        │  │             │  │  Flow       │
          └──────┬──────┘  └──────┬──────┘  └─────────────┘
                 │                │
    ┌────────────┼────────────────┼────────────────┐
    │            │                │                │
    ▼            ▼                ▼                ▼
┌─────────┐ ┌─────────┐     ┌─────────────┐  ┌─────────────┐
│sets-2003│ │sets-2005│     │  sets-2008  │  │  sets-2009  │
│Edit Flow│ │Build/Qty│     │Empty States │  │Accessibility│
└─────────┘ └─────────┘     └─────────────┘  └─────────────┘
                 │
    ┌────────────┴────────────────┐
    │                             │
    ▼                             ▼
┌─────────────┐            ┌─────────────┐
│  sets-2006  │            │  sets-2007  │
│  Wishlist   │            │  MOC Link   │
│  (Epic 6)   │            │  (Epic 4)   │
└─────────────┘            └─────────────┘
         │                       │
         └───────────┬───────────┘
                     │
                     ▼
              ┌─────────────┐
              │  sets-2010  │
              │  E2E Tests  │
              └─────────────┘
```

---

## Execution Phases

### Phase 1: Foundation (1 story)

Sequential execution required.

| Story | Title | Est. Points | Depends On |
|-------|-------|-------------|------------|
| sets-2000 | Database Schema & Shared Types | 3 | — |

**Goals:**
- Drizzle schema for `sets` and `set_images` tables
- Database migration
- Zod schemas for all request/response types
- Unblocks: All other stories

**Key Deliverables:**
- `apps/api/core/database/schema/sets.ts`
- Migration files (0005, 0006)
- `packages/core/api-client/src/schemas/sets.ts`

---

### Phase 2: Vertical Slice - MVP (1 story)

**Critical path** - creates functional read-only gallery.

| Story | Title | Est. Points | Depends On |
|-------|-------|-------------|------------|
| sets-2001 | Sets Gallery MVP | 8 | sets-2000 |

**Goals:**
- Complete read-only flow from API to UI
- Gallery with filtering, sorting, pagination
- Detail page with all metadata
- RTK Query integration

**Key Deliverables:**
- `apps/api/endpoints/sets/list/handler.ts`
- `apps/api/endpoints/sets/get/handler.ts`
- `packages/core/api-client/src/rtk/sets-api.ts`
- `apps/web/app-sets-gallery/src/pages/main-page.tsx`
- `apps/web/app-sets-gallery/src/pages/set-detail-page.tsx`
- `apps/web/app-sets-gallery/src/components/SetGalleryCard.tsx`

**MVP Scope:** Phase 1 + Phase 2 creates a functional read-only Sets Gallery.

---

### Phase 3: Create Flow (1 story)

| Story | Title | Est. Points | Depends On |
|-------|-------|-------------|------------|
| sets-2002 | Add Set Flow | 5 | sets-2000 |

**Goals:**
- Create endpoint with validation
- Add form with all fields
- Image upload via S3 presigned URLs

**Key Deliverables:**
- `apps/api/endpoints/sets/create/handler.ts`
- `apps/api/endpoints/sets/images/*` (presign, register, delete)
- `apps/web/app-sets-gallery/src/pages/add-set-page.tsx`
- `apps/web/app-sets-gallery/src/components/SetForm.tsx`

---

### Phase 4: Update & Delete (2 stories - can run in parallel)

| Story | Title | Est. Points | Depends On |
|-------|-------|-------------|------------|
| sets-2003 | Edit Set Flow | 3 | sets-2001 |
| sets-2004 | Delete Set Flow | 2 | sets-2000 |

**Goals:**
- Edit form with pre-populated data
- Delete with confirmation modal
- S3 cleanup on delete

**Parallel Execution:** These stories have no interdependencies.

---

### Phase 5: Interactive Controls (1 story)

| Story | Title | Est. Points | Depends On |
|-------|-------|-------------|------------|
| sets-2005 | Build Status & Quantity Controls | 3 | sets-2001 |

**Goals:**
- Optimistic updates with undo
- Build status toggle with celebration animation
- Quantity stepper with minimum handling

**Key Deliverables:**
- `apps/web/app-sets-gallery/src/components/BuildStatusToggle.tsx`
- `apps/web/app-sets-gallery/src/components/QuantityStepper.tsx`

---

### Phase 6: Cross-Epic Integrations (2 stories - depend on other epics)

| Story | Title | Est. Points | Depends On |
|-------|-------|-------------|------------|
| sets-2006 | Wishlist "Got It" Integration | 5 | sets-2005, Epic 6 (Wishlist) |
| sets-2007 | MOC Linking | 3 | sets-2005, Epic 4 (Instructions) |

**Goals:**
- "Got it" flow from Wishlist to Sets
- Duplicate detection on add
- MOC linking many-to-many

**Note:** These stories can be deferred if dependent epics are not complete.

---

### Phase 7: Polish (2 stories - can run in parallel)

| Story | Title | Est. Points | Depends On |
|-------|-------|-------------|------------|
| sets-2008 | Empty States & Loading | 2 | sets-2001 |
| sets-2009 | Keyboard & Accessibility | 3 | sets-2001 |

**Goals:**
- Helpful empty states with CTAs
- Loading skeletons
- Keyboard navigation shortcuts
- Screen reader support
- WCAG AA compliance

**Parallel Execution:** These stories have no interdependencies.

---

### Phase 8: Validation (1 story)

| Story | Title | Est. Points | Depends On |
|-------|-------|-------------|------------|
| sets-2010 | E2E Test Suite | 5 | All previous stories |

**Goals:**
- Comprehensive Playwright tests
- CI integration
- All critical flows covered
- Epic completion validation

---

## Recommended Execution Order

For maximum parallelism:

| Wave | Stories | Can Start After |
|------|---------|-----------------|
| 1 | sets-2000 | — |
| 2 | sets-2001, sets-2002, sets-2004 | Wave 1 |
| 3 | sets-2003, sets-2005, sets-2008, sets-2009 | sets-2001 |
| 4 | sets-2006, sets-2007 | sets-2005 + external epics |
| 5 | sets-2010 | All previous waves |

---

## MVP Scope

**Minimum Viable Product includes:**
- sets-2000: Database Schema & Shared Types
- sets-2001: Sets Gallery MVP
- sets-2002: Add Set Flow
- sets-2004: Delete Set Flow

This gives users the ability to:
- Add sets to their collection
- View their collection in a gallery
- See set details
- Delete sets

**Post-MVP enhancements:**
- sets-2003: Edit Set Flow
- sets-2005: Build Status & Quantity Controls
- sets-2006: Wishlist Integration
- sets-2007: MOC Linking
- sets-2008: Empty States & Loading
- sets-2009: Keyboard & Accessibility
- sets-2010: E2E Test Suite

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

Epic 7 is complete when:

- [ ] All 11 consolidated stories are implemented
- [ ] All API endpoints return correct data
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
| 2026-01-24 23:00 | bootstrap | Initial execution plan | sets.plan.exec.md |
