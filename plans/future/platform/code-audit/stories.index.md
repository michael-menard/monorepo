# AUDT Stories Index

## Progress Summary

| Status | Count |
|--------|-------|
| Ready to Work | 1 |
| Pending | 2 |
| **Total** | **3** |

## Ready to Start (No Blockers)

- AUDT-001: Audit Graph + Artifact Schema (scaffolded, needs polish)

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

**Status:** `pending`
**Priority:** P0
**Dependencies:** AUDT-001
**Blocks:** AUDT-003

**Description:**
Polish the 9 scaffolded lens nodes. Add unit tests with fixtures, accuracy benchmarks, and edge case handling.

**Scope:**
- Test fixtures: known-positive files (contain pattern) + known-negative files (clean)
- Severity calibration tests (production vs test file paths)
- LensResult schema compliance for each lens
- Edge cases: empty files, binary files, huge files

**Existing Files:**
- `nodes/audit/lens-security.ts` through `lens-code-quality.ts` (9 files)

**Acceptance Criteria:**
- [ ] Each lens produces valid LensResult schema output
- [ ] Security lens catches hardcoded secrets, eval, injection patterns
- [ ] Duplication lens detects cross-app duplicates
- [ ] Test-coverage lens correctly identifies untested files
- [ ] All 9 lenses have unit tests with fixtures (min 3 positive, 3 negative each)

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
