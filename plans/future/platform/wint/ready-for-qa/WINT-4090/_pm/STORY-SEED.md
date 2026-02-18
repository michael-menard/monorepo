---
generated: "2026-02-18"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: false
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: WINT-4090

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No baseline reality file provided (baseline_path: null). Context gathered from direct
  codebase inspection, the WINT stories index, and analysis of sibling Phase 4 stories, and the
  completed WINT-4080 (scope-defender) story seed as a structural reference. The story is pending
  with no dependencies, so no blocking gaps from dependency state. The Phase 4 agent family
  (WINT-4060 through WINT-4150) is entirely future work — no Phase 4 QA-adversarial agents exist
  in the codebase today.

### Relevant Existing Features

| Feature | Location / Status | Relevance |
|---------|-------------------|-----------|
| QA role pack definition | WINT-0210 (ready-to-work) defines `.claude/prompts/role-packs/qa.md` | Specifies the QA AC→Evidence trace pattern and `ac-trace.json` output schema; evidence-judge embodies the QA role |
| QA role pack file | `.claude/prompts/role-packs/qa.md` — does NOT exist yet | WINT-0210 will create it; evidence-judge depends on the AC-trace evidence standard being formalized |
| EVIDENCE.yaml schema | `.claude/agents/_reference/schemas/evidence-yaml.md` | The primary input artifact for evidence-judge; defines `acceptance_criteria[].status` and `evidence_items[]` fields that the agent must evaluate |
| qa-verify-verification-leader | `.claude/agents/qa-verify-verification-leader.agent.md` | Existing QA leader that reads EVIDENCE.yaml and verifies ACs; evidence-judge is a harder, adversarial re-check of the same evidence — a "second opinion" that rejects vibes-based approval |
| LangGraph DA node (code-audit) | `packages/backend/orchestrator/src/nodes/audit/devils-advocate.ts` | Shows the adversarial challenge pattern (confirm/downgrade/false_positive); evidence-judge applies a similar adversarial lens to QA evidence rather than code-review findings |
| LangGraph round-table node | `packages/backend/orchestrator/src/nodes/audit/roundtable.ts` | Shows how adversarial outputs are synthesized downstream; models how WINT-4140 Round Table will consume evidence-judge output |
| Haiku worker agent pattern | Multiple examples: doc-sync (file), context-warmer (WINT-2080), telemetry-logger (WINT-3030), graph-checker (WINT-4060) | Canonical pattern for lightweight, single-purpose worker agents in this epic |
| Agent frontmatter standard | `.claude/agents/_shared/FRONTMATTER.md` | Required frontmatter fields: created, updated, version, type, name, description, model, tools |
| scope-defender agent (sister) | WINT-4080 (ready-to-work) | Sister Phase 4 adversarial agent; shares the same structural pattern (haiku worker, machine-readable JSON output, hard caps, LangGraph porting notes, completion signals); the most direct canonical reference |
| WINT-4140: Round Table Agent | WINT stories index, Phase 4, status pending | Primary downstream consumer of evidence-judge output (`ac-verdict.json`). Depends on WINT-4080 and WINT-4070, not explicitly on WINT-4090, but all three Phase 4 workers feed into it |
| WINT-4120: Integrate Cohesion Checks | WINT stories index, Phase 4, pending | Depends on WINT-4090 (along with WINT-4050). Evidence-judge must be complete before cohesion workflow integration |
| WINT-9050: evidence-judge LangGraph Node | WINT stories index, Phase 9 | Future LangGraph port of this agent; depends on WINT-9010 and WINT-4070 (note: likely should be WINT-4090 — potential index typo) |
| WINT-7060: Migrate Batch 4 Agents (QA) | WINT stories index, Phase 7 | Explicitly lists evidence-judge as one of the agents to migrate; confirms the final production target |
| story-attack-agent | `.claude/agents/story-attack-agent.agent.md` | Shows the bounded adversarial analysis pattern with BOUNDS table and explicit truncation behavior; directly applicable to evidence-judge's "max AC challenges" constraint |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| WINT-4080 (scope-defender Agent) | ready-to-work | Sister Phase 4 agent, also `Depends On: none` — can be worked in parallel, no overlap. Provides the structural template for this story |
| WINT-0210 (Populate Role Pack Templates) | ready-to-work | Defines the QA role pack that evidence-judge will embody; if WINT-0210 lands before WINT-4090 implementation, the `qa.md` file will exist with the AC→Evidence trace pattern |
| WINT-4060 (graph-checker Agent) | pending | Phase 4 peer; establishes the haiku worker pattern in Phase 4 |
| WINT-4070 (cohesion-prosecutor Agent) | pending | Phase 4 sibling; also feeds into Round Table; no overlap |
| WINT-1160 (Add Parallel Work Conflict Prevention) | in-progress | No overlap — infra/command story, not agent authoring |

