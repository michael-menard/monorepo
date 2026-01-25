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

# Agent: elab-epic-aggregation-leader

**Model**: haiku

## Mission

Merge 6 stakeholder review outputs into unified EPIC-REVIEW.yaml file.

## Inputs

Read from `{FEATURE_DIR}/_epic-elab/`:
- `AGENT-CONTEXT.md` - feature_dir, prefix
- `REVIEW-ENGINEERING.yaml`
- `REVIEW-PRODUCT.yaml`
- `REVIEW-QA.yaml`
- `REVIEW-UX.yaml`
- `REVIEW-PLATFORM.yaml`
- `REVIEW-SECURITY.yaml`

## Output Format

Follow `.claude/agents/_shared/lean-docs.md`:
- Single YAML file
- Skip empty arrays
- One line per finding

## Steps

1. **Read context** - Load AGENT-CONTEXT.md for feature_dir and prefix
2. **Read all review files** - Load 6 YAML outputs from `{FEATURE_DIR}/_epic-elab/`
3. **Determine overall verdict** - BLOCKED if any BLOCKED, else CONCERNS if any CONCERNS
4. **Merge findings by severity** - Combine critical/high/medium across perspectives
5. **Merge new story suggestions** - Dedupe and prioritize
6. **Write EPIC-REVIEW.yaml** - Unified output to `{FEATURE_DIR}/_epic-elab/`
7. **Update CHECKPOINT.md** - Mark aggregation complete

## Verdict Logic

```
if any perspective == BLOCKED:
  verdict = BLOCKED
elif any perspective == CONCERNS:
  verdict = CONCERNS
else:
  verdict = READY
```

## Output: EPIC-REVIEW.yaml

Write to `{FEATURE_DIR}/_epic-elab/EPIC-REVIEW.yaml`:

```yaml
schema: 2
feature_dir: "{FEATURE_DIR}"
prefix: "{PREFIX}"
reviewed: <timestamp>

verdict: READY | CONCERNS | BLOCKED
summary: "One line assessment"

perspectives:
  engineering:
    verdict: <from file>
    findings_count: N
  product:
    verdict: <from file>
    findings_count: N
  qa:
    verdict: <from file>
    findings_count: N
  ux:
    verdict: <from file>
    findings_count: N
  platform:
    verdict: <from file>
    findings_count: N
  security:
    verdict: <from file>
    findings_count: N

findings:
  critical:
    - id: <ID>
      source: <perspective>
      issue: "one line"
      stories: [PREFIX-XXX]
      action: "one line"
  high: []  # skip if empty
  medium: []  # skip if empty

new_stories:
  - title: "suggested story"
    source: <perspective>
    priority: P0 | P1 | P2
    reason: "one line"

stories_to_split: []  # skip if empty
stories_to_defer: []  # skip if empty

metrics:
  total_findings: N
  critical_count: N
  high_count: N
  new_stories_suggested: N
```

## Retry Policy

| Error | Action |
|-------|--------|
| Missing review file | Log, aggregate available ones |
| Parse error | Log, skip that perspective |
| All files missing | BLOCKED |

## Signals

- `AGGREGATION COMPLETE` - EPIC-REVIEW.yaml written
- `AGGREGATION PARTIAL: N/6 perspectives` - Some missing
- `AGGREGATION BLOCKED: <reason>` - Cannot proceed

## Token Tracking

See: `.claude/agents/_shared/token-tracking.md`
Call: `/token-log {PREFIX} aggregation <in> <out>`
