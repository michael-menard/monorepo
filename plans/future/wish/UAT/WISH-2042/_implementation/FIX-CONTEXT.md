# Fix Context - WISH-2042

## Fix Status: COMPLETE

All 5 blocking issues have been resolved. Ready for code review re-verification.

---

## Source: VERIFICATION.yaml (Code Review Report - Iteration 3)

Code review verdict: **FAIL** - 5 blocking issues found (1 pre-existing infrastructure issue + 4 style violations).

Review date: 2026-01-28T04:25:00Z
Review iteration: 3

---

## Blocking Issues Checklist

### Issue 1: Design System Global Styles Export [PRE-EXISTING]

**Priority**: HIGH (pre-existing, blocks entire app build)
**File**: `packages/core/design-system/package.json`
**Severity**: Build blocking
**Source**: Not introduced by WISH-2042

**Description**:
The @repo/design-system package is missing an export entry for `global-styles.css`. The file exists at `packages/core/design-system/src/global-styles.css` but is not declared in the package's exports field, causing build failures when apps try to import it.

**Current State**:
```json
// packages/core/design-system/package.json
{
  "exports": {
    // Missing: "./global-styles.css": "./src/global-styles.css"
  }
}
```

**Fix Required**:
- [x] Open `packages/core/design-system/package.json`
- [x] Add to exports field: `"./global-styles.css": "./src/global-styles.css"`
- [x] Save file
- [x] Run `pnpm build` to verify resolution
- [x] Confirm no build errors in @repo/app-wishlist-gallery

**Verification**:
```bash
pnpm build  # Should complete without design-system errors
```

**Status**: ✅ COMPLETE

---

### Issue 2: GotItModal Default Export [STYLE VIOLATION]

**Priority**: MEDIUM
**File**: `apps/web/app-wishlist-gallery/src/components/GotItModal/index.tsx`
**Line**: 425
**Severity**: Style violation
**Rule**: Named exports preferred (per CLAUDE.md)

**Description**:
Component has both a named export and a default export. Per CLAUDE.md project guidelines, only named exports should be used. This violates the component export conventions.

**Current Code**:
```typescript
// Line 425 (violation)
export default GotItModal
// Also has named export above
export function GotItModal(props: GotItModalProps) { ... }
```

**Fix Required**:
- [x] Open file: `apps/web/app-wishlist-gallery/src/components/GotItModal/index.tsx`
- [x] Navigate to line 425
- [x] Delete the line: `export default GotItModal`
- [x] Verify component still has named export: `export function GotItModal(...)`
- [x] Save file
- [x] Run lint to confirm: `pnpm eslint apps/web/app-wishlist-gallery/src/components/GotItModal/index.tsx`
- [x] No lint errors expected

**Verification**:
```bash
pnpm eslint apps/web/app-wishlist-gallery/src/components/GotItModal/index.tsx
# Should pass with no violations
```

**Status**: ✅ COMPLETE

---

### Issue 3: WishlistCard Default Export [STYLE VIOLATION]

**Priority**: MEDIUM
**File**: `apps/web/app-wishlist-gallery/src/components/WishlistCard/index.tsx`
**Line**: 170
**Severity**: Style violation
**Rule**: Named exports preferred (per CLAUDE.md)

**Description**:
Similar to Issue 2, this component has both named and default exports. Only named export should be present.

**Current Code**:
```typescript
// Line 170 (violation)
export default WishlistCard
// Also has named export
export function WishlistCard(props: WishlistCardProps) { ... }
```

**Fix Required**:
- [x] Open file: `apps/web/app-wishlist-gallery/src/components/WishlistCard/index.tsx`
- [x] Navigate to line 170
- [x] Delete the line: `export default WishlistCard`
- [x] Verify component still has named export
- [x] Save file
- [x] Run lint to confirm: `pnpm eslint apps/web/app-wishlist-gallery/src/components/WishlistCard/index.tsx`
- [x] No lint errors expected

**Verification**:
```bash
pnpm eslint apps/web/app-wishlist-gallery/src/components/WishlistCard/index.tsx
# Should pass with no violations
```

**Status**: ✅ COMPLETE

---

### Issue 4: Zod Schemas in Component File [ARCHITECTURE VIOLATION]

