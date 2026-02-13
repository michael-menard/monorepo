---
doc_type: stories_index
title: "BUGF Stories Index"
status: active
story_prefix: "BUGF"
created_at: "2026-02-10T00:00:00Z"
updated_at: "2026-02-11T21:00:00Z"
total_stories: 48
---

# BUGF Stories Index

All stories in this epic use the `BUGF-XXX` naming convention (starting at 001).

## Progress Summary

| Status | Count |
|--------|-------|
| completed | 1 |
| uat | 5 |
| ready-for-qa | 0 |
| in-qa | 0 |
| in-progress | 3 |
| ready-to-work | 6 |
| elaboration | 0 |
| backlog | 28 |
| created | 3 |
| deferred | 2 |

---

## Ready to Start

Stories with all dependencies satisfied (can be worked in parallel):

| Story | Title | Phase | Blocked By |
|-------|-------|-------|-----------|
| BUGF-013 | Add Test Coverage for Instructions Gallery Components | 3 | — |
| BUGF-014 | Add Test Coverage for Sets Gallery Components | 3 | ✓ Ready |
| BUGF-016 | Implement Missing API Integrations for Inspiration Gallery | 1 | — |
| BUGF-017 | Convert TypeScript Interfaces to Zod Schemas | 4 | — |
| BUGF-018 | Fix Memory Leaks from createObjectURL | 3 | — |
| BUGF-019 | Implement Password Reset Rate Limiting and UX Improvements | 3 | — |
| BUGF-021 | Replace Type Assertions with Proper Types | 4 | — |
| BUGF-022 | Remove Deprecated Legacy App and Update CI/CD | 4 | — |
| BUGF-024 | Fix Code Quality Issues and Technical Debt | 4 | — |
| BUGF-026 | Auth Token Refresh Security Review | 2 | ✓ Ready |
| BUGF-028 | Test Infrastructure Setup for MSW Mocking of Presigned URL Responses | 3 | — |
| BUGF-030 | Implement Comprehensive E2E Test Suite | 5 | — |
| BUGF-031 | Backend API + Infrastructure for Presigned URL Upload | 1 | — |
| BUGF-033 | Add Production Guard to Auth Bypass Middleware | 1 | — |
| BUGF-034 | Fix DOM Manipulation Race Condition in Wishlist Sort Announcement | 3 | — |
| BUGF-035 | Validate Required Environment Variables on API Startup | 1 | — |
| BUGF-036 | Add Input Validation to Feature Flag Admin Endpoints | 1 | — |
| BUGF-037 | Add Transaction Safety for S3 + Database Operations | 1 | — |
| BUGF-038 | Consolidate Duplicated Uploader Components into @repo/upload | 2 | — |
| BUGF-039 | Standardize Zod Version Across All Packages | 2 | — |
| BUGF-040 | Remove Unused and Deprecated Packages | 2 | — |
| BUGF-041 | Add UUID Validation to API Route Parameters | 1 | — |
| BUGF-042 | Fix Rate Limiter Memory Leak in API Middleware | 2 | — |
| BUGF-043 | Consolidate Duplicated Test Setup Files | 3 | — |
| BUGF-044 | Fix React Version Incompatibilities in Core Packages | 2 | — |
| BUGF-045 | Consolidate Duplicated Module Layout Components | 4 | — |
| BUGF-046 | Add Missing Tests for API Auth, MOCs, and Inspiration Domains | 3 | — |
| BUGF-047 | Fix CORS Configuration to Use Environment Variables | 1 | — |
| BUGF-048 | Consolidate Duplicated TagInput Components | 4 | — |
| BUGF-049 | Fix N+1 Query in Gallery Album Repository | 4 | — |
| BUGF-050 | Complete or Remove Incomplete Hook Migration to @repo/hooks | 2 | — |

---

## Completed

Stories that have successfully passed QA verification:

| Story | Title | Phase | Completed |
|-------|-------|-------|-----------|
| BUGF-002 | Implement Edit Save Functionality for Instructions | 1 | 2026-02-11 |

---

## BUGF-031: Backend API + Infrastructure for Presigned URL Upload

**Status:** ready-to-work
**Phase:** 1 (Critical Functionality)
**Depends On:** —
**Split From:** BUGF-001
**Story File:** `ready-to-work/BUGF-031/BUGF-031.md`

**Elaboration Verdict:** PASS (2026-02-11) - All 8 audit checks passed. 0 ACs added, 20 KB entries logged as non-blocking. Story ready for implementation.

### Scope

Create the backend API endpoint `POST /api/uploads/presigned-url` to generate secure, time-limited presigned S3 URLs for file uploads. Includes S3 bucket configuration, IAM policy setup, CORS configuration, and complete backend infrastructure for upload functionality.

### Acceptance Criteria (from parent)

AC1, AC2, AC4, AC5, AC6, AC8, AC9, AC10 (8 total)

**Points:** 5 (3-5 days)

---

## BUGF-032: Frontend Integration for Presigned URL Upload

**Status:** uat
**Phase:** 1 (Critical Functionality)
**Depends On:** BUGF-031
**Split From:** BUGF-001
**Story File:** `UAT/BUGF-032/BUGF-032.md`

**Elaboration Verdict:** PASS (2026-02-11) - All 8 audit checks passed. 0 MVP-critical gaps, 0 ACs added, 10 gaps + 20 enhancements logged as non-blocking in KB. Story ready for implementation.

