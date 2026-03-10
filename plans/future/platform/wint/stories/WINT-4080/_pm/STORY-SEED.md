---
generated: "2026-02-18"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: false
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: WINT-4080

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No baseline reality file provided (baseline_path: null). Context gathered from direct
  codebase inspection, the WINT stories index, and analysis of sibling Phase 4 stories. The
  story is pending with no dependencies, so no blocking gaps from dependency state. The Phase 4
  agent family (WINT-4060 through WINT-4150) is entirely future work — no Phase 4 agents exist
  in the codebase today.

### Relevant Existing Features

| Feature | Location / Status | Relevance |
|---------|-------------------|-----------|
| DA role pack definition | WINT-0210 (ready-to-work) defines `.claude/prompts/role-packs/da.md` | Specifies the DA hard caps (max 5 challenges, cannot challenge blocking items) and `scope-challenges.json` output schema |
| DA role pack file | `.claude/prompts/role-packs/da.md` — does NOT exist yet | WINT-0210 will create it; scope-defender agent depends on its constraints being formalised |
| LangGraph DA node (code-audit) | `packages/backend/orchestrator/src/nodes/audit/devils-advocate.ts` | Existing TypeScript DA node — challenges audit lens findings in code review context. Different domain (code review vs elab scope) but shares the adversarial pattern |
| LangGraph round-table node | `packages/backend/orchestrator/src/nodes/audit/roundtable.ts` | Shows how DA output is consumed by synthesis step; models the WINT-4140 Round Table pattern |
| haiku worker agent pattern | Multiple examples: context-warmer (WINT-2080), session-manager (WINT-2100), telemetry-logger (WINT-3030), graph-checker (WINT-4060) | Canonical pattern for lightweight, single-purpose worker agents in this epic |
| Agent frontmatter standard | `.claude/agents/_shared/FRONTMATTER.md` | Required frontmatter fields: created, updated, version, type, name, description, model, tools |
| Expert personas — Product Expert | `.claude/agents/_shared/expert-personas.md` | "MVP Discipline" and "Scope Clarity" mental models most relevant to the DA role |
| WINT-0210 role pack context | `.claude/agents/_shared/examples-framework.md` | Max 2 positive + 1 negative examples per role, 10-25 line pattern skeleton |
| WINT-4140: Round Table Agent | WINT stories index, Phase 4, status pending | Primary consumer of scope-defender output (`scope-challenges.json`). Depends on WINT-4080 and WINT-4070 |
| WINT-8060: scope-defender + Backlog integration | WINT stories index, Phase 8 | Secondary consumer — deferred items auto-added to backlog with source='scope-defender' |
| WINT-9040: scope-defender LangGraph Node | WINT stories index, Phase 9 | Tertiary consumer — ports this agent's logic to `nodes/story/scope-defend.ts` |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| WINT-4090 (evidence-judge Agent) | pending | Sibling Phase 4 agent, also `Depends On: none` — can be worked in parallel, no overlap |
| WINT-0210 (Populate Role Pack Templates) | ready-to-work | Defines the DA role pack that this agent will embody; if WINT-0210 lands before WINT-4080 elaboration, the `da.md` file will exist and provide exact constraints |
| WINT-4060 (graph-checker Agent) | pending | Phase 4 peer; establishes the haiku worker pattern in Phase 4 |

### Constraints to Respect

1. **Haiku model** — The stories index explicitly states "haiku-powered worker agent". This is a
   performance constraint, not a preference. All similar Phase 2/3/4 agents use haiku.
2. **Hard caps from WINT-0210** — DA role: max 5 challenges, cannot challenge blocking items.
   These must be enforced mechanically in the agent's execution logic.
3. **Output schema** — `scope-challenges.json` with deferral recommendations (defined in WINT-0210).
   If WINT-0210 has not landed yet, the agent must define a compatible interim schema.
4. **No baseline yet** — Phase 4 is future work. Agent cannot depend on existing graph infrastructure
   (WINT-4030, WINT-4010, etc.) being live. It must function on the elaboration artifacts alone.
5. **LangGraph porting target** — WINT-9040 will port this agent. The agent must expose a clean,
   documentable interface contract (inputs, phases, outputs, completion signals).