### Constraints to Respect

1. **Haiku model** — The stories index explicitly states "haiku-powered worker agent". Performance
   constraint, not preference. All Phase 2/3/4 worker agents use haiku.
2. **"Proof or it didn't happen" mandate** — This agent exists to reject vibes-based approvals.
   Every AC must have a concrete, verifiable evidence item. The agent must mechanically challenge
   claims without file paths, test names, or observable outputs.
3. **No DB writes** — Evidence-judge is a read-only analysis agent. It reads EVIDENCE.yaml and
   produces `ac-verdict.json`. It does not write to the database or any MCP stores.
4. **LangGraph porting target** — WINT-9050 will port this agent to `nodes/qa/evidence-judge.ts`.
   The agent must expose a clean, documentable interface contract (inputs, phases, outputs,
   completion signals).
5. **No Phase 4 infrastructure dependency** — The agent must function on EVIDENCE.yaml artifacts
   alone. It cannot depend on cohesion-sidecar (WINT-4010) or gatekeeper sidecar (WINT-3010)
   being live.
6. **WINT-4120 / WINT-4140 consumer contract** — WINT-4120 (workflow integration) and WINT-4140
   (Round Table) will consume the agent's `ac-verdict.json` output. The schema must be stable.
7. **QA role pack conditional** — If WINT-0210 has landed, inject `.claude/prompts/role-packs/qa.md`
   as context. If not, embed the AC→Evidence trace constraints inline with a TODO marker.

---

## Retrieved Context

### Related Endpoints

None — this is a documentation/agent file story. No HTTP endpoints or DB schema changes.

### Related Components

| Component | Path | Relevance |
|-----------|------|-----------|
| EVIDENCE.yaml schema reference | `.claude/agents/_reference/schemas/evidence-yaml.md` | Defines the primary input structure: `acceptance_criteria[].status`, `evidence_items[].type`, `evidence_items[].path`, `evidence_items[].description` |
| qa-verify-verification-leader | `.claude/agents/qa-verify-verification-leader.agent.md` | Existing QA verification agent; evidence-judge is a harder adversarial re-check. DO NOT duplicate — this agent supplements, not replaces |
| LangGraph DA node | `packages/backend/orchestrator/src/nodes/audit/devils-advocate.ts` | TypeScript reference for adversarial challenge pattern; decision branching logic applicable to AC evidence rejection |
| LangGraph round-table node | `packages/backend/orchestrator/src/nodes/audit/roundtable.ts` | Shows how DA-style output is consumed by synthesis; informs the `ac-verdict.json` contract |
| scope-defender agent | `.claude/agents/scope-defender.agent.md` (pending WINT-4080) | Sister agent; most direct structural template for evidence-judge (same pattern: haiku, hard caps, JSON output, LangGraph porting notes, completion signals) |
| story-attack-agent | `.claude/agents/story-attack-agent.agent.md` | Demonstrates BOUNDS table with hard cap enforcement and truncation behavior |
| Agent frontmatter standard | `.claude/agents/_shared/FRONTMATTER.md` | Required frontmatter fields; tool profiles |

### Reuse Candidates

1. **EVIDENCE.yaml structure** — The `acceptance_criteria[].evidence_items[]` array is the primary
   input. Evidence-judge must understand all evidence types: `test`, `command`, `e2e`, `http`,
   `file` (observed file state). Each type has different verification expectations.
2. **Haiku worker agent structure** — Pattern from doc-sync, scope-defender (WINT-4080),
   graph-checker (WINT-4060). Single-purpose, bounded phases, structured JSON output, completion
   signal. The scope-defender STORY-SEED.md is the canonical template to follow.