**Implementation:** Complete (2026-02-12) - Both ACs implemented. RTK Query mutation, frontend integration in 2 pages, session refresh handler, error handling, 16 unit tests passing. E2E tests split to BUGF-051.

**QA Verification:** PASS (2026-02-12) - All ACs verified, 16 unit tests passing, build clean, code review passed, architecture compliant. E2E exempt (BUGF-051).

### Scope

Integrate the presigned URL API into frontend upload pages (`app-instructions-gallery` and `main-app`). Wire up RTK Query API calls, connect to existing `@repo/upload` package, with session expiry handling.

### Acceptance Criteria (from parent)

AC3, AC7 (2 total)

**Points:** 3 (2-3 days)

---

## BUGF-002: Implement Edit Save Functionality for Instructions

**Status:** Completed
**Phase:** 1 (Critical Functionality)
**Depends On:** —
**Feature:** Complete RTK Query mutation integration for saving instruction edits in both main-app and app-instructions-gallery
**Endpoints:**
- `PATCH /api/v2/instructions/mocs/:id`

**Goal:** Allow users to successfully save edits to instruction metadata

**Risk Notes:** Straightforward mutation integration - backend and RTK Query infrastructure already complete

**Story File:** plans/future/bug-fix/UAT/BUGF-002/BUGF-002.md

**QA Verification:** PASS (2026-02-11) - All 12 ACs verified, 27 unit tests passing, architecture compliant

---

## BUGF-003: Implement Delete API and Edit Page for Sets Gallery

**Status:** uat
**Phase:** 1 (Critical Functionality)
**Depends On:** —
**Feature:** Create useDeleteSetMutation integration, build missing edit-set-page.tsx, and wire up edit flow routing
**Endpoints:**
- `DELETE /api/sets/:id`
- `PATCH /api/sets/:id` (Note: Backend uses PATCH, not PUT)

**Goal:** Enable users to delete sets and access edit functionality via proper edit page

**Risk Notes:** Delete API stubbed with cache invalidation notes; backend APIs already deployed. High sizing complexity.

**Story File:** `UAT/BUGF-003/BUGF-003.md`

**Elaboration Verdict:** PASS (2026-02-11) - All 8 audit checks passed. 0 ACs added, 18 KB entries logged as non-blocking.

**Implementation:** Complete (2026-02-11) - 40/41 ACs pass, 1 deferred (AC-13 ImageUploadZone). 15 tests passing (9 edit-page + 6 main-page). E2E exempt per ADR-005.

**QA Verification:** PASS (2026-02-11) - 15/15 tests passing, 91.45% edit-page coverage, 82.11% main-page coverage, architecture compliant.

---

## BUGF-004: Implement Session Refresh API for Upload Expiry

**Status:** backlog
**Phase:** 1 (Critical Functionality)
**Depends On:** BUGF-031
**Feature:** Create API endpoint to refresh presigned URLs for expired upload sessions and integrate into upload-page session management
**Endpoints:**
- `POST /api/uploads/refresh-session`

**Goal:** Prevent users from losing upload progress when presigned URLs expire

**Risk Notes:** Depends on BUGF-031 presigned URL backend implementation

---

## BUGF-005: Create Shared Auth Hooks Package

**Status:** backlog
**Phase:** 2 (Cross-App Infrastructure)
**Depends On:** BUGF-026
**Feature:** Consolidate 6 duplicate use-module-auth.ts stubs into @repo/auth-hooks package with real authentication integration
**Infrastructure:**
- New package: @repo/auth-hooks

**Goal:** Replace hardcoded auth values with real authentication logic across all apps

**Risk Notes:** Cross-cutting change affects 6 apps; requires careful migration strategy. High sizing complexity. **SEC-002:** Security review required before implementation - auth hook consolidation must not consolidate auth state unsafely. Must define clear session/token validation and complete security architecture review before consolidation.

---

## BUGF-006: Replace Console Usage with @repo/logger

**Status:** uat
**Phase:** 2 (Cross-App Infrastructure)
**Depends On:** —
**Story File:** `UAT/BUGF-006/BUGF-006.md`
**Elaboration Report:** `ready-for-qa/BUGF-006/ELAB-BUGF-006.md`
**Feature:** Replace all console.log/error calls with @repo/logger across app-inspiration-gallery, app-instructions-gallery, and main-app
**Goal:** Ensure consistent, structured logging across all applications
**Points:** 2
**Experiment Variant:** control

**Elaboration Verdict:** CONDITIONAL PASS (2026-02-11) - All 8 audit checks passed. 0 ACs added, 11 KB entries logged as non-blocking. 4 minor issues are non-blocking and informational only. Story ready for implementation.

**Implementation:** Complete (2026-02-11) - All 10 ACs pass. 3 source files modified, 10 console statements replaced with @repo/logger. Lint and type-check pass. E2E exempt (tech_debt story type).

**Risk Notes:** Low risk; straightforward search and replace with verification

**Story generated:** 2026-02-11T17:37:20Z with experiment variant control. Predictions: split_risk=0.3, review_cycles=1, token_estimate=80K (low confidence - heuristics-only mode).

---

## BUGF-007: Fix Dashboard Test/Implementation Mismatches

