# Dev Feasibility Review: REPA-006 - Migrate Upload Types

## Feasibility Summary
- **Feasible for MVP:** Yes
- **Confidence:** High
- **Why:** Straightforward file relocation with clear boundaries. @repo/upload package structure already exists (REPA-001). No API changes, no runtime behavior changes. Pattern well-established from REPA-014, REPA-015, REPA-016.

---

## Likely Change Surface (Core Only)

### Packages Modified
**@repo/upload (destination):**
- `packages/core/upload/src/types/` - add 4 type files (session.ts, upload.ts, slug.ts, edit.ts)
- `packages/core/upload/src/types/__tests__/` - add 3 test files
- `packages/core/upload/src/types/index.ts` - replace placeholder with barrel exports
- `packages/core/upload/package.json` - verify types export path (likely already configured in REPA-001)
- `packages/core/upload/tsconfig.json` - verify types/ included (likely already configured)

**@repo/upload-types (source, to deprecate):**
- `packages/core/upload-types/package.json` - add deprecated field
- `packages/core/upload-types/README.md` - add migration guide
- `packages/core/upload-types/src/index.ts` - add console.warn() deprecation message

### Apps Modified
**apps/web/main-app:**
- 8 files with import updates (`@repo/upload-types` → `@repo/upload/types`)
- Delete 2 deprecated wrapper files (uploader-upload.ts, uploader-session.ts)
- Delete 1 wrapper test file

**apps/web/app-instructions-gallery:**
- 9 files with import updates

### Total Files Touched
- **Created**: 8 files (4 types + 3 tests + 1 barrel export)
- **Modified**: ~20 files (17 import updates + package.json + README + index.ts)
- **Deleted**: 7 files (4 source types + 3 source tests in old package after grace period, 2 wrappers + 1 test immediately)

---

## MVP-Critical Risks

### Risk 1: Zod Version Mismatch Breaking Schemas
**Why it blocks MVP:**
- Old package uses zod ^3.23.8
- New package uses zod 4.1.13
- Schema incompatibilities would cause runtime validation failures in upload flows
- Upload is critical user journey (cannot ship broken upload)

**Likelihood:** Low (Zod 3→4 is generally backward compatible)

**Required Mitigation:**
1. Run full test suite immediately after migration: `pnpm --filter @repo/upload test`
2. If failures occur, update schema syntax to Zod 4 conventions:
   - `.refine()` → `.superRefine()` where needed
   - `.transform()` → check for breaking changes
   - Schema method chaining syntax updates
3. Re-test until all 559 LOC of tests pass
4. If major incompatibilities found, consider downgrading @repo/upload to zod ^3.23.8 temporarily

**AC Coverage:** AC-9 (all migrated tests pass), AC-10 (coverage >= 45%)

---

### Risk 2: Incomplete Import Updates Breaking Builds
**Why it blocks MVP:**
- 17 files across 2 apps need import path updates
- Missing even 1 import causes TypeScript compilation failure
- Build failures block deployment

**Likelihood:** Medium (manual grep can miss files)

**Required Mitigation:**
1. Use comprehensive grep before committing:
   ```bash
   grep -r "from '@repo/upload-types'" apps/web/ packages/
   ```
2. Verify zero results in app source code (only old package should reference itself)
3. Run type checking after each app update:
   ```bash
   pnpm --filter main-app check-types
   pnpm --filter app-instructions-gallery check-types
   ```
4. Final verification: `pnpm check-types:all` must pass

**AC Coverage:** AC-11 (main-app imports), AC-12 (instructions-gallery imports), AC-24 (type checking)

---

### Risk 3: Missing Barrel Exports Causing Import Failures
**Why it blocks MVP:**
- If types/index.ts doesn't re-export all schemas, consumer imports will fail
- Each missing export breaks a file using that type
- Upload components rely on these types to render

**Likelihood:** Low (straightforward to implement)

**Required Mitigation:**
1. Create comprehensive barrel export at @repo/upload/src/types/index.ts:
   ```typescript
   export * from './session'
   export * from './upload'
   export * from './slug'
   export * from './edit'
   ```
2. Verify exports resolve: `node -e "console.log(require.resolve('@repo/upload/types'))"`
3. Test import in consuming file: `import { UploaderSessionSchema } from '@repo/upload/types'`

