# Agent Spawn Patterns

Standard patterns for spawning worker agents.

---

## Basic Spawn Pattern

```
Task tool:
  subagent_type: "general-purpose"
  model: "sonnet"
  description: "{Brief description} {STORY_ID}"
  prompt: |
    You are implementing {domain} code.

    Read agent file: .claude/agents/{agent-name}.agent.md

    CONTEXT:
    feature_dir: {FEATURE_DIR}
    story_id: {STORY_ID}

    OUTPUT:
    Report files created/modified and test results.
```

---

## Background Spawn Pattern

For parallel execution of multiple workers:

```
Task tool:
  subagent_type: "general-purpose"
  description: "Implement {STORY_ID} backend"
  run_in_background: true
  prompt: |
    Read: .claude/agents/dev-implement-backend-coder.agent.md

    STORY CONTEXT:
    Feature directory: {FEATURE_DIR}
    Story ID: {STORY_ID}
    Story file: {FEATURE_DIR}/in-progress/{STORY_ID}/{STORY_ID}.md
    Plan file: {FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/IMPLEMENTATION-PLAN.md
    Output file: {FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/BACKEND-LOG.md

    FAST-FAIL: Run pnpm check-types after each chunk. Stop early if types fail.
```

---

## Retry Spawn Pattern

When retrying after type errors:

```
Task tool:
  subagent_type: "general-purpose"
  description: "Retry {STORY_ID} backend (type fix)"
  prompt: |
    Read: .claude/agents/dev-implement-backend-coder.agent.md

    STORY CONTEXT:
    Feature directory: {FEATURE_DIR}
    Story ID: {STORY_ID}

    RETRY CONTEXT:
    This is attempt 2 of 2. Previous attempt failed with type errors.

    PREVIOUS ERRORS:
    <paste type error output>

    PREVIOUS LOG:
    <paste BACKEND-LOG.md contents>

    Fix the type errors and continue from where you left off.
```

---

## Resume After Decision Pattern

When resuming a blocked worker after user decision:

```
Task tool:
  description: "Resume {STORY_ID} backend with decision"
  prompt: |
    Read: .claude/agents/dev-implement-backend-coder.agent.md

    RESUME CONTEXT:
    An architectural decision was required. User has confirmed:
    Decision: {user's choice}

    Read ARCHITECTURAL-DECISIONS.yaml for full context.
    Continue implementation from where you left off.
```

---

## Worker Types

| Worker | Agent File | Output | Condition |
|--------|------------|--------|-----------|
| Backend Coder | `dev-implement-backend-coder.agent.md` | `BACKEND-LOG.md` | `scope.backend = true` |
| Frontend Coder | `dev-implement-frontend-coder.agent.md` | `FRONTEND-LOG.md` | `scope.frontend = true` |
| Contracts | `dev-implement-contracts.agent.md` | `CONTRACTS.md` | After backend, if API |
| Playwright | `dev-implement-playwright.agent.md` | `VERIFICATION.md` | E2E scope |

---

## Parallel Spawn Rules

1. **Single message**: Spawn all parallel workers in ONE message
2. **run_in_background: true**: Use for parallel execution
3. **TaskOutput**: Use to wait for each worker to complete
4. **Sequential dependencies**: Backend before Contracts

---

## Error Handling

| Scenario | Action |
|----------|--------|
| Type errors (1st failure) | Retry with error context (max 1 retry) |
| Type errors (2nd failure) | Create BLOCKERS.md, return BLOCKED |
| Worker blocked | No retry - return BLOCKED immediately |
| Lint errors | No retry - return BLOCKED |
