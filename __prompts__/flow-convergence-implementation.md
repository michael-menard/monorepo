# FLOW Implementation Prompt

> **Hand this to Claude Code to begin or resume implementation.**

---

## Quick Start

```bash
# First run:
"Execute the prompt in __prompts__/flow-convergence-implementation.md"

# Resume after stopping:
"Resume __prompts__/flow-convergence-implementation.md from checkpoint"
```

---

## Context

You are implementing the **flow-convergence** feature, a 41-story epic that transforms story creation and elaboration workflows into a convergence-focused system.

**CRITICAL: This is an UPDATE to existing infrastructure, not greenfield.**

| Artifact | Location |
|----------|----------|
| Plan | `plans/future/flow-convergence/PLAN.md` |
| Stories Index | `plans/future/flow-convergence/stories.index.md` |
| Roadmap | `plans/future/flow-convergence/roadmap.md` |
| **Implementation Checkpoint** | `plans/future/flow-convergence/_bootstrap/IMPL-CHECKPOINT.md` |

### Existing Infrastructure (DO NOT RECREATE)

| Component | Location | Status |
|-----------|----------|--------|
| Agents | `.claude/agents/*.agent.md` | 77 existing files |
| Commands | `.claude/commands/*.md` | 23 existing files |
| Orchestrator State | `packages/backend/orchestrator/src/state/` | graph-state, validators, utilities |
| Orchestrator Runner | `packages/backend/orchestrator/src/runner/` | circuit-breaker, retry, metrics, node-factory |

### Implementation Approach

1. **Extend existing patterns** — follow conventions from existing agents/commands
2. **Add new nodes** to orchestrator — integrate with existing state and runner infrastructure
3. **Modify existing commands** where PLAN.md specifies updates (e.g., `pm-story.md`, `dev-implement-story.md`)
4. **Reuse existing utilities** — don't recreate error handling, logging, state management

---

## Critical Constraint: Context Efficiency

This implementation will consume significant context. You MUST operate as an **orchestrator**, not an implementer.

### Orchestrator Rules

1. **NEVER read large files directly** — spawn an Explore agent to summarize what you need
2. **NEVER write code in your main context** — spawn worker agents to implement
3. **NEVER iterate on implementation details** — delegate, receive result, move on
4. **Parallelize aggressively** — launch multiple Task agents in a single message when stories are independent
5. **Update checkpoint after each story** — enables resume from any point

---

## Checkpoint System

The checkpoint file tracks all progress and enables resume.

### Checkpoint Location

`plans/future/flow-convergence/_bootstrap/IMPL-CHECKPOINT.md`

### Checkpoint Structure

```markdown
---
last_updated: "2026-01-31T12:00:00Z"
current_phase: 1 | 2 | 3 | 4
active_story: FLOW-XXX | null
---

# FLOW Implementation Checkpoint

## Completed Stories
- [x] FLOW-001 — Reality Intake Sub-Graph Infrastructure
- [x] FLOW-021 — LangGraph Reality Intake Node

## In Progress
- [ ] FLOW-002 — Reality Baseline Collection Agent (worker spawned)

## Blocked
- FLOW-003 — blocked by FLOW-002

## Cached Context

### Agent Patterns (from Phase 1 exploration)
- Naming: `<name>.agent.md`
- Structure: frontmatter + sections (Purpose, Inputs, Process, Outputs)
- Location: `.claude/agents/`

### Command Patterns (from Phase 1 exploration)
- Naming: `<name>.md`
- Structure: frontmatter + usage + steps
- Location: `.claude/commands/`

## Session Log
| Timestamp | Action | Result |
|-----------|--------|--------|
| 2026-01-31T10:00 | Started Phase 1 | — |
| 2026-01-31T10:05 | Explored agent patterns | Cached |
| 2026-01-31T10:10 | Completed FLOW-001 | 2 files created |
```

### Checkpoint Operations

**After completing each story:**
```
Update IMPL-CHECKPOINT.md:
1. Move story from "In Progress" to "Completed"
2. Update active_story to next story
3. Add session log entry
4. Check if any blocked stories are now unblocked
```

**On resume:**
```
1. Read IMPL-CHECKPOINT.md
2. Load cached context (agent patterns, command patterns)
3. Check active_story — resume if in progress
4. Check blocked stories — unblock any with satisfied dependencies
5. Continue execution from current_phase
```

---

## Agent Delegation Pattern

```
Main Agent (Orchestrator)
├── Explore agent → "Analyze existing .claude/agents/ patterns, return template structure"
├── Explore agent → "Find all workflow commands in .claude/commands/, summarize conventions"
├── Plan agent → "Design FLOW-001 implementation given [context from explores]"
└── general-purpose agent → "Implement FLOW-001 per plan, write files, return summary"
```

### Per-Story Execution Pattern

For each story:

1. **Update checkpoint** — mark story as "In Progress"

2. **Spawn Plan agent** (if architecture decisions needed):
   ```
   "Plan implementation for FLOW-XXX: [story description].
   Read the story from stories.index.md.

   IMPORTANT: Check for EXISTING files to modify first:
   - .claude/agents/ (77 existing agents)
   - .claude/commands/ (23 existing commands)
   - packages/backend/orchestrator/src/ (existing state, runner, nodes)

   Return: files to MODIFY vs files to CREATE, key decisions, implementation approach."
   ```