**Status:** deferred
**Phase:** 3 (Test Coverage & Quality)
**Depends On:** —
**Feature:** Resolve 5 critical test failures in app-dashboard by aligning tests with actual component implementations or fixing implementations to match expected behavior
**Goal:** Ensure dashboard tests accurately reflect and validate actual component behavior

**Risk Notes:** Requires decision: fix tests or fix implementation for each mismatch

**Deferred Reason:** Dashboard test mismatches not blocking core user journeys — deferred from MVP scope

---

## BUGF-009: Fix and Enable Skipped Test Suites in Main App

**Status:** ready-for-qa
**Phase:** 3 (Test Coverage & Quality)
**Depends On:** —
**Feature:** Implement or remove 10 completely skipped test suites in main-app including navigation, performance, auth flow, and cache tests
**Goal:** Restore test coverage for critical navigation and auth functionality
**Story File:** `ready-for-qa/BUGF-009/BUGF-009.md`
**Points:** 5
**Experiment Variant:** control

**Generated:** 2026-02-11T18:30:00Z with experiment variant control. Predictions: split_risk=0.7, review_cycles=3, token_estimate=180K (low confidence - heuristics-only mode).

**Elaboration Verdict:** PASS (2026-02-11) - All 8 audit checks passed. 0 MVP-critical gaps, 1 AC added (AC-4a for performance monitoring validation), 12 non-blocking findings logged to KB. Story ready for implementation.

**Implementation:** Partial Complete (2026-02-11) - 12/22 ACs pass, 7 deferred to BUGF-010 (complex integration test rewrites). 90 new tests enabled: LoginPage (38/38), SignupPage (42/42), Performance (10/11). GalleryModule obsolete test removed. Review: PASS iteration 1.

**Risk Notes:** High priority; tests were skipped for a reason - may uncover deeper issues. High sizing complexity.

---

## BUGF-010: Fix Hub.listen Mocking in Auth Tests

**Status:** ready-for-qa
**Phase:** 3 (Test Coverage & Quality)
**Depends On:** —
**Story File:** `ready-for-qa/BUGF-010/BUGF-010.md`
**Elaboration Report:** `ready-for-qa/BUGF-010/ELAB-BUGF-010.md`
**Feature:** Resolve 8 TODO comments in AuthProvider tests where Hub.listen mock is not being called in test environment
**Goal:** Ensure auth event listeners are properly tested
**Points:** 1
**Experiment Variant:** control

**Story generated:** 2026-02-11T19:30:00Z with experiment variant control. Predictions: split_risk=0.1, review_cycles=1, token_estimate=80K (low confidence - heuristics-only mode).

**Elaboration Verdict:** PASS (2026-02-11) - All 8 audit checks passed. 0 ACs added, 15 KB entries logged as non-blocking. Story ready for implementation.

**Risk Notes:** Test environment issue; may require Vitest configuration changes. Low risk - tests already written, just need mock setup fix

---

## BUGF-011: Add Test Coverage for Dashboard Components

**Status:** deferred
**Phase:** 3 (Test Coverage & Quality)
**Depends On:** BUGF-007
**Feature:** Create test files for 8 untested dashboard components including DashboardHeader, charts, tables, and FilterBar
**Goal:** Achieve minimum 45% test coverage for dashboard components

**Risk Notes:** Medium effort; straightforward component testing

**Deferred Reason:** Dashboard component tests non-blocking for MVP — deferred from MVP scope

---

## BUGF-012: Add Test Coverage for Inspiration Gallery Components

**Status:** uat
**Phase:** 3 (Test Coverage & Quality)
**Depends On:** —
**Feature:** Create test files for 18 untested components including main-page.tsx, modals, drag components, and context menus
**Goal:** Achieve test coverage for critical inspiration gallery user flows
**Story File:** `UAT/BUGF-012/BUGF-012.md`
**Elaboration Report:** `UAT/BUGF-012/ELAB-BUGF-012.md`
**Points:** 5
**Experiment Variant:** control

**Elaboration Verdict:** PASS (2026-02-11) - All 8 audit checks passed. 0 MVP-critical gaps identified, 0 ACs added. 20 enhancement opportunities and 10 non-blocking edge case gaps logged to deferred KB. Story ready for implementation without PM modifications.

**Implementation:** Complete (2026-02-11) - All 8 ACs pass. 210 tests across 23 test files, 0 failures. Created reusable @dnd-kit mock setup, comprehensive BDD test structure. E2E exempt (tech_debt story type, ADR-006).

**QA Verification:** PASS (2026-02-11) - All 8 ACs verified PASS. 210 unit tests passing, 0 failures. Lint clean (pre-existing config issues only). Architecture compliant. 2 informational findings (act() warning, pre-existing lint config). Story approved for UAT/release.

**Generated:** 2026-02-11T00:00:00Z with experiment variant control. Predictions: split_risk=0.3, review_cycles=2, token_estimate=120K (low confidence - heuristics-only mode).

**Risk Notes:** Main page is highest priority; drag testing may require special setup. All risks documented in elaboration report. High sizing complexity.

---

## BUGF-013: Add Test Coverage for Instructions Gallery Upload Components

**Status:** ready-to-work
**Phase:** 3 (Test Coverage & Quality)
**Depends On:** —
**Story File:** `ready-to-work/BUGF-013/BUGF-013.md`
**Feature:** Create comprehensive unit tests for untested upload components, forms, and session management in app-instructions-gallery
**Goal:** Achieve minimum 45% test coverage threshold with focus on upload flow integration, presigned URL API mocking, and error handling scenarios
**Points:** 5
**Experiment Variant:** control