**Priority**: MEDIUM
**File**: `apps/web/app-wishlist-gallery/src/components/GotItModal/index.tsx`
**Lines**: 32-43
**Severity**: Architecture violation
**Rule**: Component Directory Structure (per CLAUDE.md)

**Description**:
Zod schemas are defined directly in the main component file instead of being moved to a `__types__/index.ts` file. Per CLAUDE.md, component-local schemas should be organized in the component's `__types__` directory.

**Current Structure** (WRONG):
```
GotItModal/
  index.tsx              # ❌ Contains Zod schemas (lines 32-43)
  __tests__/
    GotItModal.test.tsx
```

**Required Structure** (CORRECT):
```
GotItModal/
  index.tsx              # Only component code
  __tests__/
    GotItModal.test.tsx
  __types__/
    index.ts             # ✅ Zod schemas here
```

**Fix Required**:
- [x] Create directory: `apps/web/app-wishlist-gallery/src/components/GotItModal/__types__/`
- [x] Create file: `apps/web/app-wishlist-gallery/src/components/GotItModal/__types__/index.ts`
- [x] Read GotItModal/index.tsx and identify Zod schemas (lines 32-43)
- [x] Copy schema definitions to `__types__/index.ts`
- [x] Export all schemas from `__types__/index.ts`
- [x] Update imports in GotItModal/index.tsx: `import type { GotItModalProps } from './__types__'`
- [x] Delete schema definitions from GotItModal/index.tsx
- [x] Remove unused `z` import from GotItModal/index.tsx
- [x] Run lint: `pnpm eslint apps/web/app-wishlist-gallery/src/components/GotItModal/`
- [x] Run type check: `pnpm tsc --noEmit` (in app directory)
- [x] Verify no errors

**Verification**:
```bash
pnpm eslint apps/web/app-wishlist-gallery/src/components/GotItModal/
pnpm tsc --noEmit --project apps/web/app-wishlist-gallery/tsconfig.json
# Both should pass with no errors
```

**Status**: ✅ COMPLETE

---

### Issue 5: GalleryCard Import Source Verification [IMPORT RULE VIOLATION]

**Priority**: LOW
**File**: `apps/web/app-wishlist-gallery/src/components/WishlistCard/index.tsx`
**Line**: 12
**Severity**: Import validation needed
**Rule**: Critical Import Rules (per CLAUDE.md)

**Description**:
The import statement references `@repo/gallery`, which needs verification against CLAUDE.md's critical import rules. The correct import path should match the actual package structure.

**Current Import**:
```typescript
// Line 12
import { GalleryCard } from '@repo/gallery'
```

**Expected Patterns** (per CLAUDE.md):
- UI components → `@repo/ui`
- App-level components → `@repo/app-component-library`
- Design system → `@repo/design-system`
- Etc.

**Fix Required**:
- [x] Check if `@repo/gallery` is a valid published package
  - [x] Option A: Verify it exists in monorepo workspace ✅ (packages/core/gallery/)
  - [x] Option B: Verify it's in dependencies in app's package.json
- [x] Package verified as correct - `@repo/gallery` exists and exports GalleryCard
- [x] No changes needed - import is valid per monorepo structure
- [x] Run lint: `pnpm eslint apps/web/app-wishlist-gallery/src/components/WishlistCard/index.tsx`
- [x] No errors expected

**Verification**:
```bash
# Check if package exists
ls packages/core/gallery/  # ✅ Package exists
cat packages/core/gallery/package.json  # ✅ Name: "@repo/gallery"
grep "export.*GalleryCard" packages/core/gallery/src/index.ts  # ✅ Component exported

# Lint the file
pnpm eslint apps/web/app-wishlist-gallery/src/components/WishlistCard/index.tsx
# Should pass
```

**Status**: ✅ COMPLETE (Verified - no changes needed)

---

## Fix Execution Order

### Phase 1: Infrastructure Fix (Parallel or Sequential)

**Issue 1**: Design System Export
- Independent operation
- Can be done first or in parallel
- **Time**: ~5 minutes
- **Risk**: Low (adding missing export, non-breaking)
- **Impact**: Unblocks entire build

### Phase 2: Component Style Violations (Sequential)

**Issue 2**: GotItModal Default Export
- [ ] Fix default export removal
- [ ] Lint check
- **Time**: ~2 minutes
- **Risk**: Low (removing export, already has named export)

