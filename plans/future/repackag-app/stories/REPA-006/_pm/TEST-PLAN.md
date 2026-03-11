# Test Plan: REPA-006 - Migrate Upload Types

## Scope Summary
- **Endpoints touched**: None (types migration only, no API changes)
- **UI touched**: No
- **Data/storage touched**: No
- **Packages modified**: @repo/upload, @repo/upload-types (deprecated)
- **Apps modified**: main-app (8 files), app-instructions-gallery (9 files)

---

## Happy Path Tests

### Test 1: Migrate Type Definitions
**Setup:**
- Clean workspace at commit baseline
- @repo/upload package exists with types/ placeholder directory
- @repo/upload-types package contains source files (session.ts, upload.ts, slug.ts, edit.ts)

**Action:**
1. Move @repo/upload-types/src/session.ts → @repo/upload/src/types/session.ts
2. Move @repo/upload-types/src/upload.ts → @repo/upload/src/types/upload.ts
3. Move @repo/upload-types/src/slug.ts → @repo/upload/src/types/slug.ts
4. Move @repo/upload-types/src/edit.ts → @repo/upload/src/types/edit.ts
5. Create barrel export at @repo/upload/src/types/index.ts

**Expected Outcome:**
- All 4 type files exist in @repo/upload/src/types/
- Barrel export re-exports all schemas
- No TypeScript compilation errors in @repo/upload
- Files total 817 LOC (unchanged from source)

**Evidence:**
```bash
ls -l packages/core/upload/src/types/
wc -l packages/core/upload/src/types/*.ts
pnpm --filter @repo/upload build
```

---

### Test 2: Migrate Test Files
**Setup:**
- Type files successfully migrated from Test 1
- @repo/upload-types/src/__tests__/ contains 3 test files

**Action:**
1. Move session.test.ts (177 LOC) → @repo/upload/src/types/__tests__/session.test.ts
2. Move upload.test.ts (249 LOC) → @repo/upload/src/types/__tests__/upload.test.ts
3. Move slug.test.ts (133 LOC) → @repo/upload/src/types/__tests__/slug.test.ts
4. Update test imports from `@repo/upload-types` to `@repo/upload/types`

**Expected Outcome:**
- All 3 test files exist in @repo/upload/src/types/__tests__/
- Test imports resolve to @repo/upload/types
- All tests pass
- Coverage meets or exceeds 45% minimum

**Evidence:**
```bash
pnpm --filter @repo/upload test
pnpm --filter @repo/upload test:coverage
# Verify coverage report shows >= 45%
```

---

### Test 3: Update Consumer Imports in main-app
**Setup:**
- Type files migrated and tested
- main-app has 8 files importing from @repo/upload-types

**Action:**
1. Update imports in all 8 main-app files:
   - hooks/useUploadManager.ts
   - hooks/useUploaderSession.ts
   - components/Uploader/UploaderFileItem/index.tsx
   - components/Uploader/UploaderList/index.tsx
   - components/MocEdit/EditForm.tsx
   - components/MocEdit/SlugField.tsx
   - routes/pages/InstructionsNewPage.tsx
   - (1 additional file from codebase scan)
2. Change `@repo/upload-types` → `@repo/upload/types`

**Expected Outcome:**
- All imports resolve successfully
- No TypeScript errors
- App builds successfully

**Evidence:**
```bash
pnpm --filter main-app check-types
pnpm --filter main-app build
grep -r "@repo/upload-types" apps/web/main-app/src/ # Should return no results (except deprecated wrappers)
```

---

### Test 4: Update Consumer Imports in app-instructions-gallery
**Setup:**
- Type files migrated and tested
- app-instructions-gallery has 9 files importing from @repo/upload-types

