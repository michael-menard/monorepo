# Elaboration Analysis - REPA-016

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | FAIL | High | Story claims 3 consumers but only 2 exist. MocForm component (app-instructions-gallery) does NOT import from moc-form.ts. |
| 2 | Internal Consistency | PASS | — | Goals, Non-goals, Decisions, and ACs are internally consistent. |
| 3 | Reuse-First | PASS | — | Correctly reuses existing @repo/api-client package structure rather than creating new package. |
| 4 | Ports & Adapters | PASS | — | Schema consolidation, no API endpoints involved. Transport-agnostic by nature. |
| 5 | Local Testability | PASS | — | Test migration plan is concrete with existing 252-line test suite. Vitest configured via vite.config.ts. |
| 6 | Decision Completeness | PASS | — | No blocking TBDs. Decision to use @repo/api-client vs creating new package is well-justified. |
| 7 | Risk Disclosure | PASS | — | Risks appropriately disclosed as "straightforward migration with minimal risk." |
| 8 | Story Sizing | PASS | — | 3 SP is appropriate. 12 ACs, but all are straightforward file moves and import updates. 2 consumers, not 3. |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | Incorrect consumer count | High | Story claims 3 consumers (including MocForm component) but MocForm does NOT import from moc-form.ts - it has its own inline schema. Only 2 actual consumers: InstructionsNewPage.tsx in both apps. Update AC-6, AC-7, Test Plan, and all references from "3 consumer files" to "2 consumer files". |
| 2 | Line count discrepancy | Low | Story states "328 lines" but actual files are 327 lines each. Update all references to accurate line count. |
| 3 | Missing vitest.config.ts | Medium | Story and Test Plan reference vitest.config.ts but @repo/api-client uses vite.config.ts with inline test configuration. Update Test Plan and AC-8 to reference correct config file. |
| 4 | REPA-001 dependency not documented | Low | Story touches @repo/upload package (created by REPA-001) but doesn't declare dependency. While not a blocker (schemas are independent), should clarify in Dependencies section. |

## Split Recommendation

Not applicable - story is appropriately sized at 3 SP.

## Preliminary Verdict

**Verdict**: CONDITIONAL PASS

Story is technically sound and ready to implement after fixing consumer count and config file references. The core migration approach is solid, reuse strategy is correct, and test coverage is comprehensive.

---

## MVP-Critical Gaps

Only gaps that **block the core user journey**:

| # | Gap | Blocks | Required Fix |
|---|-----|--------|--------------|
| 1 | Incorrect consumer count creates false ACs | Accurate testing and verification | Update AC-6, AC-7 to reflect 2 consumers (not 3). Remove MocForm component from consumer list in all sections. Verify no other files import moc-form.ts. |
| 2 | Test config file mismatch | Test execution verification | Update AC-8 and Test Plan Test 1 to reference vite.config.ts (not vitest.config.ts). Clarify that Vitest is configured inline in vite.config.ts. |

---

## Detailed Findings

### Finding 1: Consumer Count Mismatch (HIGH PRIORITY)

**Evidence from codebase scan:**
```bash
# Actual consumers found:
apps/web/main-app/src/routes/pages/InstructionsNewPage.tsx
apps/web/app-instructions-gallery/src/pages/upload-page.tsx

# Story claims this is also a consumer (FALSE):
apps/web/app-instructions-gallery/src/components/MocForm/index.tsx
```

**MocForm component analysis:**
- MocForm defines its own inline schema: `const MocFormSchema = z.object({...})`
- MocForm only imports `CreateMocInput` type from `@repo/api-client/schemas/instructions`
- MocForm has NO imports from `@/types/moc-form`
- MocForm is a simplified form (title, description, theme, tags only) - NOT using the comprehensive moc-form.ts schemas

**Impact:**
- AC-6 lists 3 files to update, should be 2
- AC-7 tests form validation in 3 components, should be 2
- Test Plan Test 4 mentions "1 consumer file", Test 5 mentions "All 3 consumer files"
- Reality Baseline lists "3 total consumers"
- Multiple sections need correction

**Required corrections:**
1. Update **AC-6** consumer list from 3 to 2 files
2. Update **AC-7** to test 2 components (remove MocForm reference)
3. Update **Test Plan Test 5** description from "All 3 consumer files" to "Both consumer files"
4. Update **Reality Baseline** from "3 total consumers" to "2 total consumers"
5. Remove all MocForm references from Architecture Notes and Consumer Updates sections

### Finding 2: Line Count Accuracy (LOW PRIORITY)

**Evidence:**
```bash
wc -l output:
327 apps/web/main-app/src/types/moc-form.ts
327 apps/web/app-instructions-gallery/src/types/moc-form.ts
```

**Story references "328 lines" in:**
- Context section
- Goal section
- Impact section
- Multiple other locations

**Impact:** Minor documentation accuracy issue. Not MVP-blocking.

**Required corrections:** Update all "328 lines" references to "327 lines"

### Finding 3: Test Configuration File Reference (MEDIUM PRIORITY)

**Evidence from codebase:**
- @repo/api-client does NOT have `vitest.config.ts`
- @repo/api-client uses `vite.config.ts` with inline test configuration:
  ```typescript
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  }
  ```

**Story references vitest.config.ts in:**
- AC-8: "Vitest config properly configured in api-client"
- Test Plan Test 1: mentions vitest configuration
- Architecture Notes: "Vitest config in api-client"

