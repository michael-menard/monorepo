# Dev Feasibility Review: AUDT-0020 — Polish and Complete Unit Test Coverage for All 9 Audit Lens Nodes

## Feasibility Summary

- **Feasible for MVP**: yes
- **Confidence**: high
- **Why**: All 9 lens implementations and all 9 test files already exist with substantial coverage. This is a gap-fill story — no new infrastructure, no new packages, no schema changes. The change surface is entirely in `__tests__/` files. The binary and huge file questions are resolved as documented-behavior (no implementation guard required at this scope). Risk of discovering a lens implementation bug that requires fixing is low; if found, the fix will be small and isolated.

---

## Likely Change Surface (Core Only)

- **Package**: `packages/backend/orchestrator` only
- **Files to modify** (9 test files):
  - `src/nodes/audit/__tests__/lens-security.test.ts` — add `by_severity` sum check if missing; verify empty array edge case
  - `src/nodes/audit/__tests__/lens-duplication.test.ts` — add `by_severity` sum check; add empty `targetFiles` test; add `lens` field consistency assertion
  - `src/nodes/audit/__tests__/lens-react.test.ts` — add `by_severity` sum check; add empty `targetFiles` test; add third explicit clean negative fixture
  - `src/nodes/audit/__tests__/lens-typescript.test.ts` — add `by_severity` sum check; confirm severity calibration tests cover both `__tests__/` and `.test.ts` paths (already present)
  - `src/nodes/audit/__tests__/lens-accessibility.test.ts` — add `by_severity` sum check; add empty `targetFiles` test
  - `src/nodes/audit/__tests__/lens-code-quality.test.ts` — add `by_severity` sum check; add `lens` field consistency assertion
  - `src/nodes/audit/__tests__/lens-performance.test.ts` — add `by_severity` sum check; add empty `targetFiles` test; harden conditional `lens` field guard
  - `src/nodes/audit/__tests__/lens-ui-ux.test.ts` — add `by_severity` sum check; add empty `targetFiles` test; add third explicit clean negative; harden conditional `lens` field guard
  - `src/nodes/audit/__tests__/lens-test-coverage.test.ts` — add `by_severity` sum check; add `lens` field assertion; document non-existent path behavior explicitly
- **Files to possibly modify** (lens implementations — only if test reveals a bug):
  - Any of `src/nodes/audit/lens-*.ts` — minor correctness fix only; no scope expansion
- **Critical deploy touchpoints**: None — test-only changes; no Lambda deployment or API Gateway change required

---

## MVP-Critical Risks (Max 5)

### Risk 1: `by_severity` sum mismatch reveals off-by-one bug in a lens implementation
- **Why it blocks MVP**: If a lens is miscounting findings vs `by_severity` breakdown, the aggregate audit report (`FINDINGS-{date}.yaml`) will have incorrect severity tallies, making the audit output untrustworthy.
- **Required mitigation**: The `by_severity` sum test is the mitigation — it will catch any discrepancy. If it fails, fix the implementation's counting logic before closing the story. Keep fix isolated to the one lens's `run()` function.

### Risk 2: Empty `targetFiles` array causes unhandled exception in a lens
- **Why it blocks MVP**: If any lens throws on empty input, the full pipeline will fail on no-op audit runs (e.g., a delta scope with no changed files).
- **Required mitigation**: Add the empty array edge case test to all lenses that lack it. If a lens throws, add a guard at the top of `run()`: `if (state.targetFiles.length === 0) return emptyResult(lens)`.

### Risk 3: Binary file content causes unexpected regex match producing a false finding
- **Why it blocks MVP**: A garbled-UTF-8 false positive from a binary file would inflate finding counts and reduce trust in the audit output.
- **Required mitigation**: The test plan specifies adding a single binary buffer test (write `Buffer.from([0x89, 0x50, 0x4e, 0x47])` to a `.ts` file) to the security lens (highest risk for false positives on binary noise). If a finding is produced, add a null-byte guard in the lens: `if (content.includes('\x00')) return`. No need to add binary test to all 9 lenses — security is the only one with patterns (like secret keywords) that could plausibly match binary noise at all.

---

## Missing Requirements for MVP

None blocking. The story has sufficient AC definition. The one decision that must be made explicit:

**Binary file behavior decision**: Treat current behavior (readFile returns garbled UTF-8, patterns don't match, no throw) as acceptable. Document in the binary test or in a code comment. Do NOT add a binary guard to all 9 lenses — scope is not warranted at this stage.

**Huge file behavior decision**: No file-size gate is needed for this story. The monorepo's largest source files are well under 300KB. Document the known limit in a comment in the DEV-FEASIBILITY notes. Defer file-size gating to AUDT-0030 or a separate tech-debt story.

---

## MVP Evidence Expectations

- `pnpm test --filter orchestrator` passes with all 9 lens describe blocks green
- `pnpm check-types --filter orchestrator` exits 0
- `pnpm build --filter orchestrator` exits 0
- Each of the 14 ACs checked off in the story file
- No new `.test.ts` files created — only additions to existing 9 test files

---

## Proposed Subtask Breakdown

### ST-1: Audit and fill gaps in lens-duplication, lens-react, lens-ui-ux test files
- **Goal**: Add `by_severity` sum checks, empty `targetFiles` tests, and `lens` field consistency assertions to the three test files with the most gaps
- **Files to read**: `packages/backend/orchestrator/src/nodes/audit/__tests__/lens-security.test.ts` (gold standard), `packages/backend/orchestrator/src/artifacts/audit-findings.ts`
- **Files to create/modify**:
  - `packages/backend/orchestrator/src/nodes/audit/__tests__/lens-duplication.test.ts`
  - `packages/backend/orchestrator/src/nodes/audit/__tests__/lens-react.test.ts`
  - `packages/backend/orchestrator/src/nodes/audit/__tests__/lens-ui-ux.test.ts`
- **ACs covered**: AC-3, AC-5, AC-7, AC-10
- **Depends on**: none
- **Verification**: `pnpm test --filter orchestrator -- lens-duplication lens-react lens-ui-ux`

### ST-2: Audit and fill gaps in lens-typescript, lens-accessibility, lens-performance test files
- **Goal**: Add `by_severity` sum checks, empty `targetFiles` tests, and confirm severity calibration (typescript) and `lens === 'a11y'` multi-finding assertion (accessibility)
- **Files to read**: `packages/backend/orchestrator/src/nodes/audit/__tests__/lens-security.test.ts`, `packages/backend/orchestrator/src/nodes/audit/lens-typescript.ts`
- **Files to create/modify**:
  - `packages/backend/orchestrator/src/nodes/audit/__tests__/lens-typescript.test.ts`
  - `packages/backend/orchestrator/src/nodes/audit/__tests__/lens-accessibility.test.ts`
  - `packages/backend/orchestrator/src/nodes/audit/__tests__/lens-performance.test.ts`
- **ACs covered**: AC-5, AC-6, AC-7, AC-10, AC-14
- **Depends on**: none (can run in parallel with ST-1)
- **Verification**: `pnpm test --filter orchestrator -- lens-typescript lens-accessibility lens-performance`

### ST-3: Audit and fill gaps in lens-code-quality, lens-test-coverage, lens-security test files; document binary/huge file behavior
- **Goal**: Add `by_severity` and `lens` field checks to code-quality and test-coverage; verify security already meets gold standard; add binary file test to security; document huge file limits
- **Files to read**: `packages/backend/orchestrator/src/nodes/audit/__tests__/lens-security.test.ts`, `packages/backend/orchestrator/src/nodes/audit/__tests__/lens-test-coverage.test.ts`
- **Files to create/modify**:
  - `packages/backend/orchestrator/src/nodes/audit/__tests__/lens-code-quality.test.ts`
  - `packages/backend/orchestrator/src/nodes/audit/__tests__/lens-test-coverage.test.ts`
  - `packages/backend/orchestrator/src/nodes/audit/__tests__/lens-security.test.ts`
- **ACs covered**: AC-1, AC-2, AC-4, AC-5, AC-7, AC-8, AC-9, AC-11
- **Depends on**: none (can run in parallel with ST-1 and ST-2)
- **Verification**: `pnpm test --filter orchestrator -- lens-code-quality lens-test-coverage lens-security`

### ST-4: Full test suite run and type check gate
- **Goal**: Run the complete orchestrator test suite and type checker to confirm all 9 lens suites pass together with no type regressions
- **Files to read**: none new
- **Files to create/modify**: none (read-only verification step)
- **ACs covered**: AC-12, AC-13
- **Depends on**: ST-1, ST-2, ST-3
- **Verification**: `pnpm test --filter orchestrator && pnpm check-types --filter orchestrator && pnpm build --filter orchestrator`