**Generated:** 2026-02-11T00:00:00Z with experiment variant control. Predictions: split_risk=0.3, review_cycles=2, token_estimate=120K (low confidence - heuristics-only mode).

**Elaboration Verdict:** PASS (2026-02-11) - All audit checks passed. 0 ACs added, 18 KB entries logged as non-blocking. Story ready for implementation.

**Risk Notes:** Upload testing complexity; requires MSW mocking for presigned URL flows and S3 interactions. Session refresh tests deferred (blocked by BUGF-004).

---

## BUGF-014: Add Test Coverage for Sets Gallery Components

**Status:** ready-to-work
**Phase:** 3 (Test Coverage & Quality)
**Depends On:** —
**Story File:** `ready-to-work/BUGF-014/BUGF-014.md`
**Elaboration Report:** `ready-to-work/BUGF-014/ELAB-BUGF-014.md`
**Feature:** Create test files for GalleryGrid, ModuleLayout, and SetDetailPage
**Goal:** Ensure sets gallery functionality is properly tested
**Points:** 3
**Experiment Variant:** control

**Elaboration Verdict:** PASS (2026-02-11) - All 8 audit checks passed. 0 ACs added, 18 KB entries logged as non-blocking. Story ready for implementation.

**Generated:** 2026-02-11T19:45:00Z with experiment variant control. Predictions: split_risk=0.2, review_cycles=1-2, token_estimate=100K (low confidence - heuristics-only mode).

**Risk Notes:** SetDetailPage is most complex; may need comprehensive test scenarios. Note: GalleryFilterBar excluded (shared component in @repo/gallery)

---

## BUGF-015: Add Test Coverage for Main App Components

**Status:** ready-to-work
**Phase:** 3 (Test Coverage & Quality)
**Depends On:** —
**Feature:** Create test files for 24 untested components including admin pages, modules, dialogs, and input components
**Goal:** Improve test coverage for main app to meet minimum 45% threshold
**Points:** 5
**Experiment Variant:** control

**Generated:** 2026-02-11T20:00:00Z with experiment variant control. Predictions: split_risk=0.6, review_cycles=2, token_estimate=140K (low confidence - heuristics-only mode, KB unavailable).

**Story File:** `ready-to-work/BUGF-015/BUGF-015.md`

**Elaboration Verdict:** PASS (2026-02-11) - All 8 audit checks passed. 0 ACs added, 17 KB entries logged as non-blocking (7 gaps + 10 enhancements). Story ready for implementation.

**Risk Notes:** Large scope (24 components, 15-22 hours estimated); prioritize admin (security critical) and upload (recently modified) components first. Moderate split risk due to scope. Timer testing (RateLimitBanner) requires vi.useFakeTimers pattern.

---

## BUGF-016: Implement Missing API Integrations for Inspiration Gallery

**Status:** backlog
**Phase:** 1 (Critical Functionality)
**Depends On:** —
**Feature:** Complete implementations for handleAddToAlbum, handleLinkToMoc, album membership API, and bulk delete operations
**Endpoints:**
- `POST /api/albums/:id/members`
- `POST /api/inspirations/:id/link-moc`
- `DELETE /api/inspirations (bulk)`
- `GET /api/inspirations/:id/albums`

**Goal:** Enable album management and MOC linking features

**Risk Notes:** Multiple API endpoints; requires backend coordination. High sizing complexity.

---

## BUGF-017: Convert TypeScript Interfaces to Zod Schemas

**Status:** backlog
**Phase:** 4 (Code Quality & Cleanup)
**Depends On:** —
**Feature:** Replace 100+ TypeScript interfaces with Zod schemas across all apps, prioritizing app-instructions-gallery (40+ violations)
**Goal:** Achieve runtime validation and type safety per CLAUDE.md guidelines

**Risk Notes:** Large-scale refactor; can be done incrementally by app or feature area. High sizing complexity.

---

## BUGF-018: Fix Memory Leaks from createObjectURL

**Status:** backlog
**Phase:** 3 (Test Coverage & Quality)
**Depends On:** —
**Feature:** Add URL.revokeObjectURL cleanup in useEffect hooks for all components using createObjectURL for file previews
**Goal:** Prevent memory leaks from blob URLs in file upload components

**Risk Notes:** Affects app-inspiration-gallery and app-instructions-gallery; straightforward fix

---

## BUGF-019: Implement Password Reset Rate Limiting and UX Improvements

**Status:** ready-to-work
**Phase:** 3 (Test Coverage & Quality)
**Depends On:** —
**Feature:** Add countdown timer for rate limits, disable buttons during cooldown, implement resend code rate limiting, and consolidate duplicate password strength implementations
**Goal:** Improve password reset security and user experience
**Story File:** `ready-to-work/BUGF-019/BUGF-019.md`
**Points:** 2
**Experiment Variant:** control

**Elaboration Verdict:** PASS (2026-02-11) - All 8 audit checks passed. 0 ACs added, 22 KB entries logged as non-blocking. Story ready for implementation without modifications.

**Story generated:** 2026-02-11T21:00:00Z with experiment variant control. Predictions: split_risk=0.3, review_cycles=1-2, token_estimate=90K-110K (low confidence - heuristics-only mode).

