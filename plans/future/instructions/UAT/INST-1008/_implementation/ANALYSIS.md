# Elaboration Analysis - INST-1008

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

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | Backend file upload routes use specific type endpoints | Medium | Frontend schema and mutation endpoints must match backend's specific file type routes (`/mocs/:id/files/instruction`, `/mocs/:id/files/parts-list`, `/mocs/:id/thumbnail`) not generic `/mocs/:id/files`. Story AC-4 assumes generic endpoint. |
| 2 | Backend types use different naming conventions | Low | Backend uses `InstructionType`, `FileType`, etc. Frontend should use `MocInstructions`, `MocFile` for clarity. Schemas must align but types can differ. |
| 3 | Tag naming inconsistency in story | Low | Story says to update tags from `['Instruction', 'InstructionList']` to `['Moc', 'MocList', 'MocFile']`, but existing code shows tags are `['Instruction', 'InstructionList']`. Update is correct but should verify existing implementation. |
| 4 | File upload endpoints need type-specific handling | Medium | AC-4 says "POST /api/v2/mocs/:id/files" but backend has 3 separate endpoints: `/files/instruction`, `/files/parts-list`, `/thumbnail`. Frontend needs 3 separate mutation hooks or parameterized approach. |
| 5 | Missing schema file location verification | Low | Story assumes `schemas/instructions.ts` needs to be created, but should verify if it already exists with partial schemas. |

## Preliminary Verdict

**Verdict**: CONDITIONAL PASS

Story is well-written with comprehensive details, but has one critical gap: **file upload endpoint mismatch**. Backend API uses type-specific routes (`/files/instruction`, `/files/parts-list`, `/thumbnail`) while story AC-4 assumes a single generic `/files` endpoint. This must be clarified before implementation.

---

## MVP-Critical Gaps

Only gaps that **block the core user journey**:

| # | Gap | Blocks | Required Fix |
|---|-----|--------|--------------|
| 1 | File upload endpoint specification mismatch | Core journey: Users cannot upload files if frontend calls wrong endpoints | Update AC-4 to specify 3 separate mutation hooks: `useUploadInstructionFileMutation`, `useUploadPartsListMutation`, `useUploadThumbnailMutation` matching backend routes. OR document that generic `useUploadFileMutation` should route internally based on `fileType` parameter. |

---

## Worker Token Summary

- Input: ~25,000 tokens (story, agent instructions, backend routes, existing API client files, patterns)
- Output: ~2,500 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