**Action:**
1. Update imports in all 9 files:
   - hooks/useUploadManager.ts
   - hooks/useUploaderSession.ts
   - components/Uploader/* (similar to main-app)
   - pages/upload-page.tsx
   - pages/CreateMocPage.tsx
   - (additional files from codebase scan)
2. Change `@repo/upload-types` → `@repo/upload/types`

**Expected Outcome:**
- All imports resolve successfully
- No TypeScript errors
- App builds successfully

**Evidence:**
```bash
pnpm --filter app-instructions-gallery check-types
pnpm --filter app-instructions-gallery build
grep -r "@repo/upload-types" apps/web/app-instructions-gallery/src/ # Should return no results
```

---

### Test 5: Delete Deprecated Wrapper Files
**Setup:**
- All consumers updated to use @repo/upload/types
- Deprecated wrappers exist at apps/web/main-app/src/types/uploader-*.ts

**Action:**
1. Delete apps/web/main-app/src/types/uploader-upload.ts (28 LOC wrapper)
2. Delete apps/web/main-app/src/types/uploader-session.ts (25 LOC wrapper)
3. Delete apps/web/main-app/src/types/__tests__/uploader-upload.test.ts (wrapper test)

**Expected Outcome:**
- Files removed from filesystem
- No import errors (no code should be using these deprecated wrappers)
- main-app still builds

**Evidence:**
```bash
ls apps/web/main-app/src/types/uploader-*.ts # Should return "No such file"
pnpm --filter main-app check-types
pnpm --filter main-app build
```

---

### Test 6: Configure Package Exports
**Setup:**
- Type files migrated to @repo/upload/types
- @repo/upload package.json needs types export path

**Action:**
1. Update @repo/upload/package.json exports field to include types subpath:
   ```json
   "exports": {
     "./types": "./src/types/index.ts",
     ...
   }
   ```
2. Verify tsconfig.json includes types/ directory in compilation

**Expected Outcome:**
- Import `@repo/upload/types` resolves correctly
- TypeScript can find type definitions
- Package builds successfully

**Evidence:**
```bash
pnpm --filter @repo/upload build
node -e "console.log(require.resolve('@repo/upload/types'))" # Should resolve to types/index.ts
```

---

### Test 7: Deprecate @repo/upload-types Package
**Setup:**
- All consumers migrated to @repo/upload/types
- @repo/upload-types package still functional

**Action:**
1. Add deprecation notice to @repo/upload-types/package.json:
   ```json
   "deprecated": "Moved to @repo/upload/types. See README for migration guide."
   ```
2. Update README.md with migration instructions
3. Add console.warn() at top of @repo/upload-types/src/index.ts:
   ```typescript
   console.warn('[DEPRECATED] @repo/upload-types is deprecated. Use @repo/upload/types instead.')
   ```
4. Document deprecation timeline (2 sprint cycles before removal)

**Expected Outcome:**
- Package still functions for legacy consumers
- Deprecation warning logs when imported
- README provides clear migration path

**Evidence:**
- Read README.md and verify migration instructions
- Import @repo/upload-types in test script and verify warning appears
- Check package.json for deprecated field

---

## Error Cases

### Error Case 1: Zod Version Mismatch
**Setup:**
- Old package uses zod ^3.23.8
- New package uses zod 4.1.13

**Action:**
1. Run all migrated tests with zod 4.1.13
2. Watch for schema incompatibilities

**Expected:**
- All schemas remain compatible (Zod 3→4 is mostly backward compatible)
- If incompatibilities found, update schemas to use Zod 4 syntax

**Evidence:**
```bash
pnpm --filter @repo/upload test
# Check for Zod-related errors in output
```

**Mitigation if errors occur:**
- Update schema syntax to Zod 4 conventions
- Re-run tests until passing

---

### Error Case 2: Missing Import Updates
**Setup:**
- Consumer files may have been missed in import scan

**Action:**
1. Run global grep for remaining @repo/upload-types references:
   ```bash
   grep -r "@repo/upload-types" apps/web/*/src/
   ```

**Expected:**
- No results (all imports updated)
- If results found, update those imports

**Evidence:**
- Grep output showing zero results in app source code
- Only references should be in deprecated package itself

---

### Error Case 3: Build Failures After Migration
**Setup:**
- All code migrated
- Apps may fail to build

**Action:**
1. Run full build: `pnpm build`
2. Capture any errors

**Expected:**
- All apps build successfully
- If failures, check for:
  - Missing barrel exports
  - Incorrect export paths
  - Type resolution issues

**Evidence:**
```bash
pnpm build 2>&1 | tee build-log.txt
# Review log for errors
```

**Mitigation:**
- Fix missing exports in types/index.ts
- Verify package.json exports field
- Check tsconfig.json paths

---

## Edge Cases (Reasonable)

### Edge Case 1: Concurrent Work in REPA-002/REPA-004
**Setup:**
- REPA-002 and REPA-004 are in progress
- They may have uncommitted changes importing from @repo/upload-types

**Action:**
1. Check git status for REPA-002 and REPA-004 story branches
2. Coordinate import path updates if those stories complete during REPA-006

**Expected:**
- If REPA-002/004 complete first: update their imports during this story
- If REPA-006 completes first: notify REPA-002/004 to update imports

**Evidence:**
- Git branch status showing coordination
- Updated import paths in relevant files

**Mitigation:**
- Communication with team about migration order
- Merge conflicts handled via rebase

---

### Edge Case 2: Empty/Placeholder Test Coverage
**Setup:**
- Test files migrated but may not cover all edge cases

**Action:**
1. Run coverage report: `pnpm --filter @repo/upload test:coverage`
2. Check for uncovered branches

**Expected:**
- Coverage >= 45% (existing tests already at 559 LOC)
- If below, investigate why tests were not migrated correctly

**Evidence:**
- Coverage report showing percentage breakdown
- Identify any uncovered critical paths

**Mitigation if low:**
- Verify all 3 test files were migrated
- Check test imports are correct
- Ensure tests are running (not skipped)

---

### Edge Case 3: Deprecation Period Confusion
**Setup:**
- Users may not realize old package is deprecated

**Action:**
1. Verify deprecation warning appears in console
2. Check README is clear about timeline

**Expected:**
- Console warning visible when importing old package
- README states: "This package will be removed after 2 sprint cycles (approx. 4 weeks)"

**Evidence:**
- Test script importing old package shows warning
- README.md contains deprecation timeline

---

## Required Tooling Evidence

### Backend
Not applicable - this is a types-only migration with no API changes.

### Frontend (Types Only)
**Build Evidence:**
```bash
# Full monorepo build
pnpm build