**AC Coverage:** AC-5 (barrel export), AC-18 (build verification)

---

## Missing Requirements for MVP

### Requirement 1: Zod Version Strategy Decision
**Blocker:** Need to decide whether to align Zod versions or accept mixed versions.

**Options:**
- **Option A**: Keep zod 4.1.13 in @repo/upload, update schemas if needed (RECOMMENDED)
  - Pros: Modern Zod version, better DX, already in package
  - Cons: May require schema syntax updates (low risk)
- **Option B**: Downgrade @repo/upload to zod ^3.23.8 to match old package
  - Pros: Zero schema changes needed
  - Cons: Delays Zod 4 adoption, technical debt

**PM Decision Required:**
"Use Zod 4.1.13 in @repo/upload (Option A). Update schemas during migration if incompatibilities arise. This aligns with monorepo modernization goals."

---

### Requirement 2: Deprecation Timeline Confirmation
**Blocker:** Need confirmation on grace period before deleting @repo/upload-types.

**Recommendation:** 2 sprint cycles (≈4 weeks)

**PM Decision Required:**
"@repo/upload-types will be marked deprecated but remain functional for 2 sprint cycles after REPA-006 merges. Removal will be a follow-up story (not part of REPA-006 scope)."

---

### Requirement 3: REPA-002/REPA-004 Coordination Strategy
**Blocker:** In-progress stories may conflict during merge.

**Options:**
- **Option A**: Complete REPA-006 first, update REPA-002/004 imports during their QA (RECOMMENDED)
  - Pros: REPA-006 unblocked, deprecated package functional during overlap
  - Cons: REPA-002/004 must update imports before merging
- **Option B**: Wait for REPA-002/004 to complete first
  - Pros: No coordination needed
  - Cons: Blocks REPA-006 unnecessarily (they can coexist via deprecated package)

**PM Decision Required:**
"Proceed with REPA-006 immediately (Option A). Deprecated @repo/upload-types remains functional. REPA-002/004 will update imports before merging to main."

---

## MVP Evidence Expectations

### Build Evidence
```bash
# All apps build successfully
pnpm build

# All type checking passes
pnpm check-types:all

# All linting passes
pnpm lint:all

# All tests pass
pnpm test:all
```

### Migration Evidence
```bash
# Verify all type files migrated
ls -l packages/core/upload/src/types/*.ts
# Should show: session.ts, upload.ts, slug.ts, edit.ts, index.ts

# Verify all tests migrated
ls -l packages/core/upload/src/types/__tests__/*.ts
# Should show: session.test.ts, upload.test.ts, slug.test.ts

# Verify tests pass
pnpm --filter @repo/upload test

# Verify coverage >= 45%
pnpm --filter @repo/upload test:coverage
```

### Import Update Evidence
```bash
# Verify no old imports remain in apps
grep -r "@repo/upload-types" apps/web/main-app/src/
grep -r "@repo/upload-types" apps/web/app-instructions-gallery/src/
# Both should return zero results
```

### Deprecation Evidence
```bash
# Verify deprecation warning appears
node -e "require('@repo/upload-types')"
# Should output console warning

# Verify package.json deprecated field
grep "deprecated" packages/core/upload-types/package.json
# Should show deprecation message
```

### Critical CI/Deploy Checkpoints
1. **Pre-commit**: `pnpm lint && pnpm check-types` (changed files)
2. **Pre-push**: `pnpm lint:all && pnpm check-types:all && pnpm test:all`
3. **CI Pipeline**: Full build + test + coverage report
4. **Deploy Gate**: All quality gates green (lint, types, tests, build)

---

## Technical Implementation Notes

### Reuse Patterns (High Confidence)

**From REPA-001 (Create @repo/upload Package Structure):**
- Package already has types/ directory with placeholder
- Exports field likely already configured with types subpath
- Vitest configuration already present
- Just need to populate with actual files

**From REPA-016 (Consolidate MOC Schemas):**
- Deprecation pattern: package.json deprecated field + README + console.warn()
- Grace period: Keep old package functional for migration window
- Import updates: Systematic grep + update + verify pattern

