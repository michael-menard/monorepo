---
generated: "2026-02-20"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: false
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: AUDT-0020

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No ADR-LOG found at plans/stories/ADR-LOG.md; no KB available for lessons query. Both gaps are non-blocking.

### Relevant Existing Features

| Feature | Location | Notes |
|---------|----------|-------|
| 9 lens node implementations | `packages/backend/orchestrator/src/nodes/audit/lens-*.ts` | All 9 files exist and are fully implemented (not stubs) |
| 9 lens node test files | `packages/backend/orchestrator/src/nodes/audit/__tests__/lens-*.test.ts` | All 9 test files already exist with comprehensive coverage |
| AuditFinding + LensResult Zod schemas | `packages/backend/orchestrator/src/artifacts/audit-findings.ts` | Full schema surface including LensResultSchema, AuditFindingSchema, severity/confidence enums |
| CodeAuditState graph type | `packages/backend/orchestrator/src/graphs/code-audit.ts` | State type used by all lens run() functions |
| AUDT-0010 (UAT) | `plans/future/platform/UAT/AUDT-0010/` | Dependency fully satisfied; graph + schema + scan-scope tests complete |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|-------------|
| AUDT-0010 | UAT (completed) | None — dependency satisfied |
| AUDT-0030 | Pending (blocked on this story) | No overlap; downstream only |

No other active stories touch `nodes/audit/` or lens files.

### Constraints to Respect

- All 9 lens `run()` functions return `Promise<LensResult>` — implementation signature is fixed.
- `LensResultSchema` from `artifacts/audit-findings.ts` is the compliance target for all output validation tests.
- `AuditFindingSchema` requires: `id`, `lens`, `severity`, `confidence`, `title`, `file`, `evidence`, `remediation`, `status` — `description` and `lines` are optional.
- Test pattern established by AUDT-0010: use `os.tmpdir()` + real file I/O in `beforeEach`/`afterEach`, no mocking of filesystem.
- Orchestrator package build must remain green (`pnpm check-types --filter orchestrator`, `pnpm build --filter orchestrator`).
- Minimum 45% global test coverage (project-wide gate).

---

## Retrieved Context

### Related Endpoints

None — this story is entirely within `packages/backend/orchestrator`. No API endpoints touched.

### Related Components

None — no UI components involved.

### Reuse Candidates

| Item | Location | Reuse Type |
|------|----------|-----------|
| `makeState()` helper | All existing `lens-*.test.ts` files | Copy pattern verbatim — identical across all 9 tests |
| `createFile()` helper | All existing `lens-*.test.ts` files | Copy pattern verbatim |
| `LensResultSchema.parse()` compliance check | All existing `lens-*.test.ts` files | Standard assertion in every test |
| `tmpdir()` + `beforeEach`/`afterEach` cleanup | All existing `lens-*.test.ts` files | Established test lifecycle pattern |
| `AuditFindingSchema` fields | `artifacts/audit-findings.ts` | Use for field-presence assertions |
| `calibrateSeverity()` in lens-typescript.ts | `nodes/audit/lens-typescript.ts` | Pattern for severity downgrade in test file paths |

**CRITICAL DISCOVERY**: All 9 lens test files already exist and contain comprehensive test coverage. The story must be re-scoped to focus on **gaps, polish, and accuracy benchmarks** rather than creating tests from scratch.

### Similar Stories

- AUDT-0010: Established the test infrastructure pattern (tmpdir fixtures, Zod schema compliance assertions). AUDT-0020 extends that pattern to lens-specific logic.

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Lens test with fixtures | `packages/backend/orchestrator/src/nodes/audit/__tests__/lens-security.test.ts` | Most comprehensive existing lens test — 13 cases, positive/negative fixtures, edge cases (empty file, non-existent path, by_severity consistency), field presence assertion |
| Lens implementation (severity calibration) | `packages/backend/orchestrator/src/nodes/audit/lens-typescript.ts` | Only lens with `calibrateSeverity()` — demonstrates production vs test path downgrade pattern that other lenses may need |
| Schema compliance target | `packages/backend/orchestrator/src/artifacts/audit-findings.ts` | Single source of truth for `LensResultSchema`, `AuditFindingSchema`, and all enums used in assertions |
| Test lifecycle pattern | `packages/backend/orchestrator/src/nodes/audit/__tests__/lens-duplication.test.ts` | Shows cross-app directory structure creation — most complex fixture setup, good reference for directory-dependent tests |

