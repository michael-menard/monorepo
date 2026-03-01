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

Merge 6 stakeholder review outputs into **MVP-focused** EPIC-REVIEW.yaml file.
Filter to MVP-critical items only. Track non-MVP suggestions in FUTURE-ROADMAP.yaml.

## Inputs

Read from KB:
- `kb_read_artifact(story_id="{PREFIX}-EPIC", artifact_type="context", artifact_name="AGENT-CONTEXT")` → feature_dir, prefix
- `kb_read_artifact(story_id="{PREFIX}-EPIC", artifact_type="review", artifact_name="REVIEW-ENGINEERING")`
- `kb_read_artifact(story_id="{PREFIX}-EPIC", artifact_type="review", artifact_name="REVIEW-PRODUCT")`
- `kb_read_artifact(story_id="{PREFIX}-EPIC", artifact_type="review", artifact_name="REVIEW-QA")`
- `kb_read_artifact(story_id="{PREFIX}-EPIC", artifact_type="review", artifact_name="REVIEW-UX")`
- `kb_read_artifact(story_id="{PREFIX}-EPIC", artifact_type="review", artifact_name="REVIEW-PLATFORM")`
- `kb_read_artifact(story_id="{PREFIX}-EPIC", artifact_type="review", artifact_name="REVIEW-SECURITY")`

## Output Format

Follow `.claude/agents/_shared/lean-docs.md`:
- Single YAML file
- Skip empty arrays
- One line per finding

## MVP-Critical Definition

An issue is **MVP-critical** ONLY if it **blocks the core user journey**:
- Prevents primary happy path from working
- Causes core data operations to fail
- Security vulnerability blocking launch
- Missing story required for core journey

Everything else goes to **FUTURE-ROADMAP.yaml**.

## Steps

1. **Read context** - `kb_read_artifact(story_id="{PREFIX}-EPIC", artifact_type="context", artifact_name="AGENT-CONTEXT")`
2. **Read all review artifacts** - Read 6 review artifacts from KB using `kb_read_artifact`
3. **Filter MVP-critical** - Separate items that block core journey from nice-to-haves
4. **Determine overall verdict** - Based on MVP-critical items only
5. **Merge MVP-critical findings** - Combine only journey-blocking issues
6. **Merge MVP-critical story suggestions** - Only stories needed for core journey
7. **Write EPIC-REVIEW to KB** - `kb_write_artifact(story_id="{PREFIX}-EPIC", artifact_type="review", artifact_name="EPIC-REVIEW", ...)`
8. **Write FUTURE-ROADMAP to KB** - `kb_write_artifact(story_id="{PREFIX}-EPIC", artifact_type="analysis", artifact_name="FUTURE-ROADMAP", ...)`
9. **Update checkpoint** - `kb_write_artifact(story_id="{PREFIX}-EPIC", artifact_type="checkpoint", ...)`

## Verdict Logic

```
if any perspective == BLOCKED:
  verdict = BLOCKED
elif any perspective == CONCERNS:
  verdict = CONCERNS
else:
  verdict = READY
```

## Output 1: EPIC-REVIEW (KB Artifact, MVP-Critical Only)

Write via `kb_write_artifact(story_id="{PREFIX}-EPIC", artifact_type="review", artifact_name="EPIC-REVIEW")`:

```yaml
schema: 3
feature_dir: "{FEATURE_DIR}"
prefix: "{PREFIX}"
reviewed: <timestamp>
focus: mvp-critical

verdict: READY | CONCERNS | BLOCKED
summary: "MVP readiness assessment - one line"

perspectives:
  engineering:
    verdict: <from file>
    mvp_critical_count: N
  product:
    verdict: <from file>
    mvp_critical_count: N
  qa:
    verdict: <from file>
    mvp_critical_count: N
  ux:
    verdict: <from file>
    mvp_critical_count: N
  platform:
    verdict: <from file>
    mvp_critical_count: N
  security:
    verdict: <from file>
    mvp_critical_count: N

mvp_blockers:
  - id: <ID>
    source: <perspective>
    issue: "blocks core journey because..."
    stories: [PREFIX-XXX]
    action: "required fix"

missing_mvp_stories:
  - title: "required for core journey"
    source: <perspective>
    reason: "blocks user journey step X"

stories_to_split: []  # skip if empty

metrics:
  mvp_blockers: N
  missing_mvp_stories: N
```

## Output 2: FUTURE-ROADMAP (KB Artifact, Non-MVP)

Write via `kb_write_artifact(story_id="{PREFIX}-EPIC", artifact_type="analysis", artifact_name="FUTURE-ROADMAP")`:

```yaml
schema: 1
feature_dir: "{FEATURE_DIR}"
prefix: "{PREFIX}"
reviewed: <timestamp>

summary: "Post-MVP opportunities tracked for future iterations"

enhancements:
  high_value:
    - id: <ID>
      source: <perspective>
      suggestion: "one line"
      impact: high | medium
      effort: low | medium | high

  nice_to_have:
    - id: <ID>
      source: <perspective>
      suggestion: "one line"

suggested_stories:
  - title: "future enhancement"
    source: <perspective>
    priority: P1 | P2
    reason: "improves X but not required for MVP"

stories_to_defer:
  - story: PREFIX-XXX
    reason: "not needed for core journey"

metrics:
  total_suggestions: N
  deferred_stories: N
```

## Retry Policy

| Error | Action |
|-------|--------|
| Missing review file | Log, aggregate available ones |
| Parse error | Log, skip that perspective |
| All files missing | BLOCKED |

## Signals

- `AGGREGATION COMPLETE` - EPIC-REVIEW and FUTURE-ROADMAP written to KB
- `AGGREGATION PARTIAL: N/6 perspectives` - Some missing
- `AGGREGATION BLOCKED: <reason>` - Cannot proceed

## Token Tracking

See: `.claude/agents/_shared/token-tracking.md`
Call: `/token-log {PREFIX} aggregation <in> <out>`
