# Dev Feasibility Review: WINT-4080 — Create scope-defender Agent (Devil's Advocate)

## Feasibility Summary

- **Feasible for MVP:** Yes
- **Confidence:** High
- **Why:** This story creates a single `.agent.md` file (documentation/instruction artifact). No TypeScript code, no database migrations, no new MCP tools. The primary engineering challenge is precision of language: the agent instructions must be sufficiently clear that a haiku-class model executes correctly without hand-holding. The `scope-challenges.json` schema must be defined carefully because it is a stable integration contract for WINT-4140.

---

## Likely Change Surface (Core Only)

- **Files to create:** `.claude/agents/scope-defender.agent.md` (1 new file)
- **Files to reference (read-only):** `.claude/agents/_shared/FRONTMATTER.md`, `.claude/agents/_shared/expert-personas.md`, `.claude/prompts/role-packs/da.md` (if WINT-0210 has landed)
- **Files NOT to touch:** `packages/backend/orchestrator/src/nodes/audit/devils-advocate.ts` (different domain, protected)
- **Endpoints:** None
- **Critical deploy touchpoints:** None — agent files do not require deployment

---

## MVP-Critical Risks (Max 5)

### Risk 1: scope-challenges.json schema is not stable enough for WINT-4140 consumption

**Why it blocks MVP:**
WINT-4140 (Round Table Agent) takes `scope-challenges.json` as a required input. If the schema defined in this story is incomplete, ambiguous, or changes later, WINT-4140 cannot be built. This story's schema definition IS the integration contract.

**Required mitigation:**
Define the full schema inline in AC-5 with all required fields and enum values. Document it as "provisional canonical schema" that WINT-4150 will extend (not replace). Ensure `recommendation` enum and `risk_if_deferred` enum are explicitly constrained.

---

### Risk 2: Hard cap enforcement is stated but not mechanically clear

**Why it blocks MVP:**
If the agent instructions do not explicitly describe HOW to enforce the 5-challenge cap (select top 5 by deferral impact, note truncation, never challenge blocking items), haiku model may interpret the cap loosely.

**Required mitigation:**
AC-4 must include explicit selection algorithm language. "Select top 5 by highest-impact deferral potential" must be precise: define priority ordering (e.g., `risk_if_deferred = high` > `medium` > `low`, with secondary sort by scope size of deferred item).

---

### Risk 3: DA role pack timing creates ambiguity at implementation time

**Why it blocks MVP:**
WINT-0210 (Populate Role Pack Templates) may or may not be complete when WINT-4080 is implemented. If `da.md` does not exist, the agent must embed DA constraints inline. If it does exist, it should reference/inject the role pack instead of duplicating it.

**Required mitigation:**
Agent instructions must include a conditional: "If `.claude/prompts/role-packs/da.md` exists, read it for DA hard caps. If it does not exist, use the embedded constraints in this section: [embedded caps]." This covers both cases without requiring coordination between story timelines.

---

## Missing Requirements for MVP

None identified. The seed's 8 ACs cover all MVP-critical requirements. The provisional `scope-challenges.json` schema defined in AC-5 is sufficient for WINT-4140 integration.

---

## MVP Evidence Expectations

- Agent file exists at `.claude/agents/scope-defender.agent.md`
- YAML frontmatter is valid and complete per WINT standard fields
- Agent invoked against a test elaboration artifact produces `scope-challenges.json` with valid JSON
- Hard cap of 5 challenges verified by test HP-3 (7 candidates → 5 in output, `truncated: true`)
- Blocking item guard verified by test ERR-4 (blocking items absent from challenges)
- BLOCKED signal verified by test ERR-1 (no story brief → BLOCKED)

---

## Proposed Subtask Breakdown

### ST-1: Design and document scope-challenges.json schema

**Goal:** Define the provisional `scope-challenges.json` schema with all required fields and enum values, and confirm compatibility with WINT-4140 requirements.

**Files to read:**
- `/Users/michaelmenard/Development/monorepo/plans/future/platform/wint/backlog/WINT-4080/_pm/STORY-SEED.md` (AC-5 requirements)
- `/Users/michaelmenard/Development/monorepo/packages/backend/orchestrator/src/nodes/audit/roundtable.ts` (how DA output is consumed downstream)
- `/Users/michaelmenard/Development/monorepo/packages/backend/orchestrator/src/nodes/audit/devils-advocate.ts` (challenge result structure reference)

**Files to create/modify:**
- `.claude/agents/scope-defender.agent.md` (create with schema section only)

**ACs covered:** AC-5

**Depends on:** none

**Verification:** Read the created file and validate that all schema fields from AC-5 are present; confirm `recommendation` and `risk_if_deferred` enums are defined