**Risk Notes:** UX improvements; includes extracting shared password strength utility

Related stories:
- BUGF-027: Rate Limiting Implementation Guide (UAT complete) - provides detailed spec at docs/guides/password-reset-rate-limiting.md
- BUGF-026: Auth Token Refresh Security Review (In QA)

---

## BUGF-020: Fix Accessibility Issues and Improve A11y Test Coverage

**Status:** created
**Phase:** 3 (Test Coverage & Quality)
**Depends On:** —
**Story File:** `backlog/BUGF-020/BUGF-020.md`
**Feature:** Fix accessibility issues and establish consistent a11y testing across all apps - includes promoting test utilities to shared package, fixing misleading screen reader instructions, adding accessible instructions to TagInput components, and adding comprehensive a11y test coverage to all apps
**Goal:** Ensure WCAG 2.1 AA compliance for all interactive components
**Points:** 8
**Experiment Variant:** control

**Story generated:** 2026-02-11T20:45:00Z with experiment variant control. Predictions: split_risk=0.2, review_cycles=1, token_estimate=100K (medium confidence).

**Risk Notes:** Low risk - Most a11y patterns already in place, primarily additive (fixes + tests). Test utilities promotion is straightforward.

---

## BUGF-021: Replace Type Assertions with Proper Types

**Status:** backlog
**Phase:** 4 (Code Quality & Cleanup)
**Depends On:** —
**Feature:** Remove 40+ 'as any' assertions and unsafe type casts across main-app, replace with proper type definitions and guards
**Goal:** Improve type safety and catch runtime errors at compile time

**Risk Notes:** Code quality improvement; may uncover hidden type issues

---

## BUGF-022: Remove Deprecated Legacy App and Update CI/CD

**Status:** backlog
**Phase:** 4 (Code Quality & Cleanup)
**Depends On:** —
**Feature:** Remove lego-moc-instructions-app directory and update GitHub workflows, CI config, and documentation to remove all references
**Infrastructure:**
- Update .github/workflows/deploy-frontend.yml
- Update .github/workflows/ci.yml

**Goal:** Clean up deprecated code and simplify build pipeline

**Risk Notes:** Low risk; app already removed in Nov 2025, only cleanup remains

---

## BUGF-023: Fix Wishlist Gallery Drag and Delete Issues

**Status:** backlog
**Phase:** 3 (Test Coverage & Quality)
**Depends On:** BUGF-005
**Feature:** Fix canDelete always false in auth module, add missing drag tests, fix keyboard announcement accuracy, and improve undo timer display
**Goal:** Ensure wishlist reordering and deletion work correctly

**Risk Notes:** Depends on shared auth hooks implementation; drag testing complexity

---

## BUGF-025: Lambda Execution Role Policy Documentation for S3 Presigned URLs

**Status:** backlog
**Phase:** 1 (Critical Functionality)
**Depends On:** BUGF-031
**Feature:** Create comprehensive documentation for Lambda execution role IAM policy configuration required for secure S3 presigned URL generation with strict bucket path restrictions
**Endpoints:** N/A (Documentation)
**Infrastructure:**
- Lambda execution role policy documentation
- S3 bucket scope enforcement examples

**Goal:** Ensure deployment engineers can correctly configure Lambda IAM permissions to prevent overly-permissive S3 access

**Risk Notes:** Security-critical documentation; supports SEC-001 risk mitigation for BUGF-031

---

## BUGF-026: Auth Token Refresh Security Review

**Status:** In QA Verification
**Phase:** 2 (Cross-App Infrastructure)
**Depends On:** —
**Blocks:** BUGF-005
**Feature:** Conduct comprehensive security architecture review of auth token refresh mechanisms before consolidating auth hooks into shared package
**Endpoints:** N/A (Security Review)
**Infrastructure:**
- Security review documentation
- Auth hook contract specification

**Goal:** Ensure auth hook consolidation in BUGF-005 does not introduce security vulnerabilities in session/token handling

**Story File:** `UAT/BUGF-026/BUGF-026.md`
**Elaboration Report:** `UAT/BUGF-026/ELAB-BUGF-026.md`
**Deliverable:** `UAT/BUGF-026/SECURITY-REVIEW.md`

**QA Setup:** Complete (2026-02-11) - All 5 preconditions validated. Evidence verified. Review passed. Moving to QA verification phase.

---

## BUGF-027: Rate Limiting Implementation Guide for Password Reset

**Status:** uat
**Phase:** 3 (Test Coverage & Quality)
**Depends On:** —
**Relates To:** BUGF-019, BUGF-026
**Story File:** `UAT/BUGF-027/BUGF-027.md`
**Elaboration Report:** `UAT/BUGF-027/ELAB-BUGF-027.md`
**Feature:** Create implementation guide and specification for server-side rate limiting on password reset code generation with frontend feedback mechanisms
**Infrastructure:**
- Backend rate limit specification
- Frontend feedback UI patterns

**Goal:** Prevent abuse of password reset functionality through rate limiting

**Points:** 1
**Experiment Variant:** control

**Elaboration Verdict:** PASS (2026-02-11) - All 8 audit checks passed. 0 ACs added, 12 KB entries logged as non-blocking (4 gaps + 8 enhancements). Story ready for implementation.

