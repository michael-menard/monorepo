# Elaboration Report - REPA-003

**Date**: 2026-02-10
**Verdict**: CONDITIONAL PASS

## Summary

Story REPA-003 is well-elaborated with comprehensive PM artifacts and thorough acceptance criteria. The autonomous elaboration identified 3 MVP-critical gaps that were resolved by adding new acceptance criteria (AC-20, AC-21, AC-22). All 8 audit checks passed with no blocking issues.

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches stories.index.md exactly. Migrates useUploadManager and useUploaderSession to @repo/upload/hooks. No extra features or infrastructure. |
| 2 | Internal Consistency | PASS | — | Goals, Non-goals, and Acceptance Criteria are fully aligned. No contradictions detected. |
| 3 | Reuse-First | PASS | — | Story correctly identifies and reuses @repo/upload-types, @repo/logger, @repo/app-component-library. Upload client dependency explicitly tracked via REPA-002. |
| 4 | Ports & Adapters | N/A | — | No API endpoints. Story only migrates React hooks (frontend business logic). Hooks are transport-agnostic by nature. |
| 5 | Local Testability | PASS | — | AC-9 through AC-12 define comprehensive unit tests for both hooks. Test migration strategy clearly documented. Baseline test coverage: 859 lines for useUploadManager (34 tests), 269 lines for useUploaderSession (8 tests). |
| 6 | Decision Completeness | PASS | — | Dependency injection approach for auth state is fully specified. Session key migration strategy documented. No blocking TBDs. All critical decisions resolved via new ACs. |
| 7 | Risk Disclosure | PASS | — | Breaking changes in useUploaderSession API clearly disclosed. Dependency chain blocking (REPA-001, REPA-002) explicitly documented. Test migration complexity acknowledged. Session migration edge cases identified. |
| 8 | Story Sizing | PASS | — | 5 SP is reasonable. 2 hooks to migrate, ~1100 lines total implementation, ~1100 lines tests to migrate. 4 files to update, 4 files to delete. Clear 4-phase implementation sequence (10 hours estimated). Not oversized. |

## Issues & Required Fixes

| # | Issue | Severity | Required Fix | Status |
|---|-------|----------|--------------|--------|
| 1 | Upload client import path divergence | HIGH | main-app uses @/services/api/uploadClient while app-instructions-gallery uses @repo/upload-client. After consolidation, both must import from @repo/upload/client (requires REPA-002 completion). **Resolved: Added as AC-20** | RESOLVED |
| 2 | Storage key format mismatch will break existing sessions | HIGH | CRITICAL: @repo/upload-types uses 'uploader:{route}:{userId}' format but story documented 'uploader-session:{userId}' format. This breaks existing user sessions. Must use existing format to avoid migration complexity. **Resolved: Added as AC-21** | RESOLVED |
| 3 | Story references non-existent migrateSession utility | MEDIUM | migrateSession(oldKey, newKey) referenced in Architecture Notes does not exist in @repo/upload-types. Must either implement in REPA-006 or inline the logic in useUploaderSession. **Resolved: Added as AC-22** | RESOLVED |

## Split Recommendation

**Not Applicable** - Story passes sizing check. All MVP-critical gaps resolved via new ACs (20, 21, 22).

## Discovery Findings

### Gaps Identified

| # | Finding | Decision | Notes |
|---|---------|----------|-------|
| 1 | Upload client import path migration not explicitly documented | Add as AC | AC-20: Explicitly document upload client import path migration for both apps. main-app currently uses @/services/api/uploadClient; app-instructions-gallery uses @repo/upload-client. Both must migrate to @repo/upload/client after REPA-002 completion. |
| 2 | Storage key format mismatch will break existing sessions | Add as AC | AC-21: Use existing storage key format to preserve user sessions. VERIFIED: @repo/upload-types uses `uploader:{route}:{userId}` format (not `uploader-session:{userId}`). Update AC-4, AC-10, and Architecture Notes to match existing format to prevent breaking existing user sessions with in-progress uploads. |
| 3 | Story references non-existent migrateSession utility | Add as AC | AC-22: Implement localStorage key migration logic for anonymous-to-authenticated transition. Story references `migrateSession(oldKey, newKey)` utility which does NOT exist in @repo/upload-types. Existing `migrateSession` is for schema version migration only. Must inline localStorage key migration logic in useUploaderSession useEffect. |
| 4 | useToast import path inconsistency | KB-logged | main-app imports from @repo/app-component-library/hooks/useToast, app-instructions-gallery imports from @repo/app-component-library. Non-blocking - can standardize during implementation. |
| 5 | No TypeScript type-only imports | KB-logged | Story doesn't enforce 'import type' for type-only imports. Could increase bundle size but not blocking MVP. |
| 6 | No Zod schema migration for hook options | KB-logged | Story uses TypeScript interfaces for hook options. Per CLAUDE.md, should use Zod schemas. Defer to future refactor. |
| 7 | Missing hook deprecation warnings | KB-logged | No deprecation warnings in old hook locations before deletion. Could help catch missed migration spots. |
| 8 | No performance benchmarks for debounced localStorage writes | KB-logged | Story preserves 300ms debounce but doesn't validate optimality. Consider performance tests in future. |
| 9 | File handle tracking uses Map without size limits | KB-logged | useUploadManager tracks File objects with no cleanup strategy. Could accumulate memory in long sessions. Consider LRU policy in future. |
| 10 | Session migration (anon → auth) not covered by E2E tests | KB-logged | AC-7 documents session migration but E2E tests are optional. Complex flow benefits from E2E coverage. |
| 11 | No instrumentation for upload analytics | KB-logged | Hooks have no telemetry/analytics hooks for tracking upload behavior patterns. Consider optional callback in future. |

