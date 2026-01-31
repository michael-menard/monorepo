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

Review epic from platform perspective with **MVP focus**. Return YAML only.

## MVP-Critical Definition

An issue is **MVP-critical** ONLY if it **blocks the core user journey**:
- Infrastructure prevents core feature from running
- Deployment blocker for core functionality
- Missing database/storage for core data

Everything else is a **future improvement** (observability, optimization, scaling).

## Input
- `FEATURE_DIR`: Feature directory path (e.g., `plans/future/wishlist`)
- `PREFIX`: Story prefix (e.g., "WISH")

Read from `{FEATURE_DIR}/`:
- `stories.index.md`
- `PLAN.meta.md`
- `PLAN.exec.md`
- `roadmap.md`

## Task
Analyze platform needs for core journey - **MVP-critical items only in main findings**.

## Output Format (YAML only)

```yaml
perspective: platform
verdict: READY | CONCERNS | BLOCKED

infra:
  core_infra_exists: true | false
  deploy_path_clear: true | false

# MVP-CRITICAL ONLY - blocks core journey deployment
mvp_blockers:
  - id: PLAT-001
    issue: "core feature cannot deploy because..."
    stories: [PREFIX-XXX]
    action: "required fix"

missing_mvp_stories:
  - title: "required infra setup"
    gap: "core feature needs..."

# FUTURE (observability, optimization, tracked separately by aggregator)
future:
  platform_improvements:
    - suggestion: "one line"
      impact: high | medium | low

  observability_gaps:
    - area: "logging | metrics | alerting"
      suggestion: "one line"

  suggested_stories:
    - title: "platform enhancement"
      gap: "what's needed"
      priority: P1 | P2

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
