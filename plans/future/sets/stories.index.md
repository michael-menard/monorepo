---
doc_type: stories_index
title: "SETS Stories Index (MVP)"
status: active
story_prefix: "SETS-MVP"
created_at: "2026-01-25T23:58:00Z"
updated_at: "2026-01-30T12:00:00Z"
---

# SETS Stories Index (MVP)

All stories in this epic use the `SETS-MVP-XXX` naming convention.

## Approach Change

**2026-01-30:** The original 17-story SETS epic has been replaced with a 4-story MVP that extends the WISH feature using a unified data model. See [SETS-MVP-SUMMARY.md](./SETS-MVP-SUMMARY.md) for rationale.

**Key insight:** A wishlist item is "a set that hasn't been purchased yet." Rather than separate tables, we use a single `user_sets` table with a `status` field.

## Progress Summary

| Status | Count |
|--------|-------|
| completed | 0 |
| in-progress | 0 |
| ready | 1 |
| blocked | 3 |
| deferred | 13 (original stories) |

---

## Ready to Start

Stories with all dependencies satisfied:

| Story | Feature | Blocked By |
|-------|---------|------------|
| SETS-MVP-001 | Unified Schema Extension | WISH-2000 (in UAT) |

---

## SETS-MVP-001: Unified Schema Extension

**Status:** ready
**Depends On:** WISH-2000
**Points:** 2

**Feature:** Add `status`, `buildStatus`, and purchase fields to existing wishlist schema.

**Schema Changes:**
- `status: 'wishlist' | 'owned'` (default: 'wishlist')
- `buildStatus: 'in_pieces' | 'built'` (nullable)
- `purchaseDate`, `purchasePrice`, `purchaseTax`, `purchaseShipping`
- `statusChangedAt`
- Index: `(userId, status, purchaseDate DESC)`

**Goal:** Enable unified data model for wishlist and collection items.

**Story File:** `plans/future/wish/backlog/SETS-MVP-001/SETS-MVP-001.md`

---

## SETS-MVP-002: Collection View

**Status:** blocked
**Depends On:** SETS-MVP-001, WISH-2001
**Points:** 3

**Feature:** Collection page at `/collection` showing owned items using existing gallery infrastructure.

**Key Features:**
- Reuses WishlistGallery with `status='owned'` filter
- Build status badge on cards
- Basic stats header (total sets, pieces, spent)
- No drag-and-drop (wishlist-only)

**Goal:** View and browse owned LEGO sets.

**Story File:** `plans/future/wish/backlog/SETS-MVP-002/SETS-MVP-002.md`

---

## SETS-MVP-003: Extended Got It Flow

**Status:** blocked
**Depends On:** SETS-MVP-001, WISH-2004
**Points:** 3

**Feature:** Extend "Got it" modal to capture purchase details and update status.

**Key Features:**
- Purchase details step (price, date, tax, shipping)
- Build status selection (default: in pieces)
- Simple UPDATE instead of atomic create+delete
- Undo support (5s window)

**Endpoint:**
- `PATCH /api/wishlist/:id/purchase`

**Goal:** Seamlessly transition wishlist items to collection with purchase tracking.

**Story File:** `plans/future/wish/backlog/SETS-MVP-003/SETS-MVP-003.md`

---

## SETS-MVP-004: Build Status Toggle

**Status:** blocked
**Depends On:** SETS-MVP-002
**Points:** 2

**Feature:** Toggle component to switch between "Built" and "In Pieces".

**Key Features:**
- Visual toggle on collection cards
- Optimistic UI updates
- Celebration animation (optional)
- Undo support

**Endpoint:**
- `PATCH /api/wishlist/:id` with `{ buildStatus }`

**Goal:** Track which sets are built vs. still in the box.

**Story File:** `plans/future/wish/backlog/SETS-MVP-004/SETS-MVP-004.md`

---

## Deferred Stories (Original SETS Epic)

The following stories from the original 17-story SETS epic are deferred. They may be reconsidered based on user feedback after MVP launch.

| Original ID | Feature | Priority | Notes |
|-------------|---------|----------|-------|
| SETS-005 | Add Modal with URL Scrape | Low | Use wishlist add flow |
| SETS-006 | Purchase Details Form | — | Merged into SETS-MVP-003 |
| SETS-007 | Sets CRUD API | — | Not needed (unified model) |
| SETS-008 | Wishlist Got it Integration | — | Replaced by SETS-MVP-003 |
| SETS-009 | Build Status Toggle | — | Replaced by SETS-MVP-004 |
| SETS-010 | Quantity Stepper | Medium | Future: add multiple rows |
| SETS-011 | MOC Linking | Medium | Future enhancement |
| SETS-012 | Hard Delete | Low | Use existing delete |
| SETS-013 | Manual Entry Form | Low | Use wishlist add flow |
| SETS-014 | Sort and Filter | Low | Purchase date sort is MVP |
| SETS-015 | Tag Management | Low | Shared with wishlist |
| SETS-016 | Collection Stats | — | Basic stats in SETS-MVP-002 |
| SETS-017 | Empty States | — | Included in SETS-MVP-002 |
| SETS-018 | Duplicate Detection | Low | Future enhancement |
| SETS-019 | Accessibility | Medium | Future enhancement |
| SETS-020 | Mobile Responsive | Low | Future enhancement |
| SETS-021 | Got it Success Experience | — | Included in SETS-MVP-003 |

---

## Quick Reference

| Metric | Value |
|--------|-------|
| Total MVP Stories | 4 |
| Total Points | ~10 |
| Ready to Start | 1 |
| Blocked | 3 |
| Deferred (original) | 13 unique features |
| Prerequisites | WISH-2000, WISH-2001, WISH-2004 |

---

## Update Log

| Date | Change | Stories Affected |
|------|--------|------------------|
| 2026-01-25 | Initial 17-story index | SETS-005 through SETS-021 |
| 2026-01-30 | Replaced with 4-story MVP | All - unified model approach |