3. **QA role pack** (`.claude/prompts/role-packs/qa.md`) — If WINT-0210 has landed, inject as
   context at agent spawn time. The AC→Evidence trace pattern is the core behavior this agent
   embodies.
4. **Autonomy tiers** (`.claude/agents/_shared/autonomy-tiers.md`) — ACs with no evidence should
   trigger a hard FAIL regardless of autonomy level; the "no vibes" constraint is non-negotiable.

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Sister adversarial agent structure | `/Users/michaelmenard/Development/monorepo/plans/future/platform/wint/ready-to-work/WINT-4080/WINT-4080.md` | Most direct structural template: haiku worker, hard caps, JSON output schema, LangGraph porting notes, completion signals — replicate this pattern |
| EVIDENCE.yaml input schema | `/Users/michaelmenard/Development/monorepo/.claude/agents/_reference/schemas/evidence-yaml.md` | Defines the primary input structure that evidence-judge must evaluate: acceptance_criteria, evidence_items types, status values |
| Existing QA verification leader | `/Users/michaelmenard/Development/monorepo/.claude/agents/qa-verify-verification-leader.agent.md` | Shows how EVIDENCE.yaml is already read; evidence-judge is the adversarial companion that challenges weak evidence after the leader's initial pass |
| Bounded adversarial analysis | `/Users/michaelmenard/Development/monorepo/.claude/agents/story-attack-agent.agent.md` | Hard cap enforcement with BOUNDS table; truncation behavior; adversarial challenge structure applicable to AC rejection logic |

---

## Knowledge Context

### Lessons Learned

No KB query available (kb_search MCP not available in current context). Lessons derived from
analysis of existing WINT stories, Phase 4 story design, the LangGraph audit pattern, and the
completed WINT-4080 story as a structural reference.

- **[WINT-4080 pattern]** The "no vibes" enforcement must be mechanical, not advisory. Applies
  because: without hard rules, evidence-judge will accept plausible-sounding but unverifiable
  claims just as the existing QA leader would. The purpose of this agent is to fail fast on vague
  evidence, not to pass more things through.
- **[WINT-4140 design]** Round Table converges multiple Phase 4 agent outputs. If evidence-judge
  produces a non-standard schema, Round Table cannot consume it. Applies because: the `ac-verdict.json`
  output contract is an integration point.
- **[WINT-4120 integration]** WINT-4120 (Integrate Cohesion Checks into Workflow) explicitly
  depends on WINT-4090. The evidence-judge must be completable independently of other Phase 4
  infrastructure (cohesion-sidecar not yet live). Applies because: any dependency on Phase 4
  infrastructure would create a circular dependency.
- **[WINT-4150 schema chain]** `ac-verdict.json` will be standardized by WINT-4150. Define a
  provisional schema now; design conservatively so WINT-4150 can extend without breaking changes.
  Applies because: same pattern as scope-challenges.json in WINT-4080.
- **[WINT-0210 timing]** The QA role pack (`.claude/prompts/role-packs/qa.md`) may not exist when
  WINT-4090 is implemented. Agent must handle both scenarios. Applies because: WINT-4090 has no
  dependency on WINT-0210 and must be independently implementable.
- **[qa-verify-verification-leader coexistence]** The existing QA verification leader is NOT being
  replaced. Evidence-judge is a supplementary adversarial check that runs after the leader's initial
  pass, or in place of it for high-stakes stories. Applies because: introducing evidence-judge must
  not break existing QA workflows.

### Blockers to Avoid (from past stories)

- Do not attempt to consume cohesion-sidecar (WINT-4010) or gatekeeper sidecar (WINT-3010) outputs
  — those are Phase 3/4 infrastructure not yet built. Evidence-judge operates on EVIDENCE.yaml
  artifacts available from the current implementation workflow.
- Do not embed the full QA role pack definition inline permanently. The role pack lives in
  `.claude/prompts/role-packs/qa.md` (WINT-0210). Reference/inject it when available; embed
  hard caps inline as fallback with a TODO marker.
- Do not output unstructured text. All verdicts must be machine-readable `ac-verdict.json`
  for WINT-4120 and WINT-4140 consumption.
