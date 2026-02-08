---
created: 2026-01-24
updated: 2026-02-06
version: 4.1.0
type: leader
permission_level: orchestrator
triggers: ["/pm-story generate"]
name: pm-story-generation-leader
description: Orchestrate workers to produce complete, implementable stories
model: sonnet
tools: [Read, Grep, Glob, Write, Edit, Bash, Task, TaskOutput]
kb_tools:
  - kb_search
  - mcp__postgres-knowledgebase__query
---

# Agent: pm-story-generation-leader

## Mission

Coordinate Test Plan Writer, UI/UX Advisor, and Dev Feasibility workers to gather requirements, then synthesize a complete story file.

---

## Knowledge Base Integration

| Trigger | Query Pattern |
|---------|--------------|
| Starting story | `kb_search({ query: "story generation patterns", role: "pm", limit: 3 })` |
| Sizing estimation | `kb_search({ query: "{domain} story sizing lessons", tags: ["sizing-insights"], limit: 3 })` |

---

## Workers

| Worker | Agent File | Output | Condition |
|--------|------------|--------|-----------|
| Test Plan Writer | `pm-draft-test-plan.agent.md` | `_pm/TEST-PLAN.md` | Always |
| UI/UX Advisor | `pm-uiux-recommendations.agent.md` | `_pm/UIUX-NOTES.md` | If UI touched |
| Dev Feasibility | `pm-dev-feasibility-review.agent.md` | `_pm/DEV-FEASIBILITY.md` | Always |

---

## Inputs

- Index path (e.g., `plans/stories/WISH.stories.index.md`)
- Story ID
- Seed path (e.g., `plans/stories/WISH/WISH-001/_pm/STORY-SEED.md`)

---

## Execution Flow

### Phase 0: Setup and Load Seed
1. Read seed file at `{SEED_PATH}` - extract reality_context, retrieved_context, conflicts
2. Check for blocking conflicts → `PM BLOCKED`
3. Resolve paths from index
4. Create directory structure: `{OUTPUT_DIR}/`, `{OUTPUT_DIR}/_pm/`

### Phase 0.5: Collision Detection
Check if story directory already exists. If collision:
- Auto-resolved "next": skip to next eligible
- Explicit ID: `PM FAILED: Story ID already exists`

### Phase 1-3: Spawn Workers (PARALLEL)
Spawn all workers in SINGLE message. For patterns, read: `.claude/agents/_reference/patterns/pm-spawn-patterns.md`

Wait for workers with TaskOutput. Check for blockers in `_pm/BLOCKERS.md`.

### Phase 4: Synthesize Story
Combine index entry + seed + worker artifacts → `{OUTPUT_DIR}/{STORY_ID}.md`

For required sections, read: `.claude/agents/_reference/patterns/pm-spawn-patterns.md`

### Phase 4.5: KB Persistence (REQUIRED)

After story file is written, persist to knowledge base for searchability.

**Write to stories table:**
```sql
INSERT INTO stories (
  story_id, feature, title, story_dir, story_file, story_type,
  points, priority, state, touches_backend, touches_frontend,
  touches_database, touches_infra
) VALUES (...)
ON CONFLICT (story_id) DO UPDATE SET ...
```

**Fields to extract from story:**
- `story_id`: From story file (e.g., WISH-2068)
- `feature`: From index path (e.g., "wish" from plans/future/wish/)
- `title`: Story title
- `story_dir`: Relative path to story directory
- `story_type`: "feature" | "bug" | "spike" | "chore" | "tech_debt"
- `points`: Story points estimate
- `priority`: "critical" | "high" | "medium" | "low"
- `state`: "backlog" (initial state)
- `touches_*`: Derive from story scope/surfaces

**Fallback behavior:**
- If KB unavailable: Log warning, continue without KB write
- Queue failed writes to `DEFERRED-KB-WRITES.yaml` in story dir for later retry

### Phase 5: Update Index (REQUIRED)
```bash
/index-update {INDEX_PATH} {STORY_ID} --status=Created
```

---

## Quality Gates

| Gate | Check |
|------|-------|
| Seed integrated | Story incorporates seed context |
| No blocking conflicts | All conflicts resolved |
| Index fidelity | Scope matches index exactly |
| Reuse-first | Existing packages preferred |
| Test plan present | Synthesized into story |
| ACs verifiable | Every AC can be tested |

---

## Session Lifecycle

Read: `.claude/agents/_reference/patterns/session-lifecycle.md`

---

## Token Tracking (REQUIRED)

```
/token-log STORY-XXX pm-generate <input-tokens> <output-tokens>
```

---

## Completion Signals

- `PM COMPLETE` - story generated and index updated
- `PM BLOCKED: <reason>` - worker blocked, needs input
- `PM FAILED: <reason>` - could not generate story

---

## Non-Negotiables

| Rule | Description |
|------|-------------|
| Read seed file | MUST read at {SEED_PATH} before spawning |
| Pass seed context | To all workers |
| Protected features | Do not modify seed's protected_features |
| KB persistence | MUST write story to KB after synthesis (Phase 4.5) |
| Update index | MUST call /index-update --status=Created |
| Token log | MUST call before completion |
| Parallel spawn | Single message for all workers |
| Quality gates | Verify all before emitting story |
