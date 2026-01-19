/dev-implement-story STORY-XXX

You are acting as the Dev agent ORCHESTRATOR in a structured refactor/migration workflow.
This command is used ONLY after a story has PASSED QA Audit.

CRITICAL: This is a MULTI-AGENT pipeline. You spawn sub-agents using the Task tool.
Each sub-agent runs in fresh context and communicates via artifact files.
You MUST NOT implement code yourself - you orchestrate sub-agents that do.

-------------------------------------------------------------------------------
AUTHORITATIVE INPUTS
-------------------------------------------------------------------------------

- plans/stories/STORY-XXX/STORY-XXX.md
- plans/stories/stories.index.md
- plans/vercel.migration.plan.exec.md
- plans/vercel.migration.plan.meta.md
- plans/stories/LESSONS-LEARNED.md (if exists - for planner context)

Agent definitions (read these to construct sub-agent prompts):
- .claude/agents/dev-implement-planner.md
- .claude/agents/dev-implement-plan-validator.agent.md
- .claude/agents/dev-implement-backend-coder.agent.md
- .claude/agents/dev-implement-frontend-coder.agent.md
- .claude/agents/dev-implement-contracts.md
- .claude/agents/dev-implement-verifier.agent.md
- .claude/agents/dev-implement-playwright.agent.md
- .claude/agents/dev-implement-proof-writer.agent.md
- .claude/agents/dev-implement-learnings.agent.md

-------------------------------------------------------------------------------
PRECONDITIONS (HARD STOP)
-------------------------------------------------------------------------------

Before spawning any sub-agents, validate:

- STORY-XXX.md exists and contains QA-AUDIT result of PASS
- STORY-XXX.md has `status: ready-to-work` in its frontmatter
- No prior implementation artifacts exist in STORY-XXX/_implementation/
- **Dependency check:** In plans/stories/stories.index.md, STORY-XXX must have
  `**Depends On:** none`. If dependencies exist:
  - STOP immediately
  - Report: "STORY-XXX is blocked by: [list dependencies]"
  - List which stories must be completed first

If any precondition fails: STOP and report. Do NOT spawn sub-agents.

-------------------------------------------------------------------------------
ARTIFACT DIRECTORY (SHARED MEMORY BETWEEN AGENTS)
-------------------------------------------------------------------------------

All sub-agents read from and write to:
- plans/stories/STORY-XXX/_implementation/

Artifacts:
- SCOPE.md               (Phase 0 - what surfaces are impacted)
- IMPLEMENTATION-PLAN.md (Phase 1 - detailed plan)
- PLAN-VALIDATION.md     (Phase 1B - plan validation results)
- BACKEND-LOG.md         (Phase 2 - backend implementation log)
- FRONTEND-LOG.md        (Phase 2 - frontend implementation log)
- CONTRACTS.md           (Phase 2 - API contracts, parallel with frontend)
- VERIFICATION.md        (Phase 3 - test/build/lint results)
- BLOCKERS.md            (any phase - blocks progression)
- PROOF-STORY-XXX.md     (Phase 4 - final proof document)

Global learnings file:
- plans/stories/LESSONS-LEARNED.md (Phase 5 - appended after each story)

-------------------------------------------------------------------------------
HOW TO SPAWN SUB-AGENTS
-------------------------------------------------------------------------------

For each phase that requires a sub-agent:

1. Read the corresponding agent definition file
2. Use the Task tool with:
   - subagent_type: "general-purpose"
   - description: "<short description>"
   - prompt: Contents of the agent file + story-specific context

Example:
```
Task tool:
  subagent_type: "general-purpose"
  description: "Plan STORY-007 implementation"
  prompt: |
    <contents of .claude/agents/dev-implement-planner.md>

    ---
    STORY CONTEXT:
    Story ID: STORY-007
    Story file: plans/stories/STORY-007/STORY-007.md
    Artifact directory: plans/stories/STORY-007/_implementation/
```

-------------------------------------------------------------------------------
PHASE 0 — SETUP (ORCHESTRATOR - YOU DO THIS)
-------------------------------------------------------------------------------

0.1 Validate all preconditions (see above)

0.2 Update Story Status
- Open plans/stories/STORY-XXX/STORY-XXX.md
- Change `status: ready-to-work` to `status: in-progress`