# Type checking all apps
pnpm check-types:all

# Linting all apps
pnpm lint:all

# Testing all apps
pnpm test:all
```

**Import Verification:**
```bash
# Verify no remaining old imports in app source
grep -r "@repo/upload-types" apps/web/main-app/src/
grep -r "@repo/upload-types" apps/web/app-instructions-gallery/src/

# Both should return no results (only deprecated package references itself)
```

**Package-Specific Evidence:**
```bash
# @repo/upload package tests
pnpm --filter @repo/upload test
pnpm --filter @repo/upload test:coverage
pnpm --filter @repo/upload build

# Verify coverage >= 45%
# Verify 559 LOC of tests exist in types/__tests__/
```

**Deprecation Warning Evidence:**
```bash
# Create test script that imports old package
node -e "require('@repo/upload-types')"
# Should output deprecation warning to console
```

---

## Risks to Call Out

### Risk 1: Zod Version Compatibility (Medium Risk)
**Description:** Old package uses Zod ^3.23.8, new package uses Zod 4.1.13. Schema syntax may have changed.

**Mitigation:**
- Run all tests immediately after migration
- If failures, update schemas to Zod 4 syntax (mostly backward compatible)
- Zod 3→4 upgrade is generally smooth but requires verification

**Severity:** Medium (tests should catch issues early)

---

### Risk 2: Incomplete Import Updates (Medium Risk)
**Description:** 17 files need import updates across 2 apps. May miss some files in initial scan.

**Mitigation:**
- Use comprehensive grep to find all imports: `grep -r "@repo/upload-types" apps/`
- Run type checking after each app update to catch missing imports
- Final verification: grep should return zero app source results

**Severity:** Medium (caught by type checking and builds)

---

### Risk 3: REPA-002/004 Coordination (Low Risk)
**Description:** In-progress stories may have uncommitted changes importing from old package.

**Mitigation:**
- Check story branch status before merging REPA-006
- Coordinate with team on merge order
- Deprecated package remains functional with warnings for grace period

**Severity:** Low (deprecated package remains functional)

---

### Risk 4: Deprecation Timeline Confusion (Low Risk)
**Description:** Team may not know when old package will be removed.

**Mitigation:**
- Clear README with timeline (2 sprint cycles ≈ 4 weeks)
- Console warning on every import
- package.json deprecated field

**Severity:** Low (multiple communication channels)

---

## Test Execution Order

1. **Test 1**: Migrate type definitions → verify build
2. **Test 2**: Migrate tests → verify coverage
3. **Test 3**: Update main-app imports → verify build
4. **Test 4**: Update app-instructions-gallery imports → verify build
5. **Test 5**: Delete deprecated wrappers → verify no impact
6. **Test 6**: Configure package exports → verify resolution
7. **Test 7**: Deprecate old package → verify warnings
8. **Error Cases 1-3**: Run after happy path
9. **Edge Cases 1-3**: Run after error cases
10. **Final verification**: Full monorepo build, type check, lint, test

---

## Success Criteria

All tests pass with:
- ✅ All type files migrated (817 LOC)
- ✅ All test files migrated (559 LOC)
- ✅ All 17 consumer files updated
- ✅ Deprecated wrappers deleted (2 files)
- ✅ Package exports configured
- ✅ Old package deprecated with warnings
- ✅ Coverage >= 45%
- ✅ `pnpm build` succeeds
- ✅ `pnpm check-types:all` succeeds
- ✅ `pnpm lint:all` succeeds
- ✅ `pnpm test:all` succeeds
- ✅ Zero `@repo/upload-types` references in app source code