6. **WINT-4140 consumer contract** — Round Table Agent (WINT-4140) takes `scope-challenges.json`
   from scope-defender as a required input. The output schema must be stable.
7. **No DB writes** — The agent reads elaboration artifacts; it does not write to database tables
   or MCP stores. Deferral logging to backlog is WINT-8060's concern, not this agent's.

---

## Retrieved Context

### Related Endpoints

None — this is a documentation/agent file story. No HTTP endpoints or DB schema changes.

### Related Components

| Component | Path | Relevance |
|-----------|------|-----------|
| LangGraph DA node | `packages/backend/orchestrator/src/nodes/audit/devils-advocate.ts` | TypeScript reference for how the adversarial challenge pattern is implemented; scope-defender's logic is analogous but operates on elab artifacts instead of code findings |
| LangGraph round-table node | `packages/backend/orchestrator/src/nodes/audit/roundtable.ts` | Shows how DA output (`scope-challenges.json` equivalent) feeds into the synthesis step — model for WINT-4140 Round Table |
| Agent frontmatter standard | `.claude/agents/_shared/FRONTMATTER.md` | Frontmatter fields required for all new agents; haiku model + tools profile |
| Expert personas | `.claude/agents/_shared/expert-personas.md` | "Product Expert Persona" section includes MVP Discipline and Scope Clarity mental models directly applicable to the DA role |
| Examples framework | `.claude/agents/_shared/examples-framework.md` | Defines max 2 positive + 1 negative examples format for role packs referenced by this agent |

### Reuse Candidates

1. **Existing LangGraph DA logic** (`devils-advocate.ts`) — The challenge evaluation pattern
   (confirm / downgrade / false_positive) can be adapted for scope-challenge decision types
   (defer / reduce / challenge / accept). Not a direct reuse but a design reference.
2. **haiku worker agent structure** — Pattern from WINT-4060 (graph-checker), WINT-2080
   (context-warmer), WINT-3030 (telemetry-logger). Single-purpose, bounded phases, structured
   JSON output, completion signal.
3. **DA role pack** (`.claude/prompts/role-packs/da.md`) — If WINT-0210 has landed, inject this
   as context at agent spawn time rather than embedding the full role definition inline.
4. **Autonomy tiers** (`.claude/agents/_shared/autonomy-tiers.md`) — DA challenges that are
   blocking must escalate to PM review regardless of autonomy level.

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| DA adversarial challenge logic | `/Users/michaelmenard/Development/monorepo/packages/backend/orchestrator/src/nodes/audit/devils-advocate.ts` | Shows confirm/downgrade/false_positive decision branching; adapt for scope challenge decisions |
| Round Table synthesis consuming DA output | `/Users/michaelmenard/Development/monorepo/packages/backend/orchestrator/src/nodes/audit/roundtable.ts` | Shows how challenge map is consumed by downstream synthesis — informs the `scope-challenges.json` contract WINT-4140 will consume |
| Agent frontmatter spec | `/Users/michaelmenard/Development/monorepo/.claude/agents/_shared/FRONTMATTER.md` | Required frontmatter fields, tool profiles, model selection guide |
| Role pack DA definition | `.claude/prompts/role-packs/da.md` (pending, created by WINT-0210) | Will contain the canonical DA hard caps and output schema once WINT-0210 lands |

---

## Knowledge Context

### Lessons Learned

No KB query available (kb_search MCP not available in current context). Lessons derived from
analysis of existing WINT stories, the Phase 4 story design, and the LangGraph audit pattern.

- **[WINT-0210 design]** DA hard caps (max 5 challenges, cannot challenge blocking items) must
  be mechanically enforced — not advisory. Applies because: without enforcement, scope creep
  occurs anyway ("the DA said 5 was the limit but had 8 suggestions").
- **[WINT-4140 design]** Round Table converges DA + PO findings into `final-scope.json`. If
  scope-defender produces a non-standard schema, Round Table cannot consume it. Applies because:
  the `scope-challenges.json` output contract is a hard integration point.
- **[existing DA in audit graph]** The LangGraph DA node is in the code-audit domain, not the
  elab/scope domain. Do not confuse or conflate — they are parallel implementations of the same
  adversarial pattern for different purposes. Applies because: WINT-9040 will port scope-defender
  to `nodes/story/scope-defend.ts` (separate from `nodes/audit/devils-advocate.ts`).