0.3 Create artifact directory
- Create: plans/stories/STORY-XXX/_implementation/

0.4 Determine Scope Surface
Read STORY-XXX.md and determine:
- backend_impacted: true/false (API endpoints, database, etc.)
- frontend_impacted: true/false (React components, UI, etc.)
- infra_impacted: true/false (config, env vars, etc.)

Write to _implementation/SCOPE.md:
```
backend: true/false
frontend: true/false
infra: true/false
```

-------------------------------------------------------------------------------
PHASE 1A — PLAN (SUB-AGENT)
-------------------------------------------------------------------------------

Agent: .claude/agents/dev-implement-planner.md

Spawn sub-agent:
```
Task tool:
  subagent_type: "general-purpose"
  description: "Plan STORY-XXX implementation"
  prompt: |
    <read and include .claude/agents/dev-implement-planner.md>

    ---
    STORY CONTEXT:
    Story ID: STORY-XXX
    Story file: plans/stories/STORY-XXX/STORY-XXX.md
    Artifact directory: plans/stories/STORY-XXX/_implementation/

    LESSONS LEARNED (read if exists):
    plans/stories/LESSONS-LEARNED.md
    Review recent entries for patterns to apply or avoid.
```

Output: IMPLEMENTATION-PLAN.md

WAIT for completion. Check for BLOCKERS.md - if exists, STOP.

-------------------------------------------------------------------------------
PHASE 1B — PLAN VALIDATION (SUB-AGENT) ⚡ NEW
-------------------------------------------------------------------------------

Before implementation, validate the plan catches issues early.

Agent: .claude/agents/dev-implement-plan-validator.agent.md

```
Task tool:
  subagent_type: "general-purpose"
  description: "Validate STORY-XXX plan"
  prompt: |
    <read and include .claude/agents/dev-implement-plan-validator.agent.md>

    ---
    STORY CONTEXT:
    Story ID: STORY-XXX
    Story file: plans/stories/STORY-XXX/STORY-XXX.md
    Plan file: plans/stories/STORY-XXX/_implementation/IMPLEMENTATION-PLAN.md
    Output file: plans/stories/STORY-XXX/_implementation/PLAN-VALIDATION.md
```

Output: PLAN-VALIDATION.md

WAIT for completion.
- If "PLAN INVALID" → STOP and report issues to user
- If "PLAN VALID" → proceed to Phase 2

-------------------------------------------------------------------------------
PHASE 2 — IMPLEMENT + CONTRACTS (PARALLEL SUB-AGENTS) ⚡ OPTIMIZED
-------------------------------------------------------------------------------

Spawn implementation sub-agents with MAXIMUM PARALLELISM.

The key insight: Contracts only needs Backend, so we can run:
- Backend → Contracts (sequential)
- Frontend (parallel with both)

**Spawn ALL of these in a SINGLE message for parallel execution:**

**If backend_impacted = true:**

Agent: .claude/agents/dev-implement-backend-coder.agent.md

```
Task tool:
  subagent_type: "general-purpose"
  description: "Implement STORY-XXX backend"
  prompt: |
    <read and include .claude/agents/dev-implement-backend-coder.agent.md>

    ---
    STORY CONTEXT:
    Story ID: STORY-XXX
    Story file: plans/stories/STORY-XXX/STORY-XXX.md
    Plan file: plans/stories/STORY-XXX/_implementation/IMPLEMENTATION-PLAN.md
    Output file: plans/stories/STORY-XXX/_implementation/BACKEND-LOG.md

    FAST-FAIL: Run pnpm check-types after each chunk. Stop early if types fail.
```

**If frontend_impacted = true (spawn in same message):**

Agent: .claude/agents/dev-implement-frontend-coder.agent.md

```
Task tool:
  subagent_type: "general-purpose"
  description: "Implement STORY-XXX frontend"
  prompt: |
    <read and include .claude/agents/dev-implement-frontend-coder.agent.md>

    ---
    STORY CONTEXT:
    Story ID: STORY-XXX
    Story file: plans/stories/STORY-XXX/STORY-XXX.md
    Plan file: plans/stories/STORY-XXX/_implementation/IMPLEMENTATION-PLAN.md
    Output file: plans/stories/STORY-XXX/_implementation/FRONTEND-LOG.md

    FAST-FAIL: Run pnpm check-types after each chunk. Stop early if types fail.
```

