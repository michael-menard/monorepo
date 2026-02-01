---
doc_type: stories_index
title: "WISH Stories Index"
status: active
story_prefix: "WISH"
created_at: "2026-01-25T23:20:00Z"
updated_at: "2026-01-31T23:55:00Z"
---

# WISH Stories Index

All stories in this epic use the `WISH-XXX` naming convention (starting at 2000).

## Progress Summary

| Status | Count |
|--------|-------|
| completed | 20 |
| in-progress | 0 |
| review | 0 |
| ready-for-code-review | 1 |
| ready-for-qa | 0 |
| uat | 1 |
| in-qa | 0 |
| backlog | 13 |
| elaboration | 3 |
| needs-refinement | 1 |
| deferred | 17 |
| ready-to-work | 17 |
| pending | 10 |
| created | 1 |
| cancelled | 1 |
| BLOCKED | 1 |

---

## Ready to Start

Stories with all dependencies satisfied (can be worked in parallel):

| Story | Feature | Blocked By |
|-------|---------|------------|
| WISH-2000 | Database Schema & Types | — |
| WISH-2119 | Flag scheduling (auto-enable/disable at scheduled times) | — |
| WISH-2124 | Redis infrastructure setup and migration from in-memory cache | — |

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

**Status:** completed
**Depends On:** WISH-2001
**Phase:** 3 - Core Features

**Feature:** Delete confirmation modal, 'Got It' modal with purchase details form, toast notifications with undo. Transitions items to Sets collection atomically.

**Endpoints:**
- `DELETE /api/wishlist/:id`
- `POST /api/wishlist/:id/purchased`

**Goal:** Enable users to delete items or transition them to Sets collection with purchase details

**Risk Notes:** Got it flow must be atomic - create Set before deleting Wishlist item to prevent data loss. Must implement ownership verification on purchased endpoint (see WISH-2008). Must add transaction rollback tests (see WISH-2008).

**Sizing Warning:** Yes

**Implementation Notes:** Verification story - existing implementation verified. Added Playwright E2E tests (delete-flow.spec.ts, purchase-flow.spec.ts, modal-accessibility.spec.ts). 35 new E2E tests covering AC26-30 accessibility requirements.

**QA Verdict:** PASS (2026-01-29) - All 32 ACs verified, 142 unit tests pass, architecture compliant, E2E tests created

---

## WISH-2005a: Drag-and-drop reordering with dnd-kit

**Status:** completed
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

**Status:** uat
**Depends On:** WISH-2005a
**Phase:** 4 - UX Polish

**Feature:** Client-side optimistic updates for reorder operations, 5-second undo window, toast notifications for feedback.

**Complexity:** Medium

**Goal:** Provide immediate visual feedback and recovery mechanism for reorder operations

**Risk Notes:** Optimistic state management requires careful handling of out-of-order operations and undo semantics

**Code Review Verdict:** PASS (2026-01-30) - All 6 review workers passed (lint, style, syntax, security, typecheck, build). 24 unit tests passed. Zod schema compliance verified.

**QA Verdict:** PASS (2026-01-31) - All 20 acceptance criteria verified, 24 unit tests pass, 12 E2E tests pass, architecture compliant with CLAUDE.md

**Story File:** `plans/future/wish/UAT/WISH-2005b/WISH-2005b.md`

---

## WISH-2005c: Drag preview thumbnail

**Status:** uat
**Depends On:** WISH-2005a
**Phase:** 4 - UX Polish

**Feature:** Enhanced visual feedback during drag operations with item preview thumbnail displayed in DragOverlay instead of generic ghost. Shows item image, title, and price in a scaled preview.

**Complexity:** Small

**Goal:** Provide clear visual confirmation of which item is being dragged during reordering

**Risk Notes:** Minor - straightforward dnd-kit DragOverlay integration

