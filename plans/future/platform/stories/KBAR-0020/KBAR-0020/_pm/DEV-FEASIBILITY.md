# Dev Feasibility Review: KBAR-0020 Schema Tests & Validation

## Feasibility Summary

**Feasible for MVP:** Yes

**Confidence:** High

**Why:**
- Well-defined scope with clear boundaries (schema validation only, no API or integration work)
- Follows established patterns from WINT and Artifacts schema test implementations
- All required tooling exists (Vitest, Zod, drizzle-zod already installed and configured)
- No new package dependencies needed
- KBAR-0010 dependency is in UAT phase (schema stable and safe to test)
- Clear acceptance criteria with specific validation layers
- No external service dependencies (unit tests only, no database connection required)

---

## Likely Change Surface (Core Only)

### Packages for Core Journey
- `packages/backend/database-schema/src/schema/__tests__/kbar-schema.test.ts` — Extend existing test file with comprehensive validation tests

### Files Modified
- **Primary change:** `packages/backend/database-schema/src/schema/__tests__/kbar-schema.test.ts`
  - Add ~300-500 lines of test code organized by AC (10 test suites)
  - Import patterns from WINT/Artifacts tests (Zod safeParse, enum validation, JSONB schemas)

### Files Referenced (Read-Only)
- `packages/backend/database-schema/src/schema/kbar.ts` — Schema under test (11 tables, 6 enums)
- `packages/backend/db/src/generated-schemas.ts` — Auto-generated Zod insert/select schemas
- `packages/backend/database-schema/src/schema/__tests__/wint-schema.test.ts` — Pattern reference
- `packages/backend/database-schema/src/schema/__tests__/review-qa-artifacts-schema.test.ts` — JSONB validation pattern reference
- `packages/backend/database-schema/vitest.config.ts` — Test configuration (no changes needed)

### Critical Deploy Touchpoints
None — Schema validation tests do not affect runtime code or deployments

---

## MVP-Critical Risks

**NONE IDENTIFIED**

This story has **no MVP-blocking risks**. All risks are mitigatable within the story scope or are deferred to future integration testing (KBAR-0030).

---

## Missing Requirements for MVP

**NONE**

Story seed provides complete requirements:
- Clear acceptance criteria (10 ACs with specific validation targets)
- Established test patterns to follow (WINT/Artifacts schemas)
- Explicit non-goals (no integration tests, no database connection, no schema modifications)
- Technical decisions documented in seed recommendations

---

## MVP Evidence Expectations

### Test Evidence Required
1. **Vitest test run output** showing all tests passing:
   ```bash
   pnpm --filter @repo/database-schema test kbar-schema.test.ts
   ```
   - Output must show 16+ test cases passing (per test plan)
   - No skipped or pending tests
   - Test execution time <5 seconds (unit tests only)

2. **Coverage report** showing >90% coverage for kbar.ts:
   ```bash
   pnpm --filter @repo/database-schema test:coverage -- kbar-schema.test.ts
   ```
   - Coverage HTML report or terminal output
   - Highlight: `kbar.ts` line coverage >90%
   - All exported Zod schemas covered
   - All enums covered (valid and invalid value tests)

3. **Validation behavior evidence** (from test output):
   - Zod safeParse success for valid data (AC-1, AC-2)
   - Zod safeParse failure for invalid data (AC-1, AC-2, AC-4)
   - Error messages for validation failures (developer experience check)

4. **Pattern compliance evidence:**
   - Test file structure matches WINT/Artifacts pattern (describe blocks per AC)
   - JSONB metadata schemas defined explicitly (AC-3)
   - Enum validation tests include both valid and invalid values (AC-4)

### CI/Deploy Checkpoints
- **Pre-merge check:** `pnpm test` passes (includes KBAR schema tests)
- **Coverage check:** Global coverage remains >45% (per CLAUDE.md requirement)
- **Type check:** `pnpm check-types` passes (Zod type inference verified)

No deploy checkpoints required (tests do not affect runtime).

---

## Implementation Notes

### Recommended Approach
1. **Start with critical tables** (stories, artifacts) to establish test data patterns
2. **Expand coverage iteratively** per AC priority:
   - AC-1/AC-2: Insert/select schema validation (foundation)
   - AC-4: Enum validation (high value, low effort)
   - AC-3: JSONB metadata validation (moderate complexity)
   - AC-5/AC-6: Relationships and indexes (documentation-heavy)
   - AC-7/AC-8/AC-9: Edge cases and contract testing (polish)

3. **Leverage existing patterns:**
   - Copy test structure from `wint-schema.test.ts` (describe blocks per AC)
   - Copy JSONB validation patterns from `review-qa-artifacts-schema.test.ts`
   - Use Zod safeParse consistently (never throw, always check success/failure)

### Technical Decisions Confirmed
Based on seed recommendations:

1. **JSONB metadata schemas:** Define inline in test file for now
   - **Rationale:** Simple approach for initial validation testing
   - **Future:** Extract to shared schema file in KBAR-0030+ if needed for API validation

2. **Test data:** Use inline test objects (no factories yet)
   - **Rationale:** Clarity and simplicity for schema-only tests
   - **Future:** Create factories in KBAR-0030+ for integration tests with database

3. **Snapshot tests:** Yes, use for Zod schema structure
   - **Rationale:** Prevents accidental breaking changes to generated schemas
   - **Implementation:** Snapshot insert/select schema structure for each table

### Effort Estimate
**3-4 hours** total (confirmed from seed):
- 1 hour: Zod insert/select validation tests (AC-1, AC-2)
- 1 hour: Enum + JSONB validation tests (AC-3, AC-4)
- 1 hour: Relationships, indexes, edge cases (AC-5, AC-6, AC-7)
- 0.5-1 hour: Contract testing, coverage verification, polish (AC-8, AC-9, AC-10)

### Dependencies Status
- **KBAR-0010:** In UAT phase (schema stable) ✅ READY
- **Vitest:** Installed and configured ✅ READY
- **drizzle-zod:** Installed and generating schemas ✅ READY
- **Pattern references:** WINT/Artifacts tests exist ✅ READY

---

## Quality Gates

### Pre-Implementation
- [ ] KBAR-0010 UAT completed (schema finalized) — **Currently in UAT, assume stable**
- [ ] Test patterns reviewed (WINT/Artifacts tests) — **Available for reference**

### During Implementation
- [ ] Each AC produces passing tests before moving to next AC
- [ ] Coverage incrementally increases (track per AC completion)
- [ ] Error messages are clear and actionable

### Pre-Completion
- [ ] All 10 ACs have corresponding test suites
- [ ] Coverage >90% for kbar.ts
- [ ] All tests pass in CI
- [ ] No test fragility (tests are deterministic, no flakiness)

---

## Success Criteria Verification

**Definition of Done:**
- ✅ All 16 test cases from TEST-PLAN.md pass
- ✅ Coverage >90% for kbar.ts schema file
- ✅ All 10 KBAR-0020 ACs validated with evidence
- ✅ No blocking ambiguities (all documented or resolved)
- ✅ Test execution time <5 seconds
- ✅ Clear error messages for validation failures

**Evidence Package:**
1. Vitest test output (all tests passing)
2. Coverage report (>90% kbar.ts)
3. Code review of test file (pattern compliance)
4. CI passing (pnpm test, pnpm check-types)

**Ready for QA when:**
- All tests green in local and CI
- Coverage metrics met
- No lint/type errors
