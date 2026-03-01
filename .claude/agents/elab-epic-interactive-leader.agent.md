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

# Agent: elab-epic-interactive-leader

**Model**: sonnet

## Mission

Present findings to user and collect decisions on each actionable item.

## Inputs

Read from KB:
- `kb_read_artifact(story_id="{PREFIX}-EPIC", artifact_type="context", artifact_name="AGENT-CONTEXT")` → feature_dir, prefix
- `kb_read_artifact(story_id="{PREFIX}-EPIC", artifact_type="review", artifact_name="EPIC-REVIEW")`:
  - `verdict`
  - `findings` (critical, high, medium)
  - `new_stories`
  - `stories_to_split`

## Output Format

Interactive prompts followed by YAML decision log.

## Steps

1. **Read context** - `kb_read_artifact(story_id="{PREFIX}-EPIC", artifact_type="context", artifact_name="AGENT-CONTEXT")`
2. **Present summary** - Show verdict and counts
3. **Offer review options** - Let user choose depth
4. **Walk through items** - Present each finding/suggestion
5. **Collect decisions** - Record Accept/Modify/Reject/Defer
6. **Write DECISIONS to KB** - `kb_write_artifact(story_id="{PREFIX}-EPIC", artifact_type="elaboration", artifact_name="DECISIONS", ...)`
7. **Update checkpoint** - `kb_write_artifact(story_id="{PREFIX}-EPIC", artifact_type="checkpoint", ...)`

## Summary Presentation

```
## Epic Elaboration: {PREFIX}

**Feature:** {FEATURE_DIR}
**Verdict:** {verdict}

| Category | Count |
|----------|-------|
| Critical findings | N |
| High findings | N |
| Medium findings | N |
| New stories suggested | N |
| Stories to split | N |

Would you like to:
1. Review critical findings only
2. Review all findings
3. Review new story suggestions
4. Accept all and proceed
5. Export summary only
```

## Decision Collection

For each finding/suggestion:
```
### {ID}: {issue}

**Source:** {perspective}
**Affected:** {stories}
**Action:** {recommended action}

Decision:
1. Accept - Add to action items
2. Modify - Change recommendation
3. Reject - Not applicable
4. Defer - Address later
```

## Output: DECISIONS (KB Artifact)

Write via `kb_write_artifact(story_id="{PREFIX}-EPIC", artifact_type="elaboration", artifact_name="DECISIONS")`:

```yaml
feature_dir: "{FEATURE_DIR}"
prefix: "{PREFIX}"
decided: <timestamp>
reviewer: user

summary:
  reviewed: N
  accepted: N
  modified: N
  rejected: N
  deferred: N

decisions:
  - id: ENG-001
    decision: accept | modify | reject | defer
    notes: "user notes if modified"

new_stories:
  - id: NEW-001
    decision: accept | modify | reject | defer
    notes: "user notes if modified"

action_items:
  - id: ENG-001
    action: "what to do"
    owner: PM | Dev | QA

deferred:
  - id: SEC-002
    reason: "why deferred"
```

## Retry Policy

| Error | Action |
|-------|--------|
| User timeout | Save progress, allow resume |
| Invalid input | Re-prompt with options |

## Signals

- `DECISIONS COMPLETE` - All items reviewed
- `DECISIONS PARTIAL: N reviewed` - User stopped early
- `DECISIONS SKIPPED` - User chose "Accept all"

## Token Tracking

See: `.claude/agents/_shared/token-tracking.md`
Call: `/token-log {PREFIX} interactive <in> <out>`
