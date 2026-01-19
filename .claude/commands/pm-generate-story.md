/pm-generate-story STORY-XXX | next

You are acting as the PM agent in a structured refactor/migration workflow.
This command generates ONE story file from the story index.

This command is an ORCHESTRATED PIPELINE:
- PM orchestrates sub-agents that each write durable artifacts
- PM synthesizes the final story file using those artifacts
- Artifacts, not chat context, are the source of truth

-------------------------------------------------------------------------------
ARGUMENT HANDLING
-------------------------------------------------------------------------------

This command accepts ONE of:
- `STORY-XXX` — explicit story ID (e.g., STORY-001, STORY-012)
- `next` — automatically select the first READY story (pending + no dependencies)

If `next` is provided:
1. Read plans/stories/stories.index.md
2. Parse all `## STORY-XXX` headings with their `**Status:**` and `**Depends On:**` fields
3. Select the FIRST story (by number order) where:
   - Status = `pending` AND
   - Depends On = `none`
4. If no matching stories exist: STOP and report one of:
   - "No pending stories found" (if no pending stories at all)
   - "All pending stories are blocked by dependencies" (if pending stories exist but all have dependencies)
     Include: list of pending stories and what they're waiting on
5. Proceed with that story ID

-------------------------------------------------------------------------------
AUTHORITATIVE INPUTS
-------------------------------------------------------------------------------

- plans/stories/stories.index.md
- plans/vercel.migration.plan.exec.md
- plans/vercel.migration.plan.meta.md
- .claude/agents/pm.agent.md

Reference agents (authoritative standards):
- .claude/agents/qa.agent.md
- .claude/agents/dev.agent.md
- .claude/agents/uiux.agent.md

-------------------------------------------------------------------------------
PRECONDITIONS (HARD STOP)
-------------------------------------------------------------------------------

- plans/stories/stories.index.md exists and includes STORY-XXX
- The story must have `**Status:** pending` (not already generated/completed)
- Do NOT generate stories that are not listed in the index
- If preconditions fail: STOP and report

-------------------------------------------------------------------------------
YOUR ROLE (PM ORCHESTRATOR)
-------------------------------------------------------------------------------

Act STRICTLY as the PM agent.
You MUST NOT implement code.
You MUST NOT generate Story Elaboration output.
You MUST remove blockers by making explicit decisions in-story.

You WILL:
- Fan out to sub-agents for: test planning, UI/UX guidance, dev feasibility risk
- Synthesize a single implementable story
- Eliminate “TBD” items that block implementation/testing

-------------------------------------------------------------------------------
HARD RULES (PM STORY QUALITY GATES)
-------------------------------------------------------------------------------

1) Index fidelity
- Scope must match plans/stories/stories.index.md exactly for STORY-XXX

