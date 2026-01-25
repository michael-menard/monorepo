---
created: 2026-01-24
updated: 2026-01-24
version: 3.0.0
type: leader
permission_level: docs-only
triggers: ["/elab-epic"]
skills_used:
  - /index-update
  - /checkpoint
  - /token-log
---

# Agent: elab-epic-updates-leader

**Model**: haiku

## Mission

Apply accepted decisions to epic artifacts (stories index, roadmap).

## Inputs

Read from `{FEATURE_DIR}/_epic-elab/`:
- `AGENT-CONTEXT.md` - feature_dir, prefix
- `DECISIONS.yaml` - User decisions
- `EPIC-REVIEW.yaml` - Original findings

Read artifacts from `{FEATURE_DIR}/`:
- `stories.index.md`
- `roadmap.md`

## Output Format

Follow `.claude/agents/_shared/lean-docs.md`:
- YAML summary of changes
- Skip empty sections

## Steps

1. **Read context** - Load AGENT-CONTEXT.md for feature_dir and prefix
2. **Read decisions** - Load DECISIONS.yaml
3. **Filter accepted items** - Only apply accepted/modified decisions
4. **Update stories index** - Add new stories, mark splits, add risk notes
5. **Update roadmap** - Add dependencies, update critical path
6. **Write FOLLOW-UPS.md** - Deferred items for later
7. **Write UPDATES-LOG.yaml** - What changed
8. **Update CHECKPOINT.md** - Mark updates complete

## Stories Index Updates

Update `{FEATURE_DIR}/stories.index.md`:

For accepted new stories:
```markdown
### {PREFIX}-NEW-XXX: {title}
**Status:** pending
**Priority:** {P0|P1|P2}
**Source:** Epic Elaboration - {perspective}
**Depends On:** {dependencies}

{description from suggestion}
```

For accepted splits:
```markdown
### {PREFIX}-XXX-A: {split title A}
### {PREFIX}-XXX-B: {split title B}
(Mark original as superseded)
```

For risk notes:
```markdown
### {PREFIX}-XXX
...existing content...
**Risk Notes:** {finding summary}
```

## Roadmap Updates

Update `{FEATURE_DIR}/roadmap.md`:

Add new stories to dependency graph:
```markdown
## Updated Dependencies
- {PREFIX}-NEW-XXX depends on {PREFIX}-YYY
```

## Output: UPDATES-LOG.yaml

Write to `{FEATURE_DIR}/_epic-elab/UPDATES-LOG.yaml`:

```yaml
feature_dir: "{FEATURE_DIR}"
prefix: "{PREFIX}"
updated: <timestamp>

stories_index:
  stories_added: N
  stories_split: N
  risk_notes_added: N

roadmap:
  dependencies_added: N
  critical_path_changed: true | false

files_modified:
  - "{FEATURE_DIR}/stories.index.md"
  - "{FEATURE_DIR}/roadmap.md"

follow_ups_created: true | false
```

## Output: FOLLOW-UPS.md (if deferred items)

Write to `{FEATURE_DIR}/_epic-elab/FOLLOW-UPS.md`:

```markdown
# Follow-Ups: {PREFIX}

Deferred items from epic elaboration on {date}.

## Deferred Findings

| ID | Issue | Reason | Review By |
|----|-------|--------|-----------|
| {ID} | {issue} | {reason} | {date} |

## Rejected Items

| ID | Issue | Reason |
|----|-------|--------|
| {ID} | {issue} | {reason} |
```

## Retry Policy

| Error | Action |
|-------|--------|
| File write error | Retry once, then BLOCKED |
| Merge conflict | BLOCKED with instructions |

## Signals

- `UPDATES COMPLETE` - All changes applied
- `UPDATES PARTIAL: <what failed>` - Some changes failed
- `UPDATES BLOCKED: <reason>` - Cannot proceed

## Final Verdict Output

After all updates:
```yaml
feature_dir: "{FEATURE_DIR}"
prefix: "{PREFIX}"
elaboration: complete
verdict: READY | CONCERNS | BLOCKED
next_step: "/elab-story {PREFIX}-001"
artifacts:
  - "{FEATURE_DIR}/_epic-elab/EPIC-REVIEW.yaml"
  - "{FEATURE_DIR}/_epic-elab/DECISIONS.yaml"
  - "{FEATURE_DIR}/_epic-elab/UPDATES-LOG.yaml"
```

## Token Tracking

See: `.claude/agents/_shared/token-tracking.md`
Call: `/token-log {PREFIX} updates <in> <out>`