WAIT for ALL implementation sub-agents to complete.
Check for BLOCKERS.md - if exists, STOP.

-------------------------------------------------------------------------------
PHASE 2B — API CONTRACTS (SUB-AGENT, AFTER BACKEND)
-------------------------------------------------------------------------------

Skip if backend_impacted = false.

NOTE: This runs AFTER backend completes but can overlap with frontend if frontend
is still running. The orchestrator should spawn this as soon as backend reports
"BACKEND COMPLETE".

Agent: .claude/agents/dev-implement-contracts.md

```
Task tool:
  subagent_type: "general-purpose"
  description: "Create STORY-XXX API contracts"
  prompt: |
    <read and include .claude/agents/dev-implement-contracts.md>

    ---
    STORY CONTEXT:
    Story ID: STORY-XXX
    Story file: plans/stories/STORY-XXX/STORY-XXX.md
    Backend log: plans/stories/STORY-XXX/_implementation/BACKEND-LOG.md
    Output file: plans/stories/STORY-XXX/_implementation/CONTRACTS.md

    IMPORTANT: .http files MUST be created under /__http__/, not in the story directory.
```

WAIT for completion. Check for BLOCKERS.md.

-------------------------------------------------------------------------------
PHASE 3 — VERIFY (PARALLEL SUB-AGENTS)
-------------------------------------------------------------------------------

Spawn verification sub-agents IN PARALLEL using a single message.

**3A: Build/Test Verification (always runs)**

Agent: .claude/agents/dev-implement-verifier.agent.md

```
Task tool:
  subagent_type: "general-purpose"
  description: "Verify STORY-XXX build/tests"
  prompt: |
    <read and include .claude/agents/dev-implement-verifier.agent.md>

    ---
    STORY CONTEXT:
    Story ID: STORY-XXX
    Story file: plans/stories/STORY-XXX/STORY-XXX.md
    Output file: plans/stories/STORY-XXX/_implementation/VERIFICATION.md
```

**3B: Playwright (if frontend_impacted = true, spawn in same message):**

Agent: .claude/agents/dev-implement-playwright.agent.md

```
Task tool:
  subagent_type: "general-purpose"
  description: "Run STORY-XXX Playwright tests"
  prompt: |
    <read and include .claude/agents/dev-implement-playwright.agent.md>

    ---
    STORY CONTEXT:
    Story ID: STORY-XXX
    Story file: plans/stories/STORY-XXX/STORY-XXX.md
    Append to: plans/stories/STORY-XXX/_implementation/VERIFICATION.md
```

WAIT for ALL verification sub-agents to complete.
Check results - if any FAILED, STOP.

-------------------------------------------------------------------------------
PHASE 4 — PROOF (SUB-AGENT)
-------------------------------------------------------------------------------

Agent: .claude/agents/dev-implement-proof-writer.agent.md

```
Task tool:
  subagent_type: "general-purpose"
  description: "Write STORY-XXX proof document"
  prompt: |
    <read and include .claude/agents/dev-implement-proof-writer.agent.md>

    ---
    STORY CONTEXT:
    Story ID: STORY-XXX
    Story file: plans/stories/STORY-XXX/STORY-XXX.md
    Artifact directory: plans/stories/STORY-XXX/_implementation/
    Output file: plans/stories/STORY-XXX/PROOF-STORY-XXX.md

    Read ALL artifacts from _implementation/:
    - IMPLEMENTATION-PLAN.md
    - PLAN-VALIDATION.md
    - BACKEND-LOG.md (if exists)
    - FRONTEND-LOG.md (if exists)
    - CONTRACTS.md (if exists)
    - VERIFICATION.md
```

WAIT for completion.

-------------------------------------------------------------------------------
PHASE 5 — LEARNING LOOP (SUB-AGENT) ⚡ NEW
-------------------------------------------------------------------------------

Extract lessons learned to improve future implementations.

Agent: .claude/agents/dev-implement-learnings.agent.md

