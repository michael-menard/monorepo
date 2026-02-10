---
doc_type: stories_archive
title: "WISH Archived Stories (UAT / Completed)"
parent: stories.index.md
created_at: "2026-02-09T00:00:00Z"
updated_at: "2026-02-09T00:00:00Z"
---

# WISH Archived Stories

This file contains 43 completed/UAT stories moved from [stories.index.md](./stories.index.md) to reduce file size.
These stories have passed QA or are in user acceptance testing.

---

## WISH-2000: Database Schema & Types

**Status:** uat
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

**Status:** uat
**Depends On:** WISH-2002, WISH-2003, WISH-2041
**Phase:** 4 - UX Polish

**Feature:** Core drag-and-drop functionality with dnd-kit library, persisted reorder via `PUT /api/wishlist/reorder` endpoint, awareness of pagination boundaries.

**Endpoints:**
- `PUT /api/wishlist/reorder`

**Complexity:** Large

**Goal:** Implement drag-and-drop priority reordering with persistence

**Risk Notes:** dnd-kit integration requires careful handling of pagination context and state synchronization

**Code Review Verdict:** PASS (2026-01-29) - All review checks passed, 100% quality score

**QA Verdict:** PASS (2026-02-04) - All 29 acceptance criteria verified, 53 unit tests passing, 13 E2E tests passing, no blocking issues

**Story File:** `plans/future/wish/UAT/WISH-2005a/WISH-2005a.md`

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

## WISH-2006: Accessibility

**Status:** uat
**Depends On:** WISH-2005
**Phase:** 5 - Accessibility (Deferred to Phase 2 after core functionality)

**Feature:** Full keyboard navigation with roving tabindex, keyboard shortcuts (A, G, Delete), screen reader announcements via live regions, modal focus trap and return, WCAG AA color contrast compliance.

**Goal:** Ensure wishlist feature is fully accessible to keyboard and screen reader users

**Risk Notes:** Comprehensive accessibility scope is ambitious; defer to Phase 2 after WISH-2000 through WISH-2005 are complete

**Deferral Rationale:** Focus on core functionality first (Phase 1), then tackle accessibility in dedicated phase with dedicated testing resources

**Sizing Warning:** Yes

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

## WISH-20260: Automatic Retry Mechanism for Failed Flag Schedules

**Status:** completed
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

**Story File:** `plans/future/wish/UAT/WISH-20260/WISH-20260.md`

---

## WISH-2120: Test utility helpers (createMockFile, mockS3Upload) for S3 upload testing

**Status:** uat
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

**Status:** uat
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

**Story File:** `plans/future/wish/UAT/WISH-20290/WISH-20290.md`

---

## WISH-2121: Playwright E2E MSW Setup for Browser-Mode Testing

**Status:** uat
**Depends On:** WISH-2011
**Follow-up From:** WISH-2011
**Phase:** 5 - Advanced Testing

### Scope

Enable Playwright E2E tests to use MSW for API and S3 mocking, providing consistent mocking layer across Vitest and Playwright tests. Browser-mode MSW setup reuses handlers and fixtures from WISH-2011 without duplication.

**Packages Affected:**
- `apps/web/playwright/` - Test configuration and MSW setup
- `apps/web/main-app/src/mocks/` - Extended handlers for S3/presign
- `apps/web/main-app/public/` - MSW worker script location

**Infrastructure:**
- MSW worker script (`mockServiceWorker.js`) served from public directory
- Browser worker registration via VITE_ENABLE_MSW env var
- Playwright `chromium-mocked` project for MSW-enabled E2E tests
- Fixtures: msw.fixture.ts, msw-error-injection.ts, msw-request-inspector.ts

**Acceptance Criteria:** 23 ACs (13 original + 10 from QA elaboration) - all passing.

**Complexity:** Medium (browser-mode MSW setup + Playwright integration)

**Effort:** Medium (2-3 points)

**Priority:** P2 (Advanced testing infrastructure for Phase 5)