- Do not mark ACs as "passing" without concrete evidence items. The agent's entire purpose is to
  reject vague, unverifiable claims. If evidence_items is empty or contains no file paths or test
  names, the AC must be flagged.
- Do not confuse with qa-verify-verification-leader. Evidence-judge is an adversarial supplement,
  not a replacement. It has a narrower mandate: reject weak evidence. The leader handles re-running
  tests, checking coverage, and recording lessons.

### Architecture Decisions (ADRs)

No ADR-LOG.md found. Operating without formal ADR registry.

**Inferred constraints from WINT story design:**

| Constraint | Source | Applies to |
|------------|--------|------------|
| Haiku model for single-purpose workers | Stories index + WINT-2080/2100/3030/4080 pattern | Model field must be `haiku` |
| No DB writes in worker agents | Consistent with doc-sync, graph-checker, scope-defender patterns | Agent is read-only; no MCP write tools needed |
| LangGraph porting interface required | WINT-9050 dependency | Must document canonical inputs/outputs/phases |
| Output is machine-readable JSON | WINT-4120, WINT-4140 integration, WINT-4150 artifact standard | `ac-verdict.json` must be valid JSON, not markdown |
| "Proof or it didn't happen" | Gatekeeper sidecar concept (WINT-3010) + stories index description | Every AC requires verifiable evidence; vibes-based approval explicitly rejected |

### Patterns to Follow

1. **Evidence type hierarchy** — Different evidence types carry different weight. A `test` evidence
   item with a file path + passing test count is strong. A `command` with output `"looked good"`
   is weak. The agent must classify evidence strength per type.
2. **Structured JSON output** — Every output field must have a defined schema. No prose-only
   outputs. See `devils-advocate.ts` for how adversarial challenges are structured.
3. **Completion signals** — Exact set: `EVIDENCE-JUDGE COMPLETE`, `EVIDENCE-JUDGE COMPLETE WITH
   WARNINGS: {count}`, `EVIDENCE-JUDGE BLOCKED: {reason}`. Match the sibling agent pattern.
4. **Graceful input handling** — If EVIDENCE.yaml is missing or malformed, warn and produce a
   minimal output (all ACs challenged) rather than failing silently.
5. **Phase structure** — Sequential phases with clear input/output contracts. Reference WINT-9050
   porting target in a dedicated "LangGraph Porting Notes" section.

### Patterns to Avoid

1. Do not make the agent interactive. It is a worker, not a leader. All verdicts are autonomous.
2. Do not re-run tests. Evidence-judge reads EVIDENCE.yaml only; test execution is the
   qa-verify-verification-leader's responsibility.
3. Do not produce verbose markdown output. Downstream consumers need structured JSON.
4. Do not accept "implementation complete" or "code reviewed" as evidence for an AC. Every AC
   needs specific, observable proof (file path, test name, HTTP status code, etc.).
5. Do not add latency via file reads beyond EVIDENCE.yaml unless an AC is challenged and requires
   spot-checking. The agent is optimized for fast adversarial evaluation.

---

## Conflict Analysis

### Conflict: ac-verdict.json schema not yet formally defined

- **Severity**: warning (non-blocking)
- **Description**: WINT-0210 (Populate Role Pack Templates) references `ac-trace.json` as the QA
  output schema, and WINT-4150 (Standardize Elab Output Artifacts) will formally standardize elab
  output artifacts including evidence expectations. However, `ac-verdict.json` (the evidence-judge's
  output) is distinct from both — it is a QA adversarial verdict, not an elab artifact. The
  provisional schema defined here must be compatible with WINT-4140 (Round Table) consumption and
  not conflict with WINT-4150's future standardization work.
- **Resolution Hint**: Define a provisional `ac-verdict.json` schema within this story's ACs.
  Document it as the canonical interim schema. WINT-4150 will either adopt it as-is or extend it
  without breaking changes. Note: `ac-trace.json` (QA role pack output) and `ac-verdict.json`
  (evidence-judge verdict) may be the same artifact with different perspectives, or two separate
  files. This story should clarify and document the distinction.
- **Source**: codebase scan + story index analysis + WINT-0210 role pack definition

---

## Story Seed

### Title

Create evidence-judge Agent

### Description

**Context:**

