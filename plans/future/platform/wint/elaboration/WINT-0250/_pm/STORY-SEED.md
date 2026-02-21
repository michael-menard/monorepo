---
generated: "2026-02-20"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: false
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: WINT-0250

> WARNING: No baseline reality file found (baseline_path: null). Context is gathered from direct
> inspection of the stories index, dependency story definitions, and codebase patterns. All
> dependency stories (WINT-0220, WINT-0230) are unimplemented as of 2026-02-20. This seed
> documents the intended future state based on index specifications only.

## Reality Context

### Baseline Status

- Loaded: no (no baseline reality files exist — `baseline_path: null`)
- Date: N/A
- Gaps: No formal baseline available. Both dependency stories (WINT-0220 and WINT-0230) are
  `pending` / `elaboration` status — neither `.claude/config/model-strategy.yaml` nor the
  `packages/backend/llm-router/` unified model interface exist yet. This seed documents the
  design intent for the escalation rules layer that sits atop those two foundations.

### Relevant Existing Features

| Feature | Location / Status | Relevance |
|---------|-------------------|-----------|
| model-strategy.yaml (planned) | `.claude/config/model-strategy.yaml` — does NOT exist yet | Will be created by WINT-0220; defines the task→model tier mapping that escalation rules reference |
| Unified Model Interface (planned) | `packages/backend/llm-router/` — does NOT exist yet | Will be created by WINT-0230; the abstraction layer that escalation-rules.yaml will instruct |
| Ollama Model Fleet (planned) | `scripts/setup-ollama-models.sh` — does NOT exist yet | Will be created by WINT-0240; the local model tier that represents the starting point of the escalation chain |
| Model Cost Tracking (planned) | WINT-0260 (pending) | Downstream consumer of escalation logs; escalation logging schema in WINT-0250 must be compatible with WINT-0260 cost tracking |
| LangGraph audit nodes (existing) | `packages/backend/orchestrator/src/nodes/audit/` | Shows the adversarial-analysis and confidence-flagging patterns used in the workflow; directly analogous to what escalation rules encode |
| Agent invocation telemetry (planned) | `telemetry.agent_invocations` — WINT-0040/WINT-0120 pending | Target for escalation event logs once telemetry tables are live |
| `.claude/config/` directory | `.claude/config/` — does NOT exist yet | Will be the home for both `model-strategy.yaml` (WINT-0220) and `escalation-rules.yaml` (this story) |
| WINT-0240: Configure Ollama Model Fleet | stories index, Phase 0, status pending | Sibling story; creates the Local-Small/Local-Large model fleet that forms the base of the escalation chain |
| WINT-0260: Create Model Cost Tracking | stories index, Phase 0, status pending | Downstream consumer; escalation event schema must expose tier name, task type, and reason for WINT-0260 to aggregate |
| WINT-0270: Benchmark Local Models | stories index, Phase 0, status pending | Downstream; benchmark results may cause escalation thresholds (e.g., the "2x failure" rule) to be tuned |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| WINT-0220 (Define Model-per-Task Strategy) | pending | Direct blocker — `model-strategy.yaml` must exist before this story can be implemented. Escalation rules reference the tier names and task mappings from WINT-0220 |
| WINT-0230 (Create Unified Model Interface) | elaboration | Direct blocker — the `llm.complete({ task, prompt, context })` interface must exist for escalation rules to have a target to route through |
| WINT-0240 (Configure Ollama Model Fleet) | pending | Parallel sibling; no file overlap. Defines the Local tier that occupies the base of the escalation chain |
| WINT-0260 (Create Model Cost Tracking) | pending | Downstream of this story; escalation log schema influences cost-tracking aggregation queries |

### Constraints to Respect

1. **YAML-only deliverable** — `escalation-rules.yaml` is a declarative configuration file, not
   TypeScript. The unified model interface (WINT-0230) will read and enforce the rules at runtime.
2. **Tier names must match WINT-0220** — The rule conditions reference tier names (`Local-Small`,
   `Local-Large`, `API-Cheap`, `API-Mid`, `API-High`) as defined in `model-strategy.yaml`. If
   WINT-0220 uses different naming, this file must align.
3. **Logging schema must be forward-compatible with WINT-0260** — Every escalation event must
   record: `from_tier`, `to_tier`, `task_type`, `reason`, `timestamp`. WINT-0260 will aggregate
   these for cost analysis.