**From REPA-014 (Create @repo/hooks Package):**
- Test migration pattern: Move __tests__ directory alongside source
- Coverage verification: Ensure tests run in new location
- Barrel export pattern: Re-export all from subdirectories

### File Structure (Final State)
```
packages/core/upload/src/types/
  session.ts          # 170 LOC - Session schemas
  upload.ts           # 279 LOC - Upload file items
  slug.ts             # 111 LOC - Slug utilities
  edit.ts             # 185 LOC - MOC edit forms
  index.ts            # ~10 LOC - Barrel exports
  __tests__/
    session.test.ts   # 177 LOC
    upload.test.ts    # 249 LOC
    slug.test.ts      # 133 LOC
```

### Dependency Chain
No circular dependencies:
- @repo/upload depends on: zod, @repo/logger (already configured)
- Apps depend on: @repo/upload/types (new), @repo/upload-types (old, deprecated)
- @repo/upload-types has no internal consumers after migration (safe to deprecate)

### Rollback Plan
If critical issue discovered after merge:
1. Revert REPA-006 commit
2. Apps fall back to @repo/upload-types (still functional)
3. No data loss (types only, no runtime state)
4. Re-implement with fixes after investigation

---

## Estimation

### Complexity: Low-Medium
- **File count**: 8 new files, ~20 modified, 7 deleted
- **LOC impact**: 817 LOC migrated (copy), 559 test LOC migrated (copy), ~50 LOC imports updated
- **Dependencies**: Single package (@repo/upload), established pattern
- **Testing**: Existing tests (just need to run in new location)

### Story Points: 3 SP
**Breakdown:**
- 1 SP: Migrate type files + tests (straightforward copy)
- 1 SP: Update 17 consumer imports + delete wrappers (systematic but time-consuming)
- 0.5 SP: Configure exports + verify builds (likely already configured)
- 0.5 SP: Deprecate old package (README + console.warn + package.json)

**Confidence:** High (similar to REPA-016 which was 2 SP, this adds test migration)

### Time Estimate: 4-6 hours
- 1 hour: Migrate files + create barrel export
- 1-2 hours: Update all consumer imports
- 1 hour: Run tests, fix any Zod compatibility issues
- 1 hour: Deprecation setup + verification
- 1 hour: Final QA (full build, type check, test suite)

---

## Dependencies & Blockers

### Hard Dependencies
- **REPA-001 Completed**: @repo/upload package exists ✅ (completed 2026-02-10)

### Soft Dependencies (Coordination)
- **REPA-002 (In Progress)**: May import from @repo/upload-types
  - Resolution: Deprecated package remains functional, REPA-002 updates imports before merge
- **REPA-004 (In Progress)**: May import from @repo/upload-types
  - Resolution: Same as REPA-002

### No Blockers
- No architectural decisions required (pattern established)
- No infrastructure changes required
- No API contracts changed
- No database migrations needed

---

## Confidence Assessment

**Overall Confidence: High (95%)**

**High Confidence Factors:**
- ✅ Package structure already exists (REPA-001)
- ✅ Pattern proven in REPA-014, REPA-015, REPA-016
- ✅ No API changes (types only)
- ✅ Comprehensive existing test suite (559 LOC)
- ✅ Clear file boundaries (4 types, 3 tests)
- ✅ Deprecation strategy proven in REPA-016

**Medium Confidence Factors:**
- ⚠️ Zod version mismatch (3.23.8 → 4.1.13) - likely compatible but needs verification
- ⚠️ 17 import updates - systematic but manual, risk of missed files

**Low Risk, High Impact:**
- Zod compatibility is the only technical uncertainty
- Mitigation: Run tests immediately, fix schemas if needed
- Fallback: Downgrade to Zod 3 if critical issues (unlikely)

---

## Recommendation

**Proceed with REPA-006 immediately.**

This is a low-risk, high-value migration that completes the upload package consolidation. The pattern is well-established, dependencies are clear, and the change surface is well-bounded. Zod version mismatch is the only technical uncertainty, mitigated by comprehensive test coverage.

**Critical Success Factors:**
1. Run full test suite immediately after migration
2. Systematic grep for remaining old imports
3. Coordinate with REPA-002/004 on merge order
4. Keep deprecated package functional for 2 sprint grace period

**Estimated Delivery:** 1 day (4-6 hours implementation + QA)