```
Task tool:
  subagent_type: "general-purpose"
  description: "Capture STORY-XXX learnings"
  prompt: |
    <read and include .claude/agents/dev-implement-learnings.agent.md>

    ---
    STORY CONTEXT:
    Story ID: STORY-XXX
    Story file: plans/stories/STORY-XXX/STORY-XXX.md
    Proof file: plans/stories/STORY-XXX/PROOF-STORY-XXX.md
    Artifact directory: plans/stories/STORY-XXX/_implementation/
    Output file: plans/stories/LESSONS-LEARNED.md (append)
```

WAIT for completion.

-------------------------------------------------------------------------------
PHASE 6 — STATUS UPDATE (ORCHESTRATOR - YOU DO THIS)
-------------------------------------------------------------------------------

After all phases complete:

1. Open plans/stories/STORY-XXX/STORY-XXX.md
2. Change `status: in-progress` to `status: ready-for-qa`

This signals to QA that implementation is complete and ready for verification.

-------------------------------------------------------------------------------
DONE DEFINITION
-------------------------------------------------------------------------------

Stop when:
- All sub-agents completed successfully (no BLOCKED or FAILED)
- No BLOCKERS.md exists
- PROOF-STORY-XXX.md is complete
- LESSONS-LEARNED.md is updated
- Story status is updated to `ready-for-qa`

-------------------------------------------------------------------------------
ERROR HANDLING
-------------------------------------------------------------------------------

If any sub-agent reports BLOCKED or FAILED:
1. Do NOT proceed to next phase
2. Read BLOCKERS.md or the failure reason
3. Report to user: "STORY-XXX implementation blocked: <reason>"
4. Leave story status as `in-progress` (do not revert)

-------------------------------------------------------------------------------
EXECUTION FLOW (OPTIMIZED)
-------------------------------------------------------------------------------

```
Phase 0 (Orchestrator)
       │
       ▼
Phase 1A: Planner Agent
       │
       ▼
Phase 1B: Plan Validator Agent ⚡ catches bad plans early
       │
       ▼
Phase 2: ┌─ Backend Agent ──→ Phase 2B: Contracts Agent ─┐
         │                                                │
         └─ Frontend Agent ───────────────────────────────┘
         (all parallel - contracts starts when backend done)
       │
       ▼
Phase 3: ┌─ Verifier Agent ────┐
         │                     │ (parallel)
         └─ Playwright Agent ──┘
       │
       ▼
Phase 4: Proof Writer Agent
       │
       ▼
Phase 5: Learnings Agent ⚡ builds institutional knowledge
       │
       ▼
Phase 6 (Orchestrator)
```

-------------------------------------------------------------------------------
AGENT FILE REFERENCE
-------------------------------------------------------------------------------

| Phase | Agent File | Purpose |
|-------|------------|---------|
| 1A - Plan | dev-implement-planner.md | Create implementation plan |
| 1B - Validate | dev-implement-plan-validator.agent.md | Validate plan before coding |
| 2 - Backend | dev-implement-backend-coder.agent.md | Implement backend + fast-fail |
| 2 - Frontend | dev-implement-frontend-coder.agent.md | Implement frontend + fast-fail |
| 2B - Contracts | dev-implement-contracts.md | Document API contracts |
| 3A - Verify | dev-implement-verifier.agent.md | Run build/test/lint |
| 3B - Playwright | dev-implement-playwright.agent.md | Run E2E tests |
| 4 - Proof | dev-implement-proof-writer.agent.md | Synthesize proof document |
| 5 - Learnings | dev-implement-learnings.agent.md | Capture lessons learned |

-------------------------------------------------------------------------------
ENHANCEMENTS SUMMARY
-------------------------------------------------------------------------------

1. **Fast-Fail Verification** - Backend/Frontend coders run type checks after
   each chunk. Catches errors early, saves context.

2. **Plan Validation** - Validates the plan before implementation starts.
   Catches missing ACs, invalid paths, non-existent reuse targets.

3. **Parallel Contracts** - Contracts agent runs as soon as backend completes,
   overlapping with frontend. Saves time on full-stack stories.

4. **Learning Loop** - After each story, learnings are captured to
   LESSONS-LEARNED.md. Future planners read this for patterns to apply/avoid.
