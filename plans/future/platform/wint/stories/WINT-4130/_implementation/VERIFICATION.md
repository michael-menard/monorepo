# VERIFICATION.md — WINT-4130
## Validate Graph & Cohesion System — Detection Verification Against Known Franken-Features

**Story type:** spike  
**Generated:** 2026-03-08  
**Iteration:** 1  
**Overall result:** PARTIAL — validation ran but environment pre-conditions failed

---

## Executive Summary

WINT-4130 is the first integration validation of the Phase 4 graph & cohesion system. The validation
ran to completion but all three pre-flight conditions failed because the `wint` schema has not been
created in the development PostgreSQL instance. Runtime dependencies WINT-4030 (graph population)
and WINT-4050 (cohesion rules seeding) have not been applied.

The graph-checker agent (WINT-4060) exists and is structurally sound. Its graceful degradation
behavior — producing empty results with correct warning messages when graph data is absent — was
verified both by direct invocation and structural review of the agent spec. Two critical design
gaps were identified and documented.

**Recommendation:** This story should be re-run after WINT-4030 and WINT-4050 have been applied.
The two design gaps (DEV-002 tool mismatch, DEV-003 CRUD_STAGES mismatch) should be addressed in
WINT-4060 before the re-run.

---

## Pre-Flight Status

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| `graph.features` row count | >= 1 | 0 (table absent) | FAIL |
| `rulesRegistryGet` active rules | >= 1 | 0 (table absent) | FAIL |
| `graph.feature_capabilities` row count | >= 1 | 0 (table absent) | FAIL |
| `capability_mode` | rules or builtin | unavailable | FAIL |
| graph-checker agent file exists | true | true | PASS |
| cohesion-check command exists | true | true | PASS |

**DB schemas present:** public, analytics, drizzle  
**DB schemas missing:** wint, graph  

---

## Per-AC Status

| AC | Title | Status | Notes |
|----|-------|--------|-------|
| AC-1 | Pre-flight check | FAIL | All 3 counts 0 — wint schema absent. Documentation complete. |
| AC-2 | Upload-without-replace fixture | MISSING | No graph data. Also: 'upload' not in CRUD_STAGES (DEV-003). |
| AC-3 | Create-without-delete fixture | MISSING | No graph data. Would be detectable once data exists. |
| AC-4 | Detection fires — franken_features_found > 0 | PARTIAL | Agent ran, produced valid output, but found 0 features. Root cause: pre-flight failure. |
| AC-5 | Output schema conformance | PASS | All 6 required fields present and correctly typed in graph-check-results.json. |
| AC-6 | Rule-specific detection (rule_id + actionable_hint) | N/A | No violations produced. Spec confirms BUILTIN-CRUD-COMPLETENESS would be used. |
| AC-7 | Graceful degradation — empty graph | PASS | Warning produced: "graph.features empty — WINT-4030 may not have run". Signal correct. |
| AC-8 | Graceful degradation — empty rules | PARTIAL | Structural verification PASS. Live isolation not possible in current environment. |
| AC-9 | Completion signal format | PASS | "GRAPH-CHECKER COMPLETE WITH WARNINGS: 2 warnings" — matches spec exactly. |
| AC-10 | Evidence captured in EVIDENCE.yaml | PASS | All sections present: pre_conditions, fixture_features, e2e_tests, known_deviations. |
| AC-11 | Defect triage documented | PASS | 4 known_deviations with owner stories. |

**Summary:** 4 PASS, 2 PARTIAL, 2 MISSING, 1 FAIL, 1 N/A (out of 11 ACs, AC-6 is N/A)

---

## Validation Run Details

### Graph-Checker Invocation (HP-4 / e2e-1)

- **Method:** Sub-agent invocation per cohesion-check.md pattern
- **Agent:** `.claude/agents/graph-checker.agent.md`
- **Story context:** `plans/future/platform/wint/in-progress/WINT-4130`
- **Completion signal:** `GRAPH-CHECKER COMPLETE WITH WARNINGS: 2 warnings`
- **Output:** `graph-check-results.json` written to `_implementation/`
- **Franken features found:** 0
- **Violations:** []
- **Warnings:**
  1. `graph.features empty — WINT-4030 may not have run`
  2. `No active cohesion rules found — WINT-4050 may not have run`

### EC-1 — Empty Graph Degradation (e2e-2)

Verified via live invocation (primary run IS the empty-graph case) and structural review.

- **Warning produced:** `graph.features empty — WINT-4030 may not have run` ✓
- **violations:** [] ✓
- **warning_count:** >= 1 ✓
- **Status:** CONFIRMED (live)

### EC-2 — Empty Rules Degradation (e2e-3)

Verified via structural review of `graph-checker.agent.md` Graceful Degradation section.

