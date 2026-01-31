---
doc_type: stories_index
title: "SETS Stories Index"
status: active
story_prefix: "SETS"
created_at: "2026-01-25T23:58:00Z"
updated_at: "2026-01-25T23:58:00Z"
---

# SETS Stories Index

All stories in this epic use the `SETS-XXX` naming convention (starting at 001).

## Progress Summary

| Status | Count |
|--------|-------|
| completed | 0 |
| generated | 0 |
| in-progress | 0 |
| pending | 17 |

---

## Ready to Start

Stories with all dependencies satisfied (can be worked in parallel):

| Story | Feature | Blocked By |
|-------|---------|------------|
| SETS-005 | Add Modal with URL Scrape Flow | — |
| SETS-007 | Sets CRUD API Endpoints | — |
| SETS-017 | Empty States for All Scenarios | — |

---

## SETS-005: Add Modal with URL Scrape Flow

**Status:** pending
**Depends On:** none
**Phase:** 2 (CRUD Operations)
**Feature:** Implement add modal with URL paste, product info scraping (shared scraper with Wishlist), and manual entry option
**Endpoints:**
- `POST /api/scraper/product (shared)`

**Infrastructure:**
- Shared scraper service
- S3 for image storage

**Goal:** Enable users to add sets via URL with automatic data population

**Risk Notes:** Depends on shared scraper service reliability; must handle scraper failures gracefully

**Sizing Warning:** No

---

## SETS-006: Purchase Details Step with Build Status

**Status:** pending
**Depends On:** SETS-005
**Phase:** 2 (CRUD Operations)
**Feature:** Add purchase details form (price, tax, shipping, date, quantity) with build status choice during set creation
**Endpoints:** (none)

**Infrastructure:** (none)

**Goal:** Capture complete purchase information and initial build status when adding sets

**Risk Notes:** Low risk; straightforward form UI

**Sizing Warning:** No

---

## SETS-007: Sets CRUD API Endpoints

**Status:** pending
**Depends On:** none
**Phase:** 1 (Foundation)
**Feature:** Implement backend API endpoints for creating, reading, updating, and deleting set items with full data model support
**Endpoints:**
- `POST /api/sets`
- `GET /api/sets`
- `GET /api/sets/:id`
- `PATCH /api/sets/:id`
- `DELETE /api/sets/:id`

**Infrastructure:**
- Aurora PostgreSQL table: sets
- Database indexes for userId, setNumber

**Goal:** Provide complete backend API for set collection management

**Risk Notes:** Must ensure atomic transactions for Wishlist integration; proper indexing needed for performance

**Sizing Warning:** Yes

---

## SETS-008: Wishlist 'Got it' Integration

**Status:** pending
**Depends On:** SETS-007, SETS-006
**Phase:** 3 (Wishlist Integration)
**Feature:** Implement atomic transaction flow to transfer wishlist items to sets with purchase details modal and undo capability
**Endpoints:**
- `POST /api/sets/from-wishlist`
- `DELETE /api/wishlist/:id`

**Infrastructure:** (none)

**Goal:** Enable seamless transition of wishlist items to owned sets with traceability

**Risk Notes:** High complexity: requires atomic transaction (create Set before deleting Wishlist), rollback handling, and undo support; cross-epic dependency on Wishlist

**Sizing Warning:** Yes

---

## SETS-009: Build Status Toggle with Optimistic Updates

**Status:** pending
**Depends On:** SETS-007
**Phase:** 4 (Advanced Features)
**Feature:** Implement build status toggle (In Pieces/Built) with optimistic UI updates, celebration animation, undo toast, and error handling
**Endpoints:**
- `PATCH /api/sets/:id/build-status`

**Infrastructure:** (none)

**Goal:** Provide quick, responsive build status tracking with delightful UX

**Risk Notes:** Optimistic updates require careful state management and rollback on failure

**Sizing Warning:** No

---

## SETS-010: Quantity Stepper with Minimum Enforcement

**Status:** pending
**Depends On:** SETS-007
**Phase:** 4 (Advanced Features)
**Feature:** Implement quantity adjustment controls (+/- buttons, direct edit) with minimum of 1, optimistic updates, and undo support
**Endpoints:**
- `PATCH /api/sets/:id/quantity`

**Infrastructure:** (none)

**Goal:** Enable users to track multiple copies of the same set with intuitive controls

**Risk Notes:** Must handle edge case where user tries to decrement below 1 (prompt to delete instead)

**Sizing Warning:** No

---

## SETS-011: MOC Linking Picker and Display

**Status:** pending
**Depends On:** SETS-007
**Phase:** 4 (Advanced Features)
**Feature:** Implement MOC picker modal (searchable, multi-select) and bidirectional display of set-to-MOC relationships
**Endpoints:**
- `POST /api/sets/:id/moc-links`
- `DELETE /api/sets/:id/moc-links/:mocId`
- `GET /api/mocs (for picker)`

**Infrastructure:**
- Many-to-many join table: set_moc_links

**Goal:** Enable users to track which sets were used in which MOC builds

**Risk Notes:** Cross-epic dependency on MOC Instructions; requires bidirectional updates

**Sizing Warning:** No

