# REPA-0510: Component Divergence Verification

**Timestamp**: 2026-02-11T18:00:00Z
**Verified By**: dev-setup-leader
**Status**: COMPLETE

---

## Executive Summary

**Result**: NO DIVERGENCE DETECTED

All 6 Uploader sub-components are **IDENTICAL** byte-for-byte between `main-app` and `app-instructions-gallery`. No reconciliation required. Canonical source: main-app (used as source of truth).

---

## Component-by-Component Analysis

### Uploader Sub-Components (6 total)

| Component | main-app LOC | app-instr LOC | Status | Recommendation |
|-----------|-------------|---------------|--------|----------------|
| ConflictModal | 195 | 195 | IDENTICAL | Use main-app as source |
| RateLimitBanner | 143 | 143 | IDENTICAL | Use main-app as source |
| SessionExpiredBanner | 70 | 70 | IDENTICAL | Use main-app as source |
| UnsavedChangesDialog | 95 | 95 | IDENTICAL | Use main-app as source |
| UploaderFileItem | 234 | 234 | IDENTICAL | Use main-app as source |
| UploaderList | 151 | 151 | IDENTICAL | Use main-app as source |

**Total LOC**: 888 lines × 1 (no duplication since copies are identical)

### Domain-Specific Components (2 total)

| Component | Location | LOC | Tests | Recommendation |
|-----------|----------|-----|-------|----------------|
| ThumbnailUpload | app-instructions-gallery only | 287 | YES | Migrate to @repo/upload |
| InstructionsUpload | app-instructions-gallery only | 358 | YES | Migrate to @repo/upload |

**Note**: These components only exist in app-instructions-gallery, not in main-app. No divergence concern.

---

## Canonical Implementation Source

**Recommendation**: Use `main-app` as the canonical source for all 6 Uploader sub-components.

**Rationale**:
- All components are byte-for-byte identical
- Both apps have tests (equal quality)
- main-app is the primary user-facing app
- No logic differences, no choices to make

---

## Migration Strategy

### Phase 1: Copy 6 Uploader Sub-Components from main-app
1. Copy ConflictModal from `apps/web/main-app/src/components/Uploader/ConflictModal/` to `packages/core/upload/src/components/ConflictModal/`
2. Copy RateLimitBanner from `apps/web/main-app/src/components/Uploader/RateLimitBanner/` to `packages/core/upload/src/components/RateLimitBanner/`
3. Copy SessionExpiredBanner (same pattern)
4. Copy UnsavedChangesDialog (same pattern)
5. Copy UploaderFileItem (same pattern)
6. Copy UploaderList (same pattern)

### Phase 2: Migrate 2 Domain-Specific Components
1. Move ThumbnailUpload from `apps/web/app-instructions-gallery/src/components/ThumbnailUpload/` to `packages/core/upload/src/components/ThumbnailUpload/`
2. Move InstructionsUpload from `apps/web/app-instructions-gallery/src/components/InstructionsUpload/` to `packages/core/upload/src/components/InstructionsUpload/`

### Phase 3: Update Imports
1. Update main-app: Replace `@/components/Uploader/*` with `@repo/upload/components/*`
2. Update app-instructions-gallery: Replace `@/components/*` imports with `@repo/upload/components/*`

### Phase 4: Cleanup
1. Delete old Uploader directories from both apps (EXCEPT SessionProvider, which is deferred to REPA-0520)
2. Delete old ThumbnailUpload and InstructionsUpload directories from app-instructions-gallery

---

## Quality Gate

**Precondition Status**: ✅ PASSED

- [ ] No divergence >10% LOC: **PASSED** (0% divergence detected)
- [ ] Canonical source identified: **PASSED** (main-app)
- [ ] Clear migration order established: **PASSED** (6 phases → 2 apps)
- [ ] No blocking issues found: **PASSED**

**Conclusion**: Ready to proceed with implementation.

---

## Token Log

- Divergence verification: ~2,000 tokens
- File comparisons: 6 component pairs (12 files)
- Grep/search operations: ThumbnailUpload, InstructionsUpload locations
- Documentation: This file
