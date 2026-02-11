---
doc_type: stories_index
title: "BUGF Stories Index"
status: active
story_prefix: "BUGF"
created_at: "2026-02-10T00:00:00Z"
updated_at: "2026-02-11T16:00:00Z"
total_stories: 29
---

# BUGF Stories Index

All stories in this epic use the `BUGF-XXX` naming convention (starting at 001).

## Progress Summary

| Status | Count |
|--------|-------|
| completed | 0 |
| in-progress | 0 |
| ready | 2 |
| elaboration | 0 |
| backlog | 25 |
| deferred | 2 |

---

## Ready to Start

Stories with all dependencies satisfied (can be worked in parallel):

| Story | Title | Phase | Blocked By |
|-------|-------|-------|-----------|
| BUGF-002 | Implement Edit Save Functionality for Instructions | 1 | — |
| BUGF-003 | Implement Delete API and Edit Page for Sets Gallery | 1 | — |
| BUGF-006 | Replace Console Usage with @repo/logger | 2 | — |
| BUGF-009 | Fix and Enable Skipped Test Suites in Main App | 3 | — |
| BUGF-010 | Fix Hub.listen Mocking in Auth Tests | 3 | — |
| BUGF-012 | Add Test Coverage for Inspiration Gallery Components | 3 | — |
| BUGF-013 | Add Test Coverage for Instructions Gallery Components | 3 | — |
| BUGF-014 | Add Test Coverage for Sets Gallery Components | 3 | — |
| BUGF-015 | Add Test Coverage for Main App Components | 3 | — |
| BUGF-016 | Implement Missing API Integrations for Inspiration Gallery | 1 | — |
| BUGF-017 | Convert TypeScript Interfaces to Zod Schemas | 4 | — |
| BUGF-018 | Fix Memory Leaks from createObjectURL | 3 | — |
| BUGF-019 | Implement Password Reset Rate Limiting and UX Improvements | 3 | — |
| BUGF-020 | Fix Accessibility Issues Across Apps | 3 | — |
| BUGF-021 | Replace Type Assertions with Proper Types | 4 | — |
| BUGF-022 | Remove Deprecated Legacy App and Update CI/CD | 4 | — |
| BUGF-024 | Fix Code Quality Issues and Technical Debt | 4 | — |
| BUGF-025 | Lambda Execution Role Policy Documentation for S3 Presigned URLs | 1 | BUGF-031 |
| BUGF-026 | Auth Token Refresh Security Review | 2 | — |
| BUGF-027 | Rate Limiting Implementation Guide for Password Reset | 3 | — |
| BUGF-028 | Test Infrastructure Setup for MSW Mocking of Presigned URL Responses | 3 | — |
| BUGF-030 | Implement Comprehensive E2E Test Suite | 5 | — |

---

## BUGF-031: Backend API + Infrastructure for Presigned URL Upload

**Status:** pending
**Phase:** 1 (Critical Functionality)
**Depends On:** —
**Split From:** BUGF-001
**Story File:** `backlog/BUGF-031/BUGF-031.md`

### Scope

Create the backend API endpoint `POST /api/uploads/presigned-url` to generate secure, time-limited presigned S3 URLs for file uploads. Includes S3 bucket configuration, IAM policy setup, CORS configuration, and complete backend infrastructure for upload functionality.

### Acceptance Criteria (from parent)

AC1, AC2, AC4, AC5, AC6, AC8, AC9, AC10 (8 total)

**Points:** 5 (3-5 days)

---

## BUGF-032: Frontend Integration for Presigned URL Upload

**Status:** pending
**Phase:** 1 (Critical Functionality)
**Depends On:** BUGF-031
**Split From:** BUGF-001
**Story File:** `backlog/BUGF-032/BUGF-032.md`

### Scope

Integrate the presigned URL API into frontend upload pages (`app-instructions-gallery` and `main-app`). Wire up RTK Query API calls, connect to existing `@repo/upload` package, and implement E2E upload flow testing with session expiry handling.

### Acceptance Criteria (from parent)

AC3, AC7 (2 total)

**Points:** 3 (2-3 days)

---

## BUGF-002: Implement Edit Save Functionality for Instructions

**Status:** Ready to Work
**Phase:** 1 (Critical Functionality)
**Depends On:** —
**Feature:** Complete RTK Query mutation integration for saving instruction edits in both main-app and app-instructions-gallery
**Endpoints:**
- `PATCH /api/v2/instructions/mocs/:id`

**Goal:** Allow users to successfully save edits to instruction metadata

**Risk Notes:** Straightforward mutation integration - backend and RTK Query infrastructure already complete

**Story File:** plans/future/bug-fix/ready-to-work/BUGF-002/BUGF-002.md

---

## BUGF-003: Implement Delete API and Edit Page for Sets Gallery

**Status:** Ready to Work
**Phase:** 1 (Critical Functionality)
**Depends On:** —
**Feature:** Create useDeleteSetMutation integration, build missing edit-set-page.tsx, and wire up edit flow routing
**Endpoints:**
- `DELETE /api/sets/:id`
- `PATCH /api/sets/:id` (Note: Backend uses PATCH, not PUT)

**Goal:** Enable users to delete sets and access edit functionality via proper edit page

