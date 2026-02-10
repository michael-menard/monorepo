---
doc_type: stories_index
title: "WISH Stories Index"
status: active
story_prefix: "WISH"
created_at: "2026-01-25T23:20:00Z"
updated_at: "2026-02-09T00:00:00Z"
---

# WISH Stories Index

All stories in this epic use the `WISH-XXX` naming convention (starting at 2000).

## Progress Summary

| Status | Count |
|--------|-------|
| completed | 12 |
| in-progress | 10 |
| uat | 7 |
| in-qa | 3 |
| ready-for-qa | 0 |
| ready-to-work | 10 |
| pending | 0 |
| deferred | 41 |
| Ready for Review | 2 |
| Approved | 2 |
| Done | 1 |
| elaboration | 1 |
| backlog | 7 |
| Created | 1 |
| deleted | 2 |

---

## Ready to Start

Stories with all dependencies satisfied (can be worked in parallel):

| Story | Feature | Blocked By |
|-------|---------|------------|
| WISH-2000 | Database Schema & Types | — |
| WISH-2119 | Flag scheduling (auto-enable/disable at scheduled times) | — |
| WISH-2124 | Redis infrastructure setup and migration from in-memory cache | — |

---

## WISH-2119: Flag scheduling (auto-enable/disable at scheduled times)

**Status:** blocked (pending E2E tests passing)
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

## WISH-2110: Custom Zod error messages for better form UX

**Status:** in-qa
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

## WISH-2013: File upload security hardening

**Status:** blocked
**Depends On:** none
**Follow-up From:** WISH-2011
**Phase:** 3 - Security

**Feature:** Virus scanning integration for uploaded images, strict file type validation (whitelist), file size limits (max 10MB), S3 security: IAM policy, bucket policy, CORS configuration, presigned URL TTL (15 min).

**Priority:** P0

**Goal:** Secure user file uploads and prevent malicious content

**Risk Notes:** Critical security requirement for WISH-2002. Must include virus scanning and file type validation. Benefits from MSW fixtures and handlers established in WISH-2011.

