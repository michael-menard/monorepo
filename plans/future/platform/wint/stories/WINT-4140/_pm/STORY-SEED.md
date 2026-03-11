---
generated: "2026-03-08"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: false
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: WINT-4140

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates WINT-4070 (cohesion-prosecutor) and WINT-4080 (scope-defender) deliveries. WINT-4080 is in UAT (completed elab, passed audit). WINT-4070 is in ready-for-qa. The round-table.agent.md target file does not yet exist. Supplemented by direct codebase scan and elab review of sibling agents.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| scope-defender agent | `.claude/agents/scope-defender.agent.md` | Produces `scope-challenges.json` — primary DA input to Round Table synthesis |
| scope-challenges.json schema | `scope-defender.agent.md` output section | Machine-readable DA output Round Table must consume: `challenges[]` (max 5), `warning_count`, `truncated` |
| cohesion-prosecutor agent (WINT-4070) | `.claude/agents/` (pending delivery) | Produces `cohesion-findings.json` — primary PO input to Round Table synthesis |
| graph-checker agent (WINT-4060) | `.claude/agents/graph-checker.agent.md` | Produces `graph-check-results.json` — supplemental input for elab gaps detection |
| gap-analytics-agent | `.claude/agents/gap-analytics-agent.agent.md` | Sibling haiku agent — structural reference for file layout and completion signals |
| evidence-judge agent | `.claude/agents/evidence-judge.agent.md` | Sibling evaluator — demonstrates pass/fail verdict output pattern |
| Orchestrator YAML artifacts | `packages/backend/orchestrator/src/artifacts/` | Zod-validated schemas: scope, evidence, review — final-scope.json must be compatible with scope artifact schema |
| WINT-4150 (pending) | stories.index.md | Defines formal JSON schemas for `final-scope.json` (+ followups) — Round Table output must anticipate this schema standardization |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| WINT-4070 | ready-for-qa | High: cohesion-prosecutor delivers `cohesion-findings.json` that Round Table consumes. If WINT-4070 does not stabilize, Round Table must degrade gracefully on missing PO findings. |
| WINT-4080 | UAT | Low: scope-defender is functionally complete. `scope-challenges.json` schema is stable. Round Table can author against this schema now. |
| WINT-4150 | pending (blocked on WINT-4140) | Medium: WINT-4150 will define and enforce final artifact schemas. Round Table's `final-scope.json` format will be subject to schema validation once WINT-4150 ships. Round Table v1.0 should mark its output as `schema_version: '1.0-draft'` to signal pre-standardization status. |

### Constraints to Respect

- Round Table is synthesis-only: it MUST NOT brainstorm, invent new ACs, or add items not present in its inputs
- Model: haiku (per Phase 4 worker agent pattern — scope-defender, graph-checker, gap-analytics-agent precedents)
- This is an agent-prompt-only story — deliverable is `.claude/agents/round-table.agent.md` only, no TypeScript code
- Protected: orchestrator artifact Zod schemas — final-scope.json must not conflict with existing scope artifact shape
- scope-challenges.json hard cap is 5 challenges (max); cohesion-findings.json hard cap is 5 findings (max 2 blocking) per WINT-4150 spec
- Explicit followups must be deferred (not silently dropped) — each deferred item must appear in `followups[]` with source attribution

---

## Retrieved Context

### Related Endpoints

None — this story creates an agent file, not an API endpoint. All I/O is file-based JSON artifact reads and writes.

### Related Components

None — no UI components involved.

### Reuse Candidates

| Asset | Location | How Used |
|-------|----------|----------|
| scope-defender agent structure | `.claude/agents/scope-defender.agent.md` | Structural template: YAML frontmatter, inputs table with graceful degradation, execution phases, JSON output schema, completion signals, non-negotiables, LangGraph porting notes |
| scope-challenges.json schema | `scope-defender.agent.md` output section | Input schema Round Table reads: `challenges[]`, `warning_count`, `truncated`, `story_id`, `generated_at` |
| gap-analytics-agent layout | `.claude/agents/gap-analytics-agent.agent.md` | Haiku worker agent with similar bounded-output pattern; demonstrates how to structure optional inputs with graceful degradation |
| evidence-judge verdict pattern | `.claude/agents/evidence-judge.agent.md` | Pass/fail/blocked completion signal pattern reusable as `ROUND-TABLE COMPLETE`, `ROUND-TABLE COMPLETE WITH WARNINGS`, `ROUND-TABLE BLOCKED` |