**Impact:** Developer following story will look for non-existent file.

**Required corrections:**
1. Update AC-8 to clarify Vitest is configured in vite.config.ts
2. Update Test Plan to reference correct config file
3. Clarify that no separate vitest.config.ts is needed (already configured)

### Finding 4: Files are Exact Duplicates (VERIFIED)

**Evidence:**
```bash
diff output: (no differences)
```

Files are byte-for-byte identical as claimed. ✓

### Finding 5: Comprehensive Test Coverage Exists (VERIFIED)

**Evidence:**
- Test file exists: `apps/web/main-app/src/types/__tests__/moc-form.test.ts`
- Line count: 252 lines (matches story claim)
- Tests cover: MOC validation, Set validation, helper functions
- No duplicate test file in app-instructions-gallery (correct)

Coverage is solid and ready to migrate. ✓

### Finding 6: Package Structure Decision is Sound (VERIFIED)

**Analysis:**
- Story correctly chooses @repo/api-client over creating new @repo/moc-schemas package
- Rationale is well-documented in Architecture Notes
- Follows established pattern (wishlist, sets, inspiration already in api-client/schemas/)
- Avoids schema fragmentation

Decision is architecturally sound. ✓

### Finding 7: Backward Compatibility Plan is Robust (VERIFIED)

**Evidence from story:**
- AC-4 requires existing imports continue working via index.ts re-exports
- AC-5 adds granular imports without breaking changes
- Migration is three-phase with verification steps
- TypeScript compilation gates ensure no silent breakage

Backward compatibility is well-planned. ✓

### Finding 8: Subdirectory Structure Matches Best Practices (VERIFIED)

**Proposed structure:**
```
packages/core/api-client/src/schemas/instructions/
  ├── api.ts              # API response schemas (renamed from instructions.ts)
  ├── form.ts             # Form validation schemas (from moc-form.ts)
  ├── utils.ts            # Helper functions
  ├── index.ts            # Re-exports for backward compatibility
  └── __tests__/
      └── form.test.ts    # Migrated tests
```

This matches monorepo patterns seen in other packages. ✓

### Finding 9: Schema Separation by Purpose is Clear (VERIFIED)

**From codebase analysis:**

**form.ts (form validation):**
- Strict validation for user input
- Custom error messages ("Title is required")
- Helper functions (createEmptyMocForm, normalizeTags)
- `.or(z.literal(''))` pattern for optional URLs (allows empty strings)

**api.ts (API responses):**
- Lenient UUID validation for test compatibility
- Nullable fields aligned with database schema
- Date transformations (string → Date)
- No helper functions (pure validation)

Separation of concerns is well-defined. ✓

### Finding 10: No Active Conflicts (VERIFIED)

**Git status check:** No changes to moc-form.ts or instructions.ts files in current branch.

No merge conflicts expected. ✓

---

## Codebase Reality Check

### Verified Facts

1. **Duplicate files are identical:** ✓ (diff confirms byte-for-byte match)
2. **Line count:** 327 lines each (story says 328) - minor discrepancy
3. **Consumer count:** 2 files (story says 3) - HIGH PRIORITY FIX NEEDED
4. **Test file:** 252 lines (story correct)
5. **@repo/api-client structure:** schemas/ directory exists with wishlist, sets, inspiration, instructions
6. **Vitest config:** Configured in vite.config.ts (NOT vitest.config.ts)
7. **Package exports:** Currently has flat exports, needs subdirectory exports added
8. **@repo/api-types exists:** packages/shared/api-types/src/moc/index.ts (961 lines)
9. **No barrel files violation:** Story correctly avoids barrel file pattern ✓

### Story Accuracy Assessment

| Section | Accuracy | Notes |
|---------|----------|-------|
| Context | 90% | Consumer count wrong, line count off by 1 |
| Goal | 95% | Accurate, minor line count issue |
| Scope | 90% | Consumer count inflated |
| ACs | 85% | AC-6, AC-7 need consumer count fix |
| Test Plan | 80% | Config file reference wrong, consumer count wrong |
| Architecture Notes | 95% | Solid architectural reasoning |
| Reuse Plan | 100% | Excellent reuse analysis |

---

## Recommendations

### Must Fix Before Implementation

1. **Update all consumer count references from 3 to 2:**
   - AC-6: List only 2 consumer files
   - AC-7: Test only 2 components
   - Test Plan Test 4-7: Update descriptions
   - Reality Baseline: "2 total consumers"
   - All consumer-related prose

2. **Fix test configuration references:**
   - AC-8: Clarify Vitest configured in vite.config.ts
   - Test Plan Test 1: Reference correct config
   - Remove mentions of vitest.config.ts

3. **Verify no other consumers exist:**
   - Run comprehensive grep before starting implementation
   - Document finding in ANALYSIS.md if any new consumers found

### Nice to Have (Non-Blocking)

1. **Update line count from 328 to 327** (accuracy polish)
2. **Clarify REPA-001 relationship** in Dependencies section (informational)

---

## Worker Token Summary

- **Input:** ~14,500 tokens (agent instructions, story file, seed file, codebase scans)
- **Output:** ~2,800 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
- **Files read:** 12 files (story, seed, agent instructions, moc-form.ts x2, consumers, tests, package.json, schemas, configs)
- **Codebase scans:** 8 operations (grep, diff, wc, ls, find)