**Implementation:** Complete (2026-02-11) - All 6 ACs pass. Primary deliverable: `docs/guides/password-reset-rate-limiting.md`. Optional updates to 3 auth docs. E2E exempt (documentation story). Review passed iteration 2.

**QA Verification:** PASS (2026-02-11) - All 6 ACs verified PASS. 0 critical/major findings, 2 informational. Documentation comprehensive, technically accurate, ready for UAT review.

**Risk Notes:** Supports SEC-003 risk mitigation for password reset security. Implementation should reference BUGF-019 for frontend UX improvements.

**Story generated:** 2026-02-11T17:56:36Z with experiment variant control. Predictions: split_risk=0.1, review_cycles=1, token_estimate=80K (low confidence - heuristics-only mode).

---

## BUGF-028: Test Infrastructure Setup for MSW Mocking of Presigned URL Responses

**Status:** backlog
**Phase:** 3 (Test Coverage & Quality)
**Depends On:** —
**Feature:** Set up MSW mock service worker configuration for mocking S3 presigned URL API responses and upload flow testing in unit and integration tests
**Infrastructure:**
- MSW request handlers for presigned URL endpoints
- Mock S3 response setup

**Goal:** Enable testing of file upload flows without hitting real S3 in test environment

**Risk Notes:** Should be done early in Phase 3 to support test implementation for BUGF-013 and other upload-related tests

---

## BUGF-030: Implement Comprehensive E2E Test Suite

**Status:** backlog
**Phase:** 5 (E2E Testing)
**Depends On:** —
**Consolidates:** BUGF-008, BUGF-029
**Feature:** Build comprehensive Playwright E2E test suite covering all critical user flows:
- Password reset flow (forgot-password, reset-password, code expiration, rate limiting scenarios)
- File upload flows (presigned URL integration, session management, multi-file upload)
- Auth flows (sign-in, sign-up, session persistence, sign-out)
- Gallery CRUD operations (sets, instructions, inspiration, wishlist)
- Reusable Playwright page objects and selectors for upload components, auth forms, and gallery views

**Infrastructure:**
- Playwright page object classes for all major flows
- Playwright fixtures for auth state
- Test data seeding utilities
- Selector definitions for upload, auth, and gallery components

**Goal:** Ensure all critical user journeys work end-to-end across the application with maintainable, reusable test infrastructure

**Risk Notes:** Large scope — should be phased internally (auth flows first, then upload flows, then gallery CRUD). Email integration for password reset may require test email service. Consolidates work from BUGF-008 and BUGF-029.

---

## BUGF-024: Fix Code Quality Issues and Technical Debt

**Status:** backlog
**Phase:** 4 (Code Quality & Cleanup)
**Depends On:** —
**Feature:** Consolidate duplicate components, add null checks, make hardcoded limits configurable, remove mock API files, fix empty catch blocks, and add error logging
**Goal:** Reduce technical debt and improve code maintainability

**Risk Notes:** Low priority cleanup; can be done incrementally

---

## BUGF-033: Add Production Guard to Auth Bypass Middleware

**Status:** backlog
**Phase:** 1 (Critical Functionality)
**Depends On:** —
**Feature:** Add environment check to auth bypass middleware to ensure it cannot run in production. Currently `apps/api/lego-api/middleware/auth.ts:21-30` has a `bypassAuth` flag with no production guard.
**Security:** Critical — if auth bypass is accidentally enabled in production, all API routes become unauthenticated.

**Goal:** Prevent accidental auth bypass in production environments

**Risk Notes:** Critical security fix. Should add `if (process.env.NODE_ENV === 'production') throw new Error('Auth bypass not allowed in production')` or equivalent guard. Quick fix, high impact.

---

## BUGF-034: Fix DOM Manipulation Race Condition in Wishlist Sort Announcement

**Status:** backlog
**Phase:** 3 (Test Coverage & Quality)
**Depends On:** —
**Feature:** Fix race condition in `apps/web/app-wishlist-gallery/src/pages/main-page.tsx:240-254` where `document.getElementById` is used for screen reader announcements without null checks or React refs, causing potential crashes when DOM element is not yet mounted.

**Goal:** Eliminate race condition in accessibility announcements for wishlist sorting

**Risk Notes:** Replace direct DOM manipulation with React ref pattern or the shared `useAnnouncer` hook from `@repo/accessibility`. Low effort fix.

---

## BUGF-035: Validate Required Environment Variables on API Startup

**Status:** backlog
**Phase:** 1 (Critical Functionality)
**Depends On:** —
**Feature:** Add startup validation for required environment variables (`S3_BUCKET`, `AWS_REGION`, `DATABASE_URL`, etc.) across 4 storage adapter files in `apps/api/lego-api/domains/*/adapters/storage.ts`. Currently these variables are accessed with `process.env.VAR!` (non-null assertion) which silently fails at runtime.

**Goal:** Fail fast on missing environment configuration instead of crashing mid-request

**Risk Notes:** Affects instructions, gallery, sets, and wishlist storage adapters. Should use Zod schema validation at startup.

---

## BUGF-036: Add Input Validation to Feature Flag Admin Endpoints

**Status:** backlog
**Phase:** 1 (Critical Functionality)
**Depends On:** —
**Feature:** Add Zod validation for query parameters on feature flag admin endpoints in `apps/api/lego-api/domains/config/routes.ts:228-229`. The `pageSize` parameter and `environment` parameter are passed directly to queries without validation, enabling potential injection.
**Security:** Input validation gap on admin API surface.