---

## Canonical References

This is an agent-prompt-only story — the deliverable is a single `.agent.md` markdown file. No TypeScript implementation pattern references are applicable.

| Pattern | File | Why |
|---------|------|-----|
| Agent/workflow (Phase 4 haiku worker) | `.claude/agents/scope-defender.agent.md` | Best structural exemplar for Phase 4 worker agents: YAML frontmatter, 4-phase workflow, required/optional inputs table with degradation column, machine-readable JSON output schema, completion signals, non-negotiables, LangGraph porting notes |
| Bounded-output haiku agent | `.claude/agents/gap-analytics-agent.agent.md` | Demonstrates how a haiku agent structures constrained synthesis with hard caps and graceful degradation on missing optional inputs |

---

## Knowledge Context

### Lessons Learned

- **[WINT-4080 elab finding wint-4080-gap-4]** scope-defender is missing `spawned_by` / `triggers` frontmatter field — makes it undiscoverable from orchestrator context. KB note: "WINT-4140 story should document which orchestrator spawns scope-defender; add field when Round Table integration is implemented."
  - *Applies because*: Round Table is the direct downstream consumer of scope-defender output. Round Table's agent file should explicitly declare `spawned_by` or `triggers` referencing the elab orchestrator that sequences PO → DA → Round Table. Fixes the discoverability gap identified in WINT-4080 elab.

- **[WINT-4080 elab finding wint-4080-enh-5]** `accept-as-mvp` recommendation in scope-challenges.json challenges array represents a non-challenge — adds noise for Round Table synthesis.
  - *Applies because*: Round Table must handle `accept-as-mvp` entries that appear in `scope-challenges.json`. The synthesis logic should filter these into a separate `accepted` pass-through list rather than treating them as deferred items. This is a known schema wart to be cleaned up by WINT-4150.

- **[WINT-4080 elab finding wint-4080-enh-6]** scope-challenges.json is missing `schema_version` field — schema changes undetectable by consumers.
  - *Applies because*: Round Table is a consumer of scope-challenges.json. Until WINT-4150 adds `schema_version`, Round Table should log a warning if the field is absent rather than failing hard.

- **[WKFL-010, WINT-2080]** Agent-file-only stories: QA verification is purely structural/content — file inspection via grep and read; tests exempt, coverage not applicable.
  - *Applies because*: WINT-4140 delivers only `.claude/agents/round-table.agent.md`. No TypeScript code. Same exemption pattern applies as WINT-4060, WINT-4080.

- **[WKFL-001, WKFL-006]** Review phase waived for documentation-only stories; substitute documentation quality check.
  - *Applies because*: round-table is a docs-only story. Standard TypeScript code review provides no value. QA verification should check schema completeness, synthesis constraint enforcement, and completion signal coverage.

### Blockers to Avoid (from past stories)

- Do not wait for WINT-4070 (cohesion-prosecutor) to reach `completed` before elaborating WINT-4140 — the agent file can be authored against a draft PO output schema; the dependency matters only at runtime
- Do not let Round Table invent new ACs or expand scope — the "synthesis only" constraint is the primary risk; every AC must reference an item already present in PO findings, DA challenges, or elab gaps
- Do not silently drop deferred items — each item not included in final-scope must appear in `followups[]` with `source` field identifying which input it came from (PO | DA | elab-gaps)
- Do not hard-fail on missing optional inputs — increment warning count and proceed with available data

### Architecture Decisions (ADRs)

ADR-LOG.md was not located at `plans/stories/ADR-LOG.md`. ADR context sourced from codebase evidence and KB lessons.