---

### ST-2: Write agent frontmatter, Role, Mission, and Inputs sections

**Goal:** Create the agent file header with valid WINT-standard frontmatter and document the complete input contract with graceful degradation behavior.

**Files to read:**
- `/Users/michaelmenard/Development/monorepo/.claude/agents/_shared/FRONTMATTER.md` (required fields)
- `/Users/michaelmenard/Development/monorepo/.claude/agents/doc-sync.agent.md` (haiku worker pattern reference)
- `.claude/agents/scope-defender.agent.md` (from ST-1, add to it)

**Files to create/modify:**
- `.claude/agents/scope-defender.agent.md` (extend with frontmatter + Inputs sections)

**ACs covered:** AC-1, AC-2

**Depends on:** ST-1

**Verification:** YAML frontmatter parses without error; `model: haiku`, `type: worker`, `version: 1.0.0`, `description` ≤ 80 chars; Inputs section documents required and optional inputs with graceful degradation

---

### ST-3: Write Execution Phases with hard cap enforcement logic

**Goal:** Define the 4-phase execution workflow with explicit hard cap enforcement, blocking item guard, and priority ordering algorithm.

**Files to read:**
- `/Users/michaelmenard/Development/monorepo/.claude/agents/story-attack-agent.agent.md` (bounded analysis pattern)
- `.claude/agents/scope-defender.agent.md` (from ST-2, extend)

**Files to create/modify:**
- `.claude/agents/scope-defender.agent.md` (extend with Phases section)

**ACs covered:** AC-3, AC-4

**Depends on:** ST-2

**Verification:** Phases section present with 4 named phases; each phase has input/output documented; hard cap of 5 explicitly stated with truncation behavior; "never challenge blocking items" guard explicitly stated as Phase 2 pre-condition

---

### ST-4: Write Output, Completion Signals, and LangGraph Porting Notes sections

**Goal:** Document the `scope-challenges.json` output format with inline schema example, define all 3 completion signals, and write the LangGraph Porting Notes section for WINT-9040.

**Files to read:**
- `.claude/agents/scope-defender.agent.md` (from ST-3, extend)
- `/Users/michaelmenard/Development/monorepo/plans/future/platform/wint/backlog/WINT-4080/_pm/STORY-SEED.md` (AC-6, AC-7 requirements)

**Files to create/modify:**
- `.claude/agents/scope-defender.agent.md` (extend with Output + Signals + LangGraph sections)

**ACs covered:** AC-5 (inline schema example), AC-6, AC-7

**Depends on:** ST-3

**Verification:** Completion signals section lists exactly 3 signals with correct format; LangGraph Porting Notes section present with canonical inputs, phases, outputs, and "No MCP tools in v1.0" note; output file path documented as `{story_dir}/_implementation/scope-challenges.json`

---

### ST-5: Write Non-Negotiables and Non-Goals sections

**Goal:** Document what the agent explicitly does NOT do (non-goals) and the mechanical enforcement rules (non-negotiables) that the implementing model must follow.

**Files to read:**
- `.claude/agents/scope-defender.agent.md` (from ST-4, finalize)
- `/Users/michaelmenard/Development/monorepo/plans/future/platform/wint/backlog/WINT-4080/_pm/STORY-SEED.md` (AC-8 requirements, Non-Goals section)

**Files to create/modify:**
- `.claude/agents/scope-defender.agent.md` (extend with Non-Negotiables + Non-Goals sections)

**ACs covered:** AC-8

**Depends on:** ST-4

**Verification:** Non-Goals section explicitly lists: no backlog writes, no blocking item challenges, no new ACs, no cohesion-sidecar/graph-checker dependency, no backlog MCP tools; Non-Negotiables section lists all mechanical enforcement rules

---

### ST-6: Functional verification against a sample elaboration artifact

**Goal:** Invoke the completed `scope-defender.agent.md` against a prepared test elaboration artifact and confirm all 8 ACs are met.

**Files to read:**
- `.claude/agents/scope-defender.agent.md` (completed, from ST-5)
- Test fixture elaboration artifacts (created as part of this subtask)

**Files to create/modify:**
- `tests/fixtures/scope-defender/story-brief.md` (test input)
- `tests/fixtures/scope-defender/acs.md` (test input with 7 ACs)
- `tests/fixtures/scope-defender/gaps.json` (test input marking 2 ACs blocking)

**ACs covered:** All (verification pass)

**Depends on:** ST-5

**Verification:** Agent invocation produces `scope-challenges.json` with ≤5 challenges; blocking items absent from output; completion signal emitted; JSON validates against schema from AC-5