2) Reuse-first
- Prefer existing packages under packages/**
- Do NOT propose per-story one-off utilities unless unavoidable and justified

3) Ports & adapters clarity
- Identify core/port interfaces and adapter responsibilities clearly

4) Local testing must be concrete and runnable
- Backend: MUST include required `.http` execution
- Frontend (if UI touched): MUST include Playwright execution + video URL expectation

5) HTTP contracts location must be referenced correctly
- `.http` definitions MUST live under `/__http__/`
- Story must reference required `.http` calls by path/name

6) NO blocking TBDs
- If a decision is required, PM MUST decide it in the story
- If it must be deferred, declare it OUT OF SCOPE and remove from AC/tests

7) HARD RULE: Test Plan is mandatory and must be embedded in the story
- Every story MUST include:
  "Test Plan (Happy Path / Error Cases / Edge Cases)"
- This section MUST be synthesized from:
  plans/stories/STORY-XXX/_pm/TEST-PLAN.md
- Missing this section = story is incomplete and must not be emitted

8) Seed requirement must be explicit (if applicable)
- If the story expects `pnpm seed` to be run, the story MUST include:
  - what data must exist after seeding (exact entities/fields)
  - deterministic + idempotent requirement
  - where seed code will live (repo standard)
- If seed is not required, say so explicitly.

-------------------------------------------------------------------------------
OUTPUT (FINAL)
-------------------------------------------------------------------------------

Produce ONE file only as the final output:
- plans/stories/STORY-XXX/STORY-XXX.md

Supporting artifacts MUST be written under:
- plans/stories/STORY-XXX/_pm/

-------------------------------------------------------------------------------
PIPELINE OVERVIEW (SUB-AGENTS + ARTIFACTS)
-------------------------------------------------------------------------------

Artifact directory (MANDATORY):
- plans/stories/STORY-XXX/_pm/

Artifacts:
- plans/stories/STORY-XXX/_pm/TEST-PLAN.md
- plans/stories/STORY-XXX/_pm/UIUX-NOTES.md
- plans/stories/STORY-XXX/_pm/DEV-FEASIBILITY.md
- plans/stories/STORY-XXX/_pm/BLOCKERS.md

-------------------------------------------------------------------------------
PHASE 0 — SETUP (PM)
-------------------------------------------------------------------------------

0.1 Validate index includes STORY-XXX
0.2 Create:
- plans/stories/STORY-XXX/
- plans/stories/STORY-XXX/_pm/

0.3 Initialize empty artifact files:
- TEST-PLAN.md
- UIUX-NOTES.md
- DEV-FEASIBILITY.md
- BLOCKERS.md

0.4 Determine whether UI is touched:
- If UI is NOT touched, UIUX sub-agent must output SKIPPED (with justification)

-------------------------------------------------------------------------------
PHASE 1 — DRAFT TEST PLAN (SUB-AGENT: pm-draft-test-plan)
-------------------------------------------------------------------------------

Goal:
- Produce a structured test plan for the story:
  - Happy path
  - Error cases
  - Reasonable edge cases
  - Evidence requirements

Output:
- plans/stories/STORY-XXX/_pm/TEST-PLAN.md

If blockers exist → write BLOCKERS.md and STOP.

-------------------------------------------------------------------------------
PHASE 2 — UI/UX RECOMMENDATIONS (SUB-AGENT: pm-uiux-recommendations)
-------------------------------------------------------------------------------

Run ONLY if UI is touched.

Goal:
- Provide UI requirements and examples:
  - React component suggestions (names, not implementation)
  - a11y requirements (concrete checks)
  - shadcn usage pattern via `_primitives`
  - examples/patterns to reuse (paths/names)
  - Playwright video expectation (what must be shown)

Output:
- plans/stories/STORY-XXX/_pm/UIUX-NOTES.md

If hard-gate violations are unavoidable per scope → write BLOCKERS.md and STOP.

-------------------------------------------------------------------------------
PHASE 3 — DEV FEASIBILITY REVIEW (SUB-AGENT: pm-dev-feasibility-review)
-------------------------------------------------------------------------------

Goal:
- Identify feasibility risk and change surface:
  - risk in code being changed
  - hidden dependencies
  - missing AC
  - mitigations PM should bake into AC/testing

Output:
- plans/stories/STORY-XXX/_pm/DEV-FEASIBILITY.md

If story cannot be implemented as written → write BLOCKERS.md and STOP.

-------------------------------------------------------------------------------
PHASE 4 — SYNTHESIZE STORY (PM)
-------------------------------------------------------------------------------

Using the index entry + plan meta/exec + artifacts, produce:
- plans/stories/STORY-XXX/STORY-XXX.md

STORY STRUCTURE (MANDATORY HEADINGS)

The story file MUST begin with a YAML-style metadata block:
```
---
status: backlog
---
```

Valid status values (story lifecycle):
- `backlog` — story created, awaiting QA audit
- `needs-refinement` — QA audit failed, PM must refine story
- `ready-to-work` — QA audit passed, ready for dev
- `in-progress` — dev is implementing
- `ready-for-qa` — dev complete, awaiting QA verify
- `in-qa` — QA verification in progress
- `uat` — QA passed, ready for user acceptance
- `needs-work` — QA verify failed, returned to dev

MANDATORY SECTIONS:
1) Title
2) Context
3) Goal
4) Non-goals
5) Scope
   - endpoints and surfaces (explicit)
   - packages/apps affected (explicit)
6) Acceptance Criteria (observable and locally testable)
7) Reuse Plan
8) Architecture Notes (Ports & Adapters)
9) Required Vercel / Infra Notes (only what's required)
10) HTTP Contract Plan (if API impacted)
    - Required `.http` requests:
      - /__http__/<domain>.http#<requestName>
    - Required evidence: call + response captured in proof
11) Seed Requirements (if applicable)
    - Required entities/records
    - Deterministic + idempotent requirement
    - Seed ownership expectation (seed code must exist)
12) Test Plan (Happy Path / Error Cases / Edge Cases)  <--- HARD RULE
    - MUST be synthesized from _pm/TEST-PLAN.md
    - MUST include:
      - Happy path tests
      - Error cases
      - Edge cases
      - Evidence expectations

-------------------------------------------------------------------------------
PHASE 5 — UPDATE INDEX STATUS (PM)
-------------------------------------------------------------------------------

After successfully writing the story file:

1. Open plans/stories/stories.index.md
2. Locate the entry for STORY-XXX
3. Change `**Status:** pending` to `**Status:** generated`
4. Update the Progress Summary table at the top:
   - Decrement `pending` count by 1
   - Increment `generated` count by 1

This ensures the index always reflects the current state of story generation.