### Enhancement Opportunities

| # | Finding | Decision | Notes |
|---|---------|----------|-------|
| 1 | Hook composability: useUploadManager + useUploaderSession coupling | KB-logged | Consider composite useUploadFlow hook in future to reduce boilerplate in consuming apps. |
| 2 | Progress tracking enhancements: estimated time remaining | KB-logged | Add ETA calculation based on upload speed in future iteration. |
| 3 | Retry strategy enhancements: exponential backoff | KB-logged | Current retry re-queues immediately. Consider exponential backoff for transient errors. |
| 4 | Session restoration UX: preview before restore | KB-logged | Add modal preview with 'Resume' or 'Start Fresh' options for better UX with stale sessions. |
| 5 | Upload concurrency optimization: adaptive concurrency | KB-logged | Current concurrency fixed at 3. Consider adaptive based on network conditions. |
| 6 | File handle recovery: prompt user to re-select lost files | KB-logged | Add UI callback (onFileNeedsReselect) to trigger file input dialog for better recovery UX. |
| 7 | Session key migration: automatic cleanup of old anon keys | KB-logged | Background cleanup task to remove expired anon session keys and reduce localStorage bloat. |
| 8 | TypeScript strict mode alignment: enable noImplicitAny | KB-logged | Refactor hooks to eliminate any types for improved type safety. |
| 9 | Bundle size optimization: code splitting | KB-logged | Split @repo/upload-types into smaller modules for tree-shaking. |
| 10 | Developer experience: Storybook documentation | KB-logged | Add Storybook stories demonstrating hook usage patterns for 6+ consuming apps. |

### Follow-up Stories Suggested

(None - autonomous mode does not create follow-up stories)

### Items Marked Out-of-Scope

(None - autonomous mode does not mark items out-of-scope)

### KB Entries Created (Autonomous Mode Only)

Knowledge Base entries logged to: `plans/future/repackag-app/elaboration/REPA-003/_implementation/KNOWLEDGE-BASE-ENTRIES.md`

Summary of KB entries:
- KB-001: useToast import path standardization (non-blocking)
- KB-002: TypeScript type-only imports pattern
- KB-003: Zod schema migration for hook options
- KB-004: Hook deprecation warnings strategy
- KB-005: localStorage debounce performance benchmarks
- KB-006: File handle tracking memory management (LRU policy)
- KB-007: Session migration E2E test coverage
- KB-008: Upload analytics instrumentation
- KB-009: Hook composability patterns (useUploadFlow composite)
- KB-010: Progress tracking ETA calculation
- KB-011: Retry strategy exponential backoff
- KB-012: Session restoration UX preview modal
- KB-013: Adaptive upload concurrency
- KB-014: File handle recovery UX callback
- KB-015: Automatic localStorage cleanup for stale sessions
- KB-016: noImplicitAny strict mode alignment
- KB-017: Bundle size optimization via code splitting
- KB-018: Storybook documentation for hooks

## Acceptance Criteria Additions

Three new ACs added by autonomous elaboration to resolve MVP-critical gaps:

- **AC-20** (MVP-Critical): Explicitly document upload client import path migration for both apps
- **AC-21** (MVP-Critical): Use existing storage key format to preserve user sessions
- **AC-22** (MVP-Critical): Implement localStorage key migration logic for anonymous-to-authenticated transition

**Total ACs**: 22 (19 original + 3 new)

## Proceed to Implementation?

**YES** - Story may proceed to implementation. All MVP-critical gaps have been resolved via new acceptance criteria. No story split required. Dependencies remain: REPA-001 and REPA-002 (must complete before dev work begins).

---

## Elaboration Summary

- **Verdict**: CONDITIONAL PASS
- **Mode**: autonomous
- **Date**: 2026-02-10
- **Audit Checks Passed**: 8/8 (100%)
- **MVP-Critical Gaps Resolved**: 3 (AC-20, AC-21, AC-22)
- **Non-Blocking Items Logged**: 8 KB entries
- **Enhancements Logged**: 10 KB entries
- **Story Ready for Development**: YES (after REPA-001 and REPA-002 completion)
