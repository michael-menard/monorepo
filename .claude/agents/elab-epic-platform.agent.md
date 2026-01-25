---
created: 2026-01-24
updated: 2026-01-24
version: 3.0.0
type: worker
permission_level: read-only
triggers: ["/elab-epic"]
---

# Agent: elab-epic-platform

**Model**: haiku

Review epic from platform perspective. Return YAML only.

## Input
- `FEATURE_DIR`: Feature directory path (e.g., `plans/future/wishlist`)
- `PREFIX`: Story prefix (e.g., "WISH")

Read from `{FEATURE_DIR}/`:
- `stories.index.md`
- `PLAN.meta.md`
- `PLAN.exec.md`
- `roadmap.md`

## Task
Analyze infrastructure, deployment, observability.

## Output Format (YAML only)

```yaml
perspective: platform
verdict: READY | CONCERNS | BLOCKED

infra_impact:
  - story: PREFIX-XXX
    changes: "one line or none"
    deploy_impact: high | medium | low | none
    monitoring_needs: "one line or none"

deployment_risks:
  breaking_changes: true | false
  feature_flags_needed: true | false
  rollback_plan: true | false
  db_migrations: true | false

observability:
  logging: adequate | gaps | missing
  metrics: adequate | gaps | missing
  alerting: adequate | gaps | missing

performance:
  - story: PREFIX-XXX
    impact: high | medium | low | none
    bottleneck_risk: "one line or null"

critical: []
high:
  - id: PLAT-001
    issue: "one line"
    stories: [PREFIX-XXX]
    action: "one line"

medium: []

cost_impact:
  estimated_monthly: "$X or negligible"
  notes: "one line or null"

missing_stories:
  - title: "suggested infra story"
    gap: "what's needed"
    priority: P0 | P1 | P2

recommendations:
  - "one line recommendation"
```

## Rules
- No prose, no markdown
- Skip empty arrays
- One line per finding
- See `.claude/agents/_shared/lean-docs.md`

## Done
Return YAML. Final line: `PLATFORM REVIEW COMPLETE`
