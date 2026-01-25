---
doc_type: stories_index
title: "WISH Stories Index"
status: active
story_prefix: "WISH"
created_at: "2026-01-25T23:20:00Z"
updated_at: "2026-01-25T23:20:00Z"
---

# WISH Stories Index

All stories in this epic use the `WISH-XXX` naming convention (starting at 2000).

## Progress Summary

| Status | Count |
|--------|-------|
| completed | 1 |
| in-progress | 0 |
| pending | 13 |
| deferred | 1 |

---

## Ready to Start

Stories with all dependencies satisfied (can be worked in parallel):

| Story | Feature | Blocked By |
|-------|---------|------------|
| WISH-2000 | Database Schema & Types | — |

---

## WISH-2000: Database Schema & Types

**Status:** Ready for Review
**Depends On:** none
**Phase:** 1 - Foundation

**Feature:** Drizzle schema for wishlist_items table with Zod schemas and TypeScript types

**Infrastructure:**
- wishlist_items PostgreSQL table
- Database indexes for userId and sortOrder

**Goal:** Create foundational data structures for wishlist feature

**Risk Notes:** None - schema definition is straightforward

---

## WISH-2007: Run Migration

**Status:** Approved
**Depends On:** WISH-2000
**Phase:** 1 - Foundation

**Feature:** Execute database migration to create wishlist_items table

**Infrastructure:**
- Database migration execution

**Goal:** Deploy wishlist schema to database

**Risk Notes:** Migration must be run after WISH-2000 schema is approved

---

## WISH-2001: Gallery MVP

**Status:** Ready for Review
**Depends On:** WISH-2007
**Phase:** 2 - Vertical Slice - Gallery MVP

**Feature:** Gallery view with filtering, pagination, and card display. Store filter tabs, search, sorting by date/price/piece count/priority. WishlistCard component using GalleryCard from @repo/gallery.

**Endpoints:**
- `GET /api/wishlist`
- `GET /api/wishlist/:id`

**Goal:** Enable users to view and filter their wishlist items in a gallery view

**Risk Notes:** Integration with shared gallery package must maintain consistency. Must implement authorization checks (see WISH-2008).

**Sizing Warning:** Yes

---

## WISH-2002: Add Item Flow

**Status:** Approved
**Depends On:** WISH-2001
**Phase:** 3 - Core Features

**Feature:** Add item page with form, image upload with S3 presigned URLs, form validation with Zod. Manual entry for all wishlist item fields.

**Endpoints:**
- `POST /api/wishlist`

**Infrastructure:**
- S3 presigned URLs for image upload
- Image storage in S3 with user-scoped prefix

**Goal:** Enable users to manually add wishlist items with images

**Risk Notes:** Image upload and S3 integration requires careful error handling. Must implement file type/size validation and virus scanning (see WISH-2013). Must implement authorization checks (see WISH-2008).

---

## WISH-2003: Detail & Edit Pages

**Status:** Done
**Depends On:** WISH-2001
**Phase:** 3 - Core Features

**Feature:** Detail page showing full item information and edit page with pre-populated form. PATCH endpoint for updates.

**Endpoints:**
- `PATCH /api/wishlist/:id`

**Goal:** Enable users to view full item details and edit wishlist items

**Risk Notes:** Must implement authorization checks and ownership verification (see WISH-2008).

---

## WISH-2004: Modals & Transitions

**Status:** Approved
**Depends On:** WISH-2001
**Phase:** 3 - Core Features

**Feature:** Delete confirmation modal, 'Got It' modal with purchase details form, toast notifications with undo. Transitions items to Sets collection atomically.

**Endpoints:**
- `DELETE /api/wishlist/:id`
- `POST /api/wishlist/:id/purchased`

**Goal:** Enable users to delete items or transition them to Sets collection with purchase details

**Risk Notes:** Got it flow must be atomic - create Set before deleting Wishlist item to prevent data loss. Must implement ownership verification on purchased endpoint (see WISH-2008). Must add transaction rollback tests (see WISH-2008).

**Sizing Warning:** Yes

---

## WISH-2005a: Drag-and-drop reordering with dnd-kit

**Status:** Draft
**Depends On:** WISH-2002, WISH-2003, WISH-2004
**Phase:** 4 - UX Polish

**Feature:** Core drag-and-drop functionality with dnd-kit library, persisted reorder via `PATCH /api/wishlist/reorder` endpoint, awareness of pagination boundaries.

**Endpoints:**
- `PATCH /api/wishlist/reorder`

**Complexity:** Large

**Goal:** Implement drag-and-drop priority reordering with persistence

**Risk Notes:** dnd-kit integration requires careful handling of pagination context and state synchronization

---

