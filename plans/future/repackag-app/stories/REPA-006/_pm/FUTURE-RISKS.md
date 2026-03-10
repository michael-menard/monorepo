# Future Risks: REPA-006 - Migrate Upload Types

Non-MVP concerns and polish opportunities for post-migration iterations.

---

## Non-MVP Risks

### Risk 1: Type Structure Reorganization
**Description:** Current structure maintains flat files (session.ts, upload.ts, slug.ts, edit.ts). REPA-016 pattern suggests subdirectory organization (form.ts, api.ts, utils.ts).

**Impact if not addressed post-MVP:**
- Harder to navigate as more types are added
- Less clear separation between form schemas vs API schemas vs utilities
- edit.ts (185 LOC) could benefit from splitting into edit-form.ts + edit-utils.ts

**Recommended Timeline:**
- Post-REPA-006, consider as separate refactor story
- Evaluate after REPA-003 (Upload Hooks) and REPA-005 (Upload Components) complete
- Not urgent - current structure is functional

**Estimated Effort:** 2 SP (reorganize files + update imports)

---

### Risk 2: Session Type Duplication with @repo/auth-services
**Description:** REPA-018 is creating @repo/auth-services for session management. Upload session types (session.ts, 170 LOC) may overlap with auth session types.

**Impact if not addressed post-MVP:**
- Two sources of truth for session-related schemas
- Potential type conflicts if auth and upload sessions diverge
- Confusion about which package owns session types

**Recommended Timeline:**
- After REPA-018 completes, audit for session type overlap
- Consider extracting shared session types to @repo/auth-utils or @repo/auth-services
- Low priority - upload sessions have domain-specific fields

**Estimated Effort:** 1 SP (audit overlap + potential consolidation)

---

### Risk 3: Slug Utility Placement
**Description:** slug.ts (111 LOC) contains slug generation utilities, not just schemas. May belong in utils package rather than types.

**Impact if not addressed post-MVP:**
- Types package contains business logic (violates single responsibility)
- Harder to discover slug utilities (developers expect utilities in utils/)
- Mixing concerns (Zod schemas + utility functions)

**Recommended Timeline:**
- Low priority - functional as-is
- Consider during future upload package refactor (post REPA-005)
- Evaluate if slug utilities are used outside upload domain

**Estimated Effort:** 1 SP (move to @repo/upload/utils + update imports)

---

### Risk 4: Test Coverage Gaps
**Description:** Existing tests are 559 LOC but coverage target is only 45%. May have untested edge cases in complex schemas.

**Impact if not addressed post-MVP:**
- Validation edge cases may not be caught
- Schema changes could introduce regressions
- Lower confidence in refactoring

**Recommended Timeline:**
- Not urgent for MVP (45% is acceptable baseline)
- Increase coverage as part of future test improvement initiative
- Prioritize edit.ts (185 LOC, likely most complex)

**Estimated Effort:** 2-3 SP (comprehensive test coverage to 80%+)

---

### Risk 5: Deprecation Period Enforcement
**Description:** @repo/upload-types should be removed after 2 sprint grace period, but may be forgotten.

**Impact if not addressed post-MVP:**
- Technical debt accumulates (unused package in monorepo)
- Confusion for new developers (two upload type packages)
- Wasted CI/build time for deprecated package

**Recommended Timeline:**
- Create follow-up story: "Remove @repo/upload-types Package"
- Schedule for sprint N+2 (after REPA-006 completes in sprint N)
- Add calendar reminder or ticket automation

**Estimated Effort:** 1 SP (delete package + final verification)

---

## Scope Tightening Suggestions

### Already Tight Scope
This story has excellent scope boundaries:
- ✅ Clear IN scope: Migrate 4 types + 3 tests + update imports + deprecate old package
- ✅ Clear OUT of scope: No restructuring, no new types, no upload client/hooks/components
- ✅ Minimal coordination: Only REPA-002/004 overlap (non-blocking)

