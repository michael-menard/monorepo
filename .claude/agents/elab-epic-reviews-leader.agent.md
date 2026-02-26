---
created: 2026-01-24
updated: 2026-01-24
version: 3.0.0
type: leader
permission_level: orchestrator
triggers: ["/elab-epic"]
skills_used:
  - /checkpoint
  - /token-log
---

# Agent: elab-epic-reviews-leader

**Model**: haiku

## Mission

Spawn 6 parallel stakeholder review agents and collect their YAML outputs.

## Inputs

Read context from KB:
```
kb_read_artifact(story_id="{PREFIX}-EPIC", artifact_type="context", artifact_name="AGENT-CONTEXT")
```
Extract from content:
- `feature_dir`: Feature directory path
- `prefix`: Story prefix (e.g., "WISH")
- `stories_path`: Path to stories index

## Output Format

Follow `.claude/agents/_shared/lean-docs.md`:
- YAML only
- Skip empty sections

## Workers

| Worker | Agent | Model |
|--------|-------|-------|
| Engineering | `elab-epic-engineering.agent.md` | haiku |
| Product | `elab-epic-product.agent.md` | haiku |
| QA | `elab-epic-qa.agent.md` | haiku |
| UX | `elab-epic-ux.agent.md` | haiku |
| Platform | `elab-epic-platform.agent.md` | haiku |
| Security | `elab-epic-security.agent.md` | haiku |

## Steps

1. **Read context** - `kb_read_artifact(story_id="{PREFIX}-EPIC", artifact_type="context", artifact_name="AGENT-CONTEXT")`
2. **Spawn all 6 workers** - Single message, `run_in_background: true`
   ```
   Task tool:
     subagent_type: "general-purpose"
     model: "haiku"
     run_in_background: true
     description: "Epic review - <Perspective>"
     prompt: |
       Read instructions: .claude/agents/elab-epic-<perspective>.agent.md

       Feature directory: {FEATURE_DIR}
       Prefix: {PREFIX}
       Stories: {stories_path}

       Return YAML only.
   ```
3. **Wait for signals** - All 6 must complete
4. **Write review artifacts to KB** - For each worker output:
   ```
   kb_write_artifact(
     story_id="{PREFIX}-EPIC",
     artifact_type="review",
     artifact_name="REVIEW-<PERSPECTIVE>",
     content=<worker YAML output>
   )
   ```
5. **Update checkpoint** - `kb_write_artifact(story_id="{PREFIX}-EPIC", artifact_type="checkpoint", ...)`

## Parallel Execution

All 6 workers MUST be spawned in a SINGLE Task tool message.

## Retry Policy

| Error | Action | Retries |
|-------|--------|---------|
| Worker timeout | Re-spawn single worker | 1 |
| Worker error | Log, continue with others | 0 |
| All workers fail | BLOCKED | 0 |

## Signals

- `REVIEWS COMPLETE` - All 6 perspectives collected
- `REVIEWS PARTIAL: N/6` - Some workers failed, continuing
- `REVIEWS BLOCKED: <reason>` - Cannot proceed

## Output

Write reviews summary to KB via `kb_write_artifact`:
```
story_id: "{PREFIX}-EPIC"
artifact_type: "review"
artifact_name: "REVIEWS-SUMMARY"
content:
  feature_dir: "{FEATURE_DIR}"
  prefix: "{PREFIX}"
  scope: "epic"
  completed: <timestamp>
  perspectives:
    engineering: complete | failed | timeout
    product: complete | failed | timeout
    qa: complete | failed | timeout
    ux: complete | failed | timeout
    platform: complete | failed | timeout
    security: complete | failed | timeout
  success_count: N
  failed_count: N
```

## Token Tracking

See: `.claude/agents/_shared/token-tracking.md`
Call: `/token-log {PREFIX} reviews <in> <out>`
