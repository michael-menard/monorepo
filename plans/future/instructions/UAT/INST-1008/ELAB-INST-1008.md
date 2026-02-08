# Elaboration Report - INST-1008

**Date**: 2026-02-05
**Verdict**: CONDITIONAL PASS

## Summary

Story INST-1008 (Wire RTK Query Mutations for MOC Instructions API) passed all 8 audit checks and is ready for implementation. One MVP-critical gap identified: file upload endpoint mismatch between story AC-4 and actual backend routes. This has been resolved by updating AC-4 to specify three separate mutation hooks matching the backend's type-specific endpoints.

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches stories.index.md exactly. All 5 mutations are in scope (create, update, delete, uploadFile, deleteFile). |
| 2 | Internal Consistency | PASS | — | Goals, Non-goals, ACs, and Test Plan are all aligned. No contradictions found. |
| 3 | Reuse-First | PASS | — | Story explicitly reuses patterns from `wishlist-gallery-api.ts`, uses existing packages (`@reduxjs/toolkit`, `zod`, `@repo/logger`, `@repo/api-client/rtk/base-query`). No new packages created. |
| 4 | Ports & Adapters | PASS | — | Story only modifies frontend API client layer. Backend routes already exist and follow proper architecture (service layer in place). No business logic in route handlers. |
| 5 | Local Testability | PASS | — | Comprehensive unit and integration test plan defined. E2E tests correctly marked as N/A for infrastructure story per ADR-006. |
| 6 | Decision Completeness | PASS | — | No TBDs or blocking decisions. Architecture notes are complete with cache strategy, schema design, and file upload patterns all documented. |
| 7 | Risk Disclosure | PASS | — | Risks explicitly disclosed: path mismatch (`/api/v2/mocs` vs `/mocs`), missing cache invalidation, TypeScript interface usage, reading serverless.yml, barrel files. |
| 8 | Story Sizing | PASS | — | Story is appropriately sized as "Small" (6 hours). Has 11 ACs but they are straightforward mutation endpoints following established patterns. Single package touched (`@repo/api-client`). No split needed. |

## Issues & Required Fixes

| # | Issue | Severity | Required Fix | Status |
|---|-------|----------|--------------|--------|
| 1 | File upload endpoint mismatch | Medium | AC-4 updated to specify 3 separate mutation hooks matching backend routes | RESOLVED |
| 2 | Backend naming conventions differ | Low | Frontend uses its own naming (MocInstructions), schemas align at validation layer | SKIPPED |
| 3 | Tag naming needs verification | Low | Verify existing tags during implementation | SKIPPED |
| 4 | Schema file location verification | Low | Verify during implementation | SKIPPED |

## Discovery Findings

### Gaps Identified

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | File upload endpoint mismatch (MVP-Critical) | Add as AC | AC-4 updated to specify 3 mutation hooks for type-specific upload endpoints |

### Enhancement Opportunities

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1-16 | See FUTURE-OPPORTUNITIES.md | Auto-resolved | All 16 enhancements tracked for future iterations (telemetry, undo/redo, progress tracking, etc.) |

### Follow-up Stories Suggested

None required - all enhancements tracked in FUTURE-OPPORTUNITIES.md for future consideration.

### Items Marked Out-of-Scope

- Backend naming convention alignment: Frontend can use its own naming conventions; schemas align at runtime validation.
- Offline support/mutation queuing: Post-MVP feature requiring service worker.
- Collaborative editing awareness: Future team workspaces feature.

## Proceed to Implementation?

**YES** - Story may proceed to implementation. The file upload endpoint mismatch has been clarified and resolved. Implementation should create three type-specific upload mutation hooks to match backend routes.

## Implementation Notes

When implementing AC-4 (file upload), create three separate mutations:
1. `useUploadInstructionFileMutation` - POST /api/v2/mocs/:id/files/instruction
2. `useUploadPartsListFileMutation` - POST /api/v2/mocs/:id/files/parts-list
3. `useUploadThumbnailMutation` - POST /api/v2/mocs/:id/thumbnail

This matches the backend's type-specific routes and maintains clean API semantics.