3. **Spawn general-purpose worker** (to implement):
   ```
   "Implement FLOW-XXX per this plan: [plan summary].

   IMPORTANT: Prefer modifying existing files over creating new ones.
   Follow existing patterns from nearby files.
   Integrate with existing orchestrator state/runner.

   Return: files modified, files created, any issues encountered."
   ```

4. **Update checkpoint** — mark story as "Completed", log result, update next ready stories

---

## Execution Phases

### Phase 1: Bootstrap (Do First)

**Skip if checkpoint shows Phase 1 complete.**

1. Read `PLAN.md` (main agent — this is unavoidable)
2. Spawn Explore agent: "Analyze `.claude/agents/*.agent.md` — return naming conventions, structure template, common patterns"
3. Spawn Explore agent: "Analyze `.claude/commands/*.md` — return naming conventions, structure template, common patterns"
4. **Write pattern summaries to IMPL-CHECKPOINT.md** under "Cached Context"
5. Update checkpoint: `current_phase: 2`

### Phase 2: Foundation Stories (Parallel)

**Skip if checkpoint shows these complete.**

Launch in parallel (single message, multiple Task calls):
- Worker agent → Implement FLOW-001 (Reality Intake Sub-Graph Infrastructure)
- Worker agent → Implement FLOW-021 (LangGraph Baseline Loader Node)

Update checkpoint after each completes.

### Phase 3: Critical Path Execution

Follow the critical path from `roadmap.md`:
```
FLOW-002 → FLOW-003 → FLOW-004 → FLOW-005 → FLOW-006 → FLOW-007 → FLOW-008
    ↓
FLOW-009 → FLOW-010 → FLOW-011 → FLOW-013 → FLOW-016
```

**Parallel opportunities** (from roadmap.md):
- FLOW-024, FLOW-025, FLOW-026 can run in parallel (all depend on FLOW-023)
- FLOW-012 and FLOW-013 can run in parallel (both depend on FLOW-011)
- Many Claude Code + LangGraph pairs can run in parallel

For each story:
1. Check checkpoint — skip if completed
2. Check dependencies — block if not satisfied
3. Spawn worker with focused prompt
4. Update checkpoint
5. Continue (or parallelize when dependencies allow)

### Phase 4: Metrics & Graphs

Highly parallelizable. Spawn workers for:
- All metrics stories (FLOW-012 through FLOW-017, FLOW-035 through FLOW-041)
- Graph composition stories (FLOW-042, FLOW-043, FLOW-044)

---

## Worker Output Format

Workers should return structured results:

```yaml
story: FLOW-XXX
status: completed | blocked | needs_review
files_created:
  - path/to/file1.ts
  - path/to/file2.md
files_modified:
  - path/to/existing.ts
issues: null | "description of blocker"
tests_passed: true | false | skipped
next_unblocked:
  - FLOW-YYY
  - FLOW-ZZZ
```

Orchestrator parses this and updates IMPL-CHECKPOINT.md.

---

## Stop & Resume Protocol

### To Stop Gracefully

1. Wait for current worker(s) to complete
2. Update IMPL-CHECKPOINT.md with current state
3. Ensure all completed work is reflected in stories.index.md
4. Say: "Checkpoint saved. Safe to stop."

### To Resume

1. Read IMPL-CHECKPOINT.md
2. Load cached context from checkpoint
3. Identify:
   - `active_story` — resume if worker was in progress
   - Next ready stories — ones with all dependencies satisfied
4. Continue from current phase

### Resume Prompt

```
Resume implementation of flow-convergence from checkpoint.

Read: plans/future/flow-convergence/_bootstrap/IMPL-CHECKPOINT.md

Continue from where we left off:
1. Check current_phase and active_story
2. Use cached context (don't re-explore patterns)
3. Pick up next ready stories
4. Maintain orchestrator pattern — delegate to workers
```

---

## Anti-Patterns (Avoid These)

| Anti-Pattern | Why It's Bad | Instead |
|--------------|--------------|---------|
| Reading all 41 story descriptions | Blows context | Read only current story |
| Implementing in main context | No parallelism, context bloat | Spawn worker |
| Sequential agent spawning | Slow | Parallel spawning when independent |
| Re-reading patterns per story | Redundant | Use cached context from checkpoint |
| Asking for approval per story | Blocks progress | Batch approvals by phase |
| Not updating checkpoint | Lose progress on stop | Update after every story |
| **Recreating existing infra** | Duplicates 77 agents, 23 commands, orchestrator | Extend existing patterns |
| Creating new state management | Orchestrator already has graph-state | Integrate with existing state |
| Building new error handling | Runner has circuit-breaker, retry | Use existing runner utilities |

---

## Success Criteria

- [ ] All 41 stories implemented
- [ ] Main orchestrator context stays under 50% capacity
- [ ] Workers complete stories without returning to orchestrator for clarification
- [ ] stories.index.md reflects accurate status throughout
- [ ] IMPL-CHECKPOINT.md enables clean resume from any point
- [ ] No story implemented without its dependencies satisfied

---

## Initial Command

**First run:**
```
Read plans/future/flow-convergence/PLAN.md to understand the vision.
Initialize IMPL-CHECKPOINT.md with starting state.
Spawn two Explore agents in parallel to analyze existing .claude/agents/ and .claude/commands/ patterns.
Cache pattern summaries to checkpoint.
Then spawn workers to implement FLOW-001 and FLOW-021 in parallel.
Update checkpoint after each completion.
```

**Resume:**
```
Read plans/future/flow-convergence/_bootstrap/IMPL-CHECKPOINT.md.
Resume from current state using cached context.
Continue with next ready stories.
```