- **[WINT-0210 / WINT-4150 dependency chain]** The `scope-challenges.json` schema is referenced
  by WINT-4150 (Standardize Elab Output Artifacts). If scope-defender defines an incompatible
  schema now, WINT-4150 will need a breaking change. Applies because: define the schema
  conservatively and let WINT-4150 extend it rather than the reverse.

### Blockers to Avoid (from past stories)

- Do not attempt to consume cohesion-sidecar (WINT-4010) or graph-checker (WINT-4060) outputs —
  those are Phase 4 infrastructure not yet built. The scope-defender operates on elaboration
  artifacts (ELAB-*.md, SCOPE.yaml, gaps.json) available from the current elab workflow.
- Do not embed the full DA role pack definition inline in the agent file. The role pack lives in
  `.claude/prompts/role-packs/da.md` (WINT-0210). Reference or inject it rather than duplicate.
- Do not output unstructured text. All DA output must be machine-readable `scope-challenges.json`
  for WINT-4140 Round Table consumption.
- Do not mark items as "blocking" — the DA's mandate is to challenge non-MVP scope and defer,
  not to block. If an item is truly blocking, it should already be in the elab gap analysis.
  The DA cannot challenge items already marked blocking in the elab output.

### Architecture Decisions (ADRs)

No ADR-LOG.md found. Operating without formal ADR registry.

**Inferred constraints from WINT story design:**

| Constraint | Source | Applies to |
|------------|--------|------------|
| Haiku model for single-purpose workers | Stories index + WINT-2080/2100/3030 pattern | Model field must be `haiku` |
| No DB writes in worker agents | Consistent with doc-sync, graph-checker patterns | Agent is read-only; no MCP write tools needed |
| LangGraph porting interface required | WINT-9040 dependency | Must document canonical inputs/outputs/phases |
| Output is machine-readable JSON | WINT-4140 integration, WINT-4150 artifact standard | `scope-challenges.json` must be valid JSON, not markdown |

### Patterns to Follow

1. **Bounded analysis** — Hard cap of 5 challenges maximum. Prioritise by risk/impact. Truncate
   with note if bounds would be exceeded. Same pattern as `story-attack-agent.agent.md`.
2. **Structured JSON output** — Every output field must have a defined schema. No prose-only
   outputs. See `devils-advocate.ts` for how challenges are structured.
3. **Completion signals** — Exact set: `SCOPE-DEFENDER COMPLETE`, `SCOPE-DEFENDER COMPLETE WITH
   WARNINGS: {count}`, `SCOPE-DEFENDER BLOCKED: {reason}`. Match the pattern in existing agents.
4. **Graceful input handling** — If elaboration artifacts are missing or incomplete, warn and
   produce a minimal output (empty challenge list) rather than failing.
5. **Phase structure** — Sequential phases with clear input/output contracts. Reference WINT-9040
   porting target in frontmatter or a dedicated "LangGraph Porting Notes" section.

### Patterns to Avoid

1. Do not make the agent interactive (no user prompts, no questions). It is a worker, not a
   leader. All decisions are made autonomously within hard caps.
2. Do not challenge ACs or acceptance criteria that are marked as MVP-critical gaps in the elab
   output — the DA mandate is explicitly limited to non-MVP, non-blocking scope.
3. Do not produce verbose markdown output. Round Table needs structured JSON; markdown is an
   optional human-readable summary only.
4. Do not add latency via expensive graph queries. Phase 4 infrastructure (cohesion sidecar,
   graph-checker) is not yet live. Keep the agent self-contained on elab artifacts.

---

## Conflict Analysis

### Conflict: scope-challenges.json schema not yet formally defined

- **Severity**: warning (non-blocking)
- **Description**: WINT-0210 (Populate Role Pack Templates) defines the DA role pack and
  mentions `scope-challenges.json` as the output format, but does not define the full JSON
  schema. WINT-4150 (Standardize Elab Output Artifacts) is the story that will formally
  standardize this schema — but WINT-4150 depends on WINT-4140 which depends on WINT-4080.
  The schema must therefore be defined here and in WINT-4140 before WINT-4150 can standardize
  it. There is a circular design tension: we need the schema to build the agent, but the schema
  is "officially" standardized later.