---

## Knowledge Context

### Lessons Learned

KB queries not available (kb_search not accessible). No lessons loaded from past stories.

*Gap noted: If past lens-related blockers exist in the KB, they are not surfaced here. Proceed with codebase evidence.*

### Blockers to Avoid (from codebase observation)

- **Regex false positives on multiline patterns**: The `lens-react.ts` N+1 pattern uses `/s` (dotall) flag; test fixtures need multi-line content to trigger these patterns correctly.
- **Binary file handling not implemented**: None of the 9 lenses have explicit binary file detection. The acceptance criteria mentions binary file edge cases but no lens currently guards against reading binary content via `readFile('utf-8')`. This is a gap to address.
- **Huge file performance**: No lens has file-size gating before reading. A 50MB file would be fully read into memory. The AC mentions "huge files" but no implementation guard exists.
- **`lens` field value vs enum display name**: `lens-accessibility.ts` returns `lens: 'a11y'` (not `'accessibility'`) — the `AuditLensSchema` uses `'a11y'`. This is correct but must be verified in tests (the accessibility test file already catches this with an explicit `not.toBe('accessibility')` assertion).
- **Test file path exclusion inconsistency**: `lens-typescript.ts` also checks `/test/` as a path segment for test detection, while most other lenses only check `__tests__`, `.test.`, and `.spec.`. This divergence is intentional but warrants a note.

### Architecture Decisions (ADRs)

No ADR-LOG found. Constraints derived from codebase conventions:

| Convention | Constraint |
|-----------|-----------|
| Zod-first types (CLAUDE.md) | No TypeScript interfaces in test fixtures or helper types |
| No barrel files (CLAUDE.md) | Import directly from `../lens-security.js` not from an index |
| Vitest for all tests | No Jest, no Mocha — Vitest describe/it/expect |
| `@repo/logger` not `console` | Production lens code should use logger; tests may use console for debugging |
| `os.tmpdir()` for test fixtures | Filesystem-dependent tests always use temp dirs with cleanup |

### Patterns to Follow

- `LensResultSchema.parse(result)` in every test — validates full schema compliance, not just spot checks.
- Positive fixture: content that **does** trigger the pattern being tested.
- Negative fixture: content that is clean and produces `total_findings === 0`.
- `by_severity` sum check: `critical + high + medium + low === total_findings` (seen in lens-security test).
- `findings.every(f => f.lens === 'X')` — verify lens field is correctly set on all findings.
- Edge cases per test file: empty string content (0 bytes), non-existent path (no throw), empty `targetFiles` array.

### Patterns to Avoid

- Do NOT mock `readFile` or `fs/promises` — use real temp files as established by AUDT-0010 pattern.
- Do NOT test lens implementations via the StateGraph routing — test the `run()` export directly.
- Do NOT skip the `by_severity` consistency check — it can catch off-by-one errors in finding counters.
- Do NOT assume binary file content will cause an uncaught exception — test what actually happens (readFile with 'utf-8' on binary content does not throw, it returns garbled text; patterns may or may not match).

---

## Conflict Analysis

No conflicts detected. AUDT-0010 is confirmed UAT (dependency satisfied). No active stories touch the same files. No protected features are in scope.

**Important scope clarification (not a conflict, but a reality correction):**

The story index states "Add unit tests with fixtures" as if tests do not exist. In reality, all 9 lens test files already exist at `packages/backend/orchestrator/src/nodes/audit/__tests__/`. The story must therefore be interpreted as **polish the existing tests** to ensure:
1. Each test file meets the "min 3 positive, 3 negative" fixture requirement explicitly stated in ACs.
2. Accuracy benchmarks and severity calibration are explicitly verified.
3. Edge cases (binary files, huge files, empty files) are covered consistently across all 9 lenses.
4. `LensResultSchema.parse()` compliance is verified in every test file.