**Goal:** Validate all user-supplied parameters on feature flag admin endpoints

**Risk Notes:** Quick fix using Zod `.parse()` on query params. Should also validate `pageSize` is a reasonable number (e.g., 1-100).

---

## BUGF-037: Add Transaction Safety for S3 + Database Operations

**Status:** backlog
**Phase:** 1 (Critical Functionality)
**Depends On:** —
**Feature:** Wrap S3 upload + database write operations in `apps/api/lego-api/domains/instructions/application/services.ts:277-299` in a compensating transaction pattern. Currently if S3 upload succeeds but DB write fails, orphaned S3 objects accumulate.

**Goal:** Ensure data consistency between S3 and database for instruction uploads

**Risk Notes:** Implement compensating transaction: if DB write fails, delete S3 object. Consider using a saga pattern or outbox pattern for reliability.

---

## BUGF-038: Consolidate Duplicated Uploader Components into @repo/upload

**Status:** backlog
**Phase:** 2 (Cross-App Infrastructure)
**Depends On:** —
**Feature:** Move 4 components that are 100% duplicated between `main-app` and `app-instructions-gallery` into the existing `@repo/upload` package:
- `ConflictModal`
- `RateLimitBanner`
- `UnsavedChangesDialog`
- `SessionExpiredBanner`

**Goal:** Eliminate ~400 lines of duplicated uploader UI code

**Risk Notes:** The `@repo/upload` package already exists and is the correct home for these. Straightforward move-and-reexport.

---

## BUGF-039: Standardize Zod Version Across All Packages

**Status:** backlog
**Phase:** 2 (Cross-App Infrastructure)
**Depends On:** —
**Feature:** Standardize on a single Zod version across all packages. Currently 8 different Zod versions are used across the monorepo, which can cause runtime type incompatibilities when schemas are shared between packages.
**Infrastructure:**
- Audit all package.json files for Zod version
- Pin to latest stable version
- Update pnpm-lock.yaml

**Goal:** Eliminate version mismatch issues with shared Zod schemas

**Risk Notes:** Low risk but tedious. Use `pnpm dedupe` after version alignment. Test all packages after update.

---

## BUGF-040: Remove Unused and Deprecated Packages

**Status:** backlog
**Phase:** 2 (Cross-App Infrastructure)
**Depends On:** —
**Feature:** Remove or archive packages with zero imports across the monorepo:
- `@repo/auth-hooks` (0 imports)
- `@repo/auth-utils` (0 imports)
- `@repo/hooks` (0 imports)
- `@repo/file-list` (0 imports)
- `@repo/upload-client` (0 imports)
- `@repo/upload-types` (being consolidated)
- `@repo/charts` (0 imports)

**Goal:** Reduce monorepo maintenance burden and dependency surface

**Risk Notes:** Verify zero imports with `grep -r` before removing. Some may be referenced in CI or build configs. Check `pnpm-workspace.yaml` for references.

---

## BUGF-041: Add UUID Validation to API Route Parameters

**Status:** backlog
**Phase:** 1 (Critical Functionality)
**Depends On:** —
**Feature:** Add UUID format validation on route parameters (`:id`) across API routes:
- `domains/instructions/routes.ts:74`
- `domains/gallery/routes.ts:81`
- `domains/admin/routes.ts:92`

Currently arbitrary strings are passed to database queries, which could cause unexpected errors or data access issues.
**Security:** Input validation gap on API route parameters.

**Goal:** Validate route parameters are valid UUIDs before hitting the database

**Risk Notes:** Quick fix using Zod `z.string().uuid()` validation in route handlers. Apply consistently across all domains.

---

## BUGF-042: Fix Rate Limiter Memory Leak in API Middleware

**Status:** backlog
**Phase:** 2 (Cross-App Infrastructure)
**Depends On:** —
**Feature:** Fix unbounded in-memory Map growth in `apps/api/lego-api/middleware/rate-limit.ts:33`. The rate limiter stores entries per IP but never evicts expired entries, causing memory growth proportional to unique visitors over the Lambda lifecycle.

**Goal:** Prevent memory exhaustion in long-running Lambda instances

**Risk Notes:** Add TTL-based eviction or use a bounded LRU cache. Consider whether rate limiting should use an external store (Redis/DynamoDB) for multi-instance consistency.

---

## BUGF-043: Consolidate Duplicated Test Setup Files

**Status:** backlog
**Phase:** 3 (Test Coverage & Quality)
**Depends On:** —
**Feature:** Extract shared test setup logic from 5 apps with 95%+ identical `src/test/setup.ts` files into a shared `@repo/test-utils` package or similar:
- `app-inspiration-gallery/src/test/setup.ts`
- `app-instructions-gallery/src/test/setup.ts`
- `app-sets-gallery/src/test/setup.ts`
- `app-wishlist-gallery/src/test/setup.ts`
- `main-app/src/test/setup.ts`

**Goal:** Single source of truth for test mocks and configuration

**Risk Notes:** Low risk. Each app's setup.ts can import from shared and add app-specific overrides.

---

## BUGF-044: Fix React Version Incompatibilities in Core Packages