4. **Escalation is one-directional** — Rules define upward escalation only (cheaper → more
   expensive). De-escalation (expensive → cheaper) is not in scope for this story.
5. **"Critical" and "security/architecture" fast-paths bypass the chain** — These two categories
   jump directly to Claude (API-High) regardless of current tier or failure count.
6. **Claude usage minimization** — The goal is explicit: minimize Claude invocations. Every rule
   must have a clear quantitative threshold to prevent unnecessary escalation.
7. **No runtime code in this story** — Escalation enforcement is implemented by the unified model
   interface (WINT-0230). This story only defines the declarative rules and logging specification.

---

## Retrieved Context

### Related Endpoints

None — `escalation-rules.yaml` is a configuration file. The unified model interface (WINT-0230)
reads it at route-time. No HTTP endpoints are introduced by this story.

### Related Components

| Component | Path | Role |
|-----------|------|------|
| model-strategy.yaml | `.claude/config/model-strategy.yaml` | Defines task→tier mappings; escalation rules reference tier names from this file |
| llm-router | `packages/backend/llm-router/` | The runtime enforcer of escalation rules; reads `escalation-rules.yaml` and applies conditions |
| telemetry tables | `packages/backend/database-schema/src/schema/` (WINT-0040 pending) | Target of escalation log writes once telemetry is live |
| escalation-rules.yaml | `.claude/config/escalation-rules.yaml` | Primary deliverable of this story |

### Reuse Candidates

| Candidate | How to Reuse |
|-----------|-------------|
| Tier naming from WINT-0220 | Adopt `Local-Small`, `Local-Large`, `API-Cheap`, `API-Mid`, `API-High` tier identifiers verbatim in `escalation-rules.yaml` |
| LangGraph audit confidence threshold pattern | `nodes/audit/devils-advocate.ts` uses a `confirm/downgrade/false_positive` signal; analogous to the `confidence < 70%` threshold in API-Cheap escalation |
| Task type classification from WINT-0220 | Task categories (`file-reading`, `code-generation`, `repair-loops`, `test-generation`, `po-cohesion`, `complex-reasoning`, `architecture`) become the escalation rule selectors |

---

## Canonical References

Files that demonstrate patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Declarative YAML config in `.claude/config/` | `.claude/config/` (to be created by WINT-0220) | Establishes the config directory convention; `escalation-rules.yaml` lives alongside `model-strategy.yaml` |
| Adversarial confidence thresholds | `packages/backend/orchestrator/src/nodes/audit/devils-advocate.ts` | Models how confidence scoring and threshold-based escalation logic is expressed |
| LangGraph round-table synthesis | `packages/backend/orchestrator/src/nodes/audit/roundtable.ts` | Shows structured handoff from one processing tier to the next — same pattern as tier-to-tier escalation |

---

## Knowledge Context

### Lessons Learned

No KB search was performed (no live KB connection in seed phase). Lessons are inferred from the
WINT-0220 and WINT-0230 index entries and Phase 0 sibling stories.

- **[Pattern from WINT-0230]** The unified model interface uses `llm.complete({ task, prompt, context })` as its API surface. Escalation rules must produce output that maps to `task` identifiers this interface understands — task type naming must be consistent across both files. (category: constraint)
  - *Applies because*: The runtime enforcer (WINT-0230) reads escalation-rules.yaml; if task type names diverge, routing fails silently.

- **[Pattern from WINT-0220]** The model-strategy.yaml uses a tier model with explicit candidates per tier. Escalation rules should reference tier names, not specific model names — if Qwen2.5-7B-Coder is replaced by a better local-small model, the escalation rules should not need updating. (category: pattern)
  - *Applies because*: Decoupling tier identity from model identity reduces maintenance surface.

- **[Pattern from LangGraph audit nodes]** The devils-advocate node uses structured JSON output with explicit fields for `verdict`, `confidence`, and `reasoning`. The escalation log should follow the same principle: structured records with `from_tier`, `to_tier`, `task_type`, `reason`, `timestamp`, and optionally `failure_count` for the retry-based rules. (category: pattern)
  - *Applies because*: WINT-0260 will aggregate these logs; structured records enable reliable cost analysis.