This is a narrower scope than "write tests from scratch" but still meaningful work.

---

## Story Seed

### Title

Polish and Complete Unit Test Coverage for All 9 Audit Lens Nodes

### Description

**Context**: AUDT-0010 (UAT) delivered the audit graph scaffold, LangGraph StateGraph, artifact schemas, and scan-scope node with full test coverage. Nine lens nodes were scaffolded as part of that foundation — `lens-security.ts` through `lens-code-quality.ts` — and all 9 have corresponding test files in `nodes/audit/__tests__/`.

**Problem**: The existing test files were written as part of the scaffold phase. They have good coverage of the happy path and basic positive/negative cases, but they need systematic review against the acceptance criteria: minimum 3 known-positive fixtures and 3 known-negative fixtures per lens, severity calibration tests (production path vs test file path), `LensResultSchema` compliance on every test, and edge case coverage for empty files, non-existent paths, and potential binary/huge file scenarios. Some lenses may also have gaps in their detection patterns that tests would expose.

**Proposed Solution**: Audit each of the 9 test files against the acceptance criteria checklist. Fill gaps in fixture count, add missing edge cases, add severity calibration tests where applicable (lens-typescript already has this; others may benefit), and verify `by_severity` consistency assertions are present. Additionally, review the lens implementations themselves for any accuracy issues surfaced during test writing (e.g., patterns that would produce false positives or false negatives on realistic code).

### Initial Acceptance Criteria

- [ ] AC-1: Each of the 9 lens test files validates output with `LensResultSchema.parse(result)` — no throw on valid output
- [ ] AC-2: Security lens test has at least 3 known-positive fixtures (hardcoded secret, eval, child_process.exec or similar) and 3 known-negative fixtures (clean code that does not trigger patterns)
- [ ] AC-3: Duplication lens test has at least 3 positive fixtures (cross-app duplicates, known hook names) and 3 negative fixtures (same-app files, packages/ path, test files excluded)
- [ ] AC-4: Test-coverage lens test has at least 3 positive fixtures (file without test, critical path without test, handler without test) and 3 negative fixtures (file with test, index.ts skipped, __types__/ skipped)
- [ ] AC-5: All 9 lenses have at least 3 positive fixtures and 3 negative fixtures each — verified against the checklist in implementation notes
- [ ] AC-6: Severity calibration is explicitly tested for lenses that have production-vs-test path differentiation (at minimum: lens-typescript, which has `calibrateSeverity()`)
- [ ] AC-7: `by_severity` sum check (critical + high + medium + low === total_findings) present in at least the security, typescript, and code-quality lens tests
- [ ] AC-8: Edge case — empty file (0 bytes) → `total_findings: 0` and schema valid — tested across all 9 lenses
- [ ] AC-9: Edge case — non-existent path → no throw, schema valid — tested across all 9 lenses
- [ ] AC-10: Edge case — empty `targetFiles` array → `total_findings: 0`, correct `lens` field — tested across all 9 lenses
- [ ] AC-11: Binary/huge file edge case documented — either a test or an explicit note in the implementation explaining the current behavior and acceptable limits
- [ ] AC-12: `pnpm test --filter orchestrator` passes with all lens tests green
- [ ] AC-13: `pnpm check-types --filter orchestrator` passes with no new type errors
- [ ] AC-14: All findings returned by accessibility lens use `lens === 'a11y'` (not `'accessibility'`) — verified in test

### Non-Goals