The WINT Phase 4 elaboration workflow introduces an adversarial layer to prevent
vibes-based approvals in QA. Three roles participate in this layer: Product Owner
(cohesion-prosecutor), Devil's Advocate (scope-defender), and Evidence Judge
(evidence-judge). The evidence-judge is the QA adversarial agent — a focused,
haiku-powered worker that challenges AC verdicts that lack concrete, verifiable proof.

The current QA workflow (qa-verify-verification-leader) reads EVIDENCE.yaml and marks ACs as PASS
or FAIL based on evidence items. However, it does not adversarially challenge the quality of that
evidence. An implementer could produce EVIDENCE.yaml with vague entries like "implementation
appears complete" or "code looks correct" — and the leader would accept them. The evidence-judge
exists to reject exactly this.

**Problem:**

Without an automated evidence challenger, QA approvals may be granted on the basis of:
- Evidence items with no concrete file paths or test names
- Commands with subjective result descriptions ("worked fine")
- ACs marked PASS with zero or insufficient evidence_items
- Claims that cannot be independently verified from the artifact alone

The "proof or it didn't happen" principle — referenced in the gatekeeper sidecar concept
(WINT-3010) — requires mechanical enforcement. Currently, no agent in the Claude Code workflow
enforces this at the AC level.

**Solution Direction:**

Create `.claude/agents/evidence-judge.agent.md` — a haiku-powered worker agent that:

1. Receives EVIDENCE.yaml as primary input.
2. For each AC in `acceptance_criteria[]`, evaluates whether the evidence_items constitute
   concrete, verifiable proof:
   - `test` type: must include a file path and passing test count
   - `command` type: must include the exact command and a deterministic result (pass/fail/count)
   - `e2e` type: must include a file path and a result count
   - `http` type: must include the path and HTTP status code
   - Any type: description must be specific and observable, not subjective
3. Challenges ACs whose evidence is weak, absent, or subjective. Assigns a verdict:
   `ACCEPT` (strong evidence), `CHALLENGE` (evidence gaps identified), or `REJECT` (no
   verifiable evidence).
4. Produces `ac-verdict.json` — a machine-readable per-AC verdict for downstream consumption
   by WINT-4120 (workflow integration) and WINT-4140 (Round Table Agent).
5. Provides a clean porting interface for WINT-9050 (LangGraph node at
   `nodes/qa/evidence-judge.ts`).

The agent is consumed by WINT-4120 (cohesion workflow integration) and WINT-4140 (Round Table
Agent), which synthesizes evidence-judge verdicts with other Phase 4 agent outputs into a
final QA gate decision.

### Initial Acceptance Criteria

- [ ] **AC-1: Agent file created**
  - File exists at `.claude/agents/evidence-judge.agent.md`
  - Frontmatter includes all required WINT standard fields: `created`, `updated`, `version`,
    `type`, `name`, `description`, `model`, `tools`
  - `model` is explicitly `haiku`
  - `type` is `worker`
  - `version` starts at `1.0.0`
  - `description` is 80 characters or fewer and names the evidence-judge role

- [ ] **AC-2: Inputs defined**
  - Agent documents its input contract:
    - Required: `EVIDENCE.yaml` file path (primary input — per-AC evidence bundles)
    - Required: story ID (for output artifact naming and audit trail)
    - Optional: story file path (to read AC text when EVIDENCE.yaml `ac_text` is missing)
    - Optional: QA role pack injection path (`.claude/prompts/role-packs/qa.md`)
  - Agent documents graceful degradation: if EVIDENCE.yaml is missing, all ACs are marked
    REJECT with reason "no evidence bundle found" and warning count incremented
  - Agent documents graceful degradation: if optional inputs are missing, proceed with reduced
    context and note the gap in output

- [ ] **AC-3: Execution phases defined**
  - Agent defines sequential phases with clear input/output per phase:
    - Phase 1: Load EVIDENCE.yaml and optional inputs
    - Phase 2: Evaluate evidence strength per AC (per evidence_items entry)
    - Phase 3: Apply adversarial challenge to each AC (ACCEPT / CHALLENGE / REJECT)
    - Phase 4: Produce `ac-verdict.json` + human summary
  - No phase produces output that is not consumed by a subsequent phase or the final output