**QA Verdict:** QA PASS - All 23 ACs verified. E2E gate: exempt (test infrastructure story). Minor ESLint issue auto-fixable.

**Story File:** `plans/future/wish/UAT/WISH-2121/WISH-2121.md`

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

## WISH-2124: Redis infrastructure setup and migration from in-memory cache

**Status:** completed
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

## WISH-2014: Smart Sorting Algorithms

**Status:** uat
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

**QA Verdict:** PASS (2026-02-09) - All acceptance criteria verified, 155 tests pass (15 backend + 6 frontend + 134 regression), architecture compliant

**Story File:** `plans/future/wish/UAT/WISH-2014/WISH-2014.md`

---

## WISH-2015: Wishlist Form Autosave with Draft Recovery

**Status:** completed
**Depends On:** WISH-2001
**Follow-up From:** WISH-2001
**Phase:** 4 - UX Polish

### Scope

Implement autosave functionality for the wishlist item form with draft recovery, allowing users to resume incomplete submissions with automatic persistence to localStorage and RTK store, debounced writes, and recovery banner UI.

**Features:**
- RTK slice with draft state management (4 actions + 4 selectors)
- Custom middleware with 500ms debounce for persistent writes
- Store rehydration from localStorage on app initialization
- All form fields saved except image binary (AC4)
- Recovery banner with Resume/Start Fresh buttons
- Draft auto-clear on successful submission
- User-scoped localStorage keys via auth state
- Comprehensive test coverage (56 tests: 41 unit + 15 integration)

**Packages Affected:**
- `apps/api/lego-api/domains/wishlist/types.ts` (modified)
- `apps/web/app-wishlist-gallery/src/store/slices/wishlistDraftSlice.ts` (created)
- `apps/web/app-wishlist-gallery/src/store/middleware/draftPersistenceMiddleware.ts` (created)
- `apps/web/app-wishlist-gallery/src/pages/AddItemPage.tsx` (modified)
- `packages/core/api-client/src/schemas/wishlist.ts` (modified)

**Acceptance Criteria:** 19 ACs covering RTK patterns, persistence, recovery UI, validation, and comprehensive testing.

**Complexity:** Medium

**Effort:** 5 points

**Priority:** P1 (Core UX feature)

**QA Verdict:** PASS (2026-02-09) - All 18/19 ACs verified (AC10 partial - S3 URL expiry check deferred to backend). 56 tests pass (41 unit + 15 integration), lint/typecheck/security pass, architecture compliant with RTK patterns and Zod-first types. E2E scenarios written (7) but not executed.

**Story File:** `plans/future/wish/UAT/WISH-2015/WISH-2015.md`

---

## WISH-2016: Image Optimization - Automatic Resizing, Compression, and Watermarking

**Status:** uat
**Depends On:** none
**Follow-up From:** WISH-2013
**Phase:** 4 - Performance & UX Polish
**QA Verdict:** PASS
**QA Completed:** 2026-02-09

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

**Story File:** `plans/future/wish/UAT/WISH-2016/`

**E2E Deferred To:** WISH-20162 (Playwright E2E Tests for Image Optimization)

---

## WISH-20171: Backend Combined Filter + Sort Queries

**Status:** uat
**Depends On:** WISH-2014
**Split From:** WISH-2017
**Phase:** 6 - Advanced Features

### Scope

Extend backend GET /api/wishlist endpoint with combined filter + sort query parameters. Implement repository layer with combined WHERE + ORDER BY queries, handle null values, pagination, and error validation. Focus on backend-only implementation with 45 unit tests and 18 integration tests.

### Acceptance Criteria (from parent)

AC0, AC1, AC2, AC3, AC4, AC5, AC6, AC15, AC16, AC18 (9 ACs)

### QA Verification Status

QA PASS: 9/10 ACs verified PASS. AC18 (performance) PENDING manual backend verification (known limitation). All 55 unit tests pass, all 129 schema tests pass, architecture compliant, error handling verified. No blocking issues.

