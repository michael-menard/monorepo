# Epic 7: Sets Gallery - Implementation Order

## Overview

This document defines the implementation order for Epic 7: Sets Gallery. The epic has been consolidated from 22 granular stories into 11 cohesive stories for efficient AI-driven implementation.

## PRD Reference

See [Epic 7: Sets Gallery PRD](/docs/prd/epic-7-sets-gallery.md)

## Story Mapping (Old to New)

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

## Dependency Graph

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

## Implementation Phases

### Phase 1: Foundation (1 story)

| Story | Title | Estimated Points |
|-------|-------|------------------|
| sets-2000 | Database Schema & Shared Types | 3 |

**Goals:**
- Drizzle schema for `sets` and `set_images` tables
- Zod schemas for all request/response types
- Database migration

### Phase 2: Vertical Slice - MVP (1 story)

| Story | Title | Estimated Points |
|-------|-------|------------------|
| sets-2001 | Sets Gallery MVP | 8 |

**Goals:**
- Complete read-only flow from API to UI
- Gallery with filtering, sorting, pagination
- Detail page with all metadata
- RTK Query integration

**MVP Scope:** Phase 1 + Phase 2 creates a functional read-only Sets Gallery.

### Phase 3: Create Flow (1 story)

| Story | Title | Estimated Points |
|-------|-------|------------------|
| sets-2002 | Add Set Flow | 5 |

**Goals:**
- Create endpoint with validation
- Add form with all fields
- Image upload via S3 presigned URLs

### Phase 4: Update & Delete (2 stories - can run in parallel)

| Story | Title | Estimated Points |
|-------|-------|------------------|
| sets-2003 | Edit Set Flow | 3 |
| sets-2004 | Delete Set Flow | 2 |

**Goals:**
- Edit form with pre-populated data
- Delete with confirmation modal
- S3 cleanup on delete

### Phase 5: Interactive Controls (1 story)

| Story | Title | Estimated Points |
|-------|-------|------------------|
| sets-2005 | Build Status & Quantity Controls | 3 |

**Goals:**
- Optimistic updates with undo
- Build status toggle with celebration
- Quantity stepper with minimum handling

### Phase 6: Cross-Epic Integrations (2 stories - depend on other epics)

| Story | Title | Depends On | Estimated Points |
|-------|-------|------------|------------------|
| sets-2006 | Wishlist "Got It" Integration | Epic 6: Wishlist | 5 |
| sets-2007 | MOC Linking | Epic 4: Instructions | 3 |

**Goals:**
- "Got it" flow from Wishlist to Sets
- Duplicate detection on add
- MOC linking many-to-many

**Note:** These stories can be deferred if dependent epics are not complete.

### Phase 7: Polish (2 stories - can run in parallel)

| Story | Title | Estimated Points |
|-------|-------|------------------|
| sets-2008 | Empty States & Loading | 2 |
| sets-2009 | Keyboard & Accessibility | 3 |

**Goals:**
- Helpful empty states with CTAs
- Loading skeletons
- Keyboard navigation shortcuts
- Screen reader support
- WCAG AA compliance

### Phase 8: Validation (1 story)

| Story | Title | Estimated Points |
|-------|-------|------------------|
| sets-2010 | E2E Test Suite | 5 |

**Goals:**
- Comprehensive Playwright tests
- CI integration
- All critical flows covered
- Epic completion validation

## Parallel Execution Opportunities

The following stories can be implemented in parallel:

1. **Phase 4:** sets-2003 (Edit) and sets-2004 (Delete)
2. **Phase 6:** sets-2006 (Wishlist) and sets-2007 (MOC) - if both epics available
3. **Phase 7:** sets-2008 (Empty States) and sets-2009 (Accessibility)

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

## Data Model Summary

### Sets Table

| Column | Type | Required | Default |
|--------|------|----------|---------|
| id | UUID | Yes | random |
| userId | UUID | Yes | - |
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

## Definition of Done

Epic 7 is complete when:

- [ ] All 11 consolidated stories are implemented
- [ ] All API endpoints return correct data
- [ ] All UI components render correctly
- [ ] All tests pass (unit, integration, E2E)
- [ ] Accessibility audit passes (WCAG AA)
- [ ] Code reviewed and merged
- [ ] Documentation updated