## WISH-2005b: Optimistic updates and undo flow

**Status:** Draft
**Depends On:** WISH-2005a
**Phase:** 4 - UX Polish

**Feature:** Client-side optimistic updates for reorder operations, 5-second undo window, toast notifications for feedback.

**Complexity:** Medium

**Goal:** Provide immediate visual feedback and recovery mechanism for reorder operations

**Risk Notes:** Optimistic state management requires careful handling of out-of-order operations and undo semantics

---

## WISH-2006: Accessibility

**Status:** Deferred
**Depends On:** WISH-2005
**Phase:** 5 - Accessibility (Deferred to Phase 2 after core functionality)

**Feature:** Full keyboard navigation with roving tabindex, keyboard shortcuts (A, G, Delete), screen reader announcements via live regions, modal focus trap and return, WCAG AA color contrast compliance.

**Goal:** Ensure wishlist feature is fully accessible to keyboard and screen reader users

**Risk Notes:** Comprehensive accessibility scope is ambitious; defer to Phase 2 after WISH-2000 through WISH-2005 are complete

**Deferral Rationale:** Focus on core functionality first (Phase 1), then tackle accessibility in dedicated phase with dedicated testing resources

**Sizing Warning:** Yes

---

## WISH-2008: Authorization layer testing and policy documentation

**Status:** Pending
**Depends On:** WISH-2001, WISH-2002, WISH-2003, WISH-2004, WISH-2005
**Phase:** 3+ - Security & Testing

**Feature:** Comprehensive authorization checks across all core endpoints (GET, POST, PATCH, DELETE). Policy documentation for ownership verification and role-based access.

**Endpoints:**
- All wishlist endpoints (GET, POST, PATCH, DELETE)

**Priority:** P0

**Goal:** Ensure all endpoints enforce proper authorization checks and document security policies

**Risk Notes:** Critical security gap across all core endpoints. Must implement ownership verification for all operations.

**Source:** Epic Elaboration - Security & QA perspective

---

## WISH-2009: Feature flag infrastructure setup for gradual wishlist rollout

**Status:** Pending
**Depends On:** WISH-2007
**Phase:** 2+ - Infrastructure

**Feature:** Feature flag infrastructure for gradual rollout of WISH-2001 through WISH-2005. Canary deployment capability.

**Priority:** P0

**Goal:** Enable safe, gradual rollout of wishlist feature to users

**Risk Notes:** Blocks safe production rollout. Required before any feature goes live.

**Source:** Epic Elaboration - Platform perspective

---

## WISH-2010: Shared Zod schemas and types setup

**Status:** Pending
**Depends On:** WISH-2007
**Phase:** 2 - Foundation

**Feature:** Centralized schema definitions for wishlist items, filters, reorder operations. Shared between frontend validation and backend API layer.

**Priority:** P0

**Goal:** Ensure consistency in type definitions and validation rules across frontend and backend

**Risk Notes:** Critical for maintaining type safety and validation consistency.

**Source:** Epic Elaboration - Engineering perspective

---

## WISH-2011: Test infrastructure for MSW mocking of S3 and API calls

**Status:** Pending
**Depends On:** WISH-2007
**Phase:** 2 - Infrastructure

**Feature:** Mock Service Worker (MSW) handlers for S3 presigned URL generation, S3 upload responses, API endpoints. Integration test fixtures for upload flows.

**Priority:** P0

**Goal:** Enable reliable integration tests without external S3 dependencies

**Risk Notes:** Needed for reliable, fast integration tests. Must mock both API and S3 interactions accurately.

**Source:** Epic Elaboration - QA perspective

---

## WISH-2012: Accessibility testing harness setup

**Status:** Pending
**Depends On:** WISH-2001
**Phase:** 2 - Infrastructure

**Feature:** Test infrastructure for accessibility testing: axe-core integration, automated WCAG AA checks, keyboard navigation test utilities, screen reader testing guides.

**Priority:** P0

**Goal:** Enable accessibility testing for WISH-2006 when resumed

**Risk Notes:** Needed for WISH-2006 when resumed. Requires setup before accessibility work can begin.

**Source:** Epic Elaboration - UX perspective

---

## WISH-2013: File upload security hardening

**Status:** Pending
**Depends On:** WISH-2007, WISH-2002
**Phase:** 3 - Security

**Feature:** Virus scanning integration for uploaded images, strict file type validation (whitelist), file size limits (max 10MB), S3 security: IAM policy, bucket policy, CORS configuration, presigned URL TTL (15 min).

**Priority:** P0

**Goal:** Secure user file uploads and prevent malicious content

**Risk Notes:** Critical security requirement for WISH-2002. Must include virus scanning and file type validation.

**Source:** Epic Elaboration - Security perspective