- **[Risk from index]** "Bad escalation rules = wasted money or failed tasks." The two failure modes are: (a) escalating too eagerly wastes API spend; (b) under-escalating causes repeated failures or low-quality outputs. The `failure_threshold: 2` (local fails 2x) and `confidence_threshold: 0.70` (API-Cheap below 70%) are the primary tuning knobs. (category: blocker-to-avoid)
  - *Applies because*: Thresholds need to be explicit and documentable — not opaque magic numbers — so they can be tuned from WINT-0270 benchmark data.

- **[Pattern from WINT-0250 index entry]** Escalation to Claude directly on `critical` task label or `security/architecture` decision type is a hard bypass, not a graduated escalation. The YAML must express both the graduated chain (failure counts, confidence thresholds) and the hard bypass categories as separate rule types. (category: pattern)
  - *Applies because*: Mixing them in a single rule type would make the bypass conditions ambiguous.

### Blockers to Avoid (from past stories)

- Do NOT define model-specific names in escalation-rules.yaml — use tier names only. Model swap
  in WINT-0270 must not require escalation rule edits.
- Do NOT implement escalation enforcement in this story — that belongs to WINT-0230
  (llm-router). This story only defines the rules file and logging specification.
- Do NOT create a `.claude/config/` directory structure that conflicts with what WINT-0220 will
  establish. Coordinate on directory creation: if WINT-0220 is complete, the directory already
  exists; if not, this story creates it.
- Do NOT define de-escalation rules (expensive → cheaper) — not in scope, deferred to post-MVP.
- Do NOT hardcode a specific confidence measurement method — the rules express thresholds; the
  interface (WINT-0230) is responsible for extracting confidence from model responses.
- Do NOT use a flat list of rules — group them by rule type (`graduated_chain`,
  `hard_bypass`) to make them machine-parseable and human-readable at the same time.

### Architecture Decisions (ADRs)

No ADRs directly govern `escalation-rules.yaml` — this is a new configuration layer introduced
by the Phase 0 multi-model strategy. The following ADRs are not applicable: ADR-001 (API paths),
ADR-002 (IaC), ADR-003 (images), ADR-004 (auth), ADR-005 (real services for UAT), ADR-006
(E2E tests). This story has no frontend, no HTTP endpoints, no database schema changes, and no
TypeScript source files.

### Patterns to Follow

- `escalation-rules.yaml` is a declarative YAML document; follow the same style as WINT-0220's
  `model-strategy.yaml` (to be established) — YAML keys in snake_case, comments explaining
  non-obvious thresholds
- Group rules into two top-level sections: `graduated_chain` (failure/confidence-based) and
  `hard_bypass` (immediate Claude escalation for critical/security paths)
- Log every escalation event with: `from_tier`, `to_tier`, `task_type`, `reason`,
  `failure_count` (for retry-based rules), `confidence_score` (for confidence-based rules),
  `timestamp`
- Include a `meta` block in the YAML with version, created date, owner story, and a reference
  to `model-strategy.yaml` as the tier definition source

### Patterns to Avoid

- Do not write TypeScript source files — configuration YAML is the sole deliverable
- Do not reference specific model names (e.g., `qwen2.5-coder:7b`) — reference tier names only
- Do not define more than one confidence threshold per tier transition — keep rules simple and
  independently tunable
- Do not define logging format as narrative prose — logging schema must be a structured YAML
  sub-document that the llm-router can parse to emit log records

---

## Conflict Analysis

No conflicts detected. Both dependency stories (WINT-0220 and WINT-0230) are `pending` /
`elaboration` — no file overlap exists. WINT-0240 (Ollama Model Fleet) is a parallel sibling
with no shared file targets.

---

## Story Seed

### Title

Define Escalation Rules for Multi-Model Routing (Graduated Chain + Hard Bypass)

### Description

**Context**: The WINT platform's Phase 0 multi-model strategy (WINT-0220) defines which model
tier to use for each task type, and the unified model interface (WINT-0230) provides the routing
abstraction. Without escalation rules, the router has no way to automatically promote a task to
a more capable (and expensive) tier when the current tier fails or produces low-confidence
output. All model requests would either always use the assigned tier — causing silent failures
on difficult tasks — or always escalate eagerly to Claude, defeating the cost-reduction goal.