- **Resolution Hint**: Define a provisional `scope-challenges.json` schema within this story's
  ACs. Document it as the canonical interim schema. WINT-4150 will either adopt it as-is or
  extend it without breaking changes. Use WINT-0210's description as the source of truth for
  the top-level shape (max 5 items, defer/challenge decisions, source reference).
- **Source**: codebase scan + story index analysis

---

## Story Seed

### Title

Create scope-defender Agent (Devil's Advocate)

### Description

**Context:**

The WINT Phase 4 elaboration workflow introduces an adversarial layer to prevent scope creep
during story implementation. Three roles participate: Product Owner (cohesion-prosecutor), Devil's
Advocate (scope-defender), and Synthesis (Round Table). The scope-defender is the DA agent — a
focused, haiku-powered worker that challenges proposed features during elaboration by asking:
"Is this actually needed for MVP, or are we building scope creep?"

**Problem:**

Without an automated scope challenger, elaboration gaps frequently include "nice-to-have" features
that teams rationalise as MVP. The DA role exists to force explicit justification of scope: every
non-trivial feature must survive challenge. Currently, no agent fills this role in the Claude Code
workflow. The DA pattern exists in the LangGraph code-audit graph (`devils-advocate.ts`), but
only for code review severity challenges — not for elaboration scope decisions.

**Solution Direction:**

Create `.claude/agents/scope-defender.agent.md` — a haiku-powered worker agent that:

1. Receives elaboration artifacts as input: the story brief, list of proposed features/ACs, and
   the elab gap analysis.
2. Applies the DA role (from `.claude/prompts/role-packs/da.md` when available) to challenge
   non-MVP items. Focuses on: "What happens if we defer this?", "Is this on the critical user
   journey?", "Is this complexity justified for MVP?".
3. Produces `scope-challenges.json` — a machine-readable list of up to 5 challenges, each with
   a recommended disposition (defer-to-backlog, reduce-scope, accept-as-mvp).
4. Outputs a human-readable summary alongside the JSON for PM review.
5. Provides a clean porting interface for WINT-9040 (LangGraph node at
   `nodes/story/scope-defend.ts`).

The agent is consumed by WINT-4140 (Round Table Agent), which synthesises scope-defender
challenges with cohesion-prosecutor findings into `final-scope.json`.

### Initial Acceptance Criteria

- [ ] **AC-1: Agent file created**
  - File exists at `.claude/agents/scope-defender.agent.md`
  - Frontmatter includes all required WINT standard fields: `created`, `updated`, `version`,
    `type`, `name`, `description`, `model`, `tools`
  - `model` is explicitly `haiku`
  - `type` is `worker`
  - `version` starts at `1.0.0`
  - `description` is 80 characters or fewer and names the DA role

- [ ] **AC-2: Inputs defined**
  - Agent documents its input contract:
    - Required: story brief (title + goal from ELAB artifact or story file)
    - Required: proposed ACs or feature list (from elab output or story file)
    - Optional: gap analysis (gaps.json or equivalent elab artifact) to identify what is already
      marked blocking/MVP-critical — DA cannot challenge these
    - Optional: DA role pack injection path (`.claude/prompts/role-packs/da.md`)
  - Agent documents graceful degradation: if optional inputs are missing, proceed with reduced
    context and note the gap in output

- [ ] **AC-3: Execution phases defined**
  - Agent defines sequential phases with clear input/output per phase:
    - Phase 1: Load inputs (story brief, ACs, optional gap analysis, optional role pack)
    - Phase 2: Identify challenge candidates (non-blocking, non-MVP-critical items only)
    - Phase 3: Apply DA challenges (max 5, priority ordered by deferral risk)
    - Phase 4: Produce `scope-challenges.json` + human summary
  - No phase produces output that is not consumed by a subsequent phase or the final output

- [ ] **AC-4: Hard cap enforcement**
  - Agent enforces maximum 5 challenges
  - If more than 5 items qualify, selects top 5 by highest-impact deferral potential and notes
    truncation in output
  - Agent never challenges items that appear in the gap analysis as blocking or MVP-critical
  - Agent never adds new ACs or expands scope — it only reduces or defers

- [ ] **AC-5: scope-challenges.json schema defined and documented**
  - `scope-challenges.json` schema is documented within the agent file or in a referenced schema
    file at `schemas/scope-challenges.schema.json`
  - Schema includes at minimum:
    - `story_id` (string)
    - `generated_at` (ISO timestamp)
    - `challenges` (array, max 5 items) each with:
      - `id` (string, e.g., DA-001)
      - `target` (which AC or feature is challenged)
      - `challenge` (one line: why this might be non-MVP)
      - `recommendation` (one of: `defer-to-backlog` | `reduce-scope` | `accept-as-mvp`)
      - `deferral_note` (optional: what to put in backlog if deferred)
      - `risk_if_deferred` (one of: `low` | `medium` | `high`)
    - `total_candidates_reviewed` (count before cap applied)
    - `truncated` (boolean)
  - Output file written to `{story_dir}/_implementation/scope-challenges.json`

- [ ] **AC-6: Completion signals defined**
  - Agent ends with exactly one of:
    - `SCOPE-DEFENDER COMPLETE` — challenges produced, no warnings
    - `SCOPE-DEFENDER COMPLETE WITH WARNINGS: {N} warnings` — challenges produced with
      reduced-context warnings (e.g., optional inputs missing)
    - `SCOPE-DEFENDER BLOCKED: {reason}` — unrecoverable input failure (story brief missing)
  - Completion signals documented in agent file under "Completion Signals" section

- [ ] **AC-7: LangGraph porting interface contract**
  - Agent file or an appended "LangGraph Porting Notes" section documents:
    - The canonical input contract (what WINT-9040 must provide as LangGraph state fields)
    - The 4-phase workflow as the logical execution contract
    - The output: `scope-challenges.json` written to story directory
    - No MCP tools required in v1.0 (file-based I/O only)
  - This section is not implementation code — it is a porting guide

- [ ] **AC-8: Non-goals documented**
  - Agent explicitly documents items out of scope:
    - Does not write to backlog (WINT-8060 owns this)
    - Does not challenge MVP-critical gaps or blocking items
    - Does not add new ACs or expand story scope
    - Does not consume cohesion-sidecar or graph-checker outputs (Phase 4 infrastructure)
    - Does not integrate with backlog MCP tools (WINT-8020 not yet built)

### Non-Goals

- **No backlog writes** — Deferral recommendations are captured in `scope-challenges.json` only.
  Automatic backlog writes are WINT-8060's concern (Phase 8, depends on WINT-8030 and WINT-4060).
- **No graph or cohesion queries** — Does not use cohesion-sidecar (WINT-4010), graph-checker
  (WINT-4060), or graph MCP tools. The agent operates on text-based elab artifacts only.
- **No interactive prompting** — Worker agent, not leader. All decisions are autonomous.
- **No Round Table logic** — Synthesis of DA + PO findings is WINT-4140's responsibility.
- **No WINT-4150 schema standardisation** — This story defines a provisional schema; WINT-4150
  formally standardises it later.
- **No changes to existing agents or commands** — This story creates one new file only:
  `scope-defender.agent.md`. Integration into workflows is a future concern.
- **No TypeScript implementation** — This story produces a `.agent.md` file (documentation/
  instruction artefact), not TypeScript code. The LangGraph node is WINT-9040.

**Protected features not to touch:**
- Existing `devils-advocate.ts` LangGraph node in `packages/backend/orchestrator/src/nodes/audit/`
  (different domain, different purpose — do not modify)
- Existing `da.md` role pack if WINT-0210 has landed (reference only, do not modify)

**Deferred to future stories:**
- `WINT-8060`: Auto-add deferred items to backlog with `source='scope-defender'`
- `WINT-9040`: Port scope-defender agent to LangGraph node at `nodes/story/scope-defend.ts`
- `WINT-4140`: Round Table Agent (consumes this agent's output)
- `WINT-4150`: Formal schema standardisation for all elab output artifacts

### Reuse Plan

- **Components**:
  - DA role pack (`.claude/prompts/role-packs/da.md`) — inject as context if WINT-0210 has
    landed; otherwise, embed the DA hard caps directly in the agent instructions
  - Expert personas (`.claude/agents/_shared/expert-personas.md`) — "Product Expert Persona"
    section for MVP Discipline and Scope Clarity mental models
  - LangGraph `devils-advocate.ts` — reference only for the adversarial challenge pattern and
    decision type taxonomy (confirm/downgrade/defer)
- **Patterns**:
  - haiku worker agent structure: frontmatter + Role + Mission + Inputs + Phases + Output +
    Completion Signals + Non-Negotiables (from WINT-2080, WINT-3030, WINT-4060 pattern)
  - Bounded analysis with explicit truncation (from `story-attack-agent.agent.md`)
  - Graceful input degradation (from `doc-sync.agent.md` database-unavailable pattern)
- **Packages**:
  - No TypeScript packages — this is a documentation artifact (`.agent.md`)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- **Primary verification surface**: The agent file is a documentation artifact — verification
  is functional/behavioural rather than unit-testable. Test plan should define:
  - Smoke test: Run scope-defender manually against a known elaboration artifact with 7+ proposed
    ACs and verify output is capped at 5 challenges
  - Boundary test: Run with missing optional inputs (no gap analysis) and verify graceful
    degradation with `SCOPE-DEFENDER COMPLETE WITH WARNINGS`
  - Schema validation: Parse the output `scope-challenges.json` against the defined schema and
    verify all required fields are present
  - Blocking items test: Include an item in gap analysis as MVP-critical and verify it does NOT
    appear in challenges output
  - BLOCKED signal test: Run with no story brief and verify `SCOPE-DEFENDER BLOCKED`
- **No unit tests required** — This story produces a `.agent.md` file, not TypeScript code.
  The LangGraph unit tests will be in WINT-9040.
- **Integration test prerequisite**: WINT-4140 (Round Table Agent) integration test will consume
  this agent's output. WINT-4080 must complete before that integration test can run.

### For UI/UX Advisor

Not applicable — this is a worker agent file with no user-facing UI. All interaction is through
the Claude Code agent invocation mechanism and file outputs.

### For Dev Feasibility

- **Complexity: Low** — Single `.agent.md` file creation. No TypeScript, no DB migrations, no
  new MCP tools. The primary challenge is designing the agent's logic precisely enough to be
  implementable by a haiku-class model without hand-holding.
- **Key decision: schema definition** — The provisional `scope-challenges.json` schema must be
  designed carefully, as it is a stable integration point for WINT-4140. Recommend including an
  inline JSON schema example in the agent file rather than a separate `.schema.json` file for
  Phase 4 MVP. WINT-4150 will move it to a formal schema file.
- **Key risk: DA role pack timing** — If WINT-0210 (role pack templates) has not landed by the
  time WINT-4080 is implemented, the agent must embed the DA constraints inline. This is
  acceptable but means WINT-4080 will need a patch update when WINT-0210 lands. Document this
  explicitly in the agent file as a "TODO: inject da.md when WINT-0210 completes".
- **WINT-9040 coordination**: Before closing WINT-4080, confirm the porting interface contract
  (AC-7) is sufficient for the LangGraph node port. A short review by the WINT-9040 implementer
  is recommended.
- **Estimated complexity**: 1-2 story points. Mostly agent design thinking + schema definition.
  No implementation risk. Main risk is getting the hard cap enforcement logic and the
  "don't challenge blocking items" guard exactly right in the agent instructions.
- **Subtask decomposition suggestion**:
  - ST-1: Design `scope-challenges.json` schema and confirm with WINT-4140 / WINT-4150 requirements
  - ST-2: Write agent frontmatter + Role + Mission + Inputs sections (AC-1, AC-2)
  - ST-3: Write Execution Phases (AC-3, AC-4)
  - ST-4: Write Output + Completion Signals + LangGraph Porting Notes (AC-5, AC-6, AC-7)
  - ST-5: Write Non-Negotiables + Non-Goals + AC-8
  - ST-6: Functional verification against a sample elaboration artifact

---

STORY-SEED COMPLETE WITH WARNINGS: 1 warning (no baseline file; context gathered from codebase scan and story index)