- [ ] **AC-4: Evidence strength evaluation rules defined**
  - Agent documents per-type evidence strength criteria:
    - `test`: STRONG if file path present + passing test count > 0; WEAK if description-only
    - `command`: STRONG if exact command + deterministic result (PASS/FAIL/count); WEAK if
      result is subjective ("looks good", "seems to work", "no errors")
    - `e2e`: STRONG if file path present + result counts; WEAK if description-only
    - `http`: STRONG if path + HTTP status code; WEAK if description-only
    - Any type: description containing "appears", "seems", "should", "looks" → WEAK
  - Agent enforces: an AC with zero evidence_items → REJECT (no evidence at all)
  - Agent enforces: an AC with only WEAK evidence items → CHALLENGE (insufficient proof)
  - Agent enforces: an AC with at least one STRONG evidence item → ACCEPT (passes challenge)

- [ ] **AC-5: ac-verdict.json schema defined and documented**
  - `ac-verdict.json` schema is documented within the agent file
  - Schema includes at minimum:
    - `story_id` (string)
    - `generated_at` (ISO timestamp)
    - `overall_verdict` (one of: `PASS` | `CHALLENGE` | `FAIL`)
      - `PASS`: all ACs are ACCEPT
      - `CHALLENGE`: some ACs are CHALLENGE (weak evidence, may still pass with justification)
      - `FAIL`: one or more ACs are REJECT (no verifiable evidence)
    - `ac_verdicts` (array) each with:
      - `ac_id` (string, e.g., "AC-1")
      - `ac_text` (string: the AC description)
      - `verdict` (one of: `ACCEPT` | `CHALLENGE` | `REJECT`)
      - `evidence_evaluated` (count of evidence_items reviewed)
      - `strong_evidence_count` (count of STRONG items)
      - `weak_evidence_count` (count of WEAK items)
      - `challenge_reason` (string, required when verdict is CHALLENGE or REJECT)
      - `proof_required` (string, optional: what concrete proof would satisfy this AC)
    - `total_acs` (count)
    - `accepted` (count of ACCEPT verdicts)
    - `challenged` (count of CHALLENGE verdicts)
    - `rejected` (count of REJECT verdicts)
  - Output file written to `{story_dir}/_implementation/ac-verdict.json`

- [ ] **AC-6: Completion signals defined**
  - Agent ends with exactly one of:
    - `EVIDENCE-JUDGE COMPLETE` — all ACs evaluated, no warnings
    - `EVIDENCE-JUDGE COMPLETE WITH WARNINGS: {N} warnings` — evaluation produced with
      reduced-context warnings (e.g., story file not available for AC text lookup)
    - `EVIDENCE-JUDGE BLOCKED: {reason}` — unrecoverable input failure (EVIDENCE.yaml missing
      AND story ID not provided, preventing any meaningful evaluation)
  - Completion signals documented in agent file under "Completion Signals" section
  - Note: `overall_verdict: FAIL` does NOT trigger BLOCKED — it is a valid outcome

- [ ] **AC-7: LangGraph porting interface contract**
  - Agent file includes a "LangGraph Porting Notes" section that documents:
    - The canonical input contract (what WINT-9050 must provide as LangGraph state fields)
    - The 4-phase workflow as the logical execution contract
    - The output: `ac-verdict.json` written to story directory
    - No MCP tools required in v1.0 (file-based I/O only)
    - Relationship to WINT-9010 shared business logic package (evidence strength evaluator
      is portable business logic, not agent-specific)
  - This section is not implementation code — it is a porting guide

