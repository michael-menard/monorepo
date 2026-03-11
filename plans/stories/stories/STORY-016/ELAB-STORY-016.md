# ELAB-STORY-016: MOC File Upload Management

## Overall Verdict: CONDITIONAL PASS

**STORY-016 MAY proceed to implementation** after addressing the required fixes listed below.

---

## Audit Summary

| Audit Area | Status | Notes |
|------------|--------|-------|
| Scope Alignment | PASS with issues | Minor discrepancy with stories.index.md |
| Internal Consistency | PASS | Goals, Non-goals, ACs are aligned |
| Reuse-First Enforcement | PASS | Leverages existing packages correctly |
| Ports & Adapters Compliance | PASS | Core functions follow DI pattern |
| Local Testability | PASS | Concrete HTTP tests defined |
| Decision Completeness | PASS | No blocking TBDs |
| Risk Disclosure | PASS | 4.5MB limit documented, OpenSearch fail-open noted |

---

## Issues Found

### Issue #1: Scope Mismatch with stories.index.md (Medium)

**Location:** stories.index.md vs STORY-016.md

**Description:** The stories.index.md entry for STORY-016 lists `moc-instructions/download-file/handler.ts` as an endpoint to migrate, but STORY-016.md explicitly excludes it in Non-Goals:

> **Download file endpoint** - Files are accessed via presigned URLs in get/list responses; no dedicated download endpoint

**Impact:** This is an intentional exclusion, not an error. The story explicitly documents why downloads are not needed (presigned URLs in other responses). The discrepancy is in the index file, not the story.

**Resolution Required:** Either:
- (A) Update `stories.index.md` to remove `download-file/handler.ts` from STORY-016's endpoint list, OR
- (B) Add a note in stories.index.md clarifying download is covered by existing presigned URL pattern

**Severity:** Medium - Does not block implementation but creates confusion.

---

### Issue #2: AWS Handler Uses Hard Delete, Story Says Soft Delete (Low)

**Location:** AC-11, AC-44 vs AWS handler `delete-file/handler.ts`

**Description:** The story specifies soft-delete (sets `deletedAt`):
> AC-11: DELETE `/api/mocs/:id/files/:fileId` soft-deletes the file (sets `deletedAt`)

However, the existing AWS handler at line 63 performs a hard delete:
```typescript
await db.delete(mocFiles).where(eq(mocFiles.id, fileId))
```

**Impact:** This is acceptable - the Vercel migration should implement the correct soft-delete behavior as specified. The AWS implementation may have been legacy.

**Resolution Required:** None - the story correctly specifies the desired behavior. Dev should implement soft-delete as documented.

**Severity:** Low - Story is correct; AWS implementation differs.

---

### Issue #3: Missing HTTP Test for Multi-File Upload (Low)

**Location:** HTTP Contract Plan section

**Description:** AC-2 through AC-4 and the Test Plan mention multi-file uploads (HP-2, EDGE-3), but the HTTP Contract Plan only shows a single-file upload example (`#uploadSingleFile`). The comment `#uploadMultipleFiles` is referenced in Test Plan HP-2 but not defined in the HTTP Contract Plan.

**Impact:** Dev will need to add the multi-file HTTP test request.

**Resolution Required:** Add `#uploadMultipleFiles` HTTP request to the contract plan (or Dev adds during implementation).

**Severity:** Low - Easily added during implementation.

---

### Issue #4: File Validator Package Reference Unverified (Low)

**Location:** Reuse Plan

**Description:** The story references `@repo/file-validator` for magic bytes validation:
> `@repo/file-validator` - Magic bytes validation, file validation configs

This package should be verified to exist. If it doesn't exist yet, it should either be created in a prior story or the story should note that this validation will be implemented inline.

**Impact:** Dev should verify the package exists or implement magic bytes validation within moc-instructions-core.

**Resolution Required:** Dev to verify or document approach during implementation.

**Severity:** Low - Implementation detail.

---

## What Is Acceptable As-Is

1. **Scope Definition**: Clear boundaries for 5 endpoints with explicit non-goals
2. **Acceptance Criteria**: 57 comprehensive ACs covering happy paths, errors, and edge cases
3. **Architecture**: Follows established ports & adapters pattern from STORY-015
4. **Core Package Extension**: Correctly extends `@repo/moc-instructions-core` with new functions
5. **Rate Limiting**: Properly shares rate limit key with create uploads
6. **OpenSearch Handling**: Correctly specified as fail-open (logged warning)
7. **4.5MB Constraint**: Clearly documented with guidance to use presigned URL pattern
8. **Seed Data**: Deterministic UUIDs with upsert pattern
9. **Test Plan**: Comprehensive with 10 happy paths, 20 error cases, 7 edge cases

---

## Required Fixes Before Implementation

| Priority | Issue | Required Action |
|----------|-------|-----------------|
| Medium | #1 | Update stories.index.md to remove download-file from STORY-016 endpoint list |

---

## Recommendations (Non-Blocking)

1. During implementation, add `#uploadMultipleFiles` HTTP test request
2. Verify `@repo/file-validator` exists or implement magic bytes validation in core package
3. Confirm soft-delete implementation for delete-file endpoint (correct deviation from AWS)

---

## Elaboration Completed

**Date:** 2026-01-21
**Agent:** QA (Elaboration/Audit)
**Verdict:** CONDITIONAL PASS
**Proceed to Implementation:** YES, after fixing Issue #1 (stories.index.md update)

---

## Post-Elaboration Status Update

Story status updated from `backlog` to `ready-to-work` pending the Medium-priority fix.

**Note:** The Medium-priority issue (#1) is a documentation discrepancy in the index file, not a defect in the story itself. Dev may proceed with implementation while PM updates the index.
