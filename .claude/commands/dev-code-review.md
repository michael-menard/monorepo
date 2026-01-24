Usage:
/dev-code-review STORY-XXX

You are acting as the Code Review ORCHESTRATOR in a structured refactor/migration workflow.
This command is used AFTER implementation is complete but BEFORE QA verification.

CRITICAL: This is a MULTI-AGENT pipeline. You spawn sub-agents using the Task tool.
Each sub-agent runs in fresh context and communicates via artifact files.
You MUST NOT perform reviews yourself - you orchestrate sub-agents that do.

-------------------------------------------------------------------------------
AUTHORITATIVE INPUTS
-------------------------------------------------------------------------------

- plans/stories/in-progress/STORY-XXX/STORY-XXX.md
- plans/stories/in-progress/STORY-XXX/PROOF-STORY-XXX.md
- plans/stories/in-progress/STORY-XXX/_implementation/

Agent definitions (read these to construct sub-agent prompts):
- .claude/agents/code-review-lint.agent.md
- .claude/agents/code-review-style-compliance.agent.md
- .claude/agents/code-review-syntax.agent.md
- .claude/agents/code-review-security.agent.md
- .claude/agents/code-review.agent.md

-------------------------------------------------------------------------------
PRECONDITIONS (HARD STOP)
-------------------------------------------------------------------------------

Before spawning any sub-agents, validate:

- plans/stories/in-progress/STORY-XXX/STORY-XXX.md exists
- STORY-XXX.md has `status: ready-for-code-review` in its frontmatter
- plans/stories/in-progress/STORY-XXX/PROOF-STORY-XXX.md exists
- plans/stories/in-progress/STORY-XXX/_implementation/VERIFICATION.md exists and shows checks passed

If any precondition fails: STOP and report. Do NOT spawn sub-agents.

-------------------------------------------------------------------------------
HARD RULES
-------------------------------------------------------------------------------

1. **Style Compliance is MANDATORY**
   - ALL styling MUST come from Tailwind CSS or @repo/app-component-library
   - NO custom CSS, inline styles, or arbitrary Tailwind values
   - This is a ZERO TOLERANCE rule - any violation = FAIL

2. **Lint on Touched Files Only**
   - Do NOT lint the entire codebase
   - Only lint files created/modified by the story

3. **ES7+ Syntax Required**
   - Modern JavaScript/TypeScript patterns required
   - Do NOT fail on stylistic differences (Prettier handles that)

-------------------------------------------------------------------------------
PHASE 0 — SETUP (ORCHESTRATOR - YOU DO THIS)
-------------------------------------------------------------------------------

0.1 Validate all preconditions (see above)

0.2 Read implementation logs to identify touched files:
- plans/stories/in-progress/STORY-XXX/_implementation/BACKEND-LOG.md
- plans/stories/in-progress/STORY-XXX/_implementation/FRONTEND-LOG.md
- plans/stories/in-progress/STORY-XXX/PROOF-STORY-XXX.md

0.3 Create artifact directory if needed:
- plans/stories/in-progress/STORY-XXX/_implementation/ (should exist)

-------------------------------------------------------------------------------
PHASE 1 — PARALLEL REVIEWS (SUB-AGENTS)
-------------------------------------------------------------------------------

Spawn ALL review sub-agents in a SINGLE message for parallel execution.

**1A: Lint Check**

Agent: .claude/agents/code-review-lint.agent.md

```
Task tool:
  subagent_type: "general-purpose"
  description: "Lint STORY-XXX touched files"
  prompt: |
    <read and include .claude/agents/code-review-lint.agent.md>

    ---
    STORY CONTEXT:
    Story ID: STORY-XXX
    Story file: plans/stories/in-progress/STORY-XXX/STORY-XXX.md
    Implementation dir: plans/stories/in-progress/STORY-XXX/_implementation/
    Output file: plans/stories/in-progress/STORY-XXX/_implementation/CODE-REVIEW-LINT.md

    TOUCHED FILES (from implementation logs):
    <list the touched files here>
```

**1B: Style Compliance (HARD RULE)**

Agent: .claude/agents/code-review-style-compliance.agent.md

```
Task tool:
  subagent_type: "general-purpose"
  description: "Check STORY-XXX style compliance"
  prompt: |
    <read and include .claude/agents/code-review-style-compliance.agent.md>

    ---
    STORY CONTEXT:
    Story ID: STORY-XXX
    Story file: plans/stories/in-progress/STORY-XXX/STORY-XXX.md
    Implementation dir: plans/stories/in-progress/STORY-XXX/_implementation/
    Output file: plans/stories/in-progress/STORY-XXX/_implementation/CODE-REVIEW-STYLE.md

    HARD RULE: ALL styling must come from Tailwind or @repo/app-component-library.
    ANY custom CSS = automatic FAIL.

    TOUCHED FILES (from implementation logs):
    <list the touched files here>
```

**1C: Syntax Check**

Agent: .claude/agents/code-review-syntax.agent.md

```
Task tool:
  subagent_type: "general-purpose"
  description: "Check STORY-XXX ES7+ syntax"
  prompt: |
    <read and include .claude/agents/code-review-syntax.agent.md>

    ---
    STORY CONTEXT:
    Story ID: STORY-XXX
    Story file: plans/stories/in-progress/STORY-XXX/STORY-XXX.md
    Implementation dir: plans/stories/in-progress/STORY-XXX/_implementation/
    Output file: plans/stories/in-progress/STORY-XXX/_implementation/CODE-REVIEW-SYNTAX.md

    IMPORTANT: Do NOT fail on stylistic preferences (semicolons, quotes, etc.)
    Only fail on ES7+ compliance issues.

    TOUCHED FILES (from implementation logs):
    <list the touched files here>
```