**Source:** WISH-2005a QA Elaboration (Enhancement Opportunity #1)

**Story File:** `plans/future/wish/UAT/WISH-2005c/WISH-2005c.md`

---

## WISH-2005d: Haptic feedback on mobile drag

**Status:** deferred
**Depends On:** WISH-2005a
**Phase:** 4 - UX Polish

**Feature:** Mobile vibration feedback during drag-and-drop operations using the Vibration API to provide tactile confirmation on drag start, during drag, and on drop for iOS and Android users.

**Complexity:** Small

**Goal:** Provide tactile feedback for mobile users during drag-and-drop reordering operations

**Risk Notes:** Vibration API support varies across devices; requires graceful fallback for unsupported browsers

**Source:** WISH-2005a QA Elaboration (Enhancement Opportunity #2)

---

## WISH-2006: Accessibility

**Status:** completed
**Depends On:** WISH-2005
**Phase:** 5 - Accessibility (Deferred to Phase 2 after core functionality)

**Feature:** Full keyboard navigation with roving tabindex, keyboard shortcuts (A, G, Delete), screen reader announcements via live regions, modal focus trap and return, WCAG AA color contrast compliance.

**Goal:** Ensure wishlist feature is fully accessible to keyboard and screen reader users

**Risk Notes:** Comprehensive accessibility scope is ambitious; defer to Phase 2 after WISH-2000 through WISH-2005 are complete

**Deferral Rationale:** Focus on core functionality first (Phase 1), then tackle accessibility in dedicated phase with dedicated testing resources

**Sizing Warning:** Yes

---

## WISH-20620: Advanced ARIA Features (Landmarks, Skip Links, Heading Hierarchy)

**Status:** deferred
**Depends On:** WISH-2006
**Follow-up From:** WISH-2006
**Phase:** 5 - Accessibility (Future Enhancement)

### Scope

Add advanced ARIA landmarks, skip links, and semantic heading hierarchy to enable efficient screen reader navigation beyond basic WCAG AA compliance from WISH-2006. Enhances navigation efficiency for assistive technology users.

**Features:**
- ARIA landmarks for major page regions (main, header, navigation, search, complementary)
- Skip link component (visually hidden, visible on focus, jumps to main content)
- Semantic heading hierarchy (h1-h6, no skipped levels)
- All landmarks have unique aria-label or aria-labelledby for disambiguation
- Screen reader landmark and heading navigation support

**Packages Affected:**
- `apps/web/app-wishlist-gallery` - Add semantic landmarks, skip links, and heading hierarchy to existing components

**Acceptance Criteria:** 18 ACs covering ARIA landmarks, skip links, heading hierarchy, testing, and axe-core validation

**Complexity:** Medium (semantic HTML restructuring and skip link implementation)

**Effort:** 3 points

**Priority:** P2 (Enhancement to baseline accessibility from WISH-2006)

### Source

Follow-up from QA Elaboration of WISH-2006 (Enhancement Opportunity #5)

**Original Finding:** Add advanced ARIA features (landmarks, skip links, heading hierarchy)

**Category:** Enhancement Opportunity
**Impact:** Medium (Significantly improves navigation for screen reader users)
**Effort:** Medium (Requires semantic HTML restructuring and skip link implementation)

---

## WISH-2008: Authorization layer testing and policy documentation

**Status:** completed
**Depends On:** WISH-2001, WISH-2002, WISH-2003, WISH-2004, WISH-2005
**Phase:** 3+ - Security & Testing

**Feature:** Comprehensive authorization checks across all core endpoints (GET, POST, PATCH, DELETE). Policy documentation for ownership verification and role-based access.

**Endpoints:**
- All wishlist endpoints (GET, POST, PATCH, DELETE)

**Priority:** P0

**Goal:** Ensure all endpoints enforce proper authorization checks and document security policies

**Risk Notes:** Critical security gap across all core endpoints. Must implement ownership verification for all operations.

**Source:** Epic Elaboration - Security & QA perspective

**Story File:** `plans/future/wish/UAT/WISH-2008/WISH-2008.md`

**Implementation Notes:** Verification story completed 2026-01-29. Added 42 middleware tests (auth + rate limiting), rate limiting middleware (10 failures/5 min per IP), audit logging for 403/404 events, security policy documentation, and HTTP test file with 24+ scenarios.

**Code Review Verdict:** PASS (2026-01-29) - All 6 review workers passed (lint, style, syntax, security, typecheck, build). 217 tests passed including 42 new WISH-2008 tests.

**QA Verdict:** PASS (2026-01-30) - All 24 acceptance criteria verified with concrete evidence, 217 tests passed (42 new), security policy documented, architecture compliant, rate limiting prevents brute-force attacks.

---

## WISH-2009: Feature flag infrastructure setup for gradual wishlist rollout

**Status:** completed
**Depends On:** WISH-2007
**Phase:** 2+ - Infrastructure

**Feature:** Feature flag infrastructure for gradual rollout of WISH-2001 through WISH-2005. Canary deployment capability.

**Priority:** P0

**Goal:** Enable safe, gradual rollout of wishlist feature to users

**Risk Notes:** Blocks safe production rollout. Required before any feature goes live.

**Source:** Epic Elaboration - Platform perspective

---

## WISH-2119: Flag scheduling (auto-enable/disable at scheduled times)

**Status:** ready-to-work
**Depends On:** none
**Follow-up From:** WISH-2009
**Phase:** 3 - Infrastructure

### Scope

Add scheduled flag updates (auto-enable/disable at predetermined times) to feature flag infrastructure from WISH-2009. Enables automatic feature rollouts and rollbacks without manual intervention.

**Features:**
- Scheduled flag updates (one-time schedules in MVP)
- Cron job (runs every 1 minute) to process pending schedules
- Admin endpoints: create, list, cancel schedules
- Atomic flag updates with cache invalidation

**Endpoints:**
- `POST /api/admin/flags/:flagKey/schedule` - Create scheduled update
- `GET /api/admin/flags/:flagKey/schedule` - List schedules for flag
- `DELETE /api/admin/flags/:flagKey/schedule/:scheduleId` - Cancel schedule

**Packages Affected:**
- `apps/api/lego-api/domains/config/` - Schedule service and repository
- `apps/api/lego-api/jobs/` - Cron job for schedule processing
- `packages/backend/database-schema/` - feature_flag_schedules table
- `packages/core/api-client/src/schemas/` - Schedule schemas

**Infrastructure:**
- Database table: feature_flag_schedules with status tracking (pending, applied, failed, cancelled)
- Cron job: Every 1 minute, processes schedules where scheduled_at <= NOW()
- Row-level locking (FOR UPDATE SKIP LOCKED) prevents concurrent processing

**Use Cases:**
- Holiday promotions (auto-enable Dec 1, auto-disable Jan 1)
- Timed releases (auto-enable at 9am on release day)
- A/B test windows (auto-enable for 2 weeks, then disable)
- Maintenance windows (auto-disable during maintenance)

**Acceptance Criteria:** 13 ACs covering schedule CRUD, cron job processing, error handling, and concurrent processing safety.

**Complexity:** Small-Medium (cron job + database schema + admin endpoints)

**Effort:** Low (1-2 points)

**Priority:** Low (convenience feature for Phase 3+)

### Source

Follow-up from QA Elaboration of WISH-2009 (Items Marked Out-of-Scope)

**Original Finding:** Flag scheduling (auto-enable/disable at scheduled times) - Manual only in MVP. Scheduling would allow flags to auto-enable/disable at specified times (e.g., holiday promotions).

**Impact:** Low
**Effort:** Low

---

## WISH-20260: Automatic Retry Mechanism for Failed Flag Schedules

**Status:** pending
**Depends On:** WISH-2119
**Follow-up From:** WISH-2119
**Phase:** 3 - Infrastructure

### Scope

Add automatic retry mechanism with exponential backoff to flag scheduling infrastructure from WISH-2119. Failed schedules will automatically retry up to 3 times with increasing delays (2, 4, 8 minutes) before requiring manual intervention.

**Features:**
- Exponential backoff retry logic (2^(retry_count + 1) minutes)
- Configurable max retries (default: 3, via environment variable)
- Jitter to prevent thundering herd (0-30 seconds)
- Retry metadata tracking in database (retry_count, next_retry_at, last_error)
- CloudWatch logging for retry attempts and final failures

**Database Schema:**
- Add retry columns to feature_flag_schedules table: retry_count, max_retries, next_retry_at, last_error
- Index on next_retry_at for efficient cron job queries

**Packages Affected:**
- `apps/api/lego-api/jobs/` - Enhanced cron job with retry logic
- `packages/backend/database-schema/` - Migration for retry columns
- `apps/api/lego-api/domains/config/adapters/` - Schedule repository updates

**Benefits:**
- Reduces admin toil for transient failures (database errors, network issues)
- Improves reliability of critical scheduled flag updates (holiday promotions, maintenance windows)
- Prevents delays in flag updates requiring manual intervention

**Acceptance Criteria:** 10 ACs covering database migration, exponential backoff calculation, retry query logic, max retries enforcement, successful retry handling, CloudWatch logging, and comprehensive test coverage.

**Complexity:** Medium (cron job enhancement + database schema + retry logic)

**Effort:** Medium (2-3 points)

**Priority:** P2 (Operational enhancement for Phase 3+)

### Source

Follow-up from QA Elaboration of WISH-2119 (Enhancement Opportunity #4)

**Original Finding:** "Automatic retry for failed schedules - Manual intervention required for failed schedules in MVP"

**Category:** Enhancement Opportunity
**Impact:** Medium (improves reliability and reduces admin toil)
**Effort:** Medium (retry logic + database schema + backoff calculation)

**Story File:** `plans/future/wish/backlog/WISH-20260/WISH-20260.md`

---

## WISH-2120: Test utility helpers (createMockFile, mockS3Upload) for S3 upload testing

**Status:** ready-to-work
**Depends On:** WISH-2011
**Follow-up From:** WISH-2011
**Phase:** 2 - Infrastructure

### Scope

Create reusable test utilities to reduce boilerplate in S3 upload tests. Provides `createMockFile()` for generating test File objects with configurable properties and `mockS3Upload()` for configuring common upload scenarios (success, error, timeout).

**Test Utilities:**
- `createMockFile({ name, type, size, content })` - Generate test File objects
- `mockS3Upload({ scenario, statusCode, delay, progressSteps })` - Configure upload scenarios

**Packages Affected:**
- `apps/web/app-wishlist-gallery/src/test/utils/` - New test utilities directory
- `apps/web/app-wishlist-gallery/src/hooks/__tests__/` - Refactor existing tests
- `apps/web/app-wishlist-gallery/src/components/**/__tests__/` - Refactor component tests

**Benefits:**
- Reduce test boilerplate (create mock files in 1 line instead of 3+)
- Improve test readability and maintainability
- Standardize upload test patterns across test files
- Less duplication across test files

**Acceptance Criteria:** 15 ACs covering utility creation, default values, error scenarios, timeout simulation, progress callbacks, utility tests, test refactoring, documentation, TypeScript type safety, and tree-shakability.

**Complexity:** Small (utility functions only)

**Effort:** Low (1 point)

**Priority:** P2 (Test developer experience enhancement)

### Source

Follow-up from QA Elaboration of WISH-2011 (Enhancement Opportunity #3)

**Original Finding:** Test utility helpers (createMockFile, mockS3Upload) as future enhancement after WISH-2011 validation

**Category:** Enhancement Opportunity
**Impact:** Medium (improved test developer experience)
**Effort:** Low

**Story File:** `plans/future/wish/elaboration/WISH-2120/WISH-2120.md`

---

## WISH-20290: Coverage metrics integration for test utilities

**Status:** pending
**Depends On:** WISH-2120
**Follow-up From:** WISH-2120
**Phase:** 2 - Infrastructure

### Scope

Add coverage threshold enforcement (minimum 80%) for test utility files via `vitest.config.ts` to prevent coverage regressions and maintain high test quality as the test infrastructure evolves from WISH-2120.

**Features:**
- Vitest coverage thresholds: 80% (lines, functions, branches, statements) for `src/test/utils/**/*.ts`
- Coverage enforcement in CI pipeline
- Documentation of coverage requirements in test utilities README
- Clear error messages when thresholds are not met

**Packages Affected:**
- `apps/web/app-wishlist-gallery/vitest.config.ts` - Add coverage thresholds
- `apps/web/app-wishlist-gallery/src/test/utils/README.md` - Document requirements (new)

**Benefits:**
- Prevents future coverage regressions in critical test infrastructure
- Maintains high test quality for utilities used across many test files
- Provides clear guidance for developers adding new test utilities

**Acceptance Criteria:** 12 ACs covering Vitest configuration, threshold enforcement, CI integration, documentation, and validation

**Complexity:** Small (configuration only)

**Effort:** Low (1 point)

**Priority:** P2 (Test infrastructure quality for Phase 2)

### Source

Follow-up from QA Elaboration of WISH-2120 (Gaps Identified - Finding #1)

**Original Finding:** "Coverage metrics integration for test utilities - Add coverage threshold enforcement (e.g., 80%) for test utility files via vitest.config.ts"

**Category:** Gap
**Impact:** Low (prevents future coverage regressions)
**Effort:** Low (configuration only)

**Story File:** `plans/future/wish/backlog/WISH-20290/WISH-20290.md`

---

## WISH-20300: VS Code snippets for test utility discovery (createMockFile, mockS3Upload)

**Status:** deferred
**Depends On:** WISH-2120
**Follow-up From:** WISH-2120
**Phase:** 2 - Infrastructure

### Scope

Create VS Code snippets for test utilities from WISH-2120 to improve discoverability, accelerate test writing, and ensure consistent test patterns across the codebase. Provides autocomplete-driven snippets for `createMockFile()` and `mockS3Upload()` utilities.

**VS Code Snippets:**
- `cmf` - Create mock file with defaults
- `cmfc` - Create mock file with custom properties
- `ms3s` - Mock S3 upload success scenario
- `ms3e` - Mock S3 upload error scenarios (presign-error, s3-error, timeout)
- `ms3p` - Mock S3 upload with progress simulation

**Packages Affected:**
- `.vscode/test-utils.code-snippets` - New snippet definitions
- `.vscode/README.md` - Document snippet usage

**Benefits:**
- Improve utility discoverability via autocomplete
- Accelerate test writing (reduce boilerplate)
- Ensure consistent test patterns across codebase
- Faster onboarding for new developers

**Acceptance Criteria:** 13 ACs covering snippet creation, TypeScript integration, autocomplete behavior, documentation, and manual testing.

**Complexity:** Small (JSON snippet definitions only)

**Effort:** Low (1 point)

**Priority:** P2 (Developer Experience enhancement)

### Source

Follow-up from QA Elaboration of WISH-2120 (Enhancement Opportunity #1)

**Original Finding:** "VS Code snippets for test utility discovery - Create VS Code snippet for createMockFile() and mockS3Upload() in .vscode/test-utils.code-snippets to improve discoverability for developers"

**Category:** Enhancement Opportunity
**Impact:** Medium (Developer Experience improvement)
**Effort:** Low

---

## WISH-2121: Playwright E2E MSW Setup for Browser-Mode Testing

**Status:** ready-to-work
**Depends On:** WISH-2011
**Follow-up From:** WISH-2011
**Phase:** 5 - Advanced Testing

### Scope

Enable Playwright E2E tests to use MSW for API and S3 mocking, providing consistent mocking layer across Vitest and Playwright tests. Browser-mode MSW setup reuses handlers and fixtures from WISH-2011 without duplication.

**Packages Affected:**
- `apps/web/playwright/` - Test configuration and MSW setup
- `apps/web/app-wishlist-gallery/public/` - MSW worker script location
- `apps/web/app-wishlist-gallery/src/test/mocks/` - Reuse existing handlers
- `apps/web/app-wishlist-gallery/src/test/fixtures/` - Reuse existing fixtures

**Infrastructure:**
- MSW worker script (`mockServiceWorker.js`) served from public directory
- Browser worker registration in Playwright global setup/teardown
- Service Worker for browser-level request interception

**Benefits:**
- No real backend/S3 dependencies for E2E tests
- Consistent mocking patterns across test environments
- Faster, more reliable CI tests

**Acceptance Criteria:** 13 ACs covering worker script generation, browser worker registration, handler/fixture reuse, error injection, concurrent test isolation, debug logging, CI compatibility, and documentation.

**Complexity:** Medium (browser-mode MSW setup + Playwright integration)

**Effort:** Medium (2-3 points)

**Priority:** P2 (Advanced testing infrastructure for Phase 5)

### Source

Follow-up from QA Elaboration of WISH-2011 (Follow-up Stories Suggested - Finding #2)

**Original Finding:** "Playwright E2E MSW Setup - Browser-mode MSW support explicitly deferred to future"

**Category:** Enhancement Opportunity
**Impact:** Medium (enables E2E testing without external dependencies)
**Effort:** Medium (browser-mode configuration + worker script setup)

**Story File:** `plans/future/wish/backlog/WISH-2121/WISH-2121.md`

---

## WISH-2010: Shared Zod schemas and types setup

**Status:** uat
**Depends On:** none
**Phase:** 2 - Foundation

**Feature:** Centralized schema definitions for wishlist items, filters, reorder operations. Shared between frontend validation and backend API layer. Pivot: Align existing schemas with database, update exports, add documentation.

**Priority:** P0

**Goal:** Ensure consistency in type definitions and validation rules across frontend and backend

**Risk Notes:** Critical for maintaining type safety and validation consistency.

**Source:** Epic Elaboration - Engineering perspective

**Key Discovery:** Schemas already exist in `packages/core/api-client/src/schemas/wishlist.ts` with 54+ tests. Story pivots from creation to alignment with WISH-2000 Drizzle schema.

---

## WISH-2110: Custom Zod error messages for better form UX

**Status:** ready-to-work
**Depends On:** none
**Follow-up From:** WISH-2010
**Phase:** 2 - Foundation

### Scope

Replace generic Zod validation error messages with user-friendly, field-specific messages for better form UX. Updates all wishlist schemas from WISH-2010 with custom error messages using Zod's error message options.

**Examples:**
- `"String must contain at least 1 character(s)"` → `"Title is required"`
- `"Invalid enum value"` → `"Priority must be low, medium, or high"`
- `"Number must be greater than or equal to 0"` → `"Price cannot be negative"`

**Packages Affected:**
- `packages/core/api-client/src/schemas/wishlist.ts` - Add custom messages to all schemas
- `packages/core/api-client/src/schemas/__tests__/wishlist.test.ts` - Update tests to assert specific messages

**Acceptance Criteria:** 13 ACs covering custom error messages for all schema fields, validation testing, frontend/backend integration, and documentation updates.

**Complexity:** Small (error message customization only)

**Effort:** Low (1 point)

**Priority:** P2 (UX enhancement for Phase 2+)

### Source

Follow-up from QA Elaboration of WISH-2010 (Enhancement Opportunity #1)

**Original Finding:** Custom Zod error messages for better form UX

**Category:** Enhancement Opportunity
**Impact:** Medium (better UX for form validation)
**Effort:** Low

---

## WISH-2011: Test infrastructure for MSW mocking of S3 and API calls

**Status:** completed
**Depends On:** none
**Phase:** 2 - Infrastructure

**Feature:** Mock Service Worker (MSW) handlers for S3 presigned URL generation, S3 upload responses, API endpoints. Integration test fixtures for upload flows.

**Priority:** P0

**Goal:** Enable reliable integration tests without external S3 dependencies

**Risk Notes:** Needed for reliable, fast integration tests. Must mock both API and S3 interactions accurately.

**Source:** Epic Elaboration - QA perspective

**Story File:** `plans/future/wish/ready-for-qa/WISH-2011/WISH-2011.md`

---

## WISH-2012: Accessibility testing harness setup

**Status:** completed
**Depends On:** WISH-2001
**Phase:** 2 - Infrastructure

**Feature:** Test infrastructure for accessibility testing: axe-core integration, automated WCAG AA checks, keyboard navigation test utilities, screen reader testing guides.

**Priority:** P0

**Goal:** Enable accessibility testing for WISH-2006 when resumed

**Risk Notes:** Needed for WISH-2006 when resumed. Requires setup before accessibility work can begin.

**Source:** Epic Elaboration - UX perspective

**Elaboration Notes:** CONDITIONAL PASS - Two clarification items added as acceptance criteria (AC16: Evaluate @repo/accessibility package reuse), (AC17: Clarify Playwright integration scope and WISH-2121 dependency). No MVP blockers identified.

**Story File:** `plans/future/wish/UAT/WISH-2012/WISH-2012.md`

**QA Verdict:** PASS - All 15 ACs verified, 103 tests passing, 72.87% coverage, architecture compliant

---


## WISH-2123: Content Moderation - AI/ML Image Scanning

**Status:** deferred
**Depends On:** WISH-2013
**Follow-up From:** WISH-2013
**Phase:** 4 - Security Enhancements

### Scope

AI/ML-based content moderation to automatically detect and flag inappropriate, offensive, or adult content in uploaded wishlist images. Provides admin tooling for content review, user notification, and policy enforcement.

**Features:**
- AWS Rekognition DetectModerationLabels integration
- Automatic flagging based on confidence thresholds (≥90% auto-flag, <50% auto-approve)
- Admin moderation queue for manual review
- Approve/Reject workflow with audit logging
- Moderation status tracking in database

**Endpoints:**
- `GET /api/admin/moderation/queue` - Get pending moderation items
- `POST /api/admin/moderation/:id/approve` - Approve flagged content
- `POST /api/admin/moderation/:id/reject` - Reject and remove flagged content
- `GET /api/admin/moderation/stats` - Moderation metrics and trends

**Packages Affected:**
- `apps/api/lego-api/domains/wishlist/` - Integrate moderation into upload flow
- `apps/api/lego-api/core/moderation/` - AI/ML moderation service (new)
- `apps/api/lego-api/domains/admin/` - Admin moderation review endpoints (new)
- `apps/web/admin-dashboard/` - Admin moderation review UI (new or extend existing)
- `packages/backend/database-schema/` - Moderation results table, audit log

**Infrastructure:**
- Database table: `moderation_results` with labels, confidence scores, review status
- Database column: `wishlist_items.moderation_status` ('pending-scan', 'clean', 'pending-review', 'approved', 'rejected')
- AWS Rekognition IAM policy for DetectModerationLabels API (~$0.001 per image)

**Acceptance Criteria:** 15 ACs covering AI/ML integration, automatic flagging, admin queue, image preview, approve/reject workflow, database schema, metrics dashboard, adapter pattern, async moderation, authorization, and MSW test coverage.

**Complexity:** Large (AI/ML integration + admin UI + workflow)

**Effort:** High (5-8 points)

**Priority:** P2 (Trust & Safety requirement for production platform)

**Goal:** Implement AI/ML-based content moderation to automatically detect and flag inappropriate content in uploaded wishlist images

**Risks:**
- High false positive rate from AWS Rekognition (mitigate with conservative thresholds ≥90%)
- Moderation costs scale with user growth (~$0.001/image)
- Async moderation creates UX gap for flagged content (mitigate with "Processing" badges)
- Admin review backlog grows faster than capacity (mitigate with queue monitoring and SLA)

### Source

Follow-up from QA Elaboration of WISH-2013 (Follow-up Stories Suggested - Finding #1)

**Original Finding:** "Content Moderation - AI/ML-based scanning for inappropriate/offensive images"

**Category:** Enhancement Opportunity
**Impact:** Medium (Trust & Safety requirement for production platform)
**Effort:** High (AI/ML pipeline integration, moderation workflow, review tooling)

---

## WISH-2124: Redis infrastructure setup and migration from in-memory cache

**Status:** ready-to-work
**Depends On:** none
**Follow-up From:** WISH-2009
**Phase:** 2 - Core Infrastructure

### Scope

Migrate feature flag caching from in-memory Map to Redis for distributed, production-ready caching. Implement RedisCacheAdapter following hexagonal architecture patterns, configure AWS ElastiCache for production, and set up Docker Compose for local development.

**Features:**
- RedisCacheAdapter implementing CacheAdapter interface
- Redis client singleton with connection pooling (ioredis v5.x)
- AWS ElastiCache infrastructure (t3.micro, Redis 7.x)
- Graceful error handling and database fallback on cache failure
- Docker Compose local development setup
- Canary deployment strategy with monitoring

**Packages Affected:**
- `apps/api/lego-api/domains/config/adapters/` - RedisCacheAdapter
- `apps/api/lego-api/core/cache/` - Redis client singleton
- `apps/api/lego-api/domains/config/application/` - Service wiring
- Infrastructure code (CDK/Terraform)
- Docker Compose configuration

**Acceptance Criteria:** 16 ACs covering Redis client integration, cache adapter implementation, error handling, fallback logic, cold start resilience, failover handling, TTL configuration, cache invalidation, VPC security, connection pool testing, local development setup, cost monitoring, canary deployment, and service layer wiring.

**Complexity:** Medium (Infrastructure + Migration + Testing)

**Effort:** 4 points

**Priority:** P1 (Production scaling requirement)

**Goal:** Enable distributed, production-ready caching for feature flags across multiple Lambda instances with automatic fallback to database on Redis failure.

**Risks:**
- Lambda cold start connection failures (mitigated by retry logic and database fallback)
- VPC security group misconfiguration (mitigated by infrastructure validation)
- Cache invalidation race conditions (mitigated by transaction atomicity)
- Infrastructure cost overruns (mitigated by billing alarms)
- Connection pool exhaustion under load (mitigated by load testing)

### Source

Follow-up from QA Elaboration of WISH-2009 (QA Elaboration Enhancement Opportunity #1)

**Original Finding:** "Redis infrastructure setup and migration from in-memory cache"

**Category:** Infrastructure
**Impact:** High (production scaling)
**Effort:** Medium (new infrastructure)

---

## WISH-20320: Redis Cluster mode for high availability (multi-AZ failover, load balancing)

**Status:** deferred
**Depends On:** WISH-2124
**Follow-up From:** WISH-2124
**Phase:** 3 - Advanced Infrastructure

### Scope

Migrate ElastiCache from single-instance to Cluster mode with multi-AZ deployment for production-grade high availability. Enable automatic failover, horizontal scaling, and fault tolerance for feature flag caching infrastructure.

**Features:**
- ElastiCache Cluster mode with 3 nodes (1 primary, 2 replicas)
- Multi-AZ deployment across 3 availability zones
- Automatic failover with <60 second recovery time
- Read replica load balancing for distributed read traffic
- `ioredis` cluster client configuration
- Zero-downtime blue-green migration from single-instance
- Cluster health monitoring and alerting
- Backup and recovery configuration

**Packages Affected:**
- `apps/api/lego-api/core/cache/redis-client.ts` - Cluster mode client initialization
- Infrastructure code (CDK/Terraform) - ElastiCache cluster configuration
- Docker Compose - 6-node local Redis Cluster simulation

**Acceptance Criteria:** 12 ACs covering cluster provisioning, client configuration, automatic failover validation, multi-AZ resilience, read replica load balancing, zero-downtime migration, cluster health monitoring, backup/recovery, connection string migration, local development cluster, cost monitoring, and graceful degradation.

**Complexity:** High (Distributed infrastructure + migration + failover testing)

**Effort:** 5 points

**Priority:** P2 (Production availability requirement)

**Goal:** Enable production-grade high availability for Redis caching with automatic failover and multi-AZ fault tolerance.

**Risks:**
- Increased infrastructure cost (~3x single-instance, mitigated by billing alarms)
- Replication lag under high write load (mitigated by monitoring and eventual consistency acceptance)
- Complex failover behavior (mitigated by staging tests and rollback plan)
- Client library compatibility issues (mitigated by ioredis v5.x cluster support)
- Network latency between AZs (mitigated by cross-AZ optimization and monitoring)

### Source

Follow-up from QA Elaboration of WISH-2124 (Enhancement Opportunity #1)

**Original Finding:** "Redis Cluster mode for high availability (multi-AZ failover, load balancing)"

**Category:** Enhancement Opportunity
**Impact:** High (production availability and fault tolerance)
**Effort:** High (infrastructure redesign and migration)

---

## WISH-20340: Multi-region Redis replication (global latency optimization)

**Status:** deferred
**Depends On:** WISH-2124
**Follow-up From:** WISH-2124
**Phase:** 5 - Global Optimization

### Scope

Deploy multi-region Redis replication for feature flag caching to optimize latency for global users. Enable each AWS region's Lambda functions to read from local Redis read replicas while maintaining centralized write control.

**Features:**
- ElastiCache Global Datastore with primary and secondary clusters
- Region-aware Redis client (auto-detect region, connect to local replica)
- Read-write split in RedisCacheAdapter (reads from local replica, writes to primary)
- Graceful degradation on replica failure (fallback to primary)
- Manual failover procedures with runbook
- Replication lag monitoring and alerting
- Cross-region latency validation (P95 < 50ms per region)

**Packages Affected:**
- `apps/api/lego-api/core/cache/redis-client.ts` - Region detection and dual-client creation
- `apps/api/lego-api/domains/config/adapters/RedisCacheAdapter.ts` - Read-write split routing
- Infrastructure code (CDK/Terraform) - ElastiCache Global Datastore
- Environment configuration - REDIS_PRIMARY_URL, REDIS_REPLICA_URL per region

**Acceptance Criteria:** 12 ACs covering Global Datastore setup, region-aware Redis client, read-write split, replica failover, primary failover procedures, replication lag monitoring, cross-region latency validation, write latency acceptance, environment configuration, cost monitoring, cache invalidation propagation, and disaster recovery testing.

**Complexity:** High (Multi-region infrastructure + failover orchestration)

**Effort:** 5 points

**Priority:** P3 (Global user experience optimization, deferred until multi-region deployment active)

**Goal:** Optimize cache read latency for global users by deploying read replicas in multiple AWS regions while maintaining centralized write control and eventual consistency.

**Risks:**
- Replication lag spikes during high traffic (mitigated by monitoring and TTL)
- Primary region failure requires manual intervention (mitigated by runbook and DR drills)
- Split-brain scenario with two primaries (mitigated by validation steps in failover process)
- Network partition between regions (mitigated by graceful degradation to database)
- Cost overruns from additional regions (mitigated by billing alarms and t3.micro instances)

### Source

Follow-up from QA Elaboration of WISH-2124 (Enhancement Opportunity #3)

**Original Finding:** "Multi-region Redis replication (global latency optimization)"

**Category:** Enhancement Opportunity
**Impact:** Medium (global user experience)
**Effort:** High (multi-region infrastructure)

---

## WISH-2013: File upload security hardening

**Status:** completed
**Depends On:** none
**Follow-up From:** WISH-2011
**Phase:** 3 - Security

**Feature:** Virus scanning integration for uploaded images, strict file type validation (whitelist), file size limits (max 10MB), S3 security: IAM policy, bucket policy, CORS configuration, presigned URL TTL (15 min).

**Priority:** P0

**Goal:** Secure user file uploads and prevent malicious content

**Risk Notes:** Critical security requirement for WISH-2002. Must include virus scanning and file type validation. Benefits from MSW fixtures and handlers established in WISH-2011.

**Source:** Follow-up from QA Elaboration of WISH-2011 (Finding #1)

**Story File:** `plans/future/wish/UAT/WISH-2013/WISH-2013.md`

**Elaboration Notes:** CONDITIONAL PASS - Three MVP-critical gaps addressed via additional acceptance criteria (AC18: server-side file size validation), clarified existing criteria (AC5: async virus scanning via S3 event trigger Lambda), and enhanced existing criteria (AC16: structured CloudWatch logging with specific fields).

---

## WISH-2014: Smart Sorting Algorithms

**Status:** completed
**Depends On:** none
**Follow-up From:** WISH-2001
**Phase:** 4 - UX Polish

### Scope

Add three smart sorting modes to help users discover wishlist items in meaningful ways beyond basic date/price sorting. These sorting modes leverage existing database fields (price, pieceCount, releaseDate, priority) to provide value-based, time-based, and discovery-based sorting.

**Features:**
- Best Value: Sort by price-per-piece ratio (lowest first)
- Expiring Soon: Sort by release date (oldest first)
- Hidden Gems: Sort by (5 - priority) * pieceCount (highest score first)

**Endpoints Affected:**
- `GET /api/wishlist` - Extended with new sort parameter values: bestValue, expiringSoon, hiddenGems

**Packages Affected:**
- `apps/api/lego-api/domains/wishlist/` - Sort algorithms in service/repository
- `packages/core/api-client/src/schemas/wishlist.ts` - Extended sort enum
- `apps/web/app-wishlist-gallery/src/pages/main-page.tsx` - Sort dropdown with new options

**Acceptance Criteria:** 18 ACs covering backend algorithms, frontend dropdown, schema synchronization, error handling, performance, and accessibility.

**Complexity:** Medium

**Effort:** 3 points

**Priority:** P2 (UX enhancement)

**Code Review Verdict:** PASS (iteration 3) - All 6 review workers passed (lint, style, syntax, security, typecheck, build).

**Story File:** `plans/future/wish/ready-for-qa/WISH-2014/WISH-2014.md`

---

## WISH-2015: Sort Mode Persistence (localStorage)

**Status:** completed
**Depends On:** WISH-2001
**Follow-up From:** WISH-2001
**Phase:** 4 - UX Polish

### Scope

Automatically persist wishlist sort mode preference to localStorage and restore it when users return, providing personalized sorting experience across sessions.

**Features:**
- Save sort preference to localStorage on user selection
- Restore sort mode on page load if previously set
- Clear localStorage on logout
- Handle invalid values gracefully with Zod validation
- Support incognito mode with fallback

**Packages Affected:**
- `apps/web/app-wishlist-gallery/src/hooks/useLocalStorage.ts` (created)
- `apps/web/app-wishlist-gallery/src/hooks/useWishlistSortPersistence.ts` (created)
- `apps/web/app-wishlist-gallery/src/pages/main-page.tsx` (modified)

**Acceptance Criteria:** 14 ACs covering persistence, restoration, error handling, accessibility, and test coverage.

**Complexity:** Small

**Effort:** 2 points

**Priority:** P2 (UX enhancement)

**QA Verdict:** PASS (2026-01-29) - All 11/14 ACs verified. 2 ACs acceptable partial (logout integration, E2E tests). 33 unit tests pass, TypeScript compilation pass, architecture compliant.

**Story File:** `plans/future/wish/UAT/WISH-2015/WISH-2015-new/WISH-2015.md`

---

## WISH-2016: Image Optimization - Automatic Resizing, Compression, and Watermarking

**Status:** completed
**Depends On:** none
**Follow-up From:** WISH-2013
**Phase:** 4 - Performance & UX Polish

### Scope

Automatically optimize uploaded images to reduce storage costs, improve page load performance, and enhance mobile user experience. Provides multiple image sizes (thumbnail, medium, large) for responsive display and applies subtle watermarking for copyright protection.

**Features:**
- Automatic resizing: Generate three sizes (thumbnail 200x200, medium 800x800, large 1600x1600)
- Compression: Apply 85% quality lossy compression (90-95% file size reduction)
- Format conversion: WebP format with JPEG fallback for browser compatibility
- Watermarking: Subtle watermark on large images only (10% opacity, bottom-right corner)
- Async processing: S3 event trigger Lambda with Sharp library

**Packages Affected:**
- `apps/api/lego-api/core/image-processing/` - Image optimization service (new)
- `apps/api/lego-api/functions/image-processor/` - S3 event handler Lambda (new)
- `packages/backend/database-schema/` - Add image_variants column (JSONB)
- `apps/web/app-wishlist-gallery/src/components/WishlistCard/` - Responsive images with srcset
- `apps/web/app-wishlist-gallery/src/pages/` - Optimized image display

**Infrastructure:**
- S3 event trigger on `uploads/wishlist/*`
- Lambda with Sharp library layer (~50MB)
- Database migration: image_variants column
- CloudWatch metrics for cost savings tracking

**Cost Savings:**
- Storage reduction: ~97% (from 10MB to < 1MB total per image)
- Monthly savings: ~$20-50/month for 1000 images (storage + egress)
- Page load improvement: Gallery view from 200MB → 2MB (100x faster on mobile)

**Acceptance Criteria:** 15 ACs covering image resizing, compression, WebP conversion, watermarking, database schema, S3 event trigger, Lambda performance, frontend responsive images, fallback for legacy items, error handling, test coverage, and documentation.

**Complexity:** Medium (Image processing pipeline + Lambda layer + S3 events)

**Effort:** 3-5 points

**Priority:** P2 (Performance & UX enhancement for Phase 4)

### Source

Follow-up from QA Elaboration of WISH-2013 (Follow-up Stories Suggested - Finding #2)

**Original Finding:** "WISH-2016: Image Optimization - Automatic resizing, compression, watermarking (deferred to future story)"

**Category:** Enhancement Opportunity
**Impact:** Medium (Performance optimization, cost reduction, improved UX)
**Effort:** Medium (Image processing pipeline)

---

## WISH-2122: Usage Quotas - Per-User Storage Quotas and Upload Rate Limits

**Status:** deferred
**Depends On:** WISH-2013
**Follow-up From:** WISH-2013
**Phase:** 4 - Resource Management

### Scope

Implement per-user storage quotas and upload rate limits to control S3 costs, prevent abuse, and enable tier-based resource allocation. Provides quota tracking, enforcement in presign endpoint, and user visibility via QuotaUsageWidget.

**Features:**
- Per-user storage quotas (default: 100MB for free tier, configurable by tier)
- Upload rate limits (default: 10 uploads/hour, configurable by tier)
- Real-time quota tracking in database (used_bytes, file_count)
- Quota enforcement on presign requests (reject when quota exceeded or rate limit hit)
- QuotaUsageWidget displaying current usage and remaining quota
- Sliding window rate limiting algorithm (60-minute window)
- Migration script to backfill quotas for existing users

**Endpoints:**
- `GET /api/wishlist/quota` - Get current quota usage
- Enhanced `POST /api/wishlist/images/presign` - Reject when quota/rate limit exceeded (429)

**Database:**
- New table: `user_storage_quotas` (user_id, tier, total_quota_bytes, used_bytes, file_count)
- New table: `upload_rate_limits` (user_id, window_start, upload_count)

**Packages Affected:**
- `apps/api/lego-api/domains/wishlist/` - Quota enforcement in presign endpoint
- `apps/api/lego-api/core/quotas/` - Quota service (new)
- `apps/api/lego-api/core/rate-limit/` - Upload rate limiter (new or extend existing)
- `packages/backend/database-schema/` - New quota tables
- `apps/web/app-wishlist-gallery/src/components/QuotaUsageWidget/` - Quota UI component (new)

**Acceptance Criteria:** 17 ACs covering quota initialization, enforcement, tracking accuracy, rate limiting, UI display, client error handling, tier configuration, concurrent safety, audit logging, migration, and documentation.

**Complexity:** Medium (Database tracking + enforcement logic + rate limiting)

**Effort:** 3-5 points

**Priority:** P2 (Cost control and abuse prevention for Phase 4+)

### Source

Follow-up from QA Elaboration of WISH-2013 (Follow-up Stories Suggested - Finding #3)

**Original Finding:** "User Quota Management: Per-user storage quotas or upload rate limits (deferred to future story)"

**Category:** Enhancement Opportunity
**Impact:** Medium (Cost control and abuse prevention)
**Effort:** Medium (Database tracking + enforcement logic + rate limiting)

**Story File:** _(deleted - deferred)_

---

## WISH-20171: Backend Combined Filter + Sort Queries

**Status:** ready-to-work
**Depends On:** none
**Split From:** WISH-2017
**Phase:** 6 - Advanced Features

### Scope

Extend backend GET /api/wishlist endpoint with combined filter + sort query parameters. Implement repository layer with combined WHERE + ORDER BY queries, handle null values, pagination, and error validation. Focus on backend-only implementation with 45 unit tests and 18 integration tests.

### Acceptance Criteria (from parent)

AC1, AC2, AC3, AC4, AC5, AC6, AC15, AC16, AC18 (9 ACs)

---

## WISH-20172: Frontend Filter Panel UI

**Status:** ready-to-work
**Depends On:** WISH-20171
**Split From:** WISH-2017
**Phase:** 6 - Advanced Features

### Scope

Create FilterPanel component with store, priority, and price range controls. Implement URL query parameter state management, RTK Query integration with filter params, active filter badge, and Clear All button. Focus on frontend-only implementation with 20 component tests and 4 Playwright E2E tests.

### Acceptance Criteria (from parent)

AC7, AC8, AC9, AC10, AC11, AC12, AC13, AC14, AC17, AC19, AC20 (11 ACs)

---

## WISH-2018: CDN Integration for Image Performance Optimization

**Status:** uat
**Depends On:** WISH-2013
**Follow-up From:** WISH-2013
**Phase:** 5 - Performance

### Scope

Integrate Amazon CloudFront as a CDN to serve wishlist images from edge locations worldwide, reducing latency for global users and lowering bandwidth costs. Ensures seamless migration from S3 URLs to CloudFront URLs without breaking existing images.

**Features:**
- CloudFront distribution with S3 origin configuration
- Origin Access Identity (OAI) for secure S3-CloudFront integration
- HTTPS-only access enforcement with automatic HTTP redirect
- 24-hour edge cache TTL with configurable cache behaviors
- CloudFront URL generation utilities (backend)
- API layer returns CloudFront URLs (GET /api/wishlist, GET /api/wishlist/:id)
- Backward compatibility: convert legacy S3 URLs to CloudFront URLs on-the-fly
- Presigned URL uploads still use S3 (CloudFront is read-only CDN)
- Cache invalidation strategy via versioned URLs (append ?v={timestamp})
- CloudFront access logs for performance monitoring and cost analysis

**Endpoints:**
- Enhanced GET /api/wishlist - Returns CloudFront URLs instead of S3 URLs
- Enhanced GET /api/wishlist/:id - Returns CloudFront URL for image

**Packages Affected:**
- `apps/api/lego-api/domains/wishlist/` - Update presign endpoint responses
- `apps/api/lego-api/core/cdn/` - CloudFront URL generation utilities (new)
- `apps/web/app-wishlist-gallery/src/components/` - Transparent (uses imageUrl as-is)
- Infrastructure: CloudFront distribution, OAI, S3 bucket policy updates

**Performance Improvements:**
- US East: 25% faster (80ms → 60ms)
- Europe: 70% faster (400ms → 120ms)
- Asia: 67% faster (600ms → 200ms)
- Cache hit ratio > 80% after warmup

**Cost Savings:**
- 29% cost reduction for US traffic (S3: $1.33/month → CloudFront: $0.95/month)
- Higher savings for international traffic due to lower CloudFront data transfer costs

**Acceptance Criteria:** 15 ACs covering CloudFront distribution creation, HTTPS enforcement, cache behavior, URL generation, API responses, frontend rendering, backward compatibility, upload flow, cache invalidation, access logs, cost monitoring, integration tests, performance benchmarking, and OAI security.

**Complexity:** Medium (CloudFront setup + S3 origin configuration + URL migration)

**Effort:** Medium (3-5 points)

**Priority:** P2 (Performance enhancement for Phase 5)

### Source

Follow-up from QA Elaboration of WISH-2013 (Follow-up Stories Suggested - Finding #4)

**Original Finding:** "WISH-2018: CDN Integration - CloudFront or image CDN for performance"

**Category:** Enhancement Opportunity
**Impact:** Medium (Performance improvement for global users)
**Effort:** Medium (CloudFront distribution + S3 origin configuration)

---

## WISH-2019: Redis infrastructure setup and migration from in-memory cache

**Status:** completed
**Depends On:** none
**Follow-up From:** WISH-2009
**Phase:** 2 - Infrastructure

### Scope

Migrate feature flag caching from in-memory Map to Redis for production-ready distributed caching. Sets up Redis infrastructure (ElastiCache or local Docker) and migrates the cache adapter with minimal code changes.

**Packages Affected:**
- `apps/api/lego-api/domains/config/adapters/` - Cache adapter migration
- `apps/api/lego-api/core/cache/` - Redis client singleton
- `apps/api/lego-api/domains/config/application/feature-flag-service.ts` - Service layer wiring
- `apps/api/lego-api/domains/config/index.ts` - DI container setup
- Infrastructure: AWS ElastiCache (t3.micro) or Docker Compose Redis
- Environment: REDIS_URL configuration

**Infrastructure:**
- Redis 7.x instance with 1 GB memory
- Connection pooling (max 10 connections)
- Fallback to database if Redis unavailable
- 5-minute TTL matching WISH-2009 spec

**Acceptance Criteria:** 16 ACs covering Redis provisioning, adapter migration, service layer wiring, cache key patterns, environment configuration, testing, and documentation

**Risks:**
- Lambda cold start Redis connection failures (mitigated with retry + fallback)
- VPC/security group misconfiguration blocking connectivity
- Increased infrastructure cost ~$15-30/month (acceptable for production scaling)

**Elaboration Notes:** APPROVED - All critical gaps resolved:
- AC 14: Service layer wiring (feature-flag-service.ts + DI container)
- AC 15: Cache key pattern alignment with WISH-2009 (feature_flags:{environment}:{flagKey})
- AC 16: REDIS_URL environment variable paths (apps/api/lego-api/.env.local)
- Path inconsistencies corrected in Scope and Reuse Plan sections

**Story File:** `plans/future/wish/ready-for-qa/WISH-2019/WISH-2019.md`

### Source

Follow-up from QA Elaboration of WISH-2009 (Enhancement Opportunity #1)

**Original Finding:** Redis infrastructure setup and migration from in-memory cache - WISH-2009 AC 17 uses in-memory cache for MVP. When production scaling requires it, migrate to Redis for distributed caching. The adapter pattern in AC 17 ensures minimal code changes.

**Impact:** High (production scaling)
**Effort:** Medium (new infrastructure)

---

## WISH-2029: Update architecture documentation for lego-api/domains/ pattern

**Status:** completed
**Depends On:** none
**Follow-up From:** WISH-2009
**Phase:** 2 - Infrastructure

### Scope

Update `docs/architecture/api-layer.md` to document `apps/api/lego-api/domains/` as the canonical location for backend domain modules. All existing domains (gallery, wishlist, health, instructions, sets, parts-lists) use this pattern with hexagonal architecture (ports & adapters), but documentation still references the old `services/{domain}/` pattern.

**Documentation Files Affected:**
- `docs/architecture/api-layer.md` - Main architecture documentation (primary update)
- Verification: Review all 6 existing domains for pattern consistency

**Documentation Content:**
- Directory structure tree (application/, adapters/, routes.ts, types.ts, __tests__/)
- Subdirectory responsibilities (business logic vs infrastructure)
- Hexagonal architecture explanation (ports, adapters, separation of concerns)
- Examples from existing domains (gallery, wishlist, config from WISH-2009)
- "Creating a New Domain" step-by-step guide
- Hono framework usage patterns
- Shared schema patterns (backend owns, frontend imports via @repo/api-client)
- Migration notes for legacy patterns
- Architecture decision rationale

**Acceptance Criteria:** 14 ACs covering documentation updates, examples, verification, and quality checks

**Risks:**
- Documentation drift as code evolves (mitigate with "Last Verified" dates)
- Contradictions with CLAUDE.md guidelines (cross-check during writing)

### Source

Follow-up from QA Elaboration of WISH-2009 (Gap #2 - AC 18 follow-up)

**Original Finding:** Update docs/architecture/api-layer.md to document lego-api/domains/ as canonical pattern

**Category:** Technical Debt / Documentation
**Impact:** Medium (prevents architecture confusion)
**Effort:** Low (documentation only)

---

## WISH-2039: User-level targeting for feature flags

**Status:** uat
**Depends On:** none
**Follow-up From:** WISH-2009
**Phase:** 3 - Infrastructure

### Scope

Add user-level targeting to feature flag infrastructure with explicit inclusion/exclusion lists. Enables beta tester programs, VIP access, support debugging, and exclusion of problematic users.

**Endpoints:**
- `POST /api/admin/flags/:flagKey/users` - Add users to include/exclude list
- `DELETE /api/admin/flags/:flagKey/users/:userId` - Remove user from targeting
- `GET /api/admin/flags/:flagKey/users` - List all user overrides for flag

**Database:**
- New table: `feature_flag_user_overrides` (flag_id, user_id, override_type, reason, created_by)
- Evaluation priority: Exclusion > Inclusion > Percentage-based rollout

**Packages Affected:**
- `apps/api/lego-api/domains/config/` - Update flag evaluation logic
- `packages/backend/database-schema/` - User overrides table schema
- `packages/core/api-client/src/schemas/` - User override schemas

**Acceptance Criteria:** 12 ACs covering database schema, user override endpoints, evaluation logic updates, caching, rate limiting, testing, and documentation updates.

**Complexity:** Medium - Extends WISH-2009 with new table and evaluation logic

**Risks:**
- Large include/exclude lists slow evaluation (mitigate with caching and indexes)
- Cache invalidation lag up to 5 minutes (acceptable for admin operations)
- Security: Admin-only endpoints (reuse WISH-2009 auth middleware)

### Source

Follow-up from QA Elaboration of WISH-2009 (Enhancement Opportunity - Non-goals deferred item)

**Original Finding:** User-level targeting (beyond percentage-based rollout) - MVP is percentage-based only. User-level targeting would allow specific users to be included/excluded from flags.

**Category:** Feature Enhancement
**Impact:** Medium (enables targeted rollout)
**Effort:** Medium (user overrides table)

---

## WISH-2047: IP/Geolocation Logging for Authorization Events

**Status:** completed
**Completed:** 2026-01-31
**Depends On:** none
**Follow-up From:** WISH-2008
**Phase:** 5 - Observability

### Scope

Enrich authorization failure audit logs (403/404 events) with IP address and geolocation data (country, region, city) to enable detection of suspicious access patterns, geographic anomalies, and potential security threats.

**Features:**
- IP extraction from request headers (X-Forwarded-For, X-Real-IP, socket)
- MaxMind GeoLite2 geolocation lookup (country, region, city, lat/long)
- Privacy-conscious logging (403/404 only, not 200/201 requests)
- CloudWatch Logs Insights query examples for security analysis
- Shared IP extraction utility (integration with rate limiting from WISH-2008 AC 24)

**Packages Affected:**
- `apps/api/lego-api/core/observability/` - Logger enrichment with IP/geolocation
- `apps/api/lego-api/core/geolocation/` - MaxMind GeoIP2 lookup service (new)
- `apps/api/lego-api/core/utils/` - IP extraction utility (new, shared)
- `apps/api/lego-api/middleware/` - Reuse IP extraction in auth/rate-limit middleware
- `apps/api/lego-api/domains/wishlist/` - Pass IP from context to logger

**Infrastructure:**
- MaxMind GeoLite2 City database (~50 MB) added to Lambda layer
- Environment variable: `GEOIP_DATABASE_PATH=/opt/geolite2-city.mmdb`
- Lambda memory increase: +128 MB for in-memory database caching

**Acceptance Criteria:** 12 ACs covering IP extraction, geolocation lookup, enriched logging, privacy controls, CloudWatch query examples, Lambda layer setup, performance requirements, error handling, rate limiting integration, and documentation updates.

**Complexity:** Small-Medium (IP extraction + geolocation lookup + logging enrichment)

**Effort:** Low-Medium (2 points)

**Priority:** P2 (Observability enhancement for Phase 5)

### Source

Follow-up from QA Elaboration of WISH-2008 (Enhancement Opportunity #9)

**Original Finding:** IP/geolocation logging for suspicious access patterns - Log IP address and country for 403/404 events to detect suspicious access patterns

**Category:** Enhancement Opportunity
**Impact:** Medium (Security observability improvement)
**Effort:** Medium (IP extraction + geolocation lookup + log enrichment)

---

## WISH-2022: Client-side Image Compression

**Status:** completed
**Depends On:** WISH-2002
**Follow-up From:** WISH-2002
**Phase:** 4 - UX Polish

### Scope

Automatically compress images on the client side before uploading to S3, reducing upload time and storage costs while maintaining acceptable visual quality. Uses browser-image-compression library.

**Features:**
- Auto-compress images before S3 upload using browser-image-compression library
- Compression settings: max width 1920px, max height 1920px, quality 0.8, max size 1MB
- Progress indicator: "Compressing image... X%"
- Toast notification: "Image compressed: X MB → Y MB"
- "High quality (skip compression)" checkbox
- Skip compression if image already small (< 500KB)
- Graceful fallback on compression failure

**Packages Affected:**
- `apps/web/app-wishlist-gallery/src/hooks/useS3Upload.ts`
- `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts` (new)
- `apps/web/app-wishlist-gallery/src/components/WishlistForm/`

**Acceptance Criteria:** 10 ACs covering auto-compression, settings, progress indicator, filename preservation, skip logic, graceful fallback, checkbox toggle, timing, toast notification, and preview update.

**Complexity:** Medium (library integration + hook modification + UI updates)

**Effort:** 3 points

**Priority:** P2 (UX enhancement for Phase 4)

**Story File:** `plans/future/wish/ready-for-qa/WISH-2022/WISH-2022.md`

### Source

Follow-up from QA Elaboration of WISH-2002 (Enhancement Opportunity)

**Original Finding:** Client-side image compression - compress images before S3 upload to reduce upload time and storage costs

**Category:** Enhancement Opportunity
**Impact:** High (significantly reduces upload time and S3 storage costs)
**Effort:** Medium (library integration + upload flow modification)

---


## WISH-2023: Add Compression Failure Telemetry

**Status:** deferred
**Depends On:** WISH-2022
**Follow-up From:** WISH-2022
**Phase:** 4 - UX Polish
**Deferred Reason:** Not MVP - telemetry is a post-launch enhancement

### Scope

Track compression failures via CloudWatch metrics and structured logs to identify patterns by format, size, browser, and error type. Enables data-driven improvements to compression logic and fallback behavior from WISH-2022.

**Features:**
- Compression failure logging with structured metadata (format, size, browser, error type)
- Backend telemetry endpoint `POST /api/observability/compression-failures`
- CloudWatch Metrics namespace: `Wishlist/ImageCompression`
- Metrics: `CompressionFailureCount`, `CompressionFailureRate`
- Dimensions: `Format`, `SizeBucket`, `Browser`, `ErrorType`
- CloudWatch Logs structured JSON format
- Fire-and-forget telemetry (non-blocking, 2-second timeout)

**Packages Affected:**
- `apps/web/app-wishlist-gallery/src/utils/compressionTelemetry.ts` (new) - Frontend telemetry helpers
- `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts` - Add error logging
- `apps/web/app-wishlist-gallery/src/hooks/useS3Upload.ts` - Instrument failures
- `apps/api/lego-api/domains/observability/routes.ts` - Telemetry endpoint
- `apps/api/lego-api/core/observability/metrics.ts` - CloudWatch metrics publisher

**Acceptance Criteria:** 12 ACs covering error logging, telemetry endpoint, CloudWatch Metrics/Logs, size bucketing, browser detection, error classification, privacy compliance, and documentation.

**Complexity:** Small-Medium (telemetry endpoint + CloudWatch integration)

**Effort:** 2 points

**Priority:** P2 (Observability enhancement for Phase 4)

### Source

Follow-up from QA Elaboration of WISH-2022 (Gaps Identified - Finding #3)

**Original Finding:** Compression failure telemetry - Track compression failures (format, size, browser, error) via CloudWatch/analytics to identify patterns and improve fallback logic

**Category:** Gap
**Impact:** Medium (Observability improvement for compression failures)
**Effort:** Low (CloudWatch metrics + error logging)

**Story File:** `plans/future/wish/deferred/WISH-2023/WISH-2023.md`

---
## WISH-2046: Client-side Image Compression Quality Presets

**Status:** completed
**Depends On:** WISH-2022
**Follow-up From:** WISH-2022
**Phase:** 4 - UX Polish

### Scope

Add user-selectable compression quality presets to the client-side image compression feature from WISH-2022. Enables users to choose between "Low bandwidth" (0.6 quality, 1200px), "Balanced" (0.8 quality, 1920px - default), and "High quality" (0.9 quality, 2400px) presets based on their needs.

**Features:**
- Three compression quality presets: Low bandwidth, Balanced (default), High quality
- Preset selector UI in upload form (radio buttons or dropdown)
- Estimated file size display for each preset
- localStorage persistence of selected preset
- Toast notification showing which preset was used
- "Skip compression" checkbox overrides preset selection

**Packages Affected:**
- `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts` - Preset definitions
- `apps/web/app-wishlist-gallery/src/components/WishlistForm/` - Preset selector UI
- `apps/web/app-wishlist-gallery/src/hooks/useS3Upload.ts` - Pass preset to compression

**Acceptance Criteria:** 14 ACs covering preset definitions, UI selector, localStorage persistence, compression settings application, toast notifications, and test coverage

**Complexity:** Small (extends WISH-2022 compression logic)

**Effort:** 2 points

**Priority:** P2 (UX enhancement for Phase 4)

### Source

Follow-up from QA Elaboration of WISH-2022 (Gaps Identified - Finding #2)

**Original Finding:** Compression quality presets - Add user-selectable presets for different use cases (mobile data plans, quality prioritization, slow connections)

**Category:** Gap
**Impact:** Medium (enables user control over quality/size trade-offs)
**Effort:** Low (extends existing compression logic)

---

## WISH-20550: Per-image Preset Selection for Multi-Upload Workflows

**Status:** deferred
**Depends On:** none
**Follow-up From:** WISH-2046
**Phase:** 5 - Future Enhancements

### Scope

Enable users to select compression quality presets on a per-image basis during multi-upload workflows. Extends WISH-2046's global preset selection to allow fine-grained control over individual images based on their content type and quality needs.

**Features:**
- Per-image preset selector UI in multi-upload queue
- Independent preset selection for each image in upload batch
- Default preset from global setting (WISH-2046)
- Per-image "skip compression" checkbox
- Toast notifications showing preset used for each image
- Preserved per-image selections when adding/removing images from queue

**Packages Affected:**
- `apps/web/app-wishlist-gallery/src/components/WishlistForm/` - Per-image preset selector UI
- `apps/web/app-wishlist-gallery/src/hooks/useS3Upload.ts` - Track per-image preset selection
- `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts` - Accept per-image preset parameter

**Acceptance Criteria:** 13 ACs covering per-image preset UI, independent selection, default preset inheritance, state management, toast notifications, skip compression per-image, and test coverage

**Complexity:** Medium (UI redesign for multi-upload workflows + per-image state management)

**Effort:** 3 points

**Priority:** P3 (Phase 5+ enhancement)

### Source

Follow-up from QA Elaboration of WISH-2046 (Gaps Identified - Finding #1)

**Original Finding:** Per-image preset selection - Story non-goal states preset applies globally. Could be future enhancement.

**Category:** Gap
**Impact:** Medium (enables fine-grained compression control for mixed image types)
**Effort:** Medium (requires UI redesign and per-image state management)

**Story File:** _(deleted - deferred)_

---

## WISH-20570: Dynamic Preset Recommendations Based on Upload History

**Status:** deferred
**Depends On:** none
**Follow-up From:** WISH-2046
**Phase:** 5+ - Future Enhancements

### Scope

Implement intelligent preset recommendations based on user upload history and compression preferences to reduce decision fatigue. Analyzes last 20 upload events (file size, preset used, compression ratio) to suggest optimal preset using rule-based logic.

**Features:**
- Upload history tracking in localStorage (last 20 events)
- Rule-based recommendation logic: frequent usage (80%+ same preset), large files (avg > 3MB), quality preference (low compression ratio)
- "Recommended for you" badge in preset selector UI
- Recommendation updates after each upload
- Client-side only (no server-side tracking)
- FIFO eviction for upload history (capped at 20 events)

**Packages Affected:**
- `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts` - Recommendation logic
- `apps/web/app-wishlist-gallery/src/utils/uploadAnalytics.ts` - NEW: Upload history tracking
- `apps/web/app-wishlist-gallery/src/components/WishlistForm/` - Recommendation badge UI
- `apps/web/app-wishlist-gallery/src/hooks/useS3Upload.ts` - Log upload events

**Acceptance Criteria:** 15 ACs covering upload history tracking, recommendation rules, UI badge, localStorage persistence, and test coverage

**Complexity:** Medium (requires analytics logic and user preference tracking)

**Effort:** 3 points

**Priority:** P3 (Future enhancement - Phase 5+)

### Source

Follow-up from QA Elaboration of WISH-2046 (Enhancement Opportunities - Finding #1)

**Original Finding:** Dynamic preset recommendations based on usage patterns - Future enhancement (Phase 5+). Out-of-scope for MVP.

**Category:** Enhancement Opportunity
**Impact:** Medium (improves UX by reducing decision fatigue with smart defaults)
**Effort:** Medium (analytics logic + UI)

---

## WISH-2027: Enum Modification Procedure for Wishlist Stores and Currencies

**Status:** completed
**Depends On:** none
**Follow-up From:** WISH-2007
**Phase:** 1 - Foundation

**Feature:** Document and validate safe procedure for evolving PostgreSQL ENUMs in wishlist schema. Provides runbooks for adding/deprecating stores and currencies with rollback strategies.

**Packages Affected:**
- `packages/backend/database-schema/docs/` - Enum evolution documentation

**Goal:** Prevent production issues from enum modification mistakes and enable safe schema evolution

**Risk Notes:** PostgreSQL ENUMs are immutable. ALTER TYPE ... ADD VALUE cannot be rolled back, requires careful staging and documentation.

**Source:** Follow-up from QA Elaboration of WISH-2007 (Finding #2)

**Story File:** `plans/future/wish/ready-for-qa/WISH-2027/WISH-2027.md`

**Elaboration Notes:** PASS - Story is well-structured documentation task with 15 acceptance criteria. All audit checks pass, no MVP blockers identified, scope boundaries clear.

---

## WISH-2057: Schema Evolution Policy and Versioning Strategy

**Status:** ready-to-work
**Depends On:** WISH-2007
**Follow-up From:** WISH-2007
**Phase:** 1 - Foundation

**Feature:** Document comprehensive schema evolution policies, versioning strategy, and procedures for safe database schema modifications across all environments. Establish governance for schema changes and provide runbooks for common scenarios.

**Packages Affected:**
- `packages/backend/database-schema/docs/` - 4 new documentation files (SCHEMA-EVOLUTION-POLICY.md, ENUM-MODIFICATION-RUNBOOK.md, SCHEMA-VERSIONING.md, SCHEMA-CHANGE-SCENARIOS.md)

**Goal:** Document comprehensive schema evolution policies and procedures before any future schema modifications occur to prevent production issues and ensure safe schema evolution.

**Risk Notes:** PostgreSQL enums are immutable and present unique challenges. Without documented strategy, developers may introduce breaking changes or require emergency rollbacks.

**Source:** QA Discovery Notes from WISH-2007 Elaboration (Enhancement Opportunity #6)

**Story File:** `plans/future/wish/ready-to-work/WISH-2057/WISH-2057.md`

**Elaboration Notes:** CONDITIONAL PASS (2026-01-29) - Story is well-structured with clear scope and 20 acceptance criteria. All audit checks pass. One minor issue identified: existing `packages/backend/database-schema/docs/WISHLIST-SCHEMA-EVOLUTION.md` (155 lines) already addresses some schema evolution concerns. Implementation should clarify relationship (replace, extend, or coexist).

**Sizing:** 20 Acceptance Criteria covering policy documentation, enum modification runbooks, versioning strategy, common scenarios, and governance

---

## WISH-20180: CI Job to Validate Schema Changes Against Policy

**Status:** completed
**Depends On:** none
**Follow-up From:** WISH-2057
**Phase:** 2 - Infrastructure

### Scope

Implement automated CI validation of database schema changes against schema evolution policies from WISH-2057. Provide developers with immediate feedback on policy violations during PR submission, reducing manual review burden and preventing policy violations from reaching production.

**Features:**
- GitHub Actions workflow triggered on schema changes
- Validation script for migration naming, breaking changes, and policy compliance
- PR comment with validation results
- CI pass/fail based on violation severity
- Breaking change detection (column/table drops, enum removals, type changes)
- Non-breaking change validation (optional columns, enum additions, indexes)
- Migration journal validation

**Packages Affected:**
- `.github/workflows/` - New CI workflow for schema validation
- `packages/backend/database-schema/scripts/` - Validation script implementation
- `packages/backend/database-schema/docs/` - CI validation documentation

**Acceptance Criteria:** 20 ACs covering CI workflow setup, migration file validation, breaking change detection, non-breaking change validation, and governance documentation

**Complexity:** Medium (CI workflow + SQL parsing + validation logic)

**Effort:** 3 points

**Priority:** P1 (Automated governance for Phase 2)

**Story File:** `plans/future/wish/ready-for-qa/WISH-20180/WISH-20180.md`

### Source

Follow-up from QA Elaboration of WISH-2057 (Follow-up Stories Suggested - Finding #1)

**Original Finding:** "CI job to validate schema changes against policy (automated governance)"

**Category:** Enhancement Opportunity
**Impact:** High (prevents policy violations from reaching production)
**Effort:** Medium (CI workflow + validation script)

---

## WISH-20370: Schema Change Impact Analysis Tool

**Status:** deferred
**Depends On:** none
**Follow-up From:** WISH-20180
**Phase:** 2 - Infrastructure

### Scope

Implement an automated schema change impact analysis tool that identifies affected services, API endpoints, GraphQL queries, and application code when database schema changes are proposed. Integrates with the CI pipeline from WISH-20180 to provide developers with impact reports in PR comments.

**Features:**
- Schema change detection from migration SQL files
- Service impact analysis (backend services, Lambda functions)
- API endpoint impact analysis (GraphQL schema, REST endpoints)
- Frontend impact analysis (GraphQL queries, API client calls, TypeScript types)
- Impact report generation (JSON + markdown formats)
- CI integration with PR comment posting
- Categorized impacts by severity (breaking, warning, informational)

**Packages Affected:**
- `packages/backend/database-schema/scripts/` - Impact analysis script
- `.github/workflows/schema-validation.yml` - CI workflow extension
- `packages/backend/database-schema/docs/` - Impact analysis documentation

**Acceptance Criteria:** 20 ACs covering schema change detection, service impact analysis, API endpoint analysis, frontend impact analysis, report generation, and CI integration

**Complexity:** Medium-High (AST parsing + codebase scanning + impact classification)

**Effort:** 3 points

**Priority:** P1 (Automated impact visibility for Phase 2)

**Story File:** _(deleted - deferred)_

### Source

Follow-up from QA Elaboration of WISH-20180 (Follow-up Stories Suggested - Finding #2)

**Original Finding:** "Schema change impact analysis (service/endpoint impact detection)"

**Category:** Enhancement Opportunity
**Impact:** Medium (helps developers understand downstream consequences)
**Effort:** Medium (AST parsing + codebase scanning)

---

## WISH-20380: Migration Performance Profiling

**Status:** deferred
**Depends On:** WISH-20180
**Follow-up From:** WISH-20180
**Phase:** 2 - Infrastructure

### Scope

Implement migration performance profiling tooling that estimates execution time of schema changes on production-sized datasets. Provide developers with runtime estimates, execution plan analysis, and warnings for long-running migrations during PR review.

**Features:**
- Performance profiling script (`profile-migration.ts`) for isolated migration testing
- Seed data generator for production-scale datasets (configurable sizes)
- CI workflow integration with WISH-20180 schema validation
- Performance reports posted as PR comments with threshold warnings
- EXPLAIN analysis for execution plan inspection
- Lock detection and zero-downtime strategy recommendations

**Packages Affected:**
- `packages/backend/database-schema/scripts/` - Profiling and seed scripts
- `.github/workflows/schema-validation.yml` - CI workflow extension
- `packages/backend/database-schema/docs/` - Performance profiling documentation

**Infrastructure:**
- Isolated test databases with production-scale seed data
- Performance thresholds: 30s (small), 5min (medium), 10min (critical)
- PostgreSQL EXPLAIN analysis for query plan insights

**Benefits:**
- Prevents production incidents from slow migrations
- Enables data-driven decisions on migration strategies
- Provides visibility into migration runtime before deployment
- Identifies table locks and performance risks proactively

**Acceptance Criteria:** 20 ACs covering profiling script, seed data generator, performance reports, CI integration, and documentation

**Complexity:** Medium (profiling script + seed generator + EXPLAIN analysis + CI integration)

**Effort:** Medium (2-3 points)

**Priority:** P2 (Operational enhancement for Phase 2)

**Story File:** _(deleted - deferred)_

### Source

Follow-up from QA Elaboration of WISH-20180 (Enhancement Opportunities - Finding #3)

**Original Finding:** "Migration performance profiling - Estimate migration execution time on production-sized datasets"

**Category:** Enhancement Opportunity
**Impact:** Medium (prevents slow migrations, enables planning)
**Effort:** Medium (test database + seed data + timing + EXPLAIN analysis)

---

## WISH-20390: Visual Schema Diff Tool for PR Reviews

**Status:** deferred
**Depends On:** none
**Follow-up From:** WISH-20180
**Phase:** 2 - Infrastructure

### Scope

Implement a visual schema diff tool that generates graphical representations of database schema changes for PR reviews. Integrates with WISH-20180 CI workflow to automatically post visual diffs as PR comments, improving review velocity and comprehension.

**Features:**
- Schema diff parser extracting table/column/index/constraint changes
- Visual renderer generating Mermaid diagrams showing before/after state
- CI integration embedding visual diffs in PR comments
- Color-coded highlighting (green=added, red=removed, yellow=modified)
- Graceful fallback for unparseable SQL or complex changes

**Packages Affected:**
- `packages/backend/database-schema/scripts/` - Visual diff generator script
- `.github/workflows/schema-validation.yml` - CI workflow extension
- `packages/backend/database-schema/docs/` - Visual diff documentation

**Acceptance Criteria:** 18 ACs covering schema diff parser, visual renderer, CI integration, and documentation

**Complexity:** Low-Medium (SQL parsing + Mermaid rendering + GitHub PR integration)

**Effort:** 2 points

**Priority:** P2 (Developer experience enhancement for schema reviews)

**Story File:** _(deleted - deferred)_

### Source

Follow-up from QA Elaboration of WISH-20180 (Enhancement Opportunities - Finding #4)

**Original Finding:** "Visual schema diff tool - Show table/column changes graphically in PR reviews"

**Category:** Enhancement Opportunity
**Impact:** Medium (improves review velocity and comprehension)
**Effort:** Low (leverages existing parser from WISH-20180, Mermaid.js for rendering)

---

## WISH-20400: Real-time CI Integration for Schema Change Impact Analysis

**Status:** deferred
**Depends On:** WISH-20210
**Follow-up From:** WISH-20210
**Phase:** 3 - Infrastructure

### Scope

Integrate the schema change impact analysis tool (from WISH-20210) into GitHub Actions CI/CD pipelines to automatically analyze schema changes, post impact reports as PR comments, and optionally block high-impact changes pending manual review.

**Features:**
- GitHub Actions workflow triggering on schema file changes
- Automated detection of schema modifications (column/enum/constraint changes)
- Impact report formatting as GitHub-flavored Markdown PR comments
- Threshold enforcement with blocking rules for high-impact/breaking changes
- Multi-change aggregation for PRs modifying multiple tables

**Packages Affected:**
- `.github/workflows/` - New `schema-impact-analysis.yml` workflow
- `scripts/` - Detection, formatting, and threshold enforcement scripts
- `packages/backend/database-schema/` - Reuses existing `pnpm db:impact-analysis` from WISH-20210

**Acceptance Criteria:** 26 ACs covering CI workflow basics, schema change detection, impact report formatting, threshold enforcement, multi-change scenarios, error handling, and documentation

**Complexity:** Medium (GitHub Actions workflow + detection script + formatting + threshold logic)

**Effort:** 3 points

**Priority:** High (automation for schema change workflow)

**Story File:** _(deleted - deferred)_

### Source

Follow-up from QA Elaboration of WISH-20210 (Follow-up Stories Suggested - Finding #1)

**Original Finding:** "Real-time CI integration for schema change impact analysis (automated PR comments, blocking checks)"

**Category:** Enhancement Opportunity
**Impact:** High (automated guardrails for schema evolution)
**Effort:** Medium (CI workflow + detection logic + integration with existing tool)

---

## WISH-20410: Visual Dependency Graph UI for Schema Impact Analysis

**Status:** deferred
**Depends On:** WISH-20210
**Follow-up From:** WISH-20210
**Phase:** 3 - Infrastructure

### Scope

Add an interactive visual dependency graph to the Schema Change Impact Analysis Tool (WISH-20210) that displays table → service → endpoint → component relationships as a hierarchical graph, enabling developers to quickly understand multi-layer impacts from schema changes.

**Features:**
- `--graph` flag for `pnpm db:impact-analysis` command
- Interactive HTML graph with hierarchical layout (table as root node)
- Color-coded node types (Database=cyan, Repository=blue, Service=green, Route=orange, Schema=purple, Component=pink, Test=gray)
- Edge types showing dependency relationships (solid=direct, dashed=type import)
- Interactive features: hover tooltips, click to highlight downstream dependencies, toggle test files, zoom/pan
- Static SVG export option for embedding in documentation

**Output Files:**
- Interactive HTML graph: `impact-reports/{timestamp}-{table}-{operation}-graph.html`
- Static SVG graph (optional): `impact-reports/{timestamp}-{table}-{operation}-graph.svg`

**Packages Affected:**
- `packages/backend/database-schema/scripts/impact-analysis.ts` - Extend CLI with `--graph` flag
- `packages/backend/database-schema/src/analysis/graph-builder.ts` - New dependency graph construction module
- `packages/backend/database-schema/src/renderers/graph-renderer.ts` - New HTML/SVG rendering module
- `packages/backend/database-schema/package.json` - Add vis-network or D3.js dependency

**Technical Implementation:**
- AST analysis enhancement: Track dependency relationships (not just affected files)
- Graph data structure: Nodes (files) + Edges (dependencies)
- Rendering: vis-network for interactive HTML, headless SVG generation
- Self-contained output: Embedded JavaScript/CSS (no external CDN dependencies)

**Acceptance Criteria:** 22 ACs covering CLI integration, graph structure, interactive features, dependency analysis, output quality, test coverage, and documentation

**Complexity:** Medium (graph builder + HTML renderer + AST enhancement)

**Effort:** 3 points

**Priority:** P2 (Developer experience enhancement for schema impact visualization)

**Goal:** Make complex dependency chains immediately clear through visual graph representation, improving developer understanding of schema change impacts.

**Benefits:**
- Quick identification of full impact scope at a glance
- Clear visualization of direct vs indirect dependencies
- Improved communication of impact to stakeholders
- Better understanding of update order (database → backend → frontend)

**Story File:** _(deleted - deferred)_

### Source

Follow-up from QA Elaboration of WISH-20210 (Follow-up Stories Suggested - Finding #2)

**Original Finding:** "Add visual dependency graph UI showing table → service → endpoint relationships"

**Category:** Enhancement Opportunity
**Impact:** Medium (improves developer understanding of complex dependency chains)
**Effort:** Medium (graph construction + interactive rendering + CLI integration)

---

## WISH-20191: Schema Drift Detection Tool - MVP (db:check command)

**Status:** deleted
**Depends On:** WISH-2057
**Split From:** WISH-20190
**Split Part:** 1 of 3
**Phase:** 1 - Foundation

### Scope

Implement core `db:check` command that compares the current database schema against the expected schema from Drizzle migrations, detecting drift and reporting mismatches. This MVP provides the foundational drift detection capabilities without advanced features like auto-remediation or CI/CD integration.

**Features:**
- CLI command `pnpm db:check` with environment flag support (local, staging, production)
- Schema introspection using Drizzle introspection API
- All drift detection categories: missing/extra tables, column mismatches, type differences, constraint differences, enum value differences, index differences
- Human-readable and JSON output modes for CI integration
- Exit code 0 for no drift, exit code 1 for drift detected
- Remediation suggestions in output

**Packages Affected:**
- `packages/backend/database-schema/scripts/check-schema-drift.ts` - Main drift detection script (new)
- `packages/backend/database-schema/src/drift-detector/` - Drift detection utilities (new)
- `packages/backend/database-schema/docs/SCHEMA-DRIFT-DETECTION.md` - Usage documentation (new)
- `packages/backend/database-schema/package.json` - Add `db:check` script

**Acceptance Criteria:** 20 ACs covering core functionality (AC 1-6), output formatting (AC 7-9), enum/constraint detection (AC 10-12), error handling/edge cases (AC 13-16), documentation and testing (AC 17-20)

**Complexity:** Medium (CLI script + Drizzle introspection + schema comparison)

**Effort:** 3 points

**Priority:** P1 (Critical operational tool for Phase 1)

### Source

Split from WISH-20190 during QA Elaboration (scope reduction to MVP).

**Original Parent:** WISH-20190 (Schema Drift Detection Tool)
**Split Reason:** Scope expansion during elaboration (8 new features added). Separated MVP core functionality from advanced features and CI/CD integration.

**Category:** Enhancement Opportunity
**Impact:** High (proactive detection of schema inconsistencies)
**Effort:** Medium (CLI script + introspection + comparison logic)

---

## WISH-20192: Schema Drift Detection - Advanced Features

**Status:** deferred
**Depends On:** WISH-20191
**Split From:** WISH-20190
**Split Part:** 2 of 3
**Phase:** 1 - Foundation

### Scope

Extend the drift detection tool with advanced features: `.driftignore` file support for excluding intentional drift, automated drift remediation to generate migration scripts, verbose mode for debugging, and historical drift tracking for trend analysis.

**Features:**
- `.driftignore` file support to exclude intentional drift (e.g., test tables in staging)
- Automated drift remediation: generate migration scripts to fix detected drift
- Verbose mode: detailed logging of comparison steps for debugging
- Historical drift tracking: store drift detection results over time for trend analysis

**Packages Affected:**
- `packages/backend/database-schema/src/drift-detector/ignore-parser.ts` - .driftignore parser (new)
- `packages/backend/database-schema/src/drift-detector/remediation-generator.ts` - Migration script generator (new)
- `packages/backend/database-schema/src/drift-detector/history-tracker.ts` - Drift history storage (new)
- `packages/backend/database-schema/docs/SCHEMA-DRIFT-DETECTION.md` - Update with advanced features

**Acceptance Criteria:** 4 ACs covering .driftignore support (AC 21), automated remediation (AC 22), verbose mode (AC 23), historical tracking (AC 24)

**Complexity:** Medium (requires migration script generation and persistence layer)

**Effort:** 3 points

**Priority:** P2 (Enhancement of core tool)

**Story File:** _(deleted - deferred)_

### Source

Split from WISH-20190 during QA Elaboration. User decisions from gaps #1, #4 and enhancements #1, #5.

**Original Parent:** WISH-20190 (Schema Drift Detection Tool)
**Split Reason:** Advanced features added during elaboration requiring separate implementation after MVP.

**Category:** Enhancement Opportunity
**Impact:** Medium (improves drift tool usability and automation)
**Effort:** Medium (migration generation + persistence)

---

## WISH-20193: Schema Drift Detection - CI/CD Integration

**Status:** deferred
**Depends On:** WISH-20191, WISH-20192
**Split From:** WISH-20190
**Split Part:** 3 of 3
**Phase:** 2 - Infrastructure

### Scope

Integrate drift detection into CI/CD pipelines with deployment blocking capabilities and configurable drift severity levels. Enables enforcement of schema consistency policies in deployment workflows.

**Features:**
- CI/CD integration: block deployments if drift detected in target environment
- Drift severity levels: classify drift as error/warning/info with configurable thresholds
- GitHub Actions workflow integration examples
- Deployment gate configuration for different environments

**Packages Affected:**
- `packages/backend/database-schema/src/drift-detector/severity-classifier.ts` - Drift severity logic (new)
- `.github/workflows/drift-check.yml` - CI drift detection workflow (new)
- `packages/backend/database-schema/docs/SCHEMA-DRIFT-DETECTION.md` - Update with CI/CD integration

**Acceptance Criteria:** 2 ACs covering CI/CD integration (AC 25) and drift severity levels (AC 26)

**Complexity:** Low (leverages existing drift detection, adds CI integration)

**Effort:** 2 points

**Priority:** P2 (Operational hardening)

**Story File:** _(deleted - deferred)_

### Source

Split from WISH-20190 during QA Elaboration. User decisions from enhancements #2, #6.

**Original Parent:** WISH-20190 (Schema Drift Detection Tool)
**Split Reason:** CI/CD integration requires deployment infrastructure coordination and separate implementation phase.

**Category:** Enhancement Opportunity
**Impact:** Medium (improves deployment safety and consistency)
**Effort:** Low (integration work + configuration)

---

## WISH-2032: Optimistic UI for Form Submission

**Status:** completed
**Depends On:** none
**Follow-up From:** WISH-2002
**Phase:** 4 - UX Polish

### Scope

Implement optimistic UI for wishlist item creation to provide immediate feedback and navigation, with graceful rollback on failure. Shows success toast and navigates to detail page immediately, with rollback if API call fails.

**Features:**
- Immediate success toast on form submit
- Navigate to detail page before API response
- Temporary item in RTK Query cache with optimistic ID
- Detail page loading skeleton for temporary items
- Replace temporary item with real item on API success
- Graceful rollback on API failure with error toast and retry button
- Form state preservation on rollback

**Packages Affected:**
- `apps/web/app-wishlist-gallery/src/pages/AddItemPage.tsx`
- `apps/web/app-wishlist-gallery/src/components/WishlistForm.tsx`
- `packages/core/api-client/src/rtk/wishlist-api.ts`

**Acceptance Criteria:** 10 ACs covering optimistic cache updates, immediate navigation, loading states, error rollback, retry functionality, and form state preservation.

**Complexity:** Medium (RTK Query optimistic updates + navigation state management)

**Effort:** 3 points

**Priority:** P2 (UX enhancement for Phase 4)

**Story File:** `plans/future/wish/ready-for-qa/WISH-2032/WISH-2032.md`

### Source

Follow-up from QA Elaboration of WISH-2002 (Enhancement Opportunity)

**Original Finding:** Optimistic UI for form submission - show success toast and navigate immediately, with rollback if API call fails. Aligns with WISH-2005 patterns.

**Category:** Enhancement Opportunity
**Impact:** High (significantly improves perceived performance and user experience)
**Effort:** Medium (requires careful state management and error recovery)

---

## WISH-2045: HEIC/HEIF Image Format Support

**Status:** ready-to-work
**Depends On:** WISH-2022
**Follow-up From:** WISH-2022
**Phase:** 4 - UX Polish

### Scope

Enable HEIC/HEIF image uploads with automatic conversion to JPEG during the compression workflow. Modern iPhones (iOS 11+) default to HEIC format, which is not supported by browser-image-compression library from WISH-2022.

**Features:**
- HEIC/HEIF file detection by MIME type and file extension
- Automatic HEIC to JPEG conversion using `heic2any` library
- Conversion progress indicator: "Converting HEIC to JPEG... X%"
- Seamless integration with existing compression workflow from WISH-2022
- Fallback to original HEIC upload on conversion failure
- Browser compatibility detection and graceful degradation

**Packages Affected:**
- `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts` - Add HEIC detection and conversion
- `apps/web/app-wishlist-gallery/src/hooks/useS3Upload.ts` - Update upload flow

**Infrastructure:**
- New dependency: `heic2any` npm package (MIT license, 500KB)

**Acceptance Criteria:** 16 ACs covering HEIC detection, conversion workflow, error handling, browser compatibility, progress indicators, filename preservation, test coverage, and documentation.

**Complexity:** Medium (library integration + conversion workflow + error handling)

**Effort:** 3 points

**Priority:** P1 (Blocks iPhone users from compression benefits in WISH-2022)

### Source

Follow-up from QA Elaboration of WISH-2022 (Gap #1)

**Original Finding:** Modern iPhones use HEIC by default; browser-image-compression needs plugin or server fallback for HEIC conversion

**Category:** Gap
**Impact:** High (Modern iPhone users cannot use compression workflow)
**Effort:** Medium (requires additional library integration)

**Story File:** `plans/future/wish/ready-to-work/WISH-2045/WISH-2045.md`

---

## WISH-20530: Server-side HEIC Conversion Fallback

**Status:** deferred
**Depends On:** WISH-2045
**Follow-up From:** WISH-2045
**Phase:** 4 - UX Polish

### Scope

Implement server-side HEIC to JPEG conversion as a fallback when client-side conversion fails, ensuring all users can upload iPhone photos with compression benefits regardless of browser capabilities.

**Features:**
- Detect client-side HEIC conversion failures from WISH-2045
- Upload original HEIC to S3 with fallback metadata
- S3 event triggers Lambda function for server-side conversion
- HEIC to JPEG conversion using `sharp` library (quality 90%)
- Automatic compression to target <1MB file size
- CloudWatch metrics for conversion success/failure rates
- Frontend polling for converted image (30-second timeout)
- Asynchronous processing with user notifications

**Backend Components:**
- New Lambda: `apps/api/lego-api/functions/image-processing/heicConverter.ts`
- S3 event notification configuration
- Dead letter queue for failed conversions
- CloudWatch alarms for conversion failures

**Frontend Components:**
- `apps/web/app-wishlist-gallery/src/hooks/useS3Upload.ts` - Fallback detection and polling
- `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts` - Signal fallback needed

**Infrastructure:**
- Lambda layer for `libheif` native library
- S3 lifecycle policy bucket for original HEIC files
- CloudWatch metrics and alarms

**Acceptance Criteria:** 21 ACs covering client-side failure detection, S3 upload with metadata, Lambda conversion workflow, error handling, frontend polling, toast notifications, CloudWatch metrics, and comprehensive test coverage.

**Complexity:** Medium (Lambda function + S3 events + image processing + frontend polling)

**Effort:** 3 points

**Priority:** P2 (Reliability enhancement for browsers with failed client-side conversion)

**Story File:** _(deleted - deferred)_

### Source

Follow-up from QA Elaboration of WISH-2045

**Original Finding:** Server-side HEIC conversion fallback (if client-side conversion fails in production)

**Category:** Enhancement Opportunity
**Impact:** Medium (Improves reliability for users whose browsers fail client-side HEIC conversion)
**Effort:** Medium (Requires Lambda function integration with image processing library)

---

## WISH-2049: Background Compression for Perceived Performance

**Status:** ready-to-work
**Depends On:** WISH-2022
**Follow-up From:** WISH-2022
**Phase:** 4 - UX Polish

### Scope

Start compressing images immediately when selected (before form is filled), so compression runs in background while user fills form. By the time user submits, compression is already complete, eliminating compression wait time from the critical path.

**Features:**
- Compression starts on image selection (onChange event)
- Background compression using web worker (non-blocking)
- Form remains interactive during compression
- Preview updates when compression completes
- Skip compression step during upload if already complete
- Toast notification when background compression completes
- Cancellation logic for image changes

**Packages Affected:**
- `apps/web/app-wishlist-gallery/src/hooks/useS3Upload.ts`
- `apps/web/app-wishlist-gallery/src/components/WishlistForm/`
- `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts`

**Acceptance Criteria:** 15 ACs covering background compression trigger, web worker integration, compression state management, image change handling, preview updates, toast notifications, E2E test coverage, rapid image change race condition testing, and stale result detection.

**Complexity:** Small-Medium (Refactor compression timing + state management)

**Effort:** 2 points

**Priority:** P2 (UX enhancement for Phase 4)

**Story File:** `plans/future/wish/ready-to-work/WISH-2049/WISH-2049.md`

### Source

Follow-up from QA Elaboration of WISH-2022 (Enhancement Opportunity #2)

**Original Finding:** Background compression - Start compressing image as soon as selected (before form is filled). By the time user submits, compression is already complete. Reduces perceived latency.

**Category:** Enhancement Opportunity
**Impact:** Medium (62% reduction in perceived latency for typical 5MB images)
**Effort:** Low (Minor refactoring of compression timing from WISH-2022)

---

## WISH-2050: Compression Preview Comparison

**Status:** deferred
**Depends On:** WISH-2022
**Follow-up From:** WISH-2022
**Phase:** 5 - UX Polish

### Scope

Provide a visual comparison of original vs. compressed images to help users understand quality trade-offs and build trust in the compression feature. Implements side-by-side or slider comparison UI after compression completes.

**Features:**
- Slider comparison UI showing original (left) vs. compressed (right) images
- File size and dimensions labels for both versions
- Keyboard-accessible slider with arrow key control
- Toggle on/off with "Show comparison" checkbox (localStorage preference)
- Responsive layout: vertical stack on mobile (< 768px)
- Tooltips explaining quality trade-offs

**Packages Affected:**
- `apps/web/app-wishlist-gallery/src/components/ImageComparisonPreview/` (new)
- `apps/web/app-wishlist-gallery/src/components/WishlistForm/index.tsx`
- `apps/web/app-wishlist-gallery/src/pages/AddItemPage.tsx`

**Acceptance Criteria:** 12 ACs covering comparison UI rendering, slider interaction, file size/dimension labels, keyboard accessibility, localStorage preference persistence, responsive layout, and test coverage.

**Complexity:** Medium (Comparison UI + responsive design + preference persistence)

**Effort:** 3 points

**Priority:** P2 (Trust-building UX enhancement for Phase 5)

### Source

Follow-up from QA Elaboration of WISH-2022 (Enhancement Opportunities - Finding #3)

**Original Finding:** Compression preview comparison - Side-by-side or slider comparison of original vs compressed image. Helps users understand quality trade-offs and builds trust in compression feature.

**Category:** Enhancement Opportunity
**Impact:** Medium (improves user understanding and trust in compression)
**Effort:** Medium (dual image preview and comparison UI)

**Note:** Marked out-of-scope during WISH-2022 elaboration due to UI complexity, but documented as follow-up for future consideration.

---

## WISH-2058: Core WebP Conversion

**Status:** deferred
**Depends On:** WISH-2022
**Split From:** WISH-2048
**Phase:** 4 - UX Polish

### Scope

Convert compressed images to WebP format instead of JPEG to achieve 25-35% additional size savings while maintaining acceptable visual quality in modern browsers. Simple configuration change to browser-image-compression library from WISH-2022. This is part 1 of 2 from the WISH-2048 split, focusing on core WebP conversion functionality.

**Features:**
- Change output format from JPEG to WebP in compression settings
- Maintain existing compression quality (0.8) and dimensions (1920px)
- 25-35% smaller file sizes compared to JPEG at equivalent visual quality
- WebP support: Chrome 32+, Firefox 65+, Safari 14+, Edge 18+ (97%+ coverage)

**Packages Affected:**
- `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts` - Update fileType to 'image/webp'

**Benefits:**
- Additional storage cost savings (25-35% beyond WISH-2022's compression)
- Faster page loads with smaller image files
- Better compression efficiency than JPEG
- Already supported by browser-image-compression library

**Acceptance Criteria:** 12 ACs covering WebP conversion, quality settings, file size comparison, toast notifications, filename handling, S3 upload, API storage, and test coverage.

**Complexity:** Small (configuration change only)

**Effort:** Low (2 points)

**Priority:** P2 (Performance enhancement for Phase 4)

**Story File:** `plans/future/wish/ready-to-work/WISH-2058/WISH-2058.md`

### Source

Split from WISH-2048 (WebP Format Conversion) during QA Elaboration. Original story had 14 ACs and overlapping concerns between core conversion and browser fallback logic.

**Original Finding:** WebP format conversion - Convert to WebP instead of JPEG for 25-35% additional size savings; supported by browser-image-compression library (from WISH-2022 QA Elaboration)

**Category:** Enhancement Opportunity
**Impact:** Medium (additional storage and bandwidth savings)
**Effort:** Low (simple configuration change)

---

## WISH-2068: Browser Compatibility & Fallback for WebP

**Status:** deferred
**Depends On:** WISH-2058
**Split From:** WISH-2048
**Phase:** 4 - UX Polish

### Scope

Detect browsers without WebP support (Safari < 14, IE11) and provide graceful fallback to JPEG compression with clear user messaging. This is part 2 of 2 from the WISH-2048 split, focusing on edge case handling for older browsers (< 3% of users).

**Features:**
- Browser compatibility detection using canvas API
- Preventive check: Warn users on unsupported browsers before compression
- Reactive fallback: If WebP compression fails, retry with JPEG
- Distinct toast notifications for WebP success vs JPEG fallback
- Filename extension matches actual output format (.webp or .jpeg)

**Packages Affected:**
- `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts` - Add browser detection
- `apps/web/app-wishlist-gallery/src/utils/browserSupport.ts` - New utility for WebP detection

**Benefits:**
- Graceful degradation for older browsers
- Clear user communication about format selection
- Ensures all users can upload images successfully

**Acceptance Criteria:** 2 ACs covering browser compatibility detection and fallback logic.

**Complexity:** Small (browser detection and error handling)

**Effort:** Low (1 point)

**Priority:** P3 (Edge case handling for < 3% of users)

**Story File:** `plans/future/wish/backlog/WISH-2068/WISH-2068.md`

### Source

Split from WISH-2048 (WebP Format Conversion) during QA Elaboration. Browser compatibility and fallback logic separated from core conversion functionality.

**Category:** Enhancement Opportunity - Edge Case Handling
**Impact:** Low (covers edge case for Safari < 14 and IE11)
**Effort:** Low (browser detection and fallback logic)

---

## WISH-20210: Schema Change Impact Analysis Tool

**Status:** ready-to-work
**Depends On:** WISH-2057
**Follow-up From:** WISH-2057
**Phase:** 3 - Infrastructure

### Scope

Build an automated CLI tool (`pnpm db:impact-analysis`) that analyzes proposed database schema changes and generates comprehensive impact reports identifying all affected services, endpoints, frontend components, and test files across the monorepo.

**Features:**
- CLI tool accepting `--table`, `--enum`, and `--change` flags
- AST-based code analysis using TypeScript Compiler API (ts-morph)
- Analyzes column changes (add, remove, rename, type change)
- Analyzes enum changes (add value, remove value, rename value)
- Generates Markdown impact reports with categorized findings
- Risk assessment (Breaking/Non-breaking, Rollback Safety)
- Actionable recommendations for each affected file

**Analysis Categories:**
- Backend Services (application layer, repositories, routes)
- Zod Schemas (shared validation logic)
- Frontend Components (React components, pages)
- API Hooks (RTK Query definitions)
- Test Files (unit tests, integration tests)

**Packages Affected:**
- `packages/backend/database-schema/scripts/` - New `impact-analysis.ts` CLI tool
- `packages/backend/database-schema/src/` - Drizzle schema introspection utilities

**Infrastructure:**
- Reports stored in `packages/backend/database-schema/impact-reports/`
- Exit code 0 for low-impact changes, code 1 for high-impact (CI integration)

**Benefits:**
- Prevents missed dependencies during schema migrations
- Provides confidence before applying schema changes
- Complements WISH-2057 policies with automated verification
- Reduces manual code review burden

**Acceptance Criteria:** 22 ACs covering CLI tool basics, column/enum analysis, impact report quality, test coverage, and documentation.

**Complexity:** Medium (CLI tool + AST analysis + report generation)

**Effort:** 5 points

**Priority:** P2 (Developer productivity enhancement for Phase 3)

### Source

Follow-up from QA Elaboration of WISH-2057 (Follow-up Stories Suggested - Finding #4)

**Original Finding:** "Schema change impact analysis tool (which services/endpoints affected?)"

**Category:** Enhancement Opportunity
**Impact:** High (prevents missed dependencies and runtime failures)
**Effort:** Medium (CLI tool development + AST parsing)

**Story File:** `plans/future/wish/ready-to-work/WISH-20210/WISH-20210.md`

**Elaboration Report:** `plans/future/wish/ready-to-work/WISH-20210/ELAB-WISH-20210.md`

**Verdict:** CONDITIONAL PASS - Ready for implementation with 3 critical issues to address during kickoff

---

## WISH-20420: Schema Migration Code Generation Tool

**Status:** deferred
**Depends On:** WISH-20210
**Follow-up From:** WISH-20210
**Phase:** 3 - Infrastructure

### Scope

Build an automated CLI tool (`pnpm db:generate-migration`) that consumes schema change impact analysis reports (from WISH-20210) and generates skeleton code modifications for affected files, including Drizzle schema updates, Zod schema changes, service layer boilerplate, and frontend component scaffolding.

**Features:**
- CLI tool accepting `--report` flag pointing to impact analysis Markdown file
- Template-based code generation for common schema change patterns
- Drizzle schema updates (column additions, enum extensions, migrations)
- Zod schema updates (field additions, enum extensions, validation)
- Service layer boilerplate (method signatures, repository mappings)
- Frontend scaffolding (form fields, type imports, display components)
- Test fixture updates (mock data, test assertions)

**Code Generation Capabilities:**
- Adding optional/required columns with defaults
- Adding/renaming enum values
- Generating Drizzle SQL migrations + TypeScript schema updates
- Generating Zod schema field additions with validation
- Generating service layer code with field mappings
- Generating frontend form fields and display components
- Generating test fixture updates

**Generated Output Structure:**
- `generated-migrations/{timestamp}-{table}-{operation}/`
  - `drizzle/` - SQL migrations and schema updates
  - `backend/` - `.patch` files for services, repositories, schemas
  - `frontend/` - `.patch` files for components, hooks
  - `tests/` - `.patch` files for fixtures, mocks
  - `README.md` - Step-by-step application instructions

**Packages Affected:**
- `packages/backend/database-schema/scripts/` - New `generate-migration.ts` CLI tool
- `packages/backend/database-schema/templates/` - Code generation templates
- Reuses `impact-analysis.ts` output from WISH-20210

**Safety Mechanisms:**
- No automatic application (developer must review patches)
- Dry-run mode by default (`--apply` flag required)
- Generated code includes "REVIEW REQUIRED" comments
- TypeScript compilation validation before writing files
- Unified diff `.patch` format for manual application

**Benefits:**
- Reduces manual boilerplate from hours to minutes
- Eliminates repetitive schema migration work
- Provides consistent code patterns across migrations
- Reduces human error in schema change implementation
- Complements WISH-20210 analysis with automated scaffolding

**Acceptance Criteria:** 24 ACs covering CLI basics, Drizzle/Zod generation, service layer boilerplate, frontend scaffolding, test fixture updates, code quality, and documentation.

**Complexity:** Medium (Template system + AST code insertion + patch generation)

**Effort:** 5 points

**Priority:** P2 (Developer productivity enhancement, builds on WISH-20210)

### Source

Follow-up from QA Elaboration of WISH-20210 (Follow-up Stories Suggested - Finding #3)

**Original Finding:** "Build schema migration code generation based on impact analysis output"

**Category:** Enhancement Opportunity
**Impact:** High (reduces manual migration work from hours to minutes)
**Effort:** Medium (code generation templates + AST utilities)

**Story File:** _(deleted - deferred)_

---

## WISH-20500: Schedule Management Dashboard (Core UI)

**Status:** deferred
**Depends On:** WISH-2119
**Blocker:** WISH-2119 not implemented (status: ready-to-work)
**Split From:** WISH-20220
**Phase:** 3 - Infrastructure

### Scope

Provide the foundational dashboard page and RTK Query API integration for schedule management. Implements page scaffolding, view toggle (calendar/timeline), auto-refresh polling, authorization enforcement, and error handling.

**Features:**
- Schedule management dashboard page at `/admin/feature-flags/:flagKey/schedules`
- View toggle between calendar and timeline views (preference saved to localStorage)
- RTK Query endpoints: getSchedules, createSchedule, cancelSchedule
- Auto-refresh polling (60-second interval)
- Authorization enforcement (admin-only access)
- Error handling (404, 403, network errors)

**Packages Affected:**
- `apps/web/admin-dashboard/src/pages/ScheduleManagementPage.tsx` - Main dashboard page (new)
- `packages/core/api-client/src/rtk/feature-flags-api.ts` - RTK Query endpoints (new)

**Acceptance Criteria:** 9 ACs covering dashboard navigation, view toggle, auto-refresh, authorization, error handling, and testing.

**Complexity:** Medium (Core foundation + RTK Query + admin dashboard scaffolding)

**Effort:** 2 points

**Priority:** P1 (Foundation for WISH-20510 and WISH-20520)

### Split Context

This is part 1 of 3 from the split of WISH-20220. Original story had 20 ACs (2.5x over threshold).

**Split Allocation:**
- WISH-20500 (this story): Core Dashboard - 2 points
- WISH-20510: Timeline & Cards - 1 point (depends on this)
- WISH-20520: Calendar View - 2 points (depends on this)

---

## WISH-20510: Schedule Timeline & Cards

**Status:** deferred
**Depends On:** WISH-20500
**Split From:** WISH-20220
**Phase:** 3 - Infrastructure

### Scope

Build the timeline view and schedule card components for the schedule management dashboard. Implements chronological schedule list, expandable schedule cards with status badges, cancel functionality for pending schedules, and countdown timers.

**Features:**
- ScheduleTimeline component (chronological list with past/future separation)
- ScheduleCard component (details, status badges, countdown timers)
- Cancel pending schedule flow (confirmation modal + RTK Query mutation)
- Test fixtures for mock schedule data (mockPendingSchedule, mockAppliedSchedule, mockFailedSchedule)
- Performance optimization (single interval for all countdown timers)

**Packages Affected:**
- `apps/web/admin-dashboard/src/components/ScheduleTimeline/` - Timeline visualization (new)
- `apps/web/admin-dashboard/src/components/ScheduleCard/` - Schedule card (new)
- `apps/web/admin-dashboard/src/hooks/useCountdown.ts` - Countdown timer hook (new)

**Acceptance Criteria:** 6 ACs covering timeline rendering, card rendering, cancel functionality, and testing.

**Complexity:** Low-Medium (Timeline + cards + cancel flow)

**Effort:** 1 point

**Priority:** P2 (Depends on WISH-20500)

### Split Context

This is part 2 of 3 from the split of WISH-20220. Depends on WISH-20500 (core dashboard + RTK Query API).

**Split Allocation:**
- WISH-20500: Core Dashboard - 2 points (prerequisite)
- WISH-20510 (this story): Timeline & Cards - 1 point
- WISH-20520: Calendar View - 2 points (can run in parallel after WISH-20500)

---

## WISH-20520: Schedule Calendar View

**Status:** deferred
**Depends On:** WISH-20500
**Split From:** WISH-20220
**Phase:** 3 - Infrastructure

### Scope

Build the calendar view and schedule creation form for the schedule management dashboard. Implements full month calendar with color-coded schedule markers, schedule creation form with validation, keyboard navigation, and screen reader support.

**Features:**
- ScheduleCalendar component (full month view, color-coded markers)
- CreateScheduleForm modal (date/time picker, validation, submission)
- Click date to pre-fill creation form
- Navigate between months (prev/next buttons)
- Keyboard navigation (arrow keys, Enter, Tab)
- Screen reader support (aria-labels, aria-live regions)
- Focus management (modal trap, restoration)

**Packages Affected:**
- `apps/web/admin-dashboard/src/components/ScheduleCalendar/` - Calendar view (new)
- `apps/web/admin-dashboard/src/components/CreateScheduleForm/` - Schedule form (new)
- `packages/core/app-component-library/_primitives/Slider/` - Radix UI slider (new)

**New Dependencies:**
- `react-calendar` (~15 KB, better a11y)
- `react-datepicker` (~20 KB)
- `date-fns` (tree-shakable date formatting)
- `@radix-ui/react-slider` (rollout percentage slider)

**Acceptance Criteria:** 8 ACs covering calendar rendering, form validation, form submission, keyboard navigation, screen reader support, focus management, and testing.

**Complexity:** Medium (Calendar + form + a11y + new libraries)

**Effort:** 2 points

**Priority:** P2 (Depends on WISH-20500)

### Split Context

This is part 3 of 3 from the split of WISH-20220. Depends on WISH-20500 (core dashboard + RTK Query API).

**Split Allocation:**
- WISH-20500: Core Dashboard - 2 points (prerequisite)
- WISH-20510: Timeline & Cards - 1 point (can run in parallel after WISH-20500)
- WISH-20520 (this story): Calendar View - 2 points

---

## WISH-20540: HEIC Telemetry Tracking for Conversion Success/Failure Rates

**Status:** deferred
**Depends On:** WISH-2045
**Follow-up From:** WISH-2045
**Phase:** 4 - UX Polish

### Scope

Instrument HEIC conversion workflow with telemetry to track success/failure rates, error types, conversion performance, and file characteristics for data-driven optimization. Provides visibility into real-world HEIC conversion reliability from WISH-2045 implementation.

**Features:**
- Telemetry events: HEIC_CONVERSION_STARTED, HEIC_CONVERSION_SUCCESS, HEIC_CONVERSION_FAILED, HEIC_FALLBACK_UPLOAD
- Metrics tracked: success/failure rates, conversion duration, file sizes, error type distribution
- Error categorization: BROWSER_INCOMPATIBLE, TIMEOUT, MEMORY_ERROR, CORRUPTED_FILE, UNKNOWN_ERROR
- PII sanitization for error messages and filenames
- Structured logging via @repo/logger
- Fire-and-forget telemetry (non-blocking)

**Packages Affected:**
- `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts` - HEIC conversion telemetry
- `apps/web/app-wishlist-gallery/src/hooks/useS3Upload.ts` - Upload workflow telemetry

**Acceptance Criteria:** 17 ACs covering telemetry events, metrics tracking, error categorization, PII sanitization, test coverage, and documentation.

**Complexity:** Small (Straightforward telemetry instrumentation)

**Effort:** 2 points

**Priority:** P2 (Data collection for future HEIC optimization)

### Source

Follow-up from QA Elaboration of WISH-2045 (Follow-up Story Suggested #2)

**Original Finding:** Consider adding telemetry to track HEIC conversion success/failure rates for future optimization

**Category:** Enhancement Opportunity
**Impact:** Medium (Provides data-driven insights for improving HEIC conversion reliability)
**Effort:** Low (Straightforward telemetry instrumentation)

**Story File:** _(deleted - deferred)_

---

## WISH-20230: Recurring schedules (cron-like syntax for automated recurring flag updates)

**Status:** deferred
**Depends On:** WISH-2119
**Follow-up From:** WISH-2119
**Phase:** 4 - Infrastructure

### Scope

Extend WISH-2119's one-time flag scheduling with cron-like recurring schedules for automated periodic flag updates. Enables weekly A/B tests, seasonal features, maintenance windows, and business hours restrictions without manual intervention.

**Features:**
- Cron expression syntax for recurring schedules (standard 5-field format)
- Automatic next execution calculation using `cron-parser` library
- Recurring schedule creation, listing, and cancellation via admin endpoints
- Extended cron job to process recurring schedules and recalculate nextExecutionAt
- Database columns: `recurrence` (cron expression), `nextExecutionAt` (next execution timestamp)

**Endpoints:**
- `POST /api/admin/flags/:flagKey/schedule` - Add optional `recurrence` field with cron expression
- `GET /api/admin/flags/:flagKey/schedule` - Include `recurrence`, `nextExecutionAt` in response
- `DELETE /api/admin/flags/:flagKey/schedule/:scheduleId` - Cancel recurring schedule (stops future executions)

**Packages Affected:**
- `apps/api/lego-api/domains/config/` - Extend schedule service and repository
- `apps/api/lego-api/jobs/process-flag-schedules.ts` - Generate next execution for recurring schedules
- `packages/backend/database-schema/` - Add `recurrence`, `nextExecutionAt` columns to feature_flag_schedules table
- `packages/core/api-client/src/schemas/feature-flags.ts` - Add RecurringScheduleSchema

**Infrastructure:**
- Database migration: Add `recurrence` (VARCHAR 100), `nextExecutionAt` (TIMESTAMP WITH TIME ZONE) columns
- npm dependency: `cron-parser` library (MIT license)
- Index on `nextExecutionAt` for fast cron job queries

**Use Cases:**
- Weekly A/B tests (auto-enable every Monday 9am, auto-disable Friday 5pm)
- Seasonal features (auto-enable winter theme Dec 1-Feb 28 every year)
- Maintenance windows (auto-disable features every Sunday 2am-4am)
- Business hours restrictions (auto-enable features Monday-Friday 9am-5pm only)
- Monthly promotions (auto-enable discount features on 1st day of each month)

**Acceptance Criteria:** 16 ACs covering cron expression validation, recurring schedule creation, next execution calculation, cron job processing, cancellation, and testing

**Complexity:** Medium (cron expression parsing + recurring schedule generation + next execution calculation)

**Effort:** 5 points

**Priority:** P2 (Infrastructure enhancement for Phase 4)

### Source

Follow-up from QA Elaboration of WISH-2119 (Enhancement Opportunity #1)

**Original Finding:** "Recurring schedules (cron-like syntax) - Deferred to Phase 4+ follow-up story"

**Category:** Enhancement Opportunity
**Impact:** Medium (enables automated recurring flag operations without manual intervention)
**Effort:** Medium (cron expression parsing + recurring schedule generation + next execution calculation)

**Story File:** `plans/future/wish/deferred/WISH-20230/WISH-20230.md`

---
---

## WISH-20240: Schedule preview endpoint (simulate flag state before schedule applies)

**Status:** deferred
**Depends On:** WISH-2119
**Follow-up From:** WISH-2119
**Phase:** 4 - Infrastructure Enhancements

### Scope

Enable admins to preview the exact flag state that will result from a scheduled update before it executes. Read-only endpoint simulates applying pending schedules in chronological order and returns the resulting flag state without modifying flags or schedules.

**Features:**
- GET /api/admin/flags/:flagKey/schedule/preview endpoint (admin only)
- Fetches current flag state and all pending schedules
- Simulates applying schedules in chronological order
- Returns currentState, previewedState, pendingSchedules array, stateChanged boolean
- Handles partial updates (enabled or rolloutPercentage only)
- Read-only operation (no side effects)

**Packages Affected:**
- `apps/api/lego-api/domains/config/` - Add previewSchedules method to schedule service
- `packages/core/api-client/src/schemas/` - Preview response schema

**Use Cases:**
- Verify complex scheduling scenarios before execution
- Identify conflicting schedules that may produce unexpected flag states
- Build admin confidence when scheduling critical flag changes
- Debug scheduling issues without affecting live flags

**Acceptance Criteria:** 12 ACs covering preview endpoint, simulation logic, schema alignment, and testing

**Complexity:** Small (read-only simulation logic)

**Effort:** 2 points

**Priority:** P2 (Admin tooling enhancement for Phase 4)

### Source

Follow-up from QA Elaboration of WISH-2119 (Enhancement Opportunity #2)

**Original Finding:** "Schedule preview endpoint (simulate flag state before schedule applies)"

**Category:** Enhancement Opportunity
**Impact:** Medium (improves admin confidence and reduces configuration errors)
**Effort:** Low (2 points - read-only simulation logic)

---

## WISH-20250: Bulk schedule creation (multiple schedules in single API call)

**Status:** pending
**Depends On:** WISH-2119
**Follow-up From:** WISH-2119
**Phase:** 4 - Infrastructure

### Scope

Enable admins to create multiple flag schedules in a single atomic API call, reducing operational overhead and ensuring consistency for coordinated rollout scenarios.

**Features:**
- Bulk schedule creation endpoint accepting array of schedules
- Atomic transaction processing (all-or-nothing)
- Duplicate time detection within batch
- Maximum batch size: 50 schedules per request
- Batch INSERT for database efficiency

**Endpoints:**
- `POST /api/admin/flags/:flagKey/schedule/bulk` - Create multiple schedules atomically

**Packages Affected:**
- `apps/api/lego-api/domains/config/` - Extend schedule service with bulk creation
- `packages/core/api-client/src/schemas/` - Bulk schedule schemas

**Use Cases:**
- Phased rollouts: Create 5 schedules to gradually increase rollout percentage (0% → 25% → 50% → 75% → 100%)
- Multi-flag coordination: Enable multiple related flags simultaneously
- Time-windowed features: Create enable/disable schedule pairs for temporary features
- Multi-environment rollouts: Schedule same flag changes across dev/staging/production

**Acceptance Criteria:** 10 ACs covering bulk endpoint validation, atomic batch creation, duplicate detection, authorization, schema alignment, and comprehensive test coverage.

**Complexity:** Small (Extension of existing schedule creation endpoint)

**Effort:** 2 points

**Priority:** P2 (Operational efficiency enhancement for Phase 4)

### Source

Follow-up from QA Elaboration of WISH-2119 (Enhancement Opportunity #3)

**Original Finding:** "Bulk schedule creation (multiple schedules in single API call)"

**Category:** Enhancement Opportunity
**Impact:** Medium (Operational efficiency for admins managing complex rollout schedules)
**Effort:** Low (Extension of existing schedule creation endpoint)

**Story File:** `plans/future/wish/backlog/WISH-20250/WISH-20250.md`

---

## WISH-20280: Audit Logging for Flag Schedule Operations

**Status:** backlog
**Depends On:** WISH-2119
**Follow-up From:** WISH-2119
**Phase:** 3 - Infrastructure

### Scope

Add comprehensive audit logging to flag schedule operations (create, cancel) to provide security observability and admin accountability. Integrates WISH-2119 schedule operations into WISH-2019 audit logging infrastructure, tracking which admin performed each action with timestamps and context.

**Features:**
- Audit logging for schedule creation (created_by field)
- Audit logging for schedule cancellation (cancelled_by, cancelled_at fields)
- Audit logging for automatic schedule application (cron job events)
- CloudWatch structured logging with admin context
- Database schema updates for admin tracking

**Database Schema:**
- Add created_by, cancelled_by, cancelled_at columns to feature_flag_schedules table
- Audit event types: flag_schedule.created, flag_schedule.cancelled, flag_schedule.applied, flag_schedule.failed

**Packages Affected:**
- `apps/api/lego-api/domains/config/` - Schedule service and routes updates
- `apps/api/lego-api/core/audit/` - Audit logging integration
- `packages/backend/database-schema/` - Migration for admin tracking columns
- `packages/core/api-client/src/schemas/` - Schema updates for admin fields

**Acceptance Criteria:** 15 ACs covering database schema updates, audit logging integration, service layer updates, API response updates, schema alignment, testing, and documentation.

**Complexity:** Small (extends existing audit patterns from WISH-2019)

**Effort:** 2 points

**Priority:** P1 (Security and compliance requirement for Phase 3)

### Source

Follow-up from QA Elaboration of WISH-2119 (Follow-up Stories Suggested - Finding #7)

**Original Finding:** "Integration with WISH-2019 (audit logging: track which admin created/cancelled schedules)"

**Category:** Enhancement Opportunity
**Impact:** Medium (security observability and admin accountability)
**Effort:** Low (extends existing audit infrastructure)

**Story File:** `plans/future/wish/backlog/WISH-20280/WISH-20280.md`

---

## WISH-20270: Schedule cleanup cron job (retention policy enforcement)

**Status:** backlog
**Depends On:** WISH-2119
**Follow-up From:** WISH-2119
**Phase:** 3 - Infrastructure

### Scope

Implement automated retention policy enforcement for feature flag schedules through a nightly cron job, preventing unbounded table growth while preserving failed schedules for manual review. Enforces WISH-2119's retention policies automatically.

**Features:**
- Nightly cron job (2:00 AM UTC) to delete expired schedules
- Delete applied schedules older than 90 days
- Delete cancelled schedules older than 30 days
- Preserve failed schedules indefinitely for manual review
- CloudWatch metrics for deleted count and execution time
- Structured logging with deletion counts and error handling

**Packages Affected:**
- `apps/api/lego-api/jobs/cleanup-flag-schedules.ts` - Cron job handler (new)
- `apps/api/lego-api/domains/config/adapters/schedule-repository.ts` - deleteExpiredSchedules() method

**Infrastructure:**
- Lambda function triggered by EventBridge (daily cron)
- CloudWatch Metrics: SchedulesDeletedCount, CleanupExecutionTime
- CloudWatch Logs: Deletion audit trail

**Acceptance Criteria:** 13 ACs covering repository deletion logic, cron job implementation, monitoring, testing, and documentation

**Complexity:** Small (cron job + repository method)

**Effort:** 1 point

**Priority:** P2 (Operational housekeeping for Phase 3)

### Source

Follow-up from QA Elaboration of WISH-2119 (Follow-up Stories Suggested - Finding #6)

**Original Finding:** "Schedule cleanup cron job (retention policy enforcement, automatic purging of old schedules)"

**Category:** Enhancement Opportunity
**Impact:** Low (operational housekeeping, prevents unbounded table growth)
**Effort:** Low (1 point - simple cron job reusing existing patterns)

**Story File:** `plans/future/wish/backlog/WISH-20270/WISH-20270.md`

---

## WISH-20310: Global MSW handler cleanup in src/test/setup.ts afterEach hook

**Status:** deleted
**Depends On:** WISH-2120
**Follow-up From:** WISH-2120
**Phase:** 2 - Infrastructure
**Cancellation Reason:** Implementation already exists in production code (lines 22-24 of apps/web/app-wishlist-gallery/src/test/setup.ts). Story cancelled during elaboration as obsolete.

### Scope

Add global MSW handler cleanup in `src/test/setup.ts` afterEach hook to automatically prevent handler leaks across tests, eliminating the need for manual cleanup calls from WISH-2120's `mockS3Upload()` utility.

**Features:**
- Global `afterEach(() => server.resetHandlers())` hook in test setup
- Automatic cleanup runs after each test (even on failure)
- Backward compatible with manual cleanup pattern from WISH-2120
- Prevents handler leaks causing flaky test behavior

**Packages Affected:**
- `apps/web/app-wishlist-gallery/src/test/setup.ts` - Add global afterEach hook
- `apps/web/app-wishlist-gallery/src/test/__tests__/` - Verification tests

**Benefits:**
- Safer tests: Cleanup runs even if test fails
- Less boilerplate: No manual cleanup() calls needed
- Flake reduction: Prevents handler leaks across tests
- Backward compatible: Existing manual cleanup still works

**Acceptance Criteria:** 14 ACs covering global cleanup implementation, verification tests, backward compatibility, and documentation

**Complexity:** Small (single afterEach hook + verification test)

**Effort:** 1 point

**Priority:** P2 (Test reliability enhancement for Phase 2)

### Source

Follow-up from QA Elaboration of WISH-2120 (Enhancement Opportunity #2)

**Original Finding:** "Auto-cleanup in test teardown - Add global MSW handler cleanup in src/test/setup.ts afterEach hook to prevent handler leaks across tests"

**Category:** Enhancement Opportunity
**Impact:** Medium (prevents handler leaks, improves test reliability)
**Effort:** Low (global cleanup hook)

---

## WISH-20350: Cache analytics dashboard (Grafana/Prometheus integration)

**Status:** deferred
**Depends On:** WISH-2124
**Follow-up From:** WISH-2124
**Phase:** 3 - Observability

### Scope

Implement Grafana/Prometheus analytics dashboard for Redis cache observability. Provide centralized, long-term metric storage and advanced visualization for cache performance, capacity planning, and cost optimization.

**Features:**
- Prometheus server deployment (AWS Fargate/EC2) with 90-day metric retention
- CloudWatch Exporter for scraping ElastiCache metrics
- Grafana server deployment with cache performance dashboard
- 6-panel dashboard: cache hit rate, latency P95, connection errors, active connections, memory utilization, network throughput
- Alert configuration for cache degradation (Slack notifications)
- VPN-only access with AWS SSO authentication

**Packages Affected:**
- Infrastructure code (CDK/Terraform) - Prometheus, Grafana, CloudWatch Exporter
- `apps/api/lego-api/core/monitoring/` - CloudWatch metric namespace configuration
- Grafana dashboard JSON: `infrastructure/grafana/dashboards/redis-cache.json`

**Monitoring Components:**
- Prometheus: Metric collection, storage (90-day retention), query engine
- CloudWatch Exporter: Scrapes CloudWatch metrics, exposes Prometheus endpoint
- Grafana: Visualization, dashboards, alerting via Slack

**Benefits:**
- Long-term metric retention (90 days vs. CloudWatch 15 days)
- Advanced analytics and custom dashboards
- Cross-service metric correlation
- Centralized observability for all Redis-backed services
- Proactive alerting for cache performance issues

**Acceptance Criteria:** 10 ACs covering Prometheus deployment, CloudWatch Exporter configuration, Grafana setup, cache performance dashboard (6 panels), alert rules, 90-day retention, IAM permissions, access control, cost monitoring, and dashboard version control.

**Complexity:** Medium (Monitoring Infrastructure + Dashboard + Alerting)

**Effort:** 3 points

**Priority:** P2 (Observability enhancement for production scaling)

**Goal:** Provide production-grade observability for Redis cache infrastructure with long-term trend analysis, custom dashboards, and proactive alerting.

**Risks:**
- CloudWatch API rate limiting (mitigated by 1-minute scrape interval and batching)
- Prometheus storage exhaustion (mitigated by 50 GB EBS, 90-day retention, monitoring)
- Grafana dashboard complexity (mitigated by starting with 6 essential panels)
- Infrastructure cost overruns (mitigated by billing alarms, Fargate spot instances)

### Source

Follow-up from QA Elaboration of WISH-2124 (Enhancement Opportunity #4)

**Original Finding:** "Cache analytics dashboard (Grafana/Prometheus integration)"

**Category:** Enhancement Opportunity
**Impact:** Medium (observability improvement)
**Effort:** Medium (new monitoring infrastructure)

**Story File:** _(deleted - deferred)_

---

## WISH-20330: Cache warming strategy (pre-populate on cold start, CloudWatch triggers)

**Status:** deferred
**Depends On:** WISH-2124
**Follow-up From:** WISH-2124
**Phase:** 2 - Core Infrastructure

### Scope

Implement proactive cache warming for feature flags to eliminate cold start cache misses and maintain consistently high cache hit rates across deployments and Lambda scaling events. Pre-populate frequently accessed flags before user requests arrive.

**Features:**
- CacheWarmer service for proactive flag loading
- Batch Redis operations (pipeline) for efficient warming
- Scheduled warming via EventBridge (hourly triggers)
- Post-deployment warming hook
- Cold start warming strategy (background task)
- Manual admin warming endpoint (`POST /api/admin/cache/warm`)
- CloudWatch metrics for warming observability

**Packages Affected:**
- `apps/api/lego-api/domains/config/application/cache-warmer.ts` - New cache warming service
- `apps/api/lego-api/domains/config/adapters/redis-cache-adapter.ts` - Add `setMany()` batch operation
- `apps/api/lego-api/infrastructure/lambdas/warm-cache-handler.ts` - Scheduled warming Lambda
- EventBridge schedule rule (hourly warming trigger)
- Lambda post-deployment hook

**Endpoints:**
- `POST /api/admin/cache/warm` - Manual warming trigger (admin only)

**Infrastructure:**
- EventBridge schedule: `rate(1 hour)` for periodic warming
- Lambda post-deployment hook: Warm cache before traffic shift
- CloudWatch metrics: `cache_warming_duration`, `cache_warming_flags_count`, `cache_warming_errors`

**Acceptance Criteria:** 12 ACs covering CacheWarmer service, batch Redis pipeline, top flags selection, scheduled/post-deployment/cold-start warming, admin endpoint, metrics, error handling, and performance validation

**Complexity:** Medium (infrastructure orchestration + cache preloading logic)

**Effort:** 3 points

**Priority:** P2 (Performance enhancement for Phase 2)

### Source

Follow-up from QA Elaboration of WISH-2124 (Enhancement Opportunity #2)

**Original Finding:** "Cache warming on deployment - Pre-populating cache on cold start adds complexity. MVP relies on lazy population (cache-on-read)."

**Category:** Enhancement Opportunity
**Impact:** Medium (reduces cold start latency, improves cache hit rates from ~80% to >95%)
**Effort:** Medium (requires infrastructure orchestration)

---

## WISH-20360: Automated Migration Rollback Testing

**Status:** deferred
**Depends On:** none
**Follow-up From:** WISH-20180
**Phase:** 3 - Infrastructure

### Scope

Implement automated CI testing that verifies database migrations can be successfully rolled back. For each migration in a PR, create a temporary test database, apply the migration, execute the rollback, and verify the database returns to the pre-migration state.

**Features:**
- Test database provisioning (Docker container with PostgreSQL)
- Migration apply/rollback cycle testing
- Schema state comparison (pre-migration vs post-rollback)
- Data integrity validation (test data preserved after rollback)
- CI workflow integration (GitHub Actions)
- Rollback SQL requirement enforcement

**Packages Affected:**
- `.github/workflows/` - New CI workflow for rollback testing
- `packages/backend/database-schema/scripts/` - Rollback test script implementation
- `packages/backend/database-schema/docs/` - Rollback testing documentation
- `packages/backend/database-schema/migrations/` - Migration format with rollback SQL

**Testing:**
- Ephemeral PostgreSQL database creation
- Schema comparison (tables, columns, indexes, constraints)
- Data integrity checks (test data preservation)
- CI integration (PR comment generation, pass/fail behavior)

**Acceptance Criteria:** 20 ACs covering test infrastructure setup (5 ACs), rollback execution and verification (5 ACs), data integrity validation (3 ACs), CI workflow integration (4 ACs), and documentation (3 ACs)

**Complexity:** Medium (test infrastructure + schema comparison + CI integration)

**Effort:** 3 points

**Priority:** P2 (Migration safety enhancement for production deployments)

**Goal:** Catch irreversible migrations before production deployment by automatically testing rollback procedures in CI.

**Risks:**
- Test database provisioning complexity (mitigated by GitHub Actions service containers)
- Schema comparison false positives (mitigated by normalized schema representations)
- Slow CI execution (mitigated by test optimization, 60s timeout target)

### Source

Follow-up from QA Elaboration of WISH-20180 (Enhancement Opportunity #1)

**Original Finding:** "Automated migration rollback testing (test database creation and rollback verification)"

**Category:** Enhancement Opportunity
**Impact:** High (prevents irreversible migrations, reduces rollback risk)
**Effort:** Medium (test infrastructure + schema comparison)

**Story File:** _(deleted - deferred)_

---

## WISH-20560: Real-time Compression Preview Before Upload

**Status:** deferred
**Depends On:** none
**Follow-up From:** WISH-2046
**Phase:** 5 - UX Polish

### Scope

Add real-time compression preview that shows users the exact compressed image and file size before upload, enabling informed preset selection decisions. Addresses the limitation of approximate estimates in WISH-2046 by showing actual compression results.

**Features:**
- Real-time preview component with before/after image comparison
- Side-by-side comparison layout (desktop) or stacked layout (mobile)
- Shows original vs compressed image with actual file size labels
- Preview automatically re-compresses when user changes preset
- Web Worker compression to avoid blocking UI thread
- "Use this compression" confirmation button to proceed with upload
- Caches compressed blob for reuse during actual upload

**UI/UX:**
- Preview appears after image selection, before form submission
- Each preview pane shows image label and file size with percentage reduction
- Loading spinner during re-compression (target < 1 second)
- Handles edge cases: compression failure, small images, skip compression checkbox
- Keyboard accessible with proper ARIA labels

**Packages Affected:**
- `apps/web/app-wishlist-gallery/src/components/CompressionPreview/` - Preview component (new)
- `apps/web/app-wishlist-gallery/src/hooks/useCompressionPreview.ts` - Preview hook (new)
- `apps/web/app-wishlist-gallery/src/components/WishlistForm/` - Integration
- `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts` - Reuse compression logic

**Acceptance Criteria:** 24 ACs covering core preview functionality (6 ACs), preset integration (5 ACs), UI/UX requirements (7 ACs), performance optimization (5 ACs), edge cases (4 ACs), and testing/documentation (5 ACs)

**Complexity:** High (dual image preview, Web Worker integration, real-time re-compression)

**Effort:** 5 points

**Priority:** P3 (Phase 5+ enhancement, validates need after WISH-2046 adoption)

### Source

Follow-up from QA Elaboration of WISH-2046 (Enhancement Opportunities - Finding #3)

**Original Finding:** "Real-time compression preview before upload - Future enhancement. Would improve decision-making but is high-effort."

**Category:** Enhancement Opportunity
**Impact:** High (significantly improves user understanding and confidence in compression decisions)
**Effort:** High (dual image preview, on-the-fly compression, comparison UI)

---

## WISH-20580: Compression Telemetry per Preset

**Status:** deferred
**Depends On:** WISH-2023
**Follow-up From:** WISH-2046
**Phase:** 5 - Future Enhancements

### Scope

Track compression telemetry metrics per preset to enable data-driven analysis of preset usage and effectiveness from WISH-2046. Integrates with WISH-2023 telemetry infrastructure to track which presets are most frequently used, compression ratios per preset, and user satisfaction.

**Features:**
- Compression telemetry events include `preset` field with preset name
- Track original size, compressed size, compression ratio per preset
- Track compression duration and success/failure per preset
- Track preset selection changes and compression skip events
- Track auto-skip and fallback events per preset
- Integration with existing WISH-2023 telemetry infrastructure

**Packages Affected:**
- `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts` - Emit telemetry with preset metadata
- `apps/web/app-wishlist-gallery/src/hooks/useS3Upload.ts` - Track preset selection in upload flow

**Acceptance Criteria:** 12 ACs covering telemetry event schema, preset metadata tracking, success/failure/skip/fallback tracking, integration with WISH-2023, test coverage, and documentation

**Complexity:** Small (extends existing telemetry infrastructure)

**Effort:** 2 points

**Priority:** P3 (Data collection for future preset optimization)

### Source

Follow-up from QA Elaboration of WISH-2046 (Enhancement Opportunity #4)

**Original Finding:** Compression telemetry per preset - Could integrate with WISH-2023 telemetry tracking

**Category:** Enhancement Opportunity
**Impact:** Medium (Provides data-driven insights into preset usage and compression effectiveness)
**Effort:** Low (Extends existing WISH-2023 telemetry infrastructure with preset-specific metrics)

**Story File:** _(deleted - deferred)_

---

## WISH-20590: Migrate Accessibility Hooks to @repo/accessibility

**Status:** deferred
**Depends On:** WISH-2006
**Follow-up From:** WISH-2006
**Phase:** 5 - Future Enhancements

### Scope

Migrate proven accessibility hooks (useRovingTabIndex, useKeyboardShortcuts, useAnnouncer) from app-wishlist-gallery to shared @repo/accessibility package for reuse across all React apps. Enables consistent accessibility patterns across the platform and reduces code duplication.

**Features:**
- Move useRovingTabIndex, useKeyboardShortcuts, useAnnouncer from app-local to shared package
- Export all three hooks from @repo/accessibility barrel export
- Update app-wishlist-gallery imports to use shared package
- Migrate unit tests to shared package location
- Add TSDoc documentation and usage examples for each hook
- Update @repo/accessibility README with new exports

**Packages Affected:**
- `packages/core/accessibility` - Add three new hook exports with documentation
- `apps/web/app-wishlist-gallery` - Update imports to use @repo/accessibility

**Acceptance Criteria:** 7 ACs covering file migration, barrel exports, import updates, test migration, documentation, no breaking changes, and regression testing

**Complexity:** Small (straightforward refactor with zero user-facing impact)

**Effort:** 3 points

**Priority:** P3 (Improves developer experience and code reuse)

### Source

Follow-up from QA Elaboration of WISH-2006 (Enhancement Opportunity #1)

**Original Finding:** Migrate accessibility hooks to @repo/accessibility package once proven in production

**Category:** Enhancement Opportunity
**Impact:** Medium (Enables reuse of accessibility patterns across multiple apps)
**Effort:** Low (Straightforward migration of proven utilities to shared package)

**Story File:** _(deleted - deferred)_

---

## WISH-20600: WCAG AAA Compliance for Wishlist Gallery

**Status:** deferred
**Depends On:** WISH-2006
**Follow-up From:** WISH-2006
**Phase:** 5 - Accessibility

### Scope

Enhance the wishlist gallery with configurable WCAG AAA compliance mode, providing 7:1 contrast ratios for all text and UI elements. Currently, WISH-2006 implements WCAG AA standards (4.5:1 contrast). This story adds optional AAA mode for enterprise customers or government organizations requiring stricter compliance without compromising existing AA implementation.

**Features:**
- AAA color variants with 7:1 contrast for normal text, 4.5:1 for large text
- Configuration via `WCAG_MODE` environment variable (AA or AAA)
- Runtime configuration hooks (`useWcagMode`, `useContrastColors`)
- axe-core AAA compliance validation
- No breaking changes to existing WCAG AA mode

**Packages Affected:**
- `apps/web/app-wishlist-gallery` - Add AAA color variants and configuration
- `packages/core/design-system` - Add AAA-compliant color tokens (if needed)

**Acceptance Criteria:** 14 ACs covering AAA contrast ratios, configuration, design system compliance, and testing

**Complexity:** Medium (color palette extension with configuration layer)

**Effort:** 3 points

**Priority:** P3 (Enhancement for enterprise/government compliance requirements)

### Source

Follow-up from QA Elaboration of WISH-2006 (Enhancement Opportunity #3)

**Original Finding:** Add WCAG AAA compliance (7:1 contrast) if required by enterprise customers

**Category:** Enhancement Opportunity
**Impact:** Medium (Enables enterprise/government compliance, benefits users with low vision)
**Effort:** Medium (Requires color palette audit and AAA variant creation)

**Story File:** _(deleted - deferred)_

---


## WISH-20610: Automated Screen Reader Testing with @guidepup

**Status:** deferred
**Depends On:** WISH-2006
**Follow-up From:** WISH-2006
**Phase:** 5 - Accessibility

### Scope

Add automated screen reader testing using @guidepup to verify accessibility announcements, ARIA labels, and keyboard navigation work correctly with real screen readers (VoiceOver on macOS, NVDA on Windows). Builds on WISH-2006 manual testing by adding automated regression coverage for screen reader UX.

**Features:**
- Automated VoiceOver tests on macOS (via @guidepup)
- Automated NVDA tests on Windows (via @guidepup)
- CI/CD integration with macOS and Windows runners
- Test coverage for all announcements from WISH-2006 (gallery navigation, priority changes, item deletion, modal interactions)
- Reusable test helpers for screen reader assertions

**Packages Affected:**
- `apps/web/app-wishlist-gallery/e2e/screen-reader.spec.ts` - New test suite
- `.github/workflows/ci.yml` - Add macOS/Windows runners

**Acceptance Criteria:** 16 ACs covering VoiceOver/NVDA test coverage, CI integration, test maintainability, and regression detection

**Complexity:** Medium (requires screen reader automation and CI runner setup)

**Effort:** 3 points

**Priority:** P2 (Improves accessibility test coverage and regression detection)

### Source

Follow-up from QA Elaboration of WISH-2006 (Enhancement Opportunity #4)

**Original Finding:** "Automated screen reader testing (@guidepup) - Manual testing sufficient for MVP. Consider once @guidepup library matures."

**Category:** Enhancement Opportunity
**Impact:** Medium (Catches screen reader regressions in CI, improves accessibility test coverage)
**Effort:** Medium (Requires @guidepup integration and CI runner configuration)

**Story File:** _(deleted - deferred)_

---

## SETS-MVP-001: Unified Schema Extension

**Status:** ready-to-work
**Depends On:** WISH-2000
**Phase:** 1 - Foundation
**Story Prefix:** SETS-MVP

### Scope

Extend the existing wishlist schema to support owned items, enabling a single unified data model for both wishlist and collection. Adds status field and owned-specific columns to the existing `wishlist_items` table.

**Feature:** Add status field with enum constraint ('wishlist' | 'owned'), purchase tracking fields (purchaseDate, purchasePrice, purchaseTax, purchaseShipping), build status enum, and composite index for collection queries.

**Goal:** Enable tracking of owned LEGO sets alongside wishlists using the unified data model approach.

**Dependencies:** WISH-2000 (Database Schema & Types must be completed first)

**Acceptance Criteria:** 23 ACs covering:
- Schema changes (AC1-8): status, purchaseDate, purchasePrice, purchaseTax, purchaseShipping, buildStatus, statusChangedAt, composite index
- Zod schema updates (AC9-13): ItemStatusSchema, BuildStatusSchema, UserSetSchema, MarkAsPurchasedSchema, UpdateBuildStatusSchema
- Service layer changes (AC21-23): service methods for status filtering, default filter behavior, integration tests
- Migration (AC14-16): reversible migration, default values, backward compatibility
- Tests (AC17-20): schema validation, default values, null field handling, query compatibility

**Risk Notes:** Migration must be backward compatible with no downtime. Service layer must implement default filter behavior for backward compatibility.

**Story File:** `plans/future/wish/elaboration/SETS-MVP-001/SETS-MVP-001.md`

---

## SETS-MVP-002: Collection View

**Status:** ready-to-work
**Depends On:** SETS-MVP-001, WISH-2001
**Phase:** 2 - MVP Feature
**Story Prefix:** SETS-MVP

### Scope

Create a collection view that shows owned items using the same gallery infrastructure as the wishlist, filtered by `status = 'owned'`. Reuses existing WishlistGallery components with a simple status filter, avoiding the need to build a separate Sets feature from scratch.

**Feature:** Collection page at `/collection` showing owned items in the same gallery layout as wishlist, with collection-specific display (build status badge, purchase date, no priority/drag-drop).

**Goal:** Enable users to view their collection of owned LEGO sets with build status and purchase information.

**Dependencies:** SETS-MVP-001 (Unified Schema Extension must be completed first), WISH-2001 (Gallery MVP must be completed first)

**Acceptance Criteria:** 21 ACs covering:
- Route & Navigation (AC1-3): /collection route, navigation link, page title
- Gallery Display (AC4-8): WishlistGallery reuse with status filter, build status badge, purchase date, no priority, no drag-drop
- API Integration (AC9-11, AC16-17): status filtering, default sort, existing filter support, service layer, route changes
- Empty State (AC12-13): empty collection message, CTA to wishlist
- Component Wiring (AC18): CollectionPage wiring specification
- Testing (AC19-20): HTTP test file, Playwright E2E tests
- Stories & Index (AC21): stories.index.md entry

**Risk Notes:** Low risk; primarily configuration of existing components. Build status badge is new UI element.

**Story File:** `plans/future/wish/elaboration/SETS-MVP-002/SETS-MVP-002.md`

---

## SETS-MVP-004: Build Status Toggle

**Status:** ready-to-work
**Depends On:** SETS-MVP-002
**Phase:** 2 - MVP Feature
**Story Prefix:** SETS-MVP

### Scope

Allow users to toggle the build status of owned items between "In Pieces" and "Built" with optimistic updates and visual feedback. Simple toggle component on collection cards and detail view with satisfying UX.

**Feature:** Toggle component on collection cards and detail view that switches build status with optimistic UI updates, optional celebration animation, and undo support.

**Goal:** Enable users to track and update the build status of their owned LEGO sets with visual feedback.

**Dependencies:** SETS-MVP-002 (Collection View must be completed first)

**Acceptance Criteria:** 32 ACs covering:
- Toggle Component (AC1-5): BuildStatusToggle component, current state display, distinct visual states
- Interaction (AC6-8): click toggle, keyboard accessible, ARIA attributes
- API Integration (AC9-11): PATCH endpoint, validation, error handling
- Optimistic Updates (AC12-14): immediate UI update, error revert, error toast
- Celebration (AC15-17): optional celebration animation, subtle design, prefers-reduced-motion
- Undo Support (AC18-20): toast with undo action, revert on undo
- Backend Service Layer (AC21-22): updateBuildStatus service method with validation
- Routes & Adapters (AC23-24): PATCH route handler with thin adapter pattern
- Error Handling (AC25): explicit error code and message format
- Zod Schema (AC26): UpdateWishlistItemInputSchema update
- Backend Testing (AC27): .http test file with core scenarios
- Optimistic Update Pattern (AC28): React Query useMutation implementation
- Motion Preferences (AC29): prefers-reduced-motion support
- Toast Timing (AC30): 5000ms success, 7000ms error
- Network Retry (AC31): no auto-retry, immediate revert
- Concurrent Prevention (AC32): button disable during request

**Risk Notes:** Low complexity; simple toggle with standard patterns. Celebration animation is nice-to-have, can be deferred. All architecture gaps addressed.

**Elaboration Report:** `plans/future/wish/ready-to-work/SETS-MVP-004/ELAB-SETS-MVP-004.md`

**Story File:** `plans/future/wish/ready-to-work/SETS-MVP-004/SETS-MVP-004.md`

---

## SETS-MVP-0360: Build History and Date Tracking

**Status:** pending
**Depends On:** SETS-MVP-004
**Follow-up From:** SETS-MVP-004
**Phase:** 2 - MVP Feature
**Story Prefix:** SETS-MVP

### Scope

Track and display build completion dates and maintain a history of build status changes over time. Extends SETS-MVP-004 (Build Status Toggle) to add temporal context for when items were marked as built.

**Feature:** Database schema additions for `build_completed_at` timestamp and `wishlist_item_build_history` table, backend service updates to track status changes, and frontend components to display "Built on [date]" badges and optional build history timeline.

**Goal:** Enable users to see when they marked items as built and maintain a history of build status changes over time, providing timeline context for their collection.

**Dependencies:** SETS-MVP-004 (Build Status Toggle must be completed first)

**Acceptance Criteria:** 37 ACs covering:
- Database Schema (AC1-7): build_completed_at column, build_history table, indexes, Drizzle/Zod schemas
- Backend Service Layer (AC8-12): updateBuildStatus enhancements, getBuildHistory method, authorization
- API Response Updates (AC13-15): include build_completed_at in responses
- Frontend Display - Build Date Badge (AC16-19): date badge on cards, formatting, positioning
- Frontend Display - Item Detail (AC20-22): date display in detail view, relative time
- Build History Timeline (AC23-27): collapsible history section, chronological list, empty state
- Backend Testing (AC28-29): .http tests, unit tests for history retrieval
- Migration & Rollback (AC30-32): safe migration, rollback script, null initial values
- Type Safety (AC33-35): TypeScript types, Zod schemas
- Accessibility (AC36-37): ARIA labels, keyboard navigation

**Risk Notes:** Medium complexity; requires database migration and careful timestamp handling. Build history timeline is optional for MVP. All schema changes are additive (no data loss risk).

**Source:** Follow-up from QA Elaboration of SETS-MVP-004 (Finding #2: "Build history and date tracking")

**Story File:** `plans/future/wish/backlog/SETS-MVP-0360/SETS-MVP-0360.md`

---

## SETS-MVP-0310: Status Update Flow

**Status:** backlog
**Depends On:** SETS-MVP-001
**Split From:** SETS-MVP-003
**Phase:** 2 - MVP Feature
**Story Prefix:** SETS-MVP

### Scope

Core purchase flow using the unified model - update item status to 'owned' with purchase details. Extends the "Got it" modal with a purchase details step and provides a PATCH endpoint to update the item's status and capture purchase information.

**Feature:** Extended "Got it" modal with purchase details form and backend endpoint to update item status to 'owned' with purchase metadata.

**Goal:** Enable users to mark wishlist items as owned while capturing purchase details (price, tax, shipping, purchase date, build status).

**Dependencies:** SETS-MVP-001 (requires unified schema with status, purchaseDate, buildStatus, purchasePrice, purchaseTax, purchaseShipping fields)

**Acceptance Criteria (from parent):**
- AC1-6: Modal flow (confirmation step, purchase details form, optional fields, skip/save buttons, calculated total)
- AC7-10: API changes (PATCH /api/wishlist/:id/purchase endpoint, status update, ownership validation, return updated item)

**Story File:** `plans/future/wish/backlog/SETS-MVP-0310/SETS-MVP-0310.md`

---

## SETS-MVP-0320: Purchase UX Polish

**Status:** backlog
**Depends On:** SETS-MVP-0310
**Split From:** SETS-MVP-003
**Phase:** 2 - MVP Feature
**Story Prefix:** SETS-MVP

### Scope

UX polish for the purchase flow - add success feedback, navigation link, and item removal animation after marking an item as owned.

**Feature:** Success toast with "View in Collection" link and smooth item removal animation from wishlist view.

**Goal:** Provide clear user feedback after purchase and smooth visual transition when items leave the wishlist.

**Dependencies:** SETS-MVP-0310 (requires core purchase flow to be implemented)

**Acceptance Criteria (from parent):**
- AC11-14: Success toast with "Added to your collection!" message, "View in Collection" link in toast, item disappears from wishlist view, animated removal if on wishlist page

**Story File:** `plans/future/wish/backlog/SETS-MVP-0320/SETS-MVP-0320.md`

---

## SETS-MVP-0330: Undo Support

**Status:** backlog
**Depends On:** SETS-MVP-0310
**Split From:** SETS-MVP-003
**Phase:** 2 - MVP Feature
**Story Prefix:** SETS-MVP

### Scope

Undo functionality for purchase operations - provide a 5-second window to revert a purchase action and restore the item to wishlist status.

**Feature:** Undo button in success toast with client-side timer and unpurchase endpoint to revert status changes.

**Goal:** Allow users to quickly undo accidental purchase actions within a 5-second window.

**Dependencies:** SETS-MVP-0310 (requires core purchase flow to be implemented)

**Acceptance Criteria (from parent):**
- AC15-17: Toast includes "Undo" action (5 second window), undo reverts status to 'wishlist' and clears purchase fields, PATCH /api/wishlist/:id/unpurchase endpoint for undo

**Story File:** `plans/future/wish/backlog/SETS-MVP-0330/SETS-MVP-0330.md`

---

## SETS-MVP-0340: Form Validation

**Status:** backlog
**Depends On:** SETS-MVP-0310
**Split From:** SETS-MVP-003
**Phase:** 2 - MVP Feature
**Story Prefix:** SETS-MVP

### Scope

Form validation and accessibility polish for the purchase details form - ensure data integrity and keyboard accessibility.

**Feature:** Client-side validation for price fields and purchase dates, plus full keyboard navigation support.

**Goal:** Ensure purchase data is valid and the form is fully accessible via keyboard.

**Dependencies:** SETS-MVP-0310 (requires core purchase flow to be implemented)

**Acceptance Criteria (from parent):**
- AC18-20: Price fields accept valid decimals only (0.00 - 999999.99), purchase date cannot be in the future, form is keyboard accessible (tab order, enter to submit)

**Story File:** `plans/future/wish/backlog/SETS-MVP-0340/SETS-MVP-0340.md`

---

## SETS-MVP-0350: Batch Build Status Updates

**Status:** pending
**Depends On:** SETS-MVP-004
**Follow-up From:** SETS-MVP-004
**Phase:** 2 - MVP Feature
**Story Prefix:** SETS-MVP

### Scope

Enable batch build status updates allowing users to mark multiple collection items as built or in pieces simultaneously, with progress feedback, error handling, and undo support.

**Feature:** Multi-select UI for collection items, batch API endpoint for updating multiple items at once, progress indicator for batch operations, partial failure handling with detailed error reporting, and undo support for batch operations.

**Goal:** Improve UX efficiency for users managing large collections by enabling batch operations instead of updating items one at a time.

**Dependencies:** SETS-MVP-004 (Build Status Toggle - requires buildStatus field and single-item toggle functionality)

**Source:** Follow-up from QA Elaboration of SETS-MVP-004 - Finding #1: "Batch build status updates (mark multiple items as built in one action)"

**Acceptance Criteria:** 49 ACs covering:
- Multi-select UI (AC1-5): checkboxes, visual feedback, selection count
- Batch Action Toolbar (AC6-10): sticky toolbar, action buttons, keyboard accessibility
- Selection Modes (AC11-14): select mode toggle, keyboard shortcuts
- Batch API Endpoint (AC15-19): PATCH /api/wishlist/batch/build-status, validation, transaction processing
- Progress Feedback (AC20-23): progress indicator, summary toast, partial failure warnings
- Error Handling (AC24-27): complete/partial failure handling, error details, retry support
- Undo Support (AC28-31): undo button, revert functionality, extended toast duration
- Optimistic Updates (AC32-34): immediate UI updates, selective revert on errors
- Backend Service Layer (AC35-37): batchUpdateBuildStatus service method
- Input Validation & Schema (AC38-40): BatchBuildStatusInputSchema with Zod
- Backend Testing (AC41-42): .http test file, unit tests
- Accessibility (AC43-46): ARIA labels, screen reader announcements, focus management
- Performance (AC47-49): 50 item limit, warning for oversized batches, parallel processing

**Risk Notes:** Medium complexity - requires handling partial failures and maintaining consistent state between client and server. Performance considerations for large batches.

**Story File:** `plans/future/wish/backlog/SETS-MVP-0350/SETS-MVP-0350.md`

---

## SETS-MVP-0370: Build Status Analytics

**Status:** pending
**Depends On:** SETS-MVP-004
**Follow-up From:** SETS-MVP-004
**Phase:** 2 - MVP Feature
**Story Prefix:** SETS-MVP

### Scope

Collection-level build status analytics showing completion percentage, built vs in_pieces breakdown, and filtering capabilities.

**Feature:** Stats card displaying collection completion metrics (total owned, total built, percentage complete), visual progress indicator (bar or pie chart), and build status filter to show only built or only unbuilt items.

**Goal:** Help users understand their collection progress at a glance and motivate them to build more sets by showing meaningful statistics.

**Dependencies:** SETS-MVP-004 (Build Status Toggle - requires buildStatus field and toggle functionality)

**Source:** Follow-up from QA Elaboration of SETS-MVP-004 - Enhancement opportunity identified during elaboration

**Acceptance Criteria:**
- Backend stats calculation service method with database aggregation
- GET /api/wishlist/collection/stats endpoint returning completion metrics
- CollectionStatsCard component with total/built/in_pieces counts and percentage
- Visual progress bar or pie chart showing built vs in_pieces ratio
- Build status filter dropdown with URL persistence
- Empty states for no owned items, all built, no built items
- Accessibility compliance (ARIA labels, keyboard navigation)

**Story File:** `plans/future/wish/backlog/SETS-MVP-0370/SETS-MVP-0370.md`

---