**Problem**: There is no declarative specification of when to escalate from a cheaper model tier
to a more expensive one. Workflow agents have no consistent signal to trigger escalation, and
escalation events are not logged, making cost analysis and threshold tuning impossible.

**Solution**: Create `.claude/config/escalation-rules.yaml` defining a two-class rule system:

1. **Graduated chain rules** — threshold-based triggers that escalate one tier at a time:
   - `Local` (Small or Large) fails on the same task ≥ 2 times → escalate to `API-Cheap`
   - `API-Cheap` returns confidence below 70% → escalate to `API-Mid`
   - `API-Mid` fails or flags uncertainty → escalate to `API-High` (Claude)

2. **Hard bypass rules** — categories that skip the chain and go directly to `API-High`:
   - Task involves a security or architecture decision
   - Task is explicitly marked `critical`

The file also defines the escalation log record schema so the unified model interface (WINT-0230)
can emit structured escalation events for downstream analysis by WINT-0260 (cost tracking) and
WINT-0270 (benchmark tuning).

**Scope**: Documentation-only. No TypeScript source files. No database migrations. A single YAML
file is created at `.claude/config/escalation-rules.yaml`. If the `.claude/config/` directory
does not exist (WINT-0220 not yet implemented), the implementing agent creates it.

### Initial Acceptance Criteria

- [ ] **AC-1**: `.claude/config/escalation-rules.yaml` exists and is valid YAML. The file
  includes a `meta` block with `version`, `created`, `owner_story: WINT-0250`, and
  `tier_definitions_source: .claude/config/model-strategy.yaml`.

- [ ] **AC-2**: The file contains a `graduated_chain` section with exactly 3 rules, one per
  tier transition:
  - Rule 1: `from: Local` (covers both Local-Small and Local-Large), `trigger: failure_count`,
    `threshold: 2`, `to: API-Cheap` — escalate after 2 failures on the same task
  - Rule 2: `from: API-Cheap`, `trigger: confidence_below`, `threshold: 0.70`, `to: API-Mid`
  - Rule 3: `from: API-Mid`, `trigger: failure_or_uncertainty`, `to: API-High`

- [ ] **AC-3**: The file contains a `hard_bypass` section with exactly 2 rules:
  - Bypass 1: `condition: task_decision_type`, `value: security_or_architecture`, `to: API-High`
  - Bypass 2: `condition: task_label`, `value: critical`, `to: API-High`

- [ ] **AC-4**: The file contains an `escalation_log_schema` section defining the required fields
  for every escalation event record:
  - `from_tier` (string, required)
  - `to_tier` (string, required)
  - `task_type` (string, required — matches task identifiers from `model-strategy.yaml`)
  - `reason` (string, required — human-readable trigger description)
  - `failure_count` (integer, optional — populated for `failure_count` trigger rules only)
  - `confidence_score` (float, optional — populated for `confidence_below` trigger rules only)
  - `timestamp` (ISO 8601 datetime, required)
  - `bypass_rule` (boolean, required — `true` for hard bypass, `false` for graduated chain)

- [ ] **AC-5**: Tier names used in `escalation-rules.yaml` match the tier identifiers used in
  `.claude/config/model-strategy.yaml`. If WINT-0220 is complete and `model-strategy.yaml`
  exists, the implementing agent reads it and aligns tier names. If not yet created, the seed
  tier names (`Local-Small`, `Local-Large`, `API-Cheap`, `API-Mid`, `API-High`) from the WINT-0220
  index entry are used with a TODO comment noting alignment is required when WINT-0220 completes.

- [ ] **AC-6**: The file includes inline YAML comments on each threshold value explaining the
  rationale and documenting that the value is a tuning knob — expected to be updated post
  WINT-0270 (benchmark results):
  - `failure_count: 2` — "2 consecutive failures on same task before assuming local tier cannot
    handle it; tune down to 1 for fast-fail tasks, up to 3 for flaky tasks"
  - `confidence_threshold: 0.70` — "API-Cheap models must exceed 70% confidence to be trusted;
    below this, the output may be hallucinated or incomplete; tune based on task criticality"

- [ ] **AC-7**: The `.claude/config/` directory is created if it does not already exist. No other
  files in the directory are modified.