**Risk Notes:** Delete API stubbed with cache invalidation notes; backend APIs already deployed. High sizing complexity.

**Story File:** `ready-to-work/BUGF-003/BUGF-003.md`

**Elaboration Verdict:** PASS (2026-02-11) - All 8 audit checks passed. 0 ACs added, 18 KB entries logged as non-blocking. Story ready for implementation.

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

**Status:** backlog
**Phase:** 2 (Cross-App Infrastructure)
**Depends On:** —
**Feature:** Replace all console.log/error calls with @repo/logger across app-inspiration-gallery, app-instructions-gallery, and main-app
**Goal:** Ensure consistent, structured logging across all applications

**Risk Notes:** Low risk; straightforward search and replace with verification

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

**Status:** backlog
**Phase:** 3 (Test Coverage & Quality)
**Depends On:** —
**Feature:** Implement or remove 10 completely skipped test suites in main-app including navigation, performance, auth flow, and cache tests
**Goal:** Restore test coverage for critical navigation and auth functionality

**Risk Notes:** High priority; tests were skipped for a reason - may uncover deeper issues. High sizing complexity.

---

## BUGF-010: Fix Hub.listen Mocking in Auth Tests

**Status:** backlog
**Phase:** 3 (Test Coverage & Quality)
**Depends On:** —
**Feature:** Resolve 8 TODO comments in AuthProvider tests where Hub.listen mock is not being called in test environment
**Goal:** Ensure auth event listeners are properly tested

**Risk Notes:** Test environment issue; may require Jest/Vitest configuration changes

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

**Status:** backlog
**Phase:** 3 (Test Coverage & Quality)
**Depends On:** —
**Feature:** Create test files for 19 untested components including main-page.tsx, modals, drag components, and context menus
**Goal:** Achieve test coverage for critical inspiration gallery user flows

**Risk Notes:** Main page is highest priority; drag testing may require special setup. High sizing complexity.

---

## BUGF-013: Add Test Coverage for Instructions Gallery Components

**Status:** backlog
**Phase:** 3 (Test Coverage & Quality)
**Depends On:** —
**Feature:** Create test files for untested upload components, forms, and session management
**Goal:** Ensure upload flow is properly tested with mocked S3 interactions

**Risk Notes:** Upload testing complexity; requires mock S3 presigned URL flows

---

## BUGF-014: Add Test Coverage for Sets Gallery Components

**Status:** backlog
**Phase:** 3 (Test Coverage & Quality)
**Depends On:** —
**Feature:** Create test files for GalleryGrid, GalleryFilterBar, ModuleLayout, and SetDetailPage
**Goal:** Ensure sets gallery functionality is properly tested

**Risk Notes:** SetDetailPage is most complex; may need comprehensive test scenarios

---

## BUGF-015: Add Test Coverage for Main App Components

**Status:** backlog
**Phase:** 3 (Test Coverage & Quality)
**Depends On:** —
**Feature:** Create test files for 29 untested components including admin pages, modules, dialogs, and input components
**Goal:** Improve test coverage for main app to meet minimum 45% threshold

**Risk Notes:** Large scope; prioritize admin and auth-related components first. High sizing complexity.

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

**Status:** backlog
**Phase:** 3 (Test Coverage & Quality)
**Depends On:** —
**Feature:** Add countdown timer for rate limits, disable buttons during cooldown, implement resend code rate limiting, and consolidate duplicate password strength implementations
**Goal:** Improve password reset security and user experience

**Risk Notes:** UX improvements; includes extracting shared password strength utility

---

## BUGF-020: Fix Accessibility Issues Across Apps

**Status:** backlog
**Phase:** 3 (Test Coverage & Quality)
**Depends On:** —
**Feature:** Add missing ARIA labels, keyboard support, aria-describedby for errors, and fix misleading screen reader announcements in drag components
**Goal:** Ensure WCAG 2.1 AA compliance for all interactive components

**Risk Notes:** Cross-cutting; prioritize form inputs and upload components

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

**Status:** backlog
**Phase:** 2 (Cross-App Infrastructure)
**Depends On:** —
**Blocks:** BUGF-005
**Feature:** Conduct comprehensive security architecture review of auth token refresh mechanisms before consolidating auth hooks into shared package
**Endpoints:** N/A (Security Review)
**Infrastructure:**
- Security review documentation
- Auth hook contract specification

**Goal:** Ensure auth hook consolidation in BUGF-005 does not introduce security vulnerabilities in session/token handling

**Risk Notes:** Must be completed before BUGF-005 implementation - security review required before auth hook consolidation. Supports SEC-002 risk mitigation.

---

## BUGF-027: Rate Limiting Implementation Guide for Password Reset

**Status:** backlog
**Phase:** 3 (Test Coverage & Quality)
**Depends On:** —
**Relates To:** BUGF-019
**Feature:** Create implementation guide and specification for server-side rate limiting on password reset code generation with frontend feedback mechanisms
**Infrastructure:**
- Backend rate limit specification
- Frontend feedback UI patterns

**Goal:** Prevent abuse of password reset functionality through rate limiting

**Risk Notes:** Supports SEC-003 risk mitigation for password reset security. Implementation should reference BUGF-019 for frontend UX improvements.

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