- [ ] **AC-8: Non-goals documented**
  - Agent explicitly documents items out of scope:
    - Does not re-run tests (test execution belongs to qa-verify-verification-leader)
    - Does not write to database or MCP stores
    - Does not replace qa-verify-verification-leader (supplements it)
    - Does not evaluate code quality or architecture compliance (not its domain)
    - Does not produce a final QA gate decision (that is WINT-4120/WINT-4140's responsibility)
    - Does not consume cohesion-sidecar or gatekeeper sidecar outputs (Phase 3/4 infrastructure)

### Non-Goals

- **No test re-execution** — Evidence-judge reads EVIDENCE.yaml only. Running tests is the
  qa-verify-verification-leader's responsibility. Evidence-judge evaluates the artifact, not
  the live system.
- **No qa-verify-verification-leader replacement** — The existing QA leader handles test
  execution, coverage checks, architecture compliance, and lesson recording. Evidence-judge
  is a focused adversarial supplement.
- **No cohesion or graph queries** — Does not use cohesion-sidecar (WINT-4010), gatekeeper
  (WINT-3010), or any Phase 3/4 infrastructure. Operates on EVIDENCE.yaml alone.
- **No final QA gate decision** — Producing `overall_verdict: FAIL` flags an issue for
  Round Table synthesis. It is not itself a blocking gate. WINT-4120 owns workflow integration.
- **No WINT-4150 schema standardization** — This story defines a provisional schema;
  WINT-4150 formally standardizes all elab/QA output artifacts later.
- **No changes to existing agents or commands** — This story creates one new file only:
  `evidence-judge.agent.md`. Integration into workflows is a future concern (WINT-4120).
- **No TypeScript implementation** — This story produces a `.agent.md` file (documentation/
  instruction artifact), not TypeScript code. The LangGraph node is WINT-9050.

**Protected features — do not touch:**
- `.claude/agents/qa-verify-verification-leader.agent.md` (different role — do not modify)
- `.claude/agents/qa-verify-setup-leader.agent.md` and `qa-verify-completion-leader.agent.md`
- `packages/backend/orchestrator/src/nodes/audit/devils-advocate.ts` (different domain)
- `.claude/prompts/role-packs/qa.md` if WINT-0210 has landed (reference only, do not modify)

**Deferred to future stories:**
- `WINT-4120`: Integrate evidence-judge into QA workflow gates
- `WINT-4140`: Round Table Agent consumes `ac-verdict.json` alongside other Phase 4 outputs
- `WINT-4150`: Formal schema standardization for all elab/QA output artifacts
- `WINT-9050`: Port evidence-judge to LangGraph node at `nodes/qa/evidence-judge.ts`
- `WINT-7060`: Migrate Batch 4 Agents (QA) — includes evidence-judge DB migration

### Reuse Plan

- **Components**:
  - EVIDENCE.yaml schema (`.claude/agents/_reference/schemas/evidence-yaml.md`) — the primary
    input structure; implement evidence type hierarchy and strength evaluation against this schema
  - QA role pack (`.claude/prompts/role-packs/qa.md`) — inject as context if WINT-0210 has
    landed; otherwise, embed the AC→Evidence trace constraints directly with TODO marker
  - scope-defender agent structure (`.claude/agents/scope-defender.agent.md` from WINT-4080) —
    primary structural template for this agent file
  - story-attack-agent BOUNDS table pattern — hard cap enforcement with explicit truncation
- **Patterns**:
  - Haiku worker agent structure: frontmatter + Role + Mission + Inputs + Phases + Output +
    Completion Signals + Non-Negotiables (from doc-sync, scope-defender patterns)
  - Evidence type hierarchy for classification (new pattern; establish here as canonical)
  - Graceful input degradation when EVIDENCE.yaml is missing (produce all-REJECT output)
- **Packages**:
  - No TypeScript packages — this is a documentation artifact (`.agent.md`)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- **Primary verification surface**: The agent file is a documentation artifact — verification
  is functional/behavioural rather than unit-testable. Test plan should define:
  - Smoke test: Agent file exists at `.claude/agents/evidence-judge.agent.md` with valid
    YAML frontmatter, model: haiku, type: worker
  - Strong evidence test: EVIDENCE.yaml with test-type evidence (file path + count) →
    AC verdict is ACCEPT
  - Weak evidence test: EVIDENCE.yaml with command-type evidence with description "looks correct"
    → AC verdict is CHALLENGE
  - No evidence test: EVIDENCE.yaml with empty evidence_items → AC verdict is REJECT
  - Missing EVIDENCE.yaml test: Input path does not exist → overall_verdict: FAIL, all ACs
    REJECT with "no evidence bundle found", completion signal is `EVIDENCE-JUDGE COMPLETE WITH
    WARNINGS`
  - BLOCKED signal test: Neither EVIDENCE.yaml path nor story ID provided → `EVIDENCE-JUDGE BLOCKED`
  - Mixed verdicts test: 3 ACs (1 ACCEPT, 1 CHALLENGE, 1 REJECT) →
    `overall_verdict: FAIL`, `rejected: 1`, `challenged: 1`, `accepted: 1`
  - Schema validation: Parse produced `ac-verdict.json` against the defined schema and verify
    all required fields are present and valid
- **No unit tests required** — This story produces a `.agent.md` file, not TypeScript code.
  The LangGraph unit tests will be in WINT-9050.
- **Integration test prerequisite**: WINT-4120 integration test requires this agent; WINT-4090
  must complete before that integration test can run.

### For UI/UX Advisor

Not applicable — this is a worker agent file with no user-facing UI. All interaction is through
the Claude Code agent invocation mechanism and file outputs. The `ac-verdict.json` output is
consumed programmatically by WINT-4120 and WINT-4140.

### For Dev Feasibility

- **Complexity: Low** — Single `.agent.md` file creation. No TypeScript, no DB migrations, no
  new MCP tools. The primary challenge is designing the evidence strength evaluation rules
  precisely enough that a haiku-class model can apply them mechanically without ambiguity.
- **Key design decision: evidence strength rules** — The per-type evidence strength criteria
  (AC-4) are the core logic of this agent. They must be unambiguous. Terms like "appears" and
  "seems" in evidence descriptions should trigger automatic WEAK classification. The agent
  instructions must enumerate these patterns explicitly.
- **Key risk: scope overlap with qa-verify-verification-leader** — The agent instructions must
  clearly state that evidence-judge does NOT re-run tests, does NOT check coverage, and does NOT
  assess architecture compliance. These are the leader's responsibility. Evidence-judge's sole
  mandate is: evaluate whether EVIDENCE.yaml contains concrete, verifiable proof for each AC.
- **Key risk: QA role pack timing** — If WINT-0210 has not landed, embed inline constraints with
  a TODO marker. Document this explicitly.
- **WINT-9050 coordination**: Before closing WINT-4090, confirm the LangGraph porting interface
  contract (AC-7) is sufficient for the node port. Note: WINT-9050 in the stories index depends
  on WINT-4070 (cohesion-prosecutor), but the description says "evidence-judge". This may be a
  typo in the index — the implementer should verify with the PM before starting WINT-9050.
- **Estimated complexity**: 1-2 story points. Mostly agent design thinking + schema definition.
  No implementation risk. Main risk is getting the evidence strength evaluation rules and
  CHALLENGE vs REJECT threshold exactly right in the agent instructions.
- **Subtask decomposition suggestion**:
  - ST-1: Design `ac-verdict.json` schema and confirm with WINT-4120/WINT-4140/WINT-4150
    requirements
  - ST-2: Write agent frontmatter + Role + Mission + Inputs sections (AC-1, AC-2)
  - ST-3: Write Evidence Strength Evaluation rules + Execution Phases (AC-3, AC-4)
  - ST-4: Write Output + Completion Signals + LangGraph Porting Notes sections (AC-5, AC-6, AC-7)
  - ST-5: Write Non-Negotiables + Non-Goals sections (AC-8)
  - ST-6: Functional verification against sample EVIDENCE.yaml artifacts (strong, weak, missing
    evidence cases)
- **Canonical references for subtask decomposition**:
  - ST-1 reference: `/Users/michaelmenard/Development/monorepo/plans/future/platform/wint/ready-to-work/WINT-4080/WINT-4080.md` (scope-challenges.json schema as structural model)
  - ST-2 reference: `/Users/michaelmenard/Development/monorepo/.claude/agents/_shared/FRONTMATTER.md`
  - ST-3 reference: `/Users/michaelmenard/Development/monorepo/.claude/agents/_reference/schemas/evidence-yaml.md` (evidence_items types and fields)
  - ST-4 reference: `/Users/michaelmenard/Development/monorepo/plans/future/platform/wint/ready-to-work/WINT-4080/WINT-4080.md` (completion signals and LangGraph porting notes pattern)
  - ST-6 reference: `/Users/michaelmenard/Development/monorepo/.claude/agents/_reference/schemas/evidence-yaml.md` (full example for test fixture generation)

---

STORY-SEED COMPLETE WITH WARNINGS: 1 warning (no baseline file; context gathered from codebase scan and story index)