**1D: Security Review**

Agent: .claude/agents/code-review-security.agent.md

```
Task tool:
  subagent_type: "general-purpose"
  description: "Security review STORY-XXX"
  prompt: |
    <read and include .claude/agents/code-review-security.agent.md>

    ---
    STORY CONTEXT:
    Story ID: STORY-XXX
    Story file: plans/stories/in-progress/STORY-XXX/STORY-XXX.md
    Implementation dir: plans/stories/in-progress/STORY-XXX/_implementation/
    Output file: plans/stories/in-progress/STORY-XXX/_implementation/CODE-REVIEW-SECURITY.md

    TOUCHED FILES (from implementation logs):
    <list the touched files here>
```

WAIT for ALL sub-agents to complete.

-------------------------------------------------------------------------------
PHASE 2 — SYNTHESIZE RESULTS (ORCHESTRATOR - YOU DO THIS)
-------------------------------------------------------------------------------

Read all sub-agent outputs:
- CODE-REVIEW-LINT.md
- CODE-REVIEW-STYLE.md
- CODE-REVIEW-SYNTAX.md
- CODE-REVIEW-SECURITY.md

Determine overall verdict:
- If ANY sub-agent reported FAIL → Overall FAIL
- If all PASS but some have warnings → PASS-WITH-WARNINGS
- If all PASS with no warnings → PASS

Write final report:
- plans/stories/in-progress/STORY-XXX/CODE-REVIEW-STORY-XXX.md

-------------------------------------------------------------------------------
FINAL REPORT STRUCTURE
-------------------------------------------------------------------------------

```markdown
# Code Review: STORY-XXX

## Verdict: PASS / PASS-WITH-WARNINGS / FAIL

## Summary
<1-2 sentence summary>

## Sub-Agent Results

| Check | Result | Blocking Issues |
|-------|--------|-----------------|
| Lint | PASS/FAIL | <count> |
| Style Compliance | PASS/FAIL | <count> |
| ES7+ Syntax | PASS/FAIL | <count> |
| Security | PASS/FAIL | <count> |

## Files Reviewed
<combined list from all sub-agents>

## Blocking Issues (Must Fix)

### Style Compliance Violations (HARD RULE)
<from CODE-REVIEW-STYLE.md, or "None">

### Lint Errors
<from CODE-REVIEW-LINT.md, or "None">

### Syntax Issues
<from CODE-REVIEW-SYNTAX.md, or "None">

### Security Issues
<from CODE-REVIEW-SECURITY.md, or "None">

## Warnings (Should Fix)
<combined warnings from all sub-agents>

## Required Fixes (if FAIL)
<explicit list of what must be fixed>

## Next Step
<state the next command to run>
```

-------------------------------------------------------------------------------
PHASE 3 — STATUS UPDATE (ORCHESTRATOR - YOU DO THIS)
-------------------------------------------------------------------------------

If verdict is PASS or PASS-WITH-WARNINGS:
1. Open plans/stories/in-progress/STORY-XXX/STORY-XXX.md
2. Change `status: ready-for-code-review` to `status: ready-for-qa`
3. State next step: `/qa-verify-story STORY-XXX`

If verdict is FAIL:
1. Open plans/stories/in-progress/STORY-XXX/STORY-XXX.md
2. Change `status: ready-for-code-review` to `status: code-review-failed`
3. State next step: `/dev-fix-story STORY-XXX` then re-run `/dev-code-review STORY-XXX`

-------------------------------------------------------------------------------
EXECUTION FLOW
-------------------------------------------------------------------------------

```
Phase 0 (Orchestrator) ─── Validate preconditions, identify touched files
       │
       ▼
Phase 1: ┌─ Lint Agent ──────────────┐
         │                            │
         ├─ Style Compliance Agent ──┤  (ALL PARALLEL)
         │                            │
         ├─ Syntax Agent ────────────┤
         │                            │
         └─ Security Agent ──────────┘
       │
       ▼
Phase 2 (Orchestrator) ─── Synthesize results, write CODE-REVIEW-STORY-XXX.md
       │
       ▼
Phase 3 (Orchestrator) ─── Update status if FAIL, state next step
```

-------------------------------------------------------------------------------
DONE DEFINITION
-------------------------------------------------------------------------------

Stop when:
- All sub-agents completed
- CODE-REVIEW-STORY-XXX.md is written
- Story status updated:
  - PASS/PASS-WITH-WARNINGS → `ready-for-qa`
  - FAIL → `code-review-failed`
- Next step clearly stated

-------------------------------------------------------------------------------
ERROR HANDLING
-------------------------------------------------------------------------------

If any sub-agent fails to complete:
1. Report which agent failed
2. Include any partial output
3. Do NOT mark the code review as complete
4. Recommend re-running the command

-------------------------------------------------------------------------------
IMPORTANT REMINDERS
-------------------------------------------------------------------------------

1. Style Compliance is a HARD GATE - zero tolerance for custom CSS
2. Lint only touched files, not entire codebase
3. ES7+ syntax required, but don't fail on Prettier-handled styles
4. QA verification (`/qa-verify-story`) is REQUIRED after code review passes