### Review Status

Code review PASSED (iteration 2) - All quality gates met: linting (0 errors), tests (147/147 passed), code quality approved, security validated, architecture compliant.

---

## WISH-20172: Frontend Filter Panel UI

**Status:** uat
**Depends On:** WISH-20171
**Split From:** WISH-2017
**Phase:** 6 - Advanced Features
**Story File:** plans/future/wish/UAT/WISH-20172/WISH-20172.md

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

**Status:** completed
**Depends On:** WISH-2007
**Follow-up From:** WISH-2007
**Phase:** 1 - Foundation

**Feature:** Document comprehensive schema evolution policies, versioning strategy, and procedures for safe database schema modifications across all environments. Establish governance for schema changes and provide runbooks for common scenarios.

**Packages Affected:**
- `packages/backend/database-schema/docs/` - 4 new documentation files (SCHEMA-EVOLUTION-POLICY.md, ENUM-MODIFICATION-RUNBOOK.md, SCHEMA-VERSIONING.md, SCHEMA-CHANGE-SCENARIOS.md)

**Goal:** Document comprehensive schema evolution policies and procedures before any future schema modifications occur to prevent production issues and ensure safe schema evolution.

**Risk Notes:** PostgreSQL enums are immutable and present unique challenges. Without documented strategy, developers may introduce breaking changes or require emergency rollbacks.