---

## SETS-012: Hard Delete with Confirmation

**Status:** pending
**Depends On:** SETS-007
**Phase:** 2 (CRUD Operations)
**Feature:** Implement permanent set deletion with confirmation modal ('This is permanent') and proper cleanup of relationships
**Endpoints:**
- `DELETE /api/sets/:id (already in 1007)`

**Infrastructure:** (none)

**Goal:** Allow users to remove sets from collection with appropriate safeguards

**Risk Notes:** Must cascade delete MOC links and handle wishlistItemId references properly

**Sizing Warning:** No

---

## SETS-013: Manual Entry Form

**Status:** pending
**Depends On:** SETS-005
**Phase:** 2 (CRUD Operations)
**Feature:** Implement full manual entry form for sets when URL scraping is not available or desired
**Endpoints:** (none)

**Infrastructure:** (none)

**Goal:** Provide fallback method for adding sets without URL scraping

**Risk Notes:** Low risk; standard form implementation

**Sizing Warning:** No

---

## SETS-014: Sort and Filter by Build Status

**Status:** pending
**Depends On:** SETS-007
**Phase:** 5 (UX & Polish)
**Feature:** Extend gallery sorting and filtering to include build status (All/Built/In Pieces) and purchase date
**Endpoints:**
- `GET /api/sets (with query params)`

**Infrastructure:** (none)

**Goal:** Enable users to organize and view their collection by build status and purchase timeline

**Risk Notes:** Depends on shared gallery package implementation

**Sizing Warning:** No

---

## SETS-015: Tag Management Integration

**Status:** pending
**Depends On:** SETS-007
**Phase:** 5 (UX & Polish)
**Feature:** Integrate shared tag management system for categorizing sets with user-defined tags
**Endpoints:**
- `POST /api/sets/:id/tags`
- `DELETE /api/sets/:id/tags/:tagId`

**Infrastructure:**
- Shared tags system

**Goal:** Enable flexible, user-defined categorization of set collection

**Risk Notes:** Depends on shared tag management package availability

**Sizing Warning:** No

---

## SETS-016: Collection Stats Display

**Status:** pending
**Depends On:** SETS-007
**Phase:** 5 (UX & Polish)
**Feature:** Implement collection statistics dashboard (total sets, unique sets, total pieces, total value)
**Endpoints:**
- `GET /api/sets/stats`

**Infrastructure:** (none)

**Goal:** Provide users with overview insights into their collection

**Risk Notes:** Future enhancement; low priority; may need performance optimization for large collections

**Sizing Warning:** No

---

## SETS-017: Empty States for All Scenarios

**Status:** pending
**Depends On:** none
**Phase:** 5 (UX & Polish)
**Feature:** Implement empty state designs for: new collection, no results, filtered views, no MOC links, etc.
**Endpoints:** (none)

**Infrastructure:** (none)

**Goal:** Provide helpful guidance and CTAs when no content is available

**Risk Notes:** Low risk; pure UI implementation

**Sizing Warning:** No

---

## SETS-018: Duplicate Set Detection

**Status:** pending
**Depends On:** SETS-005, SETS-010
**Phase:** 4 (Advanced Features)
**Feature:** Detect when user adds a set that already exists and prompt: add to quantity vs. create new entry with different purchase details
**Endpoints:**
- `GET /api/sets/check-duplicate`

**Infrastructure:** (none)

**Goal:** Prevent unintentional duplicates while allowing intentional separate entries for different purchases

**Risk Notes:** UX complexity: must clearly explain the two options to users

**Sizing Warning:** No

---

## SETS-019: Keyboard Navigation and Accessibility

**Status:** pending
**Depends On:** SETS-009, SETS-010, SETS-011
**Phase:** 5 (UX & Polish)
**Feature:** Implement full keyboard shortcuts (B for toggle, +/- for quantity, M for MOC link, A for add) and screen reader support
**Endpoints:** (none)

**Infrastructure:** (none)

**Goal:** Ensure Sets Gallery is fully accessible via keyboard and screen readers

**Risk Notes:** Requires careful focus management and ARIA implementation

**Sizing Warning:** No

---

## SETS-020: Mobile Responsive with Swipe Actions

**Status:** pending
**Depends On:** SETS-009
**Phase:** 5 (UX & Polish)
**Feature:** Implement mobile-optimized responsive design with bottom sheets, touch targets, and swipe gestures for build status toggle
**Endpoints:** (none)

**Infrastructure:** (none)

**Goal:** Provide optimal mobile experience for Sets Gallery on touch devices

**Risk Notes:** Touch gesture implementation requires careful testing across devices

**Sizing Warning:** No

---

## SETS-021: Got it Success Experience

**Status:** pending
**Depends On:** SETS-008
**Phase:** 3 (Wishlist Integration)
**Feature:** Implement delightful success flow when item comes from Wishlist: highlight new item, scroll to position, show toast with View/Undo
**Endpoints:** (none)

**Infrastructure:** (none)

**Goal:** Create satisfying feedback loop when transitioning items from wishlist to collection

**Risk Notes:** Animation and scroll behavior must work across all viewport sizes

**Sizing Warning:** No