**Source:** Follow-up from QA Elaboration of WISH-2011 (Finding #1)

**Story File:** `plans/future/wish/in-progress/WISH-2013/WISH-2013.md`

**Elaboration Notes:** CONDITIONAL PASS - Three MVP-critical gaps addressed via additional acceptance criteria (AC18: server-side file size validation), clarified existing criteria (AC5: async virus scanning via S3 event trigger Lambda), and enhanced existing criteria (AC16: structured CloudWatch logging with specific fields).

---

## WISH-20162: Playwright E2E Tests for Image Optimization

**Status:** backlog
**Depends On:** WISH-2016
**Follow-up From:** WISH-2016
**Phase:** 4 - Performance & UX Polish

### Scope

Execute existing Playwright E2E tests (12 BDD scenarios) for image optimization against a running backend with AWS infrastructure. Split from WISH-2016 because E2E tests require S3 triggers, Lambda, and Sharp layer that are not available locally.

**Features:**
- Wire up step definitions for 12 existing BDD scenarios in `wishlist-image-optimization.feature`
- Verify gallery cards use thumbnail variants with `<picture>` element and lazy loading
- Verify WebP source with JPEG fallback
- Verify legacy item fallback behavior
- Verify processing state indicators (pending, failed)
- Verify accessibility (alt text, no empty attributes)

**Packages Affected:**
- `apps/web/playwright/` - Step definitions and test execution

**Acceptance Criteria:** 6 ACs covering E2E execution, gallery card verification, WebP fallback, legacy fallback, processing states, and accessibility.

**Complexity:** Small (feature file already written, needs step definitions and infrastructure)

**Effort:** 1-2 points

**Priority:** P3 (Test coverage - adds browser-level verification for existing feature)

### Source

Split from WISH-2016 during implementation. E2E tests could not execute without AWS infrastructure (S3 triggers, Lambda, Sharp layer).

**Story File:** `plans/future/wish/backlog/WISH-20162/WISH-20162.md`

---

## WISH-20172b: FilterPanel Playwright E2E Tests

**Status:** backlog
**Depends On:** WISH-20172
**Follow-up From:** WISH-20172 (deferred AC14)
**Phase:** 6 - Advanced Features
**Complexity:** Small
**Effort:** 2 points

**Feature:** Playwright E2E tests for FilterPanel covering combined filter + sort flows, clear filters, filter badge count, and empty result sets against live backend.

**Goal:** Complete the deferred AC14 from WISH-20172 with 6 Playwright E2E tests

**Story File:** `plans/future/wish/backlog/WISH-20172b/WISH-20172b.md`

---

## WISH-2022: Client-side Image Compression

**Status:** ready-for-qa
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

## WISH-2032: Optimistic UI for Form Submission

**Status:** in-progress
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

**Story File:** `plans/future/wish/in-progress/WISH-2032/WISH-2032.md`

### Source

Follow-up from QA Elaboration of WISH-2002 (Enhancement Opportunity)

**Original Finding:** Optimistic UI for form submission - show success toast and navigate immediately, with rollback if API call fails. Aligns with WISH-2005 patterns.

**Category:** Enhancement Opportunity
**Impact:** High (significantly improves perceived performance and user experience)
**Effort:** Medium (requires careful state management and error recovery)

---

## WISH-20450: HEIC/HEIF Upload E2E Tests (Playwright + Cucumber)

**Status:** backlog
**Depends On:** WISH-2045
**Follow-up From:** WISH-2045
**Phase:** 4 - UX Polish

### Scope

Write Playwright E2E tests in Cucumber/Gherkin format covering the HEIC upload happy path, conversion failure handling, and browser compatibility fallback. Split from WISH-2045 to keep implementation and E2E testing as separate deliverables.

**Features:**
- Gherkin feature file for HEIC upload scenarios
- Happy path: HEIC detected, converted to JPEG, compressed, uploaded
- Error path: Conversion failure falls back to original HEIC upload
- Skip compression path: HEIC still converted even with "high quality" mode
- Non-HEIC bypass: Regular images skip conversion entirely

**Packages Affected:**
- `apps/web/playwright` - New feature file and step definitions

**Acceptance Criteria:** 8 ACs covering feature file creation, scenario coverage, step definitions, and CI pass.

**Complexity:** Low (tests only, no implementation changes)

**Effort:** 1 point

**Priority:** P2

### Source

Deferred AC from WISH-2045 implementation (E2E tests split out to separate story)

**Story File:** `plans/future/wish/backlog/WISH-20450/WISH-20450.md`

---

## WISH-20490: Background Compression E2E Tests

**Status:** backlog
**Depends On:** WISH-2049
**Follow-up From:** WISH-2049
**Phase:** 4 - UX Polish

### Scope

Execute and validate Playwright E2E tests for WISH-2049 background compression feature. E2E test files (feature file, step definitions, focused Playwright config) were created during WISH-2049 but could not be executed due to broken dev server.

**Features:**
- Fix dev server to enable E2E test execution
- Run 3 E2E scenarios covering happy path, form interactivity, and skip compression
- Fix any E2E test failures discovered during live execution

**Packages Affected:**
- `apps/web/playwright`
- `apps/web/main-app` (dev server fix if needed)

**Acceptance Criteria:** 6 ACs covering dev server startup, BDD generation, and passing all 3 E2E scenarios.

**Complexity:** Small (Tests already written, need execution + potential fixes)

**Effort:** 1 point

**Priority:** P2 (Validates WISH-2049 in live environment)

**Story File:** `plans/future/wish/backlog/WISH-20490/WISH-20490.md`

### Source

Deferred AC from WISH-2049 implementation (E2E tests split out to separate story due to broken dev server)

---

## WISH-2058: Core WebP Conversion

**Status:** in-progress
**Depends On:** none
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

**Story File:** `plans/future/wish/in-progress/WISH-2058/WISH-2058.md`

### Source

Split from WISH-2048 (WebP Format Conversion) during QA Elaboration. Original story had 14 ACs and overlapping concerns between core conversion and browser fallback logic.

**Original Finding:** WebP format conversion - Convert to WebP instead of JPEG for 25-35% additional size savings; supported by browser-image-compression library (from WISH-2022 QA Elaboration)

**Category:** Enhancement Opportunity
**Impact:** Medium (additional storage and bandwidth savings)
**Effort:** Low (simple configuration change)

---

## WISH-20281: Playwright API E2E Tests for Audit Logging Fields

**Status:** backlog
**Depends On:** WISH-20280
**Follow-up From:** WISH-20280
**Phase:** 3 - Infrastructure
**Estimated Points:** 1
**Priority:** P2

### Scope

Add Playwright API E2E tests to verify audit logging fields (createdBy, cancelledBy, cancelledAt) are returned correctly in flag schedule API responses. Extends the existing `flag-scheduling.feature` with scenarios that assert admin tracking fields are populated after schedule creation and cancellation.

**Features:**
- E2E test: Create schedule as admin, verify `createdBy` is present in response
- E2E test: Cancel schedule as admin, verify `cancelledBy` and `cancelledAt` are present in response
- E2E test: List schedules, verify admin tracking fields returned for each schedule
- E2E test: Backward compatibility - existing schedules without admin fields return null/undefined gracefully

**Packages Affected:**
- `apps/web/playwright/features/api/admin/flag-scheduling.feature` - Add audit field scenarios
- `apps/web/playwright/steps/api/flag-scheduling.steps.ts` - Add step definitions for audit field assertions

**Acceptance Criteria:** 4 ACs covering createdBy on create, cancelledBy/cancelledAt on cancel, list response fields, backward compatibility

**Complexity:** Small (1 point, extends existing Playwright feature + steps)

**Category:** Testing (E2E coverage gap from WISH-20280)
**Impact:** Medium (ensures audit fields are verified end-to-end against live API)
**Effort:** Low (extends existing flag-scheduling E2E tests)

**Story File:** `plans/future/wish/backlog/WISH-20281/WISH-20281.md`

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

## WISH-20141: AppSelect Icon & Tooltip Support for Smart Sort Dropdown

**Status:** backlog
**Depends On:** WISH-2014
**Follow-up From:** WISH-2014
**Phase:** 4 - UX Polish

### Scope

Enhance the AppSelect component to support optional icon and tooltip props per option, then wire them into the wishlist smart sorting dropdown. Completes deferred AC8 (icons) and AC9 (tooltips) from WISH-2014.

**Features:**
- Extend `AppSelectOption` with optional `icon` (lucide-react component) and `tooltip` (string) props
- Render icon inline with label in SelectItem
- Wrap option with Tooltip primitive when tooltip text provided
- Wire TrendingDown, Clock, Gem icons into smart sort options
- Add tooltips: "Sort by lowest price per piece", "Sort by oldest release dates", "Discover overlooked valuable sets"

**Packages Affected:**
- `packages/core/app-component-library/src/inputs/AppSelect.tsx` - Extend component
- `apps/web/app-wishlist-gallery/src/pages/main-page.tsx` - Wire icon/tooltip props

**Acceptance Criteria:** 8 ACs covering AppSelect extension, icon rendering, tooltip rendering, backward compatibility, tests, and accessibility.

**Complexity:** Small

**Effort:** 2 points

**Priority:** P3 (UX enhancement - cosmetic improvement to existing feature)

### Source

Deferred from WISH-2014 QA verification (AC8: icons, AC9: tooltips). AppSelect component lacked icon/tooltip support at time of implementation.

**Story File:** `plans/future/wish/backlog/WISH-20141/WISH-20141.md`

---

## WISH-20142: Playwright E2E Tests for Smart Sorting

**Status:** backlog
**Depends On:** WISH-2014
**Follow-up From:** WISH-2014
**Phase:** 4 - UX Polish

### Scope

Add Playwright E2E tests covering the full smart sorting interaction flow in a real browser. Completes deferred AC12 from WISH-2014 which could not be implemented with JSDOM due to Radix UI Select portal/focus limitations.

**Features:**
- Select each smart sort option (Best Value, Expiring Soon, Hidden Gems) via Radix UI dropdown in real browser
- Verify network requests include correct sort parameter
- Verify items re-order in gallery after sort selection
- Verify no console errors during sort interactions
- Keyboard accessibility testing (tab, arrow keys, enter)
- Screenshot evidence and network HAR capture

**Packages Affected:**
- `apps/web/playwright/wishlist/smart-sorting.spec.ts` - New E2E test file

**Acceptance Criteria:** 8 ACs covering sort selection, item ordering verification, console error checks, keyboard accessibility, screenshot evidence, and CI compatibility.

**Complexity:** Small

**Effort:** 2 points

**Priority:** P3 (Test coverage - adds browser-level verification for existing feature)

### Source

Deferred from WISH-2014 QA verification (AC12: Playwright E2E test). JSDOM limitations with Radix UI Select prevented interaction testing in unit tests.

**Story File:** `plans/future/wish/backlog/WISH-20142/WISH-20142.md`

---

## SETS-MVP-0320: Purchase UX Polish

**Status:** ready-for-qa
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

**Story File:** `plans/future/wish/ready-for-qa/SETS-MVP-0320/SETS-MVP-0320.md`

---

## SETS-MVP-0321: Purchase UX Polish - Unit Tests

**Status:** ready-for-qa
**Depends On:** SETS-MVP-0320
**Follow-up From:** SETS-MVP-0320
**Phase:** 2 - MVP Feature
**Story Prefix:** SETS-MVP
**Estimated Points:** 1

### Scope

Unit tests for the purchase UX polish implemented in SETS-MVP-0320. E2E tests split to SETS-MVP-0322.

**Feature:** Unit tests for GotItModal success toast (message content, action button, duration, error handling).

**Goal:** Verify toast behavior and callbacks via unit tests (5 tests, all passing).

**Dependencies:** SETS-MVP-0320 (code implementation must be complete)

**Acceptance Criteria:**
- AC1: Unit tests for GotItModal success toast (message content, action button, navigation callback)
- AC2: Unit tests verify toast duration is 5000ms and includes item title as description

**Story File:** `plans/future/wish/backlog/SETS-MVP-0321/SETS-MVP-0321.md`

---

## SETS-MVP-0322: Purchase UX Polish - E2E Tests

**Status:** backlog
**Depends On:** SETS-MVP-0320, SETS-MVP-0321
**Follow-up From:** SETS-MVP-0321
**Phase:** 2 - MVP Feature
**Story Prefix:** SETS-MVP
**Estimated Points:** 1

### Scope

E2E Playwright tests for purchase UX polish (SETS-MVP-0320). Feature file and step definitions already written, needs live verification.

**Feature:** 4 Playwright scenarios covering success toast, "View in Collection" navigation, item removal, and toast auto-dismiss.

**Goal:** Run and verify E2E tests against live dev server per ADR-006.

**Dependencies:** SETS-MVP-0320 (code), SETS-MVP-0321 (unit tests)

**Acceptance Criteria:**
- AC1: E2E test: user purchases item, success toast appears with "Added to your collection!"
- AC2: E2E test: user clicks "View in Collection" in toast, navigates to /collection page
- AC3: E2E test: item disappears from wishlist view after purchase
- AC4: E2E test: toast auto-dismisses after timeout
- AC5: All tests run in live mode (not mocked) per ADR-006
- AC6: All 4 Playwright scenarios pass against live dev server

**Story File:** `plans/future/wish/backlog/SETS-MVP-0322/SETS-MVP-0322.md`

---

## SETS-MVP-0330: Undo Support for Purchase Actions

**Status:** ready-to-work
**Depends On:** SETS-MVP-0310 (UAT)
**Split From:** SETS-MVP-003
**Phase:** 2 - MVP Feature
**Story Prefix:** SETS-MVP
**Estimated Points:** 1
**Experiment Variant:** control
**Updated:** 2026-02-09

### Scope

Undo functionality for purchase operations - provide a 5-second window to revert a purchase action and restore the item to wishlist status.

**Feature:** Undo button in success toast with client-side timer and unpurchase endpoint to revert status changes.

**Goal:** Allow users to quickly undo accidental purchase actions within a 5-second window, reverting the item status back to 'wishlist' and clearing all purchase-related fields.

**Dependencies:** SETS-MVP-0310 (Purchase Flow - currently in UAT, sufficient for implementation)

**Acceptance Criteria:** 22 ACs covering:
- Frontend: Toast integration (AC1-7) - Undo action button, 5s window, RTK Query mutation, success/error feedback, button disable, toast persistence
- Backend: Unpurchase endpoint (AC8-16) - PATCH /api/v2/wishlist/:id/unpurchase, service layer, ownership validation, idempotent operation
- Testing: (AC17-22) - Unit tests, E2E scenarios (happy path, timeout, ownership, double-click, persistence)

**Reference Pattern:** BuildStatusToggle component demonstrates same undo pattern successfully (5s toast action)

**Story File:** `plans/future/wish/ready-to-work/SETS-MVP-0330/SETS-MVP-0330.md`

---

## SETS-MVP-0340: Form Validation

**Status:** UAT
**Depends On:** SETS-MVP-0310
**Split From:** SETS-MVP-003
**Phase:** 2 - MVP Feature
**Story Prefix:** SETS-MVP
**Generated:** 2026-02-09
**Experiment Variant:** control
**Elaboration Verdict:** CONDITIONAL PASS (AC21 added to resolve type mismatch)

### Scope

Form validation and accessibility polish for the purchase details form - refactor to React Hook Form + Zod, enforce price range constraints, add keyboard accessibility.

**Feature:** Client-side validation for price fields (0.00-999999.99) and purchase dates, plus full keyboard navigation support (Enter to submit, proper ARIA attributes).

**Goal:** Ensure purchase data is valid through comprehensive Zod schema validation and make the form fully accessible via keyboard with WCAG compliance.

**Dependencies:** SETS-MVP-0310 (requires core purchase flow to be implemented) - currently in UAT

**Acceptance Criteria:**
- AC18: Price fields accept valid decimals only (0.00 - 999999.99) - use Zod schema with createEnhancedSchemas.price()
- AC19: Purchase date cannot be in the future - HTML5 max attribute + Zod fallback
- AC20: Form is keyboard accessible (tab order, enter to submit, ARIA attributes, focus management)
- AC21: Price schema handles HTML input string-to-number conversion - use React Hook Form valueAsNumber option (ADDED BY ELABORATION)

**Reuse Plan:**
- React Hook Form v7.71.1 (already installed)
- @hookform/resolvers v5.2.2 (already installed)
- validation-messages.ts library from @repo/app-component-library
- LoginPage.tsx pattern (React Hook Form + Zod)
- Accessibility utils from utils/a11y.ts

**Estimated Effort:** 1 point (12-15 hours: schema definition, form refactoring, keyboard handler, comprehensive tests)

**Worker Artifacts:**
- Story Seed: `_pm/STORY-SEED.md`
- Test Plan: `_pm/TEST-PLAN.md`
- UI/UX Notes: `_pm/UIUX-NOTES.md`
- Dev Feasibility: `_pm/DEV-FEASIBILITY.md`
- Risk Predictions: `_pm/RISK-PREDICTIONS.yaml`
- Elaboration Report: `ELAB-SETS-MVP-0340.md`

**Story File:** `plans/future/wish/UAT/SETS-MVP-0340/SETS-MVP-0340.md`

---

## SETS-MVP-0410: Sell / Dispose Flow for Owned Items

**Status:** backlog
**Depends On:** SETS-MVP-0310
**Phase:** 2 - MVP Feature
**Story Prefix:** SETS-MVP

### Scope

Allow users to remove an owned set from their collection with context — sold, gifted, returned, or otherwise disposed of. Currently the only option is a hard delete that loses all purchase history. This story adds a "Sold / Removed" status transition with optional sale details and preserves the item record for historical tracking.

**Feature:** "Sold It" modal (mirroring the "Got It" modal) with sale details form, new `sold` status in the ItemStatus enum, backend PATCH endpoint for status transition, and a history/archive view for disposed items.

**Goal:** Enable users to track the full lifecycle of a set (wishlist → owned → sold/disposed) without losing purchase history, and optionally capture sale details for personal record-keeping.

**Dependencies:** SETS-MVP-0310 (Status Update Flow must be completed — establishes the PATCH purchase pattern this story mirrors)

**Acceptance Criteria:**
- AC1: Add `sold` value to ItemStatus enum (`wishlist | owned | sold`) with database migration
- AC2: "Sell / Remove" button on collection cards and detail view for owned items
- AC3: SoldItModal with optional fields: sale price, sale date (defaults to today), sale channel (e.g., BrickLink, eBay, local, gift, return, other), buyer notes
- AC4: PATCH `/api/wishlist/:id/sell` endpoint updates status from `owned` → `sold`, captures sale metadata
- AC5: Sold items no longer appear in Collection view (`status='owned'` filter excludes them)
- AC6: Archive/History view at `/collection/history` showing sold/disposed items with purchase and sale details
- AC7: Profit/loss display per item (sale price vs purchase price + tax + shipping)
- AC8: Undo support with 5-second toast window (mirrors delete undo pattern)
- AC9: Option to move item back to wishlist (`sold` → `wishlist`) or back to owned (`sold` → `owned`)
- AC10: Ownership validation — only item owner can transition status
- AC11: Zod schemas for SaleDetailsInput and updated ItemStatusSchema
- AC12: Accessibility — keyboard navigation, ARIA labels, screen reader announcements
- AC13: Unit tests for modal, service layer, and status transitions
- AC14: .http test file for PATCH sell endpoint

**Risk Notes:** Medium complexity. Requires database migration to add enum value and new columns (salePrice, saleDate, saleChannel, saleNotes). Enum migration in PostgreSQL requires `ALTER TYPE ... ADD VALUE` which is not reversible in a transaction — needs careful migration strategy. Archive view is a new page but can reuse existing gallery infrastructure with status filter.

---

## WISH-2069: Run and Fix Image Compression E2E Tests

**Status:** backlog
**Depends On:** WISH-2022
**Follow-up From:** WISH-2022
**Phase:** 4 - UX Polish

### Scope

Execute the existing WISH-2022 Playwright E2E tests (13 BDD scenarios) against the running application with AWS Cognito authentication, and fix any test failures or infrastructure issues discovered during execution.

**Features:**
- Run `pnpm test:compression` with proper AWS Cognito env vars
- Fix any step definition mismatches with current DOM structure
- Validate all 13 compression BDD scenarios pass
- Verify smoke tests pass: `pnpm test:compression:smoke`

**Packages Affected:**
- `apps/web/playwright` (fixes only if needed)

**Acceptance Criteria:** 6 ACs covering env configuration, BDD generation, test execution, step definition updates, and smoke tests.

**Complexity:** Small (tests already authored, just needs execution + potential fixes)

**Effort:** 1 point

**Priority:** P3 (Test validation)

**Story File:** `plans/future/wish/backlog/WISH-2069/WISH-2069.md`

### Source

Follow-up from WISH-2022 implementation - E2E tests were authored but could not be executed due to missing AWS Cognito infrastructure in local development environment.

---

## WISH-2005d: Haptic feedback on mobile drag

**Status:** deferred
**Depends On:** WISH-2005a
**Detail:** See [stories.deferred.md](./stories.deferred.md#wish-2005d)

---

## WISH-20620: Advanced ARIA Features (Landmarks, Skip Links, Heading Hierarchy)

**Status:** deferred
**Depends On:** WISH-2006
**Detail:** See [stories.deferred.md](./stories.deferred.md#wish-20620)

---

## WISH-20300: VS Code snippets for test utility discovery (createMockFile, mockS3Upload)

**Status:** deferred
**Depends On:** WISH-2120
**Detail:** See [stories.deferred.md](./stories.deferred.md#wish-20300)

---

## WISH-2123: Content Moderation - AI/ML Image Scanning

**Status:** deferred
**Depends On:** WISH-2013
**Detail:** See [stories.deferred.md](./stories.deferred.md#wish-2123)

---

## WISH-20320: Redis Cluster mode for high availability (multi-AZ failover, load balancing)

**Status:** deferred
**Depends On:** WISH-2124
**Detail:** See [stories.deferred.md](./stories.deferred.md#wish-20320)

---

## WISH-20340: Multi-region Redis replication (global latency optimization)

**Status:** deferred
**Depends On:** WISH-2124
**Detail:** See [stories.deferred.md](./stories.deferred.md#wish-20340)

---

## WISH-2122: Usage Quotas - Per-User Storage Quotas and Upload Rate Limits

**Status:** deferred
**Depends On:** WISH-2013
**Detail:** See [stories.deferred.md](./stories.deferred.md#wish-2122)

---

## WISH-2023: Add Compression Failure Telemetry

**Status:** deferred
**Depends On:** WISH-2022
**Detail:** See [stories.deferred.md](./stories.deferred.md#wish-2023)

---

## WISH-20550: Per-image Preset Selection for Multi-Upload Workflows

**Status:** deferred
**Depends On:** none
**Detail:** See [stories.deferred.md](./stories.deferred.md#wish-20550)

---

## WISH-20570: Dynamic Preset Recommendations Based on Upload History

**Status:** deferred
**Depends On:** none
**Detail:** See [stories.deferred.md](./stories.deferred.md#wish-20570)

---

## WISH-20370: Schema Change Impact Analysis Tool

**Status:** deferred
**Depends On:** none
**Detail:** See [stories.deferred.md](./stories.deferred.md#wish-20370)

---

## WISH-20380: Migration Performance Profiling

**Status:** deferred
**Depends On:** WISH-20180
**Detail:** See [stories.deferred.md](./stories.deferred.md#wish-20380)

---

## WISH-20390: Visual Schema Diff Tool for PR Reviews

**Status:** deferred
**Depends On:** none
**Detail:** See [stories.deferred.md](./stories.deferred.md#wish-20390)

---

## WISH-20400: Real-time CI Integration for Schema Change Impact Analysis

**Status:** deferred
**Depends On:** WISH-20210
**Detail:** See [stories.deferred.md](./stories.deferred.md#wish-20400)

---

## WISH-20410: Visual Dependency Graph UI for Schema Impact Analysis

**Status:** deferred
**Depends On:** WISH-20210
**Detail:** See [stories.deferred.md](./stories.deferred.md#wish-20410)

---

## WISH-20192: Schema Drift Detection - Advanced Features

**Status:** deferred
**Depends On:** WISH-20191
**Detail:** See [stories.deferred.md](./stories.deferred.md#wish-20192)

---

## WISH-20193: Schema Drift Detection - CI/CD Integration

**Status:** deferred
**Depends On:** WISH-20191, WISH-20192
**Detail:** See [stories.deferred.md](./stories.deferred.md#wish-20193)

---

## WISH-20530: Server-side HEIC Conversion Fallback

**Status:** deferred
**Depends On:** none
**Detail:** See [stories.deferred.md](./stories.deferred.md#wish-20530)

---

## WISH-2050: Compression Preview Comparison

**Status:** deferred
**Depends On:** WISH-2022
**Detail:** See [stories.deferred.md](./stories.deferred.md#wish-2050)

---

## WISH-2068: Browser Compatibility & Fallback for WebP

**Status:** deferred
**Depends On:** none
**Detail:** See [stories.deferred.md](./stories.deferred.md#wish-2068)

---

## WISH-20420: Schema Migration Code Generation Tool

**Status:** deferred
**Depends On:** WISH-20210
**Detail:** See [stories.deferred.md](./stories.deferred.md#wish-20420)

---

## WISH-20500: Schedule Management Dashboard (Core UI)

**Status:** deferred
**Depends On:** WISH-2119
**Detail:** See [stories.deferred.md](./stories.deferred.md#wish-20500)

---

## WISH-20510: Schedule Timeline & Cards

**Status:** deferred
**Depends On:** WISH-20500
**Detail:** See [stories.deferred.md](./stories.deferred.md#wish-20510)

---

## WISH-20520: Schedule Calendar View

**Status:** deferred
**Depends On:** WISH-20500
**Detail:** See [stories.deferred.md](./stories.deferred.md#wish-20520)

---

## WISH-20540: HEIC Telemetry Tracking for Conversion Success/Failure Rates

**Status:** deferred
**Depends On:** none
**Detail:** See [stories.deferred.md](./stories.deferred.md#wish-20540)

---

## WISH-20230: Recurring schedules (cron-like syntax for automated recurring flag updates)

**Status:** deferred
**Depends On:** WISH-2119
**Detail:** See [stories.deferred.md](./stories.deferred.md#wish-20230)

---

## WISH-20240: Schedule preview endpoint (simulate flag state before schedule applies)

**Status:** deferred
**Depends On:** WISH-2119
**Detail:** See [stories.deferred.md](./stories.deferred.md#wish-20240)

---

## WISH-20250: Bulk schedule creation (multiple schedules in single API call)

**Status:** deferred
**Depends On:** WISH-2119
**Detail:** See [stories.deferred.md](./stories.deferred.md#wish-20250)

---

## WISH-20350: Cache analytics dashboard (Grafana/Prometheus integration)

**Status:** deferred
**Depends On:** WISH-2124
**Detail:** See [stories.deferred.md](./stories.deferred.md#wish-20350)

---

## WISH-20330: Cache warming strategy (pre-populate on cold start, CloudWatch triggers)

**Status:** deferred
**Depends On:** WISH-2124
**Detail:** See [stories.deferred.md](./stories.deferred.md#wish-20330)

---

## WISH-20360: Automated Migration Rollback Testing

**Status:** deferred
**Depends On:** none
**Detail:** See [stories.deferred.md](./stories.deferred.md#wish-20360)

---

## WISH-20560: Real-time Compression Preview Before Upload

**Status:** deferred
**Depends On:** none
**Detail:** See [stories.deferred.md](./stories.deferred.md#wish-20560)

---

## WISH-20580: Compression Telemetry per Preset

**Status:** deferred
**Depends On:** WISH-2023
**Detail:** See [stories.deferred.md](./stories.deferred.md#wish-20580)

---

## WISH-20590: Migrate Accessibility Hooks to @repo/accessibility

**Status:** deferred
**Depends On:** WISH-2006
**Detail:** See [stories.deferred.md](./stories.deferred.md#wish-20590)

---

## WISH-20600: WCAG AAA Compliance for Wishlist Gallery

**Status:** deferred
**Depends On:** WISH-2006
**Detail:** See [stories.deferred.md](./stories.deferred.md#wish-20600)

---

## WISH-20610: Automated Screen Reader Testing with @guidepup

**Status:** deferred
**Depends On:** WISH-2006
**Detail:** See [stories.deferred.md](./stories.deferred.md#wish-20610)

---

## SETS-MVP-0360: Build History and Date Tracking

**Status:** deferred
**Depends On:** SETS-MVP-004
**Detail:** See [stories.deferred.md](./stories.deferred.md#sets-mvp-0360)

---

## SETS-MVP-0350: Batch Build Status Updates

**Status:** deferred
**Depends On:** SETS-MVP-004
**Detail:** See [stories.deferred.md](./stories.deferred.md#sets-mvp-0350)

---

## SETS-MVP-0370: Build Status Analytics

**Status:** deferred
**Depends On:** SETS-MVP-004
**Detail:** See [stories.deferred.md](./stories.deferred.md#sets-mvp-0370)

---

## SETS-MVP-0380: WISH-2004 Endpoint Deprecation and Migration Strategy

**Status:** deferred
**Depends On:** SETS-MVP-0310
**Detail:** See [stories.deferred.md](./stories.deferred.md#sets-mvp-0380)

---

## SETS-MVP-0400: Consumer Notification and Migration Guide for API Endpoint Transition

**Status:** deferred
**Depends On:** SETS-MVP-0310
**Detail:** See [stories.deferred.md](./stories.deferred.md#sets-mvp-0400)

---

## WISH-2000: Database Schema & Types

**Status:** uat
**Depends On:** none
**Detail:** See [stories.archive.md](./stories.archive.md#wish-2000)

---

## WISH-2007: Run Migration

**Status:** approved
**Depends On:** WISH-2000
**Detail:** See [stories.archive.md](./stories.archive.md#wish-2007)

---

## WISH-2001: Gallery MVP

**Status:** ready for review
**Depends On:** WISH-2007
**Detail:** See [stories.archive.md](./stories.archive.md#wish-2001)

---

## WISH-2002: Add Item Flow

**Status:** approved
**Depends On:** WISH-2001
**Detail:** See [stories.archive.md](./stories.archive.md#wish-2002)

---

## WISH-2003: Detail & Edit Pages

**Status:** done
**Depends On:** WISH-2001
**Detail:** See [stories.archive.md](./stories.archive.md#wish-2003)

---

## WISH-2004: Modals & Transitions

**Status:** completed
**Depends On:** WISH-2001
**Detail:** See [stories.archive.md](./stories.archive.md#wish-2004)

---

## WISH-2005a: Drag-and-drop reordering with dnd-kit

**Status:** uat
**Depends On:** WISH-2002, WISH-2003, WISH-2041
**Detail:** See [stories.archive.md](./stories.archive.md#wish-2005a)

---

## WISH-2005b: Optimistic updates and undo flow

**Status:** uat
**Depends On:** WISH-2005a
**Detail:** See [stories.archive.md](./stories.archive.md#wish-2005b)

---

## WISH-2005c: Drag preview thumbnail

**Status:** uat
**Depends On:** WISH-2005a
**Detail:** See [stories.archive.md](./stories.archive.md#wish-2005c)

---

## WISH-2006: Accessibility

**Status:** uat
**Depends On:** WISH-2005
**Detail:** See [stories.archive.md](./stories.archive.md#wish-2006)

---

## WISH-2008: Authorization layer testing and policy documentation

**Status:** completed
**Depends On:** WISH-2001, WISH-2002, WISH-2003, WISH-2004, WISH-2005
**Detail:** See [stories.archive.md](./stories.archive.md#wish-2008)

---

## WISH-2009: Feature flag infrastructure setup for gradual wishlist rollout

**Status:** completed
**Depends On:** WISH-2007
**Detail:** See [stories.archive.md](./stories.archive.md#wish-2009)

---

## WISH-20260: Automatic Retry Mechanism for Failed Flag Schedules

**Status:** completed
**Depends On:** WISH-2119
**Detail:** See [stories.archive.md](./stories.archive.md#wish-20260)

---

## WISH-2120: Test utility helpers (createMockFile, mockS3Upload) for S3 upload testing

**Status:** uat
**Depends On:** WISH-2011
**Detail:** See [stories.archive.md](./stories.archive.md#wish-2120)

---

## WISH-20290: Coverage metrics integration for test utilities

**Status:** uat
**Depends On:** WISH-2120
**Detail:** See [stories.archive.md](./stories.archive.md#wish-20290)

---

## WISH-2121: Playwright E2E MSW Setup for Browser-Mode Testing

**Status:** uat
**Depends On:** WISH-2011
**Detail:** See [stories.archive.md](./stories.archive.md#wish-2121)

---

## WISH-2010: Shared Zod schemas and types setup

**Status:** uat
**Depends On:** none
**Detail:** See [stories.archive.md](./stories.archive.md#wish-2010)

---

## WISH-2011: Test infrastructure for MSW mocking of S3 and API calls

**Status:** completed
**Depends On:** none
**Detail:** See [stories.archive.md](./stories.archive.md#wish-2011)

---

## WISH-2012: Accessibility testing harness setup

**Status:** completed
**Depends On:** WISH-2001
**Detail:** See [stories.archive.md](./stories.archive.md#wish-2012)

---

## WISH-2124: Redis infrastructure setup and migration from in-memory cache

**Status:** completed
**Depends On:** none
**Detail:** See [stories.archive.md](./stories.archive.md#wish-2124)

---

## WISH-2014: Smart Sorting Algorithms

**Status:** uat
**Depends On:** none
**Detail:** See [stories.archive.md](./stories.archive.md#wish-2014)

---

## WISH-2015: Wishlist Form Autosave with Draft Recovery

**Status:** completed
**Depends On:** WISH-2001
**Detail:** See [stories.archive.md](./stories.archive.md#wish-2015)

---

## WISH-2016: Image Optimization - Automatic Resizing, Compression, and Watermarking

**Status:** uat
**Depends On:** none
**Detail:** See [stories.archive.md](./stories.archive.md#wish-2016)

---

## WISH-20171: Backend Combined Filter + Sort Queries

**Status:** uat
**Depends On:** WISH-2014
**Detail:** See [stories.archive.md](./stories.archive.md#wish-20171)

---

## WISH-20172: Frontend Filter Panel UI

**Status:** uat
**Depends On:** WISH-20171
**Detail:** See [stories.archive.md](./stories.archive.md#wish-20172)

---

## WISH-2018: CDN Integration for Image Performance Optimization

**Status:** uat
**Depends On:** WISH-2013
**Detail:** See [stories.archive.md](./stories.archive.md#wish-2018)

---

## WISH-2019: Redis infrastructure setup and migration from in-memory cache

**Status:** completed
**Depends On:** none
**Detail:** See [stories.archive.md](./stories.archive.md#wish-2019)

---

## WISH-2029: Update architecture documentation for lego-api/domains/ pattern

**Status:** completed
**Depends On:** none
**Detail:** See [stories.archive.md](./stories.archive.md#wish-2029)

---

## WISH-2039: User-level targeting for feature flags

**Status:** uat
**Depends On:** none
**Detail:** See [stories.archive.md](./stories.archive.md#wish-2039)

---

## WISH-2047: IP/Geolocation Logging for Authorization Events

**Status:** completed
**Depends On:** none
**Detail:** See [stories.archive.md](./stories.archive.md#wish-2047)

---

## WISH-2046: Client-side Image Compression Quality Presets

**Status:** completed
**Depends On:** WISH-2022
**Detail:** See [stories.archive.md](./stories.archive.md#wish-2046)

---

## WISH-2027: Enum Modification Procedure for Wishlist Stores and Currencies

**Status:** completed
**Depends On:** none
**Detail:** See [stories.archive.md](./stories.archive.md#wish-2027)

---

## WISH-2057: Schema Evolution Policy and Versioning Strategy

**Status:** completed
**Depends On:** WISH-2007
**Detail:** See [stories.archive.md](./stories.archive.md#wish-2057)

---

## WISH-20180: CI Job to Validate Schema Changes Against Policy

**Status:** completed
**Depends On:** none
**Detail:** See [stories.archive.md](./stories.archive.md#wish-20180)

---

## WISH-2045: HEIC/HEIF Image Format Support

**Status:** uat
**Depends On:** none
**Detail:** See [stories.archive.md](./stories.archive.md#wish-2045)

---

## WISH-2049: Background Compression for Perceived Performance

**Status:** completed
**Depends On:** WISH-2022
**Detail:** See [stories.archive.md](./stories.archive.md#wish-2049)

---

## WISH-20210: Schema Change Impact Analysis Tool

**Status:** uat
**Depends On:** WISH-2057
**Detail:** See [stories.archive.md](./stories.archive.md#wish-20210)

---

## WISH-20280: Audit Logging for Flag Schedule Operations

**Status:** completed
**Depends On:** WISH-2119
**Detail:** See [stories.archive.md](./stories.archive.md#wish-20280)

---

## SETS-MVP-001: Unified Schema Extension

**Status:** completed
**Depends On:** WISH-2000
**Detail:** See [stories.archive.md](./stories.archive.md#sets-mvp-001)

---

## SETS-MVP-002: Collection View

**Status:** uat
**Depends On:** SETS-MVP-001, WISH-2001
**Detail:** See [stories.archive.md](./stories.archive.md#sets-mvp-002)

---

## SETS-MVP-004: Build Status Toggle

**Status:** completed
**Depends On:** SETS-MVP-002
**Detail:** See [stories.archive.md](./stories.archive.md#sets-mvp-004)

---

## SETS-MVP-0310: Status Update Flow

**Status:** uat
**Depends On:** SETS-MVP-001
**Detail:** See [stories.archive.md](./stories.archive.md#sets-mvp-0310)

---

## WISH-2070: Fix Pre-existing TypeScript Errors in app-wishlist-gallery

**Status:** completed
**Depends On:** none
**Detail:** See [stories.archive.md](./stories.archive.md#wish-2070)

---
