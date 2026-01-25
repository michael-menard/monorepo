# PM Fix Story - Reference

## Architecture

```
/pm-fix-story STORY-XXX
    │
    └─→ Phase 0: pm-story-fix-leader (sonnet)
            ├─→ Load story + QA feedback
            ├─→ Analyze gaps (inline)
            ├─→ Apply fixes to story
            └─→ Update status → backlog
```

## Output Format

All agents follow `.claude/agents/_shared/lean-docs.md`:
- Tables over prose
- Skip empty sections
- Structured data

Primary artifact: Updated `STORY-XXX.md`

## Artifacts

| File | Created By | Purpose |
|------|------------|---------|
| `STORY-XXX.md` (updated) | Leader | Fixed story with revision history |
| `_pm/TEST-PLAN.md` (if needed) | Leader | Updated test plan |

## Signals

| Phase | Success | Blocked | Failed |
|-------|---------|---------|--------|
| 0 Fix | `PM COMPLETE` | `PM BLOCKED: <reason>` | `PM FAILED: <reason>` |

## Token Tracking

See: `.claude/agents/_shared/token-tracking.md`

Estimated tokens:
| Phase | Input | Output | Total |
|-------|-------|--------|-------|
| 0 Fix | ~8k | ~3k | ~11k |

## Preconditions

| Check | Requirement |
|-------|-------------|
| QA audit exists | `ELAB-STORY-XXX.md` with FAIL or CONDITIONAL PASS |
| Story status | `status: needs-refinement` in frontmatter |
| Story location | `plans/stories/elaboration/STORY-XXX/` |

## Gap Categories

| Category | Examples | Fix Pattern |
|----------|----------|-------------|
| Ambiguous AC | "unclear about error handling" | Rewrite with specifics |
| Missing AC | "no AC for edge case X" | Add new AC |
| Untestable AC | "cannot verify without Y" | Make locally verifiable |
| Scope Creep | "exceeds index scope" | Move to Non-goals |
| Missing Test Plan | "no error path tests" | Update TEST-PLAN.md |
| Constraint Gap | "migration not specified" | Add explicit constraints |

## Fix Patterns

### Ambiguous → Specific

Before:
```
- [ ] User can upload images
```

After:
```
- [ ] User can upload images (JPEG, PNG, WebP) up to 10MB
- [ ] Upload shows progress indicator
- [ ] Failed uploads show specific error message
```

### Untestable → Testable

Before:
```
- [ ] Performance is acceptable
```

After:
```
- [ ] Gallery loads 20 thumbnails in <2s on 4G (Lighthouse > 80)
```

## Quality Gates

| Gate | Check |
|------|-------|
| All QA items addressed | Every feedback item resolved or deferred |
| ACs specific | No vague language ("good", "fast", "works") |
| ACs testable | Each verifiable by QA locally |
| Test plan updated | Covers all ACs including fixes |
| Constraints explicit | No hidden dependencies |
| Scope matches index | No creep beyond original scope |

## Status Transition

`needs-refinement` → `backlog`

## Retry Policy

| Error | Retries | Action |
|-------|---------|--------|
| Story not found | 0 | BLOCKED - check location |
| QA audit not found | 0 | BLOCKED - run /elab-story first |
| Cannot resolve gap | 0 | BLOCKED - needs user input |

## Troubleshooting

| Issue | Check |
|-------|-------|
| Story not found | Verify `elaboration/STORY-XXX/` exists |
| No QA feedback | Check for `ELAB-STORY-XXX.md` or `## QA Feedback` section |
| Status not updating | Verify frontmatter YAML syntax |
| Re-audit fails again | Review if all Critical/High items truly addressed |