- [ ] **AC-8**: A `README.md` comment block (YAML comment at the top of the file) summarizes:
  (1) the purpose of the file, (2) which component reads it (llm-router, WINT-0230), (3) how to
  tune thresholds, and (4) what to do when WINT-0270 benchmarks are available.

### Non-Goals

- Do NOT implement escalation enforcement — that belongs to the unified model interface (WINT-0230)
- Do NOT create TypeScript source files — YAML configuration is the sole deliverable
- Do NOT define de-escalation rules (downgrade from expensive to cheaper tier) — deferred to post-MVP
- Do NOT define model-specific fallback candidates — tier names are sufficient; model selection
  within a tier remains with `model-strategy.yaml`
- Do NOT add new database tables or schema migrations — telemetry table creation is in WINT-0040;
  the log schema in this story is a specification for the log format, not a DB migration
- Do NOT define escalation budgets (e.g., max spend per task) — deferred to WINT-0260
- Do NOT wire the rules file into the llm-router — that integration belongs to WINT-0230

### Reuse Plan

- **Tier names**: Adopt verbatim from WINT-0220's `model-strategy.yaml` once available
- **Task type identifiers**: Adopt verbatim from WINT-0220's task→model mapping table; escalation
  rules apply per task type
- **Log schema pattern**: Mirror the structured-event schema pattern from
  `packages/backend/orchestrator/src/nodes/audit/` (structured fields, no narrative-only logging)
- **Config directory**: Co-locate with `model-strategy.yaml` in `.claude/config/`; no new
  directory structure required

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- This story produces a YAML configuration file. There is no TypeScript source to unit test.
- Verification is documentation QA: validate YAML syntax, confirm all 5 rules are present
  (3 graduated + 2 hard bypass), confirm the log schema section includes all 8 required fields.
- Confirm tier names in `escalation-rules.yaml` match the tier names in `model-strategy.yaml`
  (once WINT-0220 completes). A cross-file naming audit is the primary integration concern.
- Confirm `failure_count` threshold comments reference WINT-0270 as the tuning trigger.
- E2E Playwright tests: NOT applicable (no frontend, no HTTP endpoint).
- ADR-005 (real services for UAT): NOT applicable (no live DB interaction).
- Key regression concern: When WINT-0230 (unified model interface) is implemented, verify it
  reads escalation-rules.yaml and applies the `graduated_chain` rules and `hard_bypass` rules
  as specified. That integration test belongs to WINT-0230, not this story.

### For UI/UX Advisor

- This story is configuration-only — no React components, no web UI.
- The only "UX" consideration is YAML readability: inline comments on threshold values (AC-6)
  and the top-of-file README block (AC-8) are the human-interface of this artifact.
- Inline comments should be actionable: not "this value controls confidence" but "set this to
  0.80 for high-stakes tasks, 0.60 for exploratory tasks."

### For Dev Feasibility

- Implementation is documentation-only: create one YAML file, optionally create the parent
  directory.
- **Primary deliverable**: `.claude/config/escalation-rules.yaml`
- **Directory prerequisite**: Check if `.claude/config/` exists (created by WINT-0220). If not,
  `mkdir -p .claude/config/` before writing the file.
- **Coordination with WINT-0220**: If `model-strategy.yaml` exists, read it first and align tier
  names (AC-5). If not, use index-documented tier names with a TODO comment.
- **Effort estimate**: LOW (1-2 hours). Pure YAML authoring with no runtime dependencies.
- **Subtask decomposition** (3 subtasks):
  - **ST-1**: Check for existing `.claude/config/model-strategy.yaml`; if present, extract tier
    names and task type identifiers for alignment. Create `.claude/config/` if absent.
  - **ST-2**: Author `escalation-rules.yaml` with `meta`, `graduated_chain`, `hard_bypass`, and
    `escalation_log_schema` sections per AC-1 through AC-6.
  - **ST-3**: Add the top-of-file README comment block (AC-8) and verify all inline threshold
    comments are present (AC-6). Validate YAML syntax.
- **Split risk**: LOW (0.1). Single file, no dependencies on live infrastructure.
- **Key risk to confirm at setup**: Verify WINT-0220 implementation status. If `model-strategy.yaml`
  exists, ST-1 reads it. If not, ST-1 documents the TODO alignment step and proceeds with
  index-documented tier names.
