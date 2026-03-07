---
created: 2026-01-24
updated: 2026-03-07
version: 1.2.0
type: reference
command: /pm-bootstrap-workflow
---

# PM Bootstrap Workflow - Reference

## Architecture

```
/pm-bootstrap-workflow
    │
    ├─→ Phase 0: pm-bootstrap-setup-leader.agent.md (haiku)
    │       └─→ Validates inputs, collision check via kb_list_stories
    │
    ├─→ Phase 1: pm-bootstrap-analysis-leader.agent.md (sonnet)
    │       └─→ Analyzes plan, creates ANALYSIS.yaml
    │
    └─→ Phase 2: pm-bootstrap-generation-leader.agent.md (haiku)
            └─→ Generates all artifact files, inserts stories via kb_create_story
```

## Output Format

All agents follow `.claude/agents/_shared/lean-docs.md`:
- YAML over markdown prose
- Skip empty sections
- Structured data (tables/lists, not paragraphs)

## Artifacts

| File | Created By | Mode | Purpose |
|------|------------|------|---------|
| `{PREFIX}.bootstrap/AGENT-CONTEXT.md` | Setup | File Mode only | Bootstrap context |
| `{PREFIX}.bootstrap/CHECKPOINT.md` | All phases | File Mode only | Resume state |
| `{PREFIX}.bootstrap/ANALYSIS.yaml` | Analysis | File Mode only | Structured story data |
| `{PREFIX}.bootstrap/SUMMARY.yaml` | Generation | File Mode only | Final summary |
| `{feature_dir}/stories.index.md` | Generation | File Mode only | Master story index (filesystem) |
| `{feature_dir}/{PREFIX}-*/story.yaml` | Generation | Both modes | Per-story scaffold files |
| KB `stories` table rows | Generation | KB Mode only | Stories inserted via `kb_create_story` |

> **KB Mode**: Intermediate artifacts are returned inline (YAML blocks in prompt context). No `_bootstrap/` files are written. `stories.index.md` is still written to disk as a filesystem index, but the authoritative story records are in the KB `stories` table (inserted via `kb_create_story`).

## Signals

See: `.claude/agents/_shared/completion-signals.md`

| Phase | Signal |
|-------|--------|
| Setup | `SETUP COMPLETE` / `SETUP BLOCKED: <reason>` |
| Analysis | `ANALYSIS COMPLETE` / `ANALYSIS BLOCKED: <reason>` |
| Generation | `GENERATION COMPLETE` / `GENERATION BLOCKED: <reason>` |

## Token Tracking

See: `.claude/agents/_shared/token-tracking.md`

## Retry Policy

| Phase | Error | Retries |
|-------|-------|---------|
| Setup | Missing input | User prompt, no retry |
| Setup | Prefix collision | User prompt, no retry |
| Analysis | Unparseable plan | 0 - requires new input |
| Generation | Write failed | 1 - retry with permission fix |

## Troubleshooting

| Issue | Check |
|-------|-------|
| "Stories already exist" (KB Mode) | Run `kb_list_stories({ feature: "{project_name}" })` to see existing stories |
| "Prefix already exists" (File Mode) | Look for existing `{feature_dir}/stories.index.md` on disk |
| "Cannot extract stories" | Ensure raw plan has actionable items |
| "Circular dependency" | Review story dependencies in ANALYSIS.yaml |
| Phase stuck | Check CHECKPOINT.md for resume state (File Mode) |

---

## Templates

All canonical artifact templates (Stories Index, Meta Plan, Exec Plan, Roadmap, Lessons Learned,
Token Budget) are defined in:

`.claude/agents/_shared/bootstrap-templates.md`

---

## Prefix Examples

| Project | Prefix | Story IDs | Files Created |
|---------|--------|-----------|---------------|
| Vercel Migration | STORY | STORY-1010, STORY-1020 | `STORY.stories.index.md` |
| Workflow Harness | WRKF | WRKF-0000, WRKF-1010 | `WRKF.stories.index.md` |
| Auth Refactor | AUTH | AUTH-1010, AUTH-2010 | `AUTH.stories.index.md` |
| Gallery Feature | GLRY | GLRY-1010, GLRY-1020, GLRY-1021 | `GLRY.stories.index.md` |

## Story Sizing Guidelines

Stories should be completable in 1-3 dev sessions. Watch for these "too large" indicators:

| Indicator | Threshold | Action |
|-----------|-----------|--------|
| Acceptance Criteria | > 8 ACs | Split into smaller stories |
| Endpoints | > 5 endpoints | Group by domain/function |
| Full-stack scope | Significant FE + BE | Split backend/frontend |
| Bundled features | Multiple independent features | One feature per story |
| Test scenarios | > 3 distinct happy paths | Indicates multiple features |
| Package touches | > 2 packages | Consider splitting by package |

If 2+ indicators, flag for splitting during elaboration.
