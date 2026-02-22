# AUDT Stories Index

## Progress Summary

| Status | Count |
|--------|-------|
| Ready to Work | 1 |
| Ready for QA | 1 |
| Pending | 1 |
| **Total** | **3** |

## Ready to Start (No Blockers)

- AUDT-001: Audit Graph + Artifact Schema (scaffolded, needs polish)
- AUDT-0020: Polish and Complete Unit Test Coverage for All 9 Audit Lens Nodes (ready-for-qa)

---

### AUDT-001: Audit Graph & Artifact Schema

**Status:** `ready-to-work`
**Priority:** P0
**Dependencies:** None
**Blocks:** AUDT-002

**Description:**
Polish the scaffolded LangGraph StateGraph, Zod artifact schemas, and scan-scope node. Add index exports and integration tests.

**Scope:**
- Register exports in `packages/backend/orchestrator/src/index.ts`
- Register graph in `graphs/index.ts`, nodes in `nodes/index.ts`
- Create `nodes/audit/index.ts` barrel
- Integration test: graph compiles, pipeline + roundtable routing works
- Test fixtures for Zod schemas

**Existing Files:**
- `graphs/code-audit.ts` — StateGraph with conditional routing
- `artifacts/audit-findings.ts` — Zod schemas
- `nodes/audit/scan-scope.ts` — File discovery

**Acceptance Criteria:**
- [ ] StateGraph compiles with pipeline and roundtable conditional routing
- [ ] All Zod schemas validate with test fixtures
- [ ] scan-scope discovers files correctly for all scope types (full, delta, domain, story)
- [ ] Exports registered in all package index files
- [ ] `pnpm check-types --filter orchestrator` passes

---

### AUDT-002: 9 Audit Lens Nodes

**Status:** `ready-for-qa`
**Priority:** P0
**Story ID:** AUDT-0020
**Story File:** `ready-for-qa/AUDT-0020/AUDT-0020.md`
**Dependencies:** AUDT-001
**Blocks:** AUDT-003

**Description:**
Polish the 9 scaffolded lens nodes. Gap-fill existing unit tests to consistently meet: min 3 positive + 3 negative fixtures per lens, `LensResultSchema` compliance, `by_severity` sum checks, `lens` field assertions, and full edge-case coverage (empty file, empty array, non-existent path, binary file).

**Scope:**
- `by_severity` sum check across all 9 lens test files
- Empty `targetFiles` array edge case across all 9 lenses
- `lens` field consistency assertions across all 9 lenses
- Binary file documented behavior test (security lens)
- Severity calibration test (lens-typescript)
- `lens === 'a11y'` assertion (lens-accessibility)

**Existing Files:**
- `nodes/audit/__tests__/lens-*.test.ts` — 9 test files (all exist, need gap-filling)
- `nodes/audit/lens-*.ts` — 9 implementations (all exist, modify only if test reveals a bug)

**Acceptance Criteria:**
- [ ] Each lens produces valid LensResult schema output (`LensResultSchema.parse()` no-throw)
- [ ] Security lens catches hardcoded secrets, eval, injection patterns
- [ ] Duplication lens detects cross-app duplicates
- [ ] Test-coverage lens correctly identifies untested files
- [ ] All 9 lenses have unit tests with fixtures (min 3 positive, 3 negative each)
- [ ] `by_severity` sum check present in all 9 lens test files
- [ ] Empty `targetFiles` array → 0 findings across all 9 lenses
- [ ] `pnpm test --filter orchestrator` passes green

---

### AUDT-003: Audit Orchestration Nodes

**Status:** `pending`
**Priority:** P1
**Dependencies:** AUDT-002
**Blocks:** None

**Description:**
Polish the 6 orchestration nodes. Add end-to-end integration test running a full audit pipeline on real codebase data.

**Scope:**
- Integration test: full pipeline (scan → lenses → synthesize → deduplicate → persist)
- Integration test: full roundtable (adds devil's advocate + roundtable)
- Verify FINDINGS-{date}.yaml output matches schema
- Verify TRENDS.yaml aggregation across multiple runs
- Verify deduplication against stories.index.md

**Existing Files:**
- `nodes/audit/devils-advocate.ts`, `roundtable.ts`, `synthesize.ts`, `deduplicate.ts`, `persist-findings.ts`, `persist-trends.ts`

**Acceptance Criteria:**
- [ ] Pipeline mode end-to-end test passes
- [ ] Roundtable mode end-to-end test passes
- [ ] FINDINGS-{date}.yaml written with correct schema
- [ ] TRENDS.yaml aggregates across multiple audit runs
- [ ] Deduplication correctly flags similar existing stories (Jaccard > 0.8)
- [ ] Sequential AUDIT-NNN IDs assigned correctly