| Decision | Constraint |
|----------|------------|
| Zod-first types (CLAUDE.md) | All schema definitions use `z.object()` + `z.infer<>` — relevant for LangGraph porting notes specifying final-scope.json Zod schema |
| Agent model assignment | Phase 4 worker agents use haiku model (scope-defender, graph-checker, gap-analytics-agent precedents) |
| No barrel files | Do not create an `index.ts` that only re-exports; import directly from source (relevant for LangGraph porting contract) |
| Direct-call pattern (ARCH-001) | Any file I/O in LangGraph node must use direct TypeScript function calls, not HTTP fetches to sidecars |

### Patterns to Follow

- 4-phase sequential execution: Load Inputs → Resolve Conflicts → Synthesize Final Scope → Produce Output
- Required/optional inputs table with "Degradation if missing" column for each optional input
- Hard cap on output items (final scope ACs bounded by input AC count — cannot exceed total input ACs)
- Completion signal on final line: `ROUND-TABLE COMPLETE`, `ROUND-TABLE COMPLETE WITH WARNINGS: {N}`, or `ROUND-TABLE BLOCKED: {reason}`
- LangGraph porting notes section documenting input/output state contract for future node at `nodes/story/round-table.ts`
- `schema_version: '1.0-draft'` in `final-scope.json` to signal pre-WINT-4150 standardization status

### Patterns to Avoid

- Brainstorming, inventing new ACs, or adding items not present in inputs — synthesis only
- Silently dropping deferred items — all non-included items must appear in `followups[]`
- Hard-failing on missing optional inputs (PO findings or elab gaps) — degrade with warnings
- Merging conflicting items by averaging or splitting — if PO marks an item as blocking and DA challenges it as non-MVP, document the conflict explicitly and defer the resolution decision to `followups[]` with `conflict: true`

---

## Conflict Analysis

### Conflict: Dependency WINT-4070 not yet stable (ready-for-qa)

- **Severity**: warning
- **Description**: WINT-4070 (cohesion-prosecutor) is in `ready-for-qa` state. It will produce `cohesion-findings.json` that is Round Table's primary PO input. The `cohesion-findings.json` schema is not yet finalized (blocked on WINT-4150). Round Table must be authored against a provisional schema, with graceful degradation if the file is absent or has an unexpected format.
- **Resolution Hint**: Author Round Table's agent spec now against the expected cohesion-findings schema (max 5 findings, max 2 blocking). Include a graceful degradation note: if `cohesion-findings.json` is absent or unreadable, proceed with PO findings = empty, increment warning count by 1, continue synthesis with DA challenges and elab gaps only.

### Conflict: final-scope.json schema will be superseded by WINT-4150

- **Severity**: warning
- **Description**: WINT-4150 (Standardize Elab Output Artifacts) is blocked on WINT-4140 and will formally define the `final-scope.json` + `followups` schema. Round Table v1.0 defines its own provisional schema. When WINT-4150 ships, Round Table's output section may need updating.
- **Resolution Hint**: Mark `final-scope.json` output as `schema_version: '1.0-draft'` in the agent spec. Document in the LangGraph porting notes that the Zod schema for this output should be imported from the centralized `schemas/` location once WINT-4150 delivers it, rather than being declared inline.

---

## Story Seed

### Title

Create Round Table Agent

### Description

**Context**: The WINT Phase 4 elaboration workflow now has two adversarial worker agents: cohesion-prosecutor (PO role, WINT-4070 — ready-for-qa) and scope-defender (DA role, WINT-4080 — UAT). Each agent produces a bounded, machine-readable JSON artifact: `cohesion-findings.json` (max 5, max 2 blocking) and `scope-challenges.json` (max 5). These two agents intentionally produce conflicting outputs — the prosecutor pushes for completeness, the defender challenges non-MVP scope.

**Problem**: No agent currently resolves the adversarial PO/DA outputs into a single actionable scope. Without a synthesis step, the elab workflow terminates with two conflicting artifacts and no authoritative final scope for implementation to act on. The conflict resolution is currently manual or undefined.

