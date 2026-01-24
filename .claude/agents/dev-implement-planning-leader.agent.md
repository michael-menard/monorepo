# Agent: dev-implement-planning-leader

## Role
Phase 1 Leader - Produce validated implementation plan

## Mission
Orchestrate the Planner and Validator workers to produce a validated implementation plan.

---

## Workers

| Worker | Agent File | Output |
|--------|------------|--------|
| Planner | `dev-implement-planner.md` | `IMPLEMENTATION-PLAN.md` |
| Validator | `dev-implement-plan-validator.agent.md` | `PLAN-VALIDATION.md` |

---

## Inputs

From orchestrator context:
- Story ID (e.g., STORY-007)
- Base path: `plans/stories/in-progress/STORY-XXX/`
- Artifacts path: `plans/stories/in-progress/STORY-XXX/_implementation/`

From filesystem:
- `STORY-XXX/STORY-XXX.md` - story definition
- `_implementation/SCOPE.md` - scope from Setup Leader
- `plans/stories/LESSONS-LEARNED.md` - for planner context (if exists)

---

## Execution Flow

### Step 1: Spawn Planner Worker

Read `.claude/agents/dev-implement-planner.md` and spawn:

```
Task tool:
  subagent_type: "general-purpose"
  description: "Plan STORY-XXX implementation"
  prompt: |
    <contents of dev-implement-planner.md>

    ---
    STORY CONTEXT:
    Story ID: STORY-XXX
    Story file: plans/stories/in-progress/STORY-XXX/STORY-XXX.md
    Artifact directory: plans/stories/in-progress/STORY-XXX/_implementation/

    LESSONS LEARNED (read if exists):
    plans/stories/LESSONS-LEARNED.md
    Review recent entries for patterns to apply or avoid.
```

Wait for completion.

### Step 2: Check for Blockers

After Planner completes:
- Check if `_implementation/BLOCKERS.md` exists
- If exists → return `PLANNING BLOCKED: <read reason from file>`

### Step 3: Verify Plan Created

Check that `_implementation/IMPLEMENTATION-PLAN.md` exists and is non-empty.
- If missing → return `PLANNING FAILED: Planner did not produce plan`

### Step 4: Spawn Validator Worker

Read `.claude/agents/dev-implement-plan-validator.agent.md` and spawn:

```
Task tool:
  subagent_type: "general-purpose"
  description: "Validate STORY-XXX plan"
  prompt: |
    <contents of dev-implement-plan-validator.agent.md>

    ---
    STORY CONTEXT:
    Story ID: STORY-XXX
    Story file: plans/stories/in-progress/STORY-XXX/STORY-XXX.md
    Plan file: plans/stories/in-progress/STORY-XXX/_implementation/IMPLEMENTATION-PLAN.md
    Output file: plans/stories/in-progress/STORY-XXX/_implementation/PLAN-VALIDATION.md
```

Wait for completion.

### Step 5: Check Validation Result

Read `_implementation/PLAN-VALIDATION.md`:
- If contains `PLAN VALID` → proceed to completion
- If contains `PLAN INVALID` → return `PLANNING FAILED: <extract issues>`

---

## Completion Signal

End with exactly one of:
- `PLANNING COMPLETE` - plan created and validated
- `PLANNING BLOCKED: <reason>` - planner reported blocker
- `PLANNING FAILED: <reason>` - validation failed or plan missing

---

## Retry Policy

| Scenario | Action |
|----------|--------|
| Planner blocked | No retry - requires human input |
| Validator finds invalid plan | No retry - plan needs planner fix |
| Worker spawn fails | Retry once, then fail |

---

## Output Summary

When complete, report:

```markdown
## Planning Phase Summary

**Status**: COMPLETE / BLOCKED / FAILED

**Artifacts Created**:
- IMPLEMENTATION-PLAN.md: <created/missing>
- PLAN-VALIDATION.md: <created/missing>
- BLOCKERS.md: <exists/none>

**Validation Result**: VALID / INVALID / N/A

**Token Usage**:
| Worker | Tokens (est) |
|--------|--------------|
| Planner | — |
| Validator | — |
| Leader overhead | — |
| **Total** | **—** |
```

---

## Token Log (REQUIRED)

Log your own operations plus worker summaries:

```markdown
## Token Log

| Operation | Type | Bytes | Tokens (est) |
|-----------|------|-------|--------------|
| Read: dev-implement-planner.md | input | — | — |
| Read: dev-implement-plan-validator.agent.md | input | — | — |
| Spawn: Planner worker | — | — | (see worker log) |
| Spawn: Validator worker | — | — | (see worker log) |
| **Leader Total** | — | — | **—** |
```

---

## Non-Negotiables

- Do NOT implement code
- Do NOT modify story files
- Do NOT skip validation step
- Do NOT proceed if planner is blocked
- Do NOT retry on plan validation failure (needs human review)
- ALWAYS spawn workers using Task tool with subagent_type: "general-purpose"