- Do NOT rewrite or replace the existing lens implementations unless a test reveals a correctness bug that must be fixed.
- Do NOT add new lens categories or new detection patterns beyond what is needed to fix failing tests.
- Do NOT add integration tests for the full StateGraph pipeline — that is AUDT-0030's scope.
- Do NOT add performance benchmark tests with timing thresholds — deferred per AUDT-0010 FUTURE-OPPORTUNITIES.
- Do NOT add snapshot tests for graph structure — deferred per AUDT-0010 FUTURE-OPPORTUNITIES.
- Do NOT modify any production DB schemas, Knowledge Base schemas, or orchestrator artifact schemas.
- Do NOT add test coverage for scope types other than `'full'` — delta/domain/story scope variations are deferred.

### Reuse Plan

- **Components**: None (no UI components involved)
- **Patterns**: `makeState()` helper, `createFile()` helper, `tmpdir()` + `beforeEach`/`afterEach` cleanup — copy verbatim from existing lens test files
- **Packages**: `vitest` (existing), `fs/promises` (Node built-in), `os` (Node built-in), `path` (Node built-in), `artifacts/audit-findings.ts` for `LensResultSchema` import

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

The story is primarily a test-quality story. The test plan should:
1. Define a per-lens checklist: positive count, negative count, edge cases, schema compliance, `by_severity` consistency, `lens` field correctness.
2. Address the binary file question explicitly — either specify a test that reads a real binary file (e.g., a PNG) and verifies no throw, or specify that the implementation adds a guard and the test verifies the guard.
3. Address the huge file question — define "huge" (e.g., >500KB or >5000 lines) and specify either a performance guard in implementation or an explicit acceptance that the lens will read the whole file.
4. Note that `lens-test-coverage` behavior on non-existent paths is subtly different from other lenses: it checks filesystem existence via `access()` but still generates a finding for a non-existent source file (because the test file also won't exist). The test file handles this correctly already but the test plan should document the expected behavior.

### For UI/UX Advisor

No UI work in this story. Skip UI/UX review phase.

### For Dev Feasibility

Key implementation questions to address:

1. **Binary file handling**: `readFile(path, 'utf-8')` on binary content does not throw — it returns garbled UTF-8 text. Regex patterns are unlikely to match binary noise. The feasibility reviewer should determine if an explicit binary guard (e.g., checking for null bytes in content) is needed or if current behavior is acceptable.

2. **Huge file handling**: No current file-size limit. For a lens scanning all 1000+ files in a full audit, reading a 50MB minified JS file would be slow. Feasibility reviewer should determine if a file-size gate (e.g., skip files >1MB) should be added and tested.

3. **Gap count per lens**: The feasibility reviewer should open each test file and count existing positive/negative fixtures to identify which lenses need the most work:
   - `lens-security.test.ts`: ~8 positive, ~3 negative — likely sufficient
   - `lens-duplication.test.ts`: ~5 positive, ~3 negative — likely sufficient
   - `lens-typescript.test.ts`: ~8 positive, ~3 negative — likely sufficient
   - `lens-react.test.ts`: ~5 positive, ~2 negative — may need one more negative
   - `lens-accessibility.test.ts`: ~4 positive, ~3 negative — likely sufficient
   - `lens-code-quality.test.ts`: ~7 positive, ~3 negative — likely sufficient
   - `lens-performance.test.ts`: ~6 positive, ~3 negative — likely sufficient
   - `lens-ui-ux.test.ts`: ~5 positive, ~3 negative — likely sufficient
   - `lens-test-coverage.test.ts`: ~6 positive, ~4 negative — likely sufficient

4. **T-shirt size estimate**: Given that all 9 test files already exist with substantial coverage, this story is likely a **Small** (2-4 hours) — primarily gap analysis, edge case additions, and the binary/huge file decision. The main risk is discovering a lens implementation bug that requires fixing.

5. **Canonical references for subtask decomposition**:
   - `packages/backend/orchestrator/src/nodes/audit/__tests__/lens-security.test.ts` — most complete test; use as the gold standard when adding cases to other lenses
   - `packages/backend/orchestrator/src/nodes/audit/lens-typescript.ts` — reference for severity calibration pattern if other lenses need it
   - `packages/backend/orchestrator/src/artifacts/audit-findings.ts` — `AuditFindingSchema` definition; all required fields must be present in test assertion for `findings[0]`