**Status:** backlog
**Phase:** 2 (Cross-App Infrastructure)
**Depends On:** —
**Feature:** Update or remove packages declaring React 18 peer dependencies in a React 19 monorepo:
- `@repo/charts` declares React 18.2 peer dep
- `@repo/file-list` declares React 18.0 peer dep

These cause pnpm peer dependency warnings and can lead to runtime issues with React 19 features.

**Goal:** Ensure all packages are compatible with React 19

**Risk Notes:** If these packages have zero imports (see BUGF-040), removing them is the faster fix. Otherwise update peer deps and test.

---

## BUGF-045: Consolidate Duplicated Module Layout Components

**Status:** backlog
**Phase:** 4 (Code Quality & Cleanup)
**Depends On:** —
**Feature:** Extract the `module-layout.tsx` component that is 90%+ identical across 5 micro-frontend apps into a shared location (likely `@repo/app-component-library`):
- `app-dashboard/src/components/module-layout.tsx`
- `app-inspiration-gallery/src/components/module-layout.tsx`
- `app-instructions-gallery/src/components/module-layout.tsx`
- `app-sets-gallery/src/components/module-layout.tsx`
- `app-wishlist-gallery/src/components/module-layout.tsx`

**Goal:** Single module layout component used by all micro-frontends

**Risk Notes:** Minor per-app differences may exist (titles, navigation items). Use props or slots for customization.

---

## BUGF-046: Add Missing Tests for API Auth, MOCs, and Inspiration Domains

**Status:** backlog
**Phase:** 3 (Test Coverage & Quality)
**Depends On:** —
**Feature:** Add unit/integration tests for three API domains with zero test coverage:
- `domains/auth` (165 lines, 0 tests) — token validation, session management
- `domains/mocs` (355 lines, 0 tests) — MOC CRUD operations
- `domains/inspiration` (759 lines, 0 tests) — gallery management, album operations

**Goal:** Achieve minimum test coverage for critical API business logic

**Risk Notes:** Auth domain tests are highest priority due to security implications. Use MSW for HTTP mocking and in-memory DB for repository tests.

---

## BUGF-047: Fix CORS Configuration to Use Environment Variables

**Status:** backlog
**Phase:** 1 (Critical Functionality)
**Depends On:** —
**Feature:** Replace hardcoded CORS origins in `apps/api/lego-api/server.ts:61-67` with environment variable configuration. Currently uses a hardcoded allowlist that requires code changes for new environments.
**Security:** CORS misconfiguration risk when deploying to new environments.

**Goal:** Make CORS origins configurable per environment without code changes

**Risk Notes:** Use `process.env.CORS_ALLOWED_ORIGINS` (comma-separated) with fallback to current hardcoded values for backwards compatibility.

---

## BUGF-048: Consolidate Duplicated TagInput Components

**Status:** backlog
**Phase:** 4 (Code Quality & Cleanup)
**Depends On:** —
**Feature:** Consolidate 3 variants of TagInput components across apps into a single shared component:
- `main-app/src/components/MocEdit/TagInput.tsx`
- `app-instructions-gallery/src/components/MocEdit/TagInput.tsx`
- `app-sets-gallery/src/components/TagInput.tsx`

**Goal:** Single TagInput component in `@repo/app-component-library`

**Risk Notes:** Minor API differences between variants. Unify props interface and add any needed configuration options.

---

## BUGF-049: Fix N+1 Query in Gallery Album Repository

**Status:** backlog
**Phase:** 4 (Code Quality & Cleanup)
**Depends On:** —
**Feature:** Fix N+1 query pattern in `domains/gallery/adapters/repositories.ts:146-164` where album items are loaded individually in a loop instead of using a batch query with `WHERE album_id IN (...)`.

**Goal:** Improve gallery album list performance for users with many albums

**Risk Notes:** Low risk refactor. Replace loop with single Drizzle ORM query using `inArray()`. May significantly improve response time for heavy users.

---

## BUGF-050: Complete or Remove Incomplete Hook Migration to @repo/hooks

**Status:** backlog
**Phase:** 2 (Cross-App Infrastructure)
**Depends On:** —
**Feature:** The `@repo/hooks` package was created and hooks were deleted from 6 apps, but `@repo/hooks` currently has zero imports across the codebase. Either:
1. Complete the migration by updating all import paths to use `@repo/hooks`
2. Or remove `@repo/hooks` and restore hooks to their original app locations

**Goal:** Resolve the incomplete hook migration that left broken import paths

**Risk Notes:** Check git history to understand original migration intent. Option 1 is preferred if `@repo/hooks` contains the correct implementations. Related to BUGF-040 (unused packages).

---

## BUGF-051: E2E Tests for Presigned URL Upload Flow

**Status:** ready-to-work
**Phase:** 5 (E2E Testing)
**Depends On:** BUGF-032, BUGF-031
**Split From:** BUGF-032
**Story File:** `ready-to-work/BUGF-051/BUGF-051.md`
**Story Type:** test

### Scope

Playwright E2E tests to verify the complete presigned URL upload flow works end-to-end with a live backend. Covers happy path upload, error scenarios (invalid file type, file too large, network failure), session expiry/refresh, and multi-file upload.

### Acceptance Criteria

- AC1: Happy path upload E2E (presigned URL API call, S3 PUT, progress bar, success status)
- AC2: Error handling E2E (file too large, invalid type, network failure)
- AC3: Session expiry E2E (refresh generates new URLs, uploads retry)

**Points:** 2