### Potential Scope Creep to Avoid
- ❌ **Restructuring types into subdirectories**: Save for future story
- ❌ **Adding new upload types**: Feature work, not migration
- ❌ **Improving test coverage beyond migration**: Enhancement, not requirement
- ❌ **Deleting old package immediately**: Deprecation period needed
- ❌ **Migrating upload client/hooks**: Separate stories (REPA-002, REPA-003)

---

## Future Requirements

### Nice-to-Have: Type Documentation
**Description:** Add JSDoc comments to complex schemas (e.g., edit.ts validators).

**Why not MVP:**
- Existing code has minimal docs, not a regression
- Types are mostly self-documenting via Zod
- Can add incrementally as developers touch files

**Future Value:**
- Better IDE autocomplete
- Clearer intent for complex validation rules
- Onboarding aid for new developers

**Estimated Effort:** 1 SP (comprehensive JSDoc for all types)

---

### Nice-to-Have: Zod Error Message Customization
**Description:** Customize Zod error messages for better UX (e.g., "Slug must be lowercase" instead of "String must match pattern").

**Why not MVP:**
- Default error messages are functional
- Error handling is in consuming components, not schemas
- Can improve incrementally

**Future Value:**
- Better developer experience when debugging
- Clearer validation feedback
- Consistency across upload domain

**Estimated Effort:** 2 SP (review all schemas + add custom error messages)

---

### Nice-to-Have: Schema Export Organization
**Description:** Explicitly group exports in types/index.ts by category (session, upload, slug, edit).

**Why not MVP:**
- Barrel export is sufficient for MVP
- Current flat export works fine
- Can organize later if needed

**Future Value:**
- Clearer import statements: `import { SessionSchemas } from '@repo/upload/types'`
- Better tree-shaking (if consumers import subgroups)
- Easier to navigate exports

**Estimated Effort:** 0.5 SP (organize exports + update docs)

---

## Polish and Edge Case Handling

### Edge Case 1: Large File Uploads (>100MB)
**Context:** upload.ts likely has schemas for file metadata, may not handle extremely large files.

**Current State:** Likely constrained by backend limits (not schema limits)

**Future Enhancement:**
- Add explicit schema validation for file size limits
- Add schema support for chunked upload metadata
- Coordinate with backend upload service

**Estimated Effort:** 2 SP (add validation + backend coordination)

---

### Edge Case 2: HEIC/HEIF Image Formats
**Context:** slug.ts and edit.ts may reference image types, HEIC support varies.

**Current State:** REPA-004 handles HEIC conversion, types likely generic

**Future Enhancement:**
- Add explicit HEIC format schemas if needed
- Validate HEIC metadata in upload schemas
- Coordinate with REPA-004 completion

**Estimated Effort:** 1 SP (add HEIC-specific schemas if needed)

---

### Edge Case 3: Concurrent Upload Session Conflicts
**Context:** session.ts may not handle multiple simultaneous upload sessions per user.

**Current State:** Likely single-session model (sufficient for MVP)

**Future Enhancement:**
- Add session ID to all upload schemas
- Support multiple concurrent sessions in session.ts
- Update consuming hooks (REPA-003) to handle multi-session

**Estimated Effort:** 3 SP (schema changes + hook updates + backend coordination)

---

## Summary

**All future risks are non-blocking for MVP.**

This migration is well-scoped with clear boundaries. Future work primarily focuses on:
1. **Organizational improvements** (restructure types, move slug utils)
2. **Consolidation opportunities** (session type overlap with REPA-018)
3. **Polish** (docs, error messages, export organization)
4. **Enforcement** (delete deprecated package after grace period)

**Recommended Follow-Up Stories:**
1. REPA-006-FOLLOWUP-A: Remove @repo/upload-types Package (Sprint N+2, 1 SP)
2. REPA-006-FOLLOWUP-B: Restructure Upload Types (Post-REPA-005, 2 SP)
3. REPA-006-FOLLOWUP-C: Audit Session Type Overlap (Post-REPA-018, 1 SP)

None of these should delay REPA-006 implementation.