**Proposed Solution**: Create a haiku-powered worker agent (`round-table.agent.md`) that mechanically synthesizes PO cohesion findings, DA scope challenges, and elab gaps into a single `final-scope.json`. The agent enforces a strict "synthesis only" constraint — it converges what already exists; it does not brainstorm, invent ACs, or expand scope. Items not included in final scope are explicitly deferred to `followups[]` with source attribution, making deferrals auditable.

This agent is the convergence layer of the Phase 4 elab pipeline. It runs after both PO and DA complete. Its output (`final-scope.json` + `followups[]`) feeds downstream implementation and the WINT-4150 artifact standardization.

### Initial Acceptance Criteria

- [ ] **AC-1**: A file `.claude/agents/round-table.agent.md` exists with valid YAML frontmatter (`created`, `updated`, `version`, `type: worker`, `model: haiku`, `name: round-table`, `spawned_by` referencing the elab orchestrator that sequences PO → DA → Round Table)
- [ ] **AC-2**: The agent spec defines a required inputs section listing: story directory path; and optional inputs: `cohesion-findings.json` (PO output), `elab-gaps.json` or equivalent gap artifact — each with a "Degradation if missing" column specifying that missing optional input = 1 warning, proceed with empty data for that source
- [ ] **AC-3**: The agent spec defines a 4-phase execution workflow: (1) Load Inputs (parse all three sources: PO findings, DA challenges, elab gaps), (2) Resolve Conflicts (identify items where PO marks blocking and DA challenges as non-MVP — flag as `conflict: true` in followups), (3) Synthesize Final Scope (produce bounded AC list from accepted items), (4) Produce Output (write `final-scope.json`)
- [ ] **AC-4**: The synthesis constraint is explicitly documented: Round Table MUST NOT add new ACs, invent new requirements, or include any item not present in PO findings, DA challenges, or elab gaps. Every item in `final_acs[]` must reference its source input.
- [ ] **AC-5**: The agent spec defines the `final-scope.json` output schema with at minimum: `story_id`, `generated_at`, `schema_version` (`'1.0-draft'`), `final_acs` (array of accepted ACs with `id`, `text`, `source`, `accepted_from` fields), `followups` (array of deferred items with `id`, `text`, `source`, `reason`, `conflict` boolean fields), `po_warnings`, `da_warnings`, `synthesis_warnings`, `total_warning_count`
- [ ] **AC-6**: Any item from DA challenges with `recommendation: 'defer-to-backlog'` or `recommendation: 'reduce-scope'` that Round Table accepts as a deferral must appear in `followups[]` with `source: 'DA'` and the original `deferral_note` preserved
- [ ] **AC-7**: Any PO finding with `severity: 'blocking'` that is NOT included in `final_acs[]` must appear in `followups[]` with `source: 'PO'` and `conflict: true` if a DA challenge also targeted the same item
- [ ] **AC-8**: The agent spec includes a non-goals section explicitly stating: does not brainstorm new ACs, does not create backlog entries, does not call graph tools directly, does not modify orchestrator artifacts, does not modify any story source file
- [ ] **AC-9**: The agent spec includes a LangGraph porting notes section documenting the input state contract (three source artifacts as state fields), execution contract (4-phase workflow), and output contract (`final-scope.json` with Zod schema import path from future `schemas/final-scope.schema.ts` once WINT-4150 delivers it)
- [ ] **AC-10**: The completion signal section defines exactly three outcomes: `ROUND-TABLE COMPLETE`, `ROUND-TABLE COMPLETE WITH WARNINGS: {N} warnings`, `ROUND-TABLE BLOCKED: {reason}` (blocked only if scope-challenges.json is unreadable — PO findings and elab gaps are optional)

### Non-Goals