**Issue 3**: WishlistCard Default Export
- [ ] Fix default export removal
- [ ] Lint check
- **Time**: ~2 minutes
- **Risk**: Low (same pattern as Issue 2)

### Phase 3: Architecture Refactoring (Sequential)

**Issue 4**: GotItModal Zod Schemas
- [ ] Create __types__ directory and file
- [ ] Extract and move schema definitions
- [ ] Update imports
- [ ] Delete old definitions
- [ ] Type check and lint
- **Time**: ~10 minutes
- **Risk**: Medium (moving code, refactoring imports)

### Phase 4: Import Validation (Sequential)

**Issue 5**: GalleryCard Import
- [ ] Verify package exists
- [ ] Update import if needed
- [ ] Lint and type check
- **Time**: ~5 minutes
- **Risk**: Low (import verification only, may be already correct)

---

## Success Criteria

### For Each Issue

**Issue 1**: ✓ `pnpm build` succeeds without design-system errors
**Issue 2**: ✓ No lint violations in GotItModal/index.tsx, default export removed
**Issue 3**: ✓ No lint violations in WishlistCard/index.tsx, default export removed
**Issue 4**: ✓ Schemas in __types__/index.ts, imports updated, no type errors
**Issue 5**: ✓ Import source verified or corrected, no lint warnings

### Overall Success

- [ ] All 5 issues fixed
- [ ] `pnpm build` passes without errors
- [ ] `pnpm eslint apps/web/app-wishlist-gallery/` passes (all app files)
- [ ] `pnpm tsc --noEmit` passes (all touched packages)
- [ ] No new lint warnings introduced
- [ ] No type errors in touched files

### Verification Commands

```bash
# After fixes complete, run:
pnpm build                      # Should succeed
pnpm eslint apps/web/app-wishlist-gallery/  # Should pass
pnpm tsc --noEmit --project apps/web/app-wishlist-gallery/tsconfig.json  # Should pass
```

---

## Risk Assessment

### Pre-existing Issue (Issue 1)
- **Risk Level**: LOW
- **Mitigation**: Add exports field, test build
- **Rollback**: Simple - revert package.json

### Default Exports (Issues 2, 3)
- **Risk Level**: LOW
- **Mitigation**: Component has named export, safe to remove default
- **Rollback**: Simple - re-add one-line export

### Schema Refactoring (Issue 4)
- **Risk Level**: MEDIUM
- **Mitigation**: Create new file first, move imports carefully, test types
- **Rollback**: Move schemas back if issues arise, revert imports

### Import Validation (Issue 5)
- **Risk Level**: LOW
- **Mitigation**: Verify package exists before changing import
- **Rollback**: Revert import if package not found

---

## Notes

### Scope
- **Backend**: No fixes needed (all code review checks passed for backend)
- **Frontend**: 5 issues all in frontend (styles, imports, architecture)
- **Infrastructure**: 1 issue (pre-existing design-system export)

### Not Blocking
- These are pure style/architecture violations
- No functional bugs or test failures
- Backend code is production-ready
- Undo functionality status already addressed in previous phase

### Dependencies
- Issue 1 (design-system) doesn't depend on other issues
- Issues 2-5 are all in app-wishlist-gallery, can be done in sequence

---

## Checklist Summary

**Total Issues**: 5
**Critical Issues**: 4 (Issues 2-5)
**Pre-existing Issues**: 1 (Issue 1)
**Estimated Total Time**: ~25 minutes
**Estimated Difficulty**: Low-Medium

```
Issue 1 (Design System Export):     [x] COMPLETE
Issue 2 (GotItModal Default Export): [x] COMPLETE
Issue 3 (WishlistCard Default Export): [x] COMPLETE
Issue 4 (Zod Schemas in Types):     [x] COMPLETE
Issue 5 (GalleryCard Import):       [x] COMPLETE (Verified)

Overall Status: [x] COMPLETE - All 5 issues resolved
```

---

## Next Phase

After all issues are fixed:
1. Commit fixes to feature branch
2. Re-run code review: `pnpm run code-review`
3. Verify all workers pass (build, lint, style, syntax, security, typecheck)
4. Use `/dev-code-review` command to trigger full verification
5. Move story to next phase when code review passes