- **Spec text confirmed:** "No active cohesion rules found — WINT-4050 may not have run" ✓
- **BUILTIN-CRUD-COMPLETENESS fallback confirmed in spec:** Phase 3 Apply Rules, step 2 ✓
- **Status:** CONFIRMED (structural)

---

## Known Deviations / Defects

### DEV-001 — wint schema absent (CRITICAL)

The `wint`/`graph` schema does not exist in the dev PostgreSQL instance. WINT-4030 and WINT-4050
have not run. This is the root cause of all pre-flight failures.

- **Impact:** AC-1 FAIL, AC-2 MISSING, AC-3 MISSING, AC-4 PARTIAL
- **Owner:** WINT-4030 (apply schema + populate data), then WINT-4050 (seed rules)
- **Action:** Apply WINT-4030 migrations and population script. Apply WINT-4050 rules seeding. Re-run WINT-4130.
- **Blocking:** No — story designed for this degradation path.

### DEV-002 — graph-checker agent tool-to-function mismatch (HIGH)

`graph-checker.agent.md` specifies `tools: [Read, Grep, Glob]` (filesystem only) but Phase 2
requires calling `graph_get_franken_features()`, `rulesRegistryGet()`, and
`graph_get_capability_coverage()` — TypeScript DB functions. A filesystem-only agent cannot
execute TypeScript imports or connect to PostgreSQL. In an empty-graph environment this gap is
masked (degraded output matches spec), but in a populated environment the agent would produce
fictitious results rather than live DB data.

- **Impact:** AC-4 cannot be fully verified with live data when environment is populated
- **Owner:** WINT-4060
- **Recommended fix:** Add a `Bash` tool invocation to run a TypeScript runner script that queries
  the DB and writes results to a temp file, then have the agent read that file. Alternatively,
  implement as a LangGraph node per the porting notes in the agent spec.
- **Blocking:** No — masked in current environment.

### DEV-003 — upload-without-replace fixture not detectable via CRUD_STAGES (MEDIUM)

`graph_get_franken_features` uses `CRUD_STAGES = ['create','read','update','delete']`. The strings
`'upload'` and `'replace'` are not in this set. AC-2 fixture (upload-without-replace) cannot be
detected by this tool. Identifying upload-without-replace requires a direct `SELECT` on
`graph.feature_capabilities WHERE lifecycle_stage = 'upload'`.

- **Impact:** AC-2 cannot be satisfied by the designed detection mechanism
- **Owner:** WINT-4060 (extend CRUD_STAGES or add custom query) or WINT-4030 (clarify intent)
- **Blocking:** No — cannot be tested until graph data exists anyway.

### DEV-004 — haiku model for complex rule evaluation (LOW)

`graph-checker.agent.md` specifies `model: haiku`. For Phase 3 rule evaluation and
`actionable_hint` generation, haiku may produce reduced-quality hints. Monitor when data is
available.

- **Impact:** Minor — hint quality may be reduced
- **Owner:** WINT-4060
- **Blocking:** No.

---

## Schema Conformance Check (AC-5)

Verified against `graph-checker.agent.md` Output section schema:

| Field | Type | Required | Present | Value | Status |
|-------|------|----------|---------|-------|--------|
| `story_id` | string | yes | yes | "WINT-4130" | PASS |
| `generated_at` | string (ISO 8601) | yes | yes | "2026-03-08T17:00:00Z" | PASS |
| `franken_features_found` | integer | yes | yes | 0 | PASS |
| `violations` | array | yes | yes | [] | PASS |
| `warnings` | array of strings | yes | yes | [2 entries] | PASS |
| `warning_count` | integer | yes | yes | 2 | PASS |

All 6 required fields present and correctly typed. **Schema check: PASS**

---

## What Needs to Happen for Full Validation Pass

1. **WINT-4030** must be merged and its schema migration + populate-graph-features.ts script run
   against the dev PostgreSQL instance
2. **WINT-4050** must be merged and its cohesion rules seeded into `wint.rules`
3. **WINT-4060** must fix the tool-to-function mismatch (DEV-002) so the agent can actually query
   the DB when graph data exists
4. **WINT-4060** must clarify or extend CRUD_STAGES to include 'upload'/'replace' if those are
   intended stages (DEV-003)
5. **Re-run WINT-4130** validation after steps 1-4 are complete

---

## E2E Gate

This story is a spike with no code changes. The E2E gate is marked exempt. The graph-checker
agent invocation and structural verification constitute the validation run against live resources
per ADR-006.

---

## Files Produced

| File | Status |
|------|--------|
| `_implementation/EVIDENCE.yaml` | Written |
| `_implementation/graph-check-results.json` | Written |
| `_implementation/VERIFICATION.md` | Written (this file) |