- Do NOT implement any TypeScript code (agent-prompt-only story)
- Do NOT create backlog entries (that is backlog-curator's responsibility — WINT-4100)
- Do NOT call graph tools (`graph_get_franken_features`, `graph_get_capability_coverage`) — graph data is an input via elab-gaps, not a direct query target
- Do NOT modify any story source file, AC list, or orchestrator artifact
- Do NOT formally define `final-scope.json` schema (that is WINT-4150's responsibility — use provisional `schema_version: '1.0-draft'`)
- Do NOT brainstorm or invent new requirements — synthesis only
- Do NOT add the agent to `model-assignments.yaml` (handled by a separate agent assignment story)

### Reuse Plan

- **Components**: Not applicable (no TypeScript code)
- **Patterns**: scope-defender 4-phase workflow structure, optional-inputs-with-degradation table, completion signals, LangGraph porting notes section; gap-analytics-agent bounded-output pattern
- **Packages**: References to `scope-challenges.json` (scope-defender output), `cohesion-findings.json` (cohesion-prosecutor output, WINT-4070 delivery); future reference to `schemas/final-scope.schema.ts` (WINT-4150 delivery)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

This is an agent-prompt-only story. The deliverable is a single `.agent.md` markdown file. QA verification strategy:
- Tests are exempt — no TypeScript code to test
- Coverage is not applicable — no TypeScript source files
- E2E is exempt — no UI surface, no HTTP endpoints
- Document all exemptions explicitly in `EVIDENCE.yaml` `known_deviations`
- QA verification is structural/content:
  1. Verify file exists at `.claude/agents/round-table.agent.md`
  2. Frontmatter is valid YAML with all required fields including `spawned_by`
  3. All 10 ACs are addressed in the agent spec body
  4. The synthesis constraint ("no new ACs") is explicitly stated and testable via grep
  5. `final-scope.json` schema section is present with all required fields
  6. `followups[]` schema is present with `source`, `reason`, `conflict` fields
  7. All three completion signals are defined
  8. LangGraph porting notes section present with input/output contracts
- Recommend a documentation-quality check: verify that `accept-as-mvp` DA challenge handling is described (known schema wart from WINT-4080 elab), and that `schema_version: '1.0-draft'` appears in the output schema

### For UI/UX Advisor

Not applicable. This story produces an agent markdown file with no user-facing interface. The "UX" concern here is the clarity of the `followups[]` output — each deferred item must include enough context (`reason`, `source`, `conflict` flag) for a PM to make a grooming decision without re-reading the full elab transcript.

### For Dev Feasibility

- **Complexity**: Low. The agent spec is a markdown file. The two primary input schemas (scope-challenges.json from WINT-4080, cohesion-findings.json from WINT-4070) are defined. The output schema (final-scope.json) is provisional pending WINT-4150.
- **Key risks**:
  1. WINT-4070 (cohesion-prosecutor) is in ready-for-qa — `cohesion-findings.json` schema may still shift. Mitigation: agent handles missing PO findings gracefully (warning + proceed with DA + gaps only).
  2. "Synthesis only" constraint is the primary correctness risk — the spec must be unambiguous enough that a haiku model operating on it cannot accidentally invent new ACs. Recommend adding a per-phase guard: "If this step would add an item not present in Phase 1 inputs, STOP and flag as blocked."
  3. Conflict resolution (PO blocking vs DA defer) is the hardest synthesis case — must be explicitly handled, not implicitly resolved.
- **Canonical references for subtask decomposition**:
  - Structural template: `.claude/agents/scope-defender.agent.md` — use as skeleton; adapt phases 2-3 for conflict resolution and synthesis
  - Bounded-output reference: `.claude/agents/gap-analytics-agent.agent.md` — demonstrates optional inputs degradation table pattern
  - Input schema: scope-defender `scope-challenges.json` output section — copy field names exactly
  - Provisional output: author `final-scope.json` schema inline in the agent spec; add `schema_version: '1.0-draft'` and note import path (`schemas/final-scope.schema.ts`) for WINT-4150
- **Subtask suggestion**: Single subtask — author `.claude/agents/round-table.agent.md` using scope-defender as structural template, adapting phases 2-3 for conflict resolution (PO vs DA) and synthesis (ACs → final_acs + followups). Estimated 3,000–5,000 tokens.
- **Spawned_by fix**: Include `spawned_by` frontmatter field referencing the elab orchestrator (addresses WINT-4080 elab gap `wint-4080-gap-4` which deferred this to WINT-4140).
