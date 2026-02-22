# Elaboration Analysis - WKFL-008

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story title "Workflow Experimentation Framework" and summary match the index entry. WKFL-001 confirms WKFL-008 is a declared downstream consumer (`blocks: [WKFL-008]`). The stories.index.md does not list WKFL-008 directly but the WKFL-001 story.yaml dependency chain confirms alignment. |
| 2 | Internal Consistency | CONDITIONAL PASS | Low | Goals, ACs, and non-goals are coherent. One minor tension: `scope.in` lists "Traffic routing mechanism" but the technical_notes implement traffic routing as inline pseudocode inside story creation — no dedicated agent or node is named. The implementation location (`.claude/` commands vs. LangGraph node) is left ambiguous. |
| 3 | Reuse-First Enforcement | PASS | — | `reuse_plan.must_reuse` explicitly calls out OUTCOME.yaml from WKFL-001 and the existing story creation flow. AC-3 verification references `OUTCOME.yaml includes variant`, confirming integration. |
| 4 | Ports & Adapters Compliance | N/A | — | This is an agent/YAML-based story with no API layer or transport boundary. No ports & adapters requirement applies. |
| 5 | Local Testability | CONDITIONAL PASS | Medium | ACs 1, 2, 3, and 5 have concrete YAML-based verification steps (file exists with correct fields, queryable by variant, EXPERIMENT-REPORT.yaml has recommendation). AC-4 verification ("Report only makes claims with >= 10 samples per variant") describes behaviour but does not specify a concrete local test step — no fixture, command, or file path is given to exercise the minimum sample guard. This leaves AC-4 partially unverifiable without implementation knowledge. |
| 6 | Decision Completeness | CONDITIONAL PASS | Medium | Two unresolved decisions exist: (1) No agent or node is named as the owner of traffic routing during story creation — the pseudocode in technical_notes is illustrative JavaScript but the actual integration point (which agent file gets modified) is not specified. (2) The storage location for per-variant metric aggregation is unspecified — the story says metrics are "queryable by variant" but does not state whether this is a KB query, a flat YAML, or a database table. These are not hard blockers but increase implementer ambiguity. |
| 7 | Risk Disclosure | FAIL | High | No explicit `risks:` section exists. The story is silent on: (1) experiment interference (two active experiments may assign the same story to both variants simultaneously — the pseudocode uses `break` after first match, which mitigates this, but the risk is not discussed); (2) statistical validity with the low sample threshold of 10 (p-values on n=10 are unreliable, which the technical_notes example implicitly acknowledges with `p=0.45` but does not flag as a risk); (3) what happens when the story creation flow changes and variant tagging is silently broken (no integrity check or fallback). |
| 8 | Story Sizing | PASS | — | 5 ACs (under 8 threshold). No endpoints. No frontend. Deliverables are: one YAML schema, one agent file, one command, traffic routing hook in story creation, and one report format — all related and non-independent. Touches `.claude/` config and potentially `dev-documentation-leader.agent.md` (2 touch points). Within sizing bounds. |
| 9 | Subtask Decomposition | FAIL | Medium | No `subtasks:` section is present. Given 5 ACs and 4 distinct deliverables (experiments.yaml schema, experiment-analyzer agent, /experiment-report command, traffic routing hook), a subtask breakdown is expected to guide phased implementation and allow partial verification. Absence increases risk of incomplete delivery. |

---

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | No risk disclosure section | High | Add `risks:` block covering experiment interference, statistical validity at low N, and variant tagging integrity. |
| 2 | AC-4 verification is under-specified | Medium | Provide a concrete local test step: e.g., "Create EXPERIMENT-REPORT.yaml fixture with 8 samples per variant, run /experiment-report, verify report omits statistical claims and states 'insufficient data'." |
| 3 | Traffic routing integration point is unnamed | Medium | Specify which agent file receives the routing hook (likely `dev-documentation-leader.agent.md` based on WKFL-001 precedent) and note the integration step explicitly in `scope.in` or `technical_notes`. |
| 4 | Per-variant metric storage location unspecified | Medium | Clarify whether variant-tagged OUTCOME.yaml files are queried directly, aggregated into a dedicated YAML, or stored in KB. AC-3 verification depends on this being defined. |
| 5 | No subtasks section | Medium | Add `subtasks:` covering at minimum: (a) define experiments.yaml schema, (b) implement traffic routing hook, (c) build experiment-analyzer agent, (d) implement /experiment-report command, (e) verify end-to-end with fixture data. |

---

## Preliminary Verdict

**Verdict**: CONDITIONAL PASS

The story is well-scoped, internally coherent, and appropriately sized. The reuse plan is explicit and the YAML-based verification pattern is mostly sound. Three medium issues (AC-4 testability, unnamed integration point, missing storage spec) and one high issue (absent risk disclosure) must be resolved before the story is implementation-ready. No split is required — the scope is cohesive and does not bundle independent features.

---

## MVP-Critical Gaps

| # | Gap | Blocks | Required Fix |
|---|-----|--------|--------------|
| 1 | Risk disclosure absent | AC-4, AC-5 analysis validity | Add `risks:` section covering experiment interference, low-N statistical reliability, and variant tagging integrity. |
| 2 | AC-4 verification under-specified | Local testability of minimum sample guard | Define a concrete fixture-based test step specifying file, command, and expected output when sample size < 10. |
| 3 | Traffic routing integration point unnamed | AC-2 implementation | Specify the target agent file for the story-creation routing hook (expected: `dev-documentation-leader.agent.md`). |

---

## Worker Token Summary

- Input: ~6,500 tokens (story.yaml, stories.index.md, PLAN.exec.md, PLAN.md, WKFL-001 story.yaml)
- Output: ~800 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