**Source:** QA Discovery Notes from WISH-2007 Elaboration (Enhancement Opportunity #6)

**Story File:** `plans/future/wish/UAT/WISH-2057/WISH-2057.md`

**Elaboration Notes:** CONDITIONAL PASS (2026-01-29) - Story is well-structured with clear scope and 20 acceptance criteria. All audit checks pass. One minor issue identified: existing `packages/backend/database-schema/docs/WISHLIST-SCHEMA-EVOLUTION.md` (155 lines) already addresses some schema evolution concerns. Implementation should clarify relationship (replace, extend, or coexist).

**Implementation Notes:** COMPLETE (2026-02-01) - All 4 documentation files created. Existing docs WISHLIST-SCHEMA-EVOLUTION.md and enum-evolution-guide.md marked SUPERSEDED. CI-SCHEMA-VALIDATION.md updated with cross-references. All 20 ACs verified. Code review PASS on iteration 1.

**QA Verification:** PASS (2026-02-01) - All 20 acceptance criteria verified. Documentation quality complete. No blocking issues identified. Story moved to UAT completion status.

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

## WISH-2045: HEIC/HEIF Image Format Support

**Status:** uat
**Depends On:** none
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

**Story File:** `plans/future/wish/UAT/WISH-2045/WISH-2045.md`

---

## WISH-2049: Background Compression for Perceived Performance

**Status:** completed
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

**Story File:** `plans/future/wish/UAT/WISH-2049/WISH-2049.md`

**Note:** E2E tests written but execution deferred to WISH-20490 (dev server broken).

### Source

Follow-up from QA Elaboration of WISH-2022 (Enhancement Opportunity #2)

**Original Finding:** Background compression - Start compressing image as soon as selected (before form is filled). By the time user submits, compression is already complete. Reduces perceived latency.

**Category:** Enhancement Opportunity
**Impact:** Medium (62% reduction in perceived latency for typical 5MB images)
**Effort:** Low (Minor refactoring of compression timing from WISH-2022)

---

## WISH-20210: Schema Change Impact Analysis Tool

**Status:** uat
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

**Story File:** `plans/future/wish/UAT/WISH-20210/WISH-20210.md`

**Elaboration Report:** `plans/future/wish/UAT/WISH-20210/ELAB-WISH-20210.md`

**Verdict:** CONDITIONAL PASS - Ready for implementation with 3 critical issues to address during kickoff

---

## WISH-20280: Audit Logging for Flag Schedule Operations

**Status:** completed (2026-02-10)
**Depends On:** WISH-2119
**Follow-up From:** WISH-2119
**Phase:** 3 - Infrastructure
**Estimated Points:** 2
**Priority:** P2

### Scope

Add comprehensive audit logging to flag schedule operations (create, cancel) to provide security observability and admin accountability. Creates new audit logger in `core/audit/` (separate from admin domain) that adapts audit patterns for schedule events, tracking which admin performed each action with timestamps and context.

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
- `apps/api/lego-api/core/audit/` (NEW) - Lightweight audit logger for schedule events
- `packages/backend/database-schema/` - Migration for admin tracking columns
- `packages/core/api-client/src/schemas/` - Schema updates for admin fields

**Acceptance Criteria:** 15 ACs covering database schema updates, audit logging integration, service layer updates, API response updates, schema alignment, testing, and documentation.

**Complexity:** Small (2 points, extends existing patterns from admin domain)

**Dependency Note:** Original follow-up referenced WISH-2019 (audit logging) but WISH-2019 is actually Redis caching. Actual audit patterns sourced from admin domain.

**Category:** Enhancement Opportunity (Security & Compliance)
**Impact:** Medium (Security observability and admin accountability)
**Effort:** Low (Extends existing audit infrastructure patterns)

**Story File:** `plans/future/wish/UAT/WISH-20280/WISH-20280.md`

**Effort:** 2 points

**Priority:** P1 (Security and compliance requirement for Phase 3)

### Source

Follow-up from QA Elaboration of WISH-2119 (Follow-up Stories Suggested - Finding #7)

**Original Finding:** "Integration with WISH-2019 (audit logging: track which admin created/cancelled schedules)"

**Category:** Enhancement Opportunity
**Impact:** Medium (security observability and admin accountability)
**Effort:** Low (extends existing audit infrastructure)

**Story File:** `plans/future/wish/UAT/WISH-20280/WISH-20280.md`

---

## SETS-MVP-001: Unified Schema Extension

**Status:** completed
**Depends On:** WISH-2000
**Phase:** 1 - Foundation
**Story Prefix:** SETS-MVP
**QA Verdict:** PASS
**QA Completed:** 2026-02-08T18:50:00Z

### Scope

Extend the existing wishlist schema to support owned items, enabling a single unified data model for both wishlist and collection. Adds status field and owned-specific columns to the existing `wishlist_items` table.

**Feature:** Add status field with enum constraint ('wishlist' | 'owned'), purchase tracking fields (purchaseDate, purchasePrice, purchaseTax, purchaseShipping), build status enum, and composite index for collection queries.

**Goal:** Enable tracking of owned LEGO sets alongside wishlists using the unified data model approach.

**Dependencies:** WISH-2000 (Database Schema & Types must be completed first)

**Acceptance Criteria:** 23 ACs - ALL PASSING (100%)
- Schema changes (AC1-8): status, purchaseDate, purchasePrice, purchaseTax, purchaseShipping, buildStatus, statusChangedAt, composite index
- Zod schema updates (AC9-13): ItemStatusSchema, BuildStatusSchema, UserSetSchema, MarkAsPurchasedSchema, UpdateBuildStatusSchema
- Service layer changes (AC21-23): service methods for status filtering, default filter behavior, integration tests
- Migration (AC14-16): reversible migration, default values, backward compatibility
- Tests (AC17-20): schema validation, default values, null field handling, query compatibility

**Test Results:** 756/756 passing (64 database schema + 79 API client + 27 integration + 613 full API)

**Risk Notes:** Migration is backward compatible with no downtime. Service layer implements default filter behavior for backward compatibility.

**Story File:** `plans/future/wish/UAT/SETS-MVP-001/SETS-MVP-001.md`

---

## SETS-MVP-002: Collection View

**Status:** uat
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

**Story File:** `plans/future/wish/UAT/SETS-MVP-002/SETS-MVP-002.md`

---

## SETS-MVP-004: Build Status Toggle

**Status:** completed
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

**Test Results:** All 32 ACs verified passing. 13 unit tests pass with 98.55% line coverage. Zero anti-patterns. Architecture compliant.

**Risk Notes:** Low complexity; simple toggle with standard patterns. All architecture gaps addressed. Three-state cycle implementation acceptable per known deviation.

**Elaboration Report:** `plans/future/wish/in-progress/SETS-MVP-004/ELAB-SETS-MVP-004.md`

**Story File:** `plans/future/wish/UAT/SETS-MVP-004/SETS-MVP-004.md`

---

## SETS-MVP-0310: Status Update Flow

**Status:** uat
**Depends On:** SETS-MVP-001
**Split From:** SETS-MVP-003
**Phase:** 2 - MVP Feature
**Story Prefix:** SETS-MVP

### Scope

Core purchase flow using the unified model - update item status to 'owned' with purchase details. Extends the "Got it" modal with a purchase details step and provides a PATCH endpoint to update the item's status and capture purchase information.

**Feature:** Extended "Got it" modal with purchase details form and backend endpoint to update item status to 'owned' with purchase metadata.

**Goal:** Enable users to mark wishlist items as owned while capturing purchase details (price, tax, shipping, purchase date, build status).

**Dependencies:** SETS-MVP-001 (requires unified schema with status, purchaseDate, buildStatus, purchasePrice, purchaseTax, purchaseShipping fields)

**QA Status:** PASS - 31 tests pass (22 frontend + 9 backend), all ACs verified, architecture compliant, code review PASS

**Acceptance Criteria (from parent):**
- AC1-6: Modal flow (confirmation step, purchase details form, optional fields, skip/save buttons, calculated total)
- AC7-10: API changes (PATCH /api/wishlist/:id/purchase endpoint, status update, ownership validation, return updated item)

**Story File:** `plans/future/wish/UAT/SETS-MVP-0310/SETS-MVP-0310.md`

---

## WISH-2070: Fix Pre-existing TypeScript Errors in app-wishlist-gallery

**Status:** completed
**Depends On:** none
**Phase:** 5 - Tech Debt

### Scope

Fix all pre-existing TypeScript errors in `app-wishlist-gallery` that cause `pnpm check-types` to fail. These errors predate recent feature work and block CI quality gates for all stories.

**Error Categories (52 total errors):**

1. **`@repo/logger` missing type declarations** (16 errors) - across app and shared packages
2. **Unused imports in test files** (4 errors) - `FeatureFlagContext`, `useAnnouncer`, `useFeatureFlag`, `useKeyboardShortcuts` tests
3. **`CollectionPage` component type errors** (2 errors) - prop mismatches
4. **`draftPersistenceMiddleware.test.ts` type errors** (4 errors) - `MockInstance` incompatibility
5. **`wishlistDraftSlice.test.ts` type errors** (20+ errors) - `unknown` state type
6. **`AppToggleGroup` type mismatch** (2 errors) - Radix prop incompatibility
7. **`api-client` unused imports** (2 errors) - `authorization-errors.ts`

**Packages Affected:**
- `apps/web/app-wishlist-gallery`
- `packages/core/logger`
- `packages/core/app-component-library`
- `packages/core/api-client`
- `packages/core/gallery`

**Acceptance Criteria:** `pnpm check-types` passes with 0 errors for `app-wishlist-gallery`.

**Complexity:** Medium (scattered across many files but each fix is small)

**Effort:** 2 points

**Priority:** P1 (Blocks CI quality gate for all in-flight stories)

**Story File:** `plans/future/wish/UAT/WISH-2070/WISH-2070.md`

### Source

Discovered during WISH-2045 QA verification - `pnpm check-types` fails with 52 pre-existing errors unrelated to any single story.

### QA Verification Result

**Verdict:** PASS
- AC1: pnpm check-types passes with 0 errors - PASS
- AC2: No runtime behavior changes - PASS
- AC3: Tests pass (749/763, 14 pre-existing failures unrelated) - PASS
- AC4: @repo/logger type declarations work - PASS
- E2E Gate: EXEMPT (chore story, type-only fixes)

---
