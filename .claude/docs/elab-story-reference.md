# Story Elaboration - Reference

## Architecture

```
/elab-story STORY-XXX
    │
    ├─→ Phase 0: Setup Leader (haiku)
    │       └─→ Move story to elaboration/
    │
    ├─→ Phase 1: Analyst (sonnet)
    │       └─→ ANALYSIS.md (audit + discovery)
    │
    ├─→ Interactive Discussion (orchestrator)
    │       └─→ Present findings, collect user decisions
    │
    └─→ Phase 2: Completion Leader (haiku)
            └─→ ELAB-STORY-XXX.md, status update, directory move
```

## Output Format

All agents follow `.claude/agents/_shared/lean-docs.md`:
- Tables over prose
- Skip empty sections
- Structured data

Primary artifacts: `ANALYSIS.md`, `ELAB-STORY-XXX.md`

## Artifacts

| File | Created By | Purpose |
|------|------------|---------|
| `_implementation/ANALYSIS.md` | Analyst | Audit results, discovery findings |
| `ELAB-STORY-XXX.md` | Completion Leader | Final elaboration report |
| `STORY-XXX.md` (updated) | Completion Leader | QA Discovery Notes appended |

## Signals

| Phase | Success | Blocked |
|-------|---------|---------|
| 0 Setup | `ELAB-SETUP COMPLETE` | `ELAB-SETUP BLOCKED: <reason>` |
| 1 Analysis | `ANALYSIS COMPLETE` | `ANALYSIS BLOCKED: <reason>` |
| 2 Completion | `ELABORATION COMPLETE: <verdict>` | `ELABORATION BLOCKED: <reason>` |

## Token Tracking

See: `.claude/agents/_shared/token-tracking.md`

Estimated tokens per phase:
| Phase | Input | Output | Total |
|-------|-------|--------|-------|
| 0 Setup | ~500 | ~200 | ~700 |
| 1 Analysis | ~15k | ~3k | ~18k |
| 2 Completion | ~5k | ~2k | ~7k |
| **Total** | ~20k | ~5k | **~25k** |

## Retry Policy

| Phase | Error | Retries |
|-------|-------|---------|
| 0 Setup | Story not found | 0 - BLOCKED |
| 1 Analysis | Parse error | 1 |
| 2 Completion | Write error | 1 |

## Audit Checklist

| # | Check | Description |
|---|-------|-------------|
| 1 | Scope Alignment | Story matches stories.index.md |
| 2 | Internal Consistency | Goals, AC, scope aligned |
| 3 | Reuse-First | Uses `packages/**` |
| 4 | Ports & Adapters | Core logic transport-agnostic |
| 5 | Local Testability | `.http` for backend, Playwright for frontend |
| 6 | Decision Completeness | No blocking TBDs |
| 7 | Risk Disclosure | Risks explicit |
| 8 | Story Sizing | Not too large |

## Story Sizing Indicators

| Indicator | Threshold |
|-----------|-----------|
| Acceptance Criteria | > 8 ACs |
| Endpoints | > 5 endpoints |
| Full-stack | Frontend AND backend |
| Bundled features | Multiple independent |
| Test scenarios | > 3 happy paths |
| Package touches | > 2 packages |

If 2+ indicators → `SPLIT REQUIRED`

## Interactive Discussion Format

For each finding, present:
```
[N/M] <Finding title>
Impact: <High/Medium/Low>
Effort: <High/Medium/Low>
Recommendation: <what to do>

Options:
1. Add as new AC
2. Create follow-up story
3. Mark out-of-scope (with justification)
4. Skip / Not relevant
```

## Verdicts

| Verdict | Status Change | Next Action |
|---------|---------------|-------------|
| `PASS` | `ready-to-work` | `/dev-implement-story` |
| `CONDITIONAL PASS` | `ready-to-work` | `/dev-implement-story` (with notes) |
| `FAIL` | `needs-refinement` | `/pm-fix-story` |
| `SPLIT REQUIRED` | `needs-split` | PM creates split stories |

## Directory Locations

| Status | Location |
|--------|----------|
| Pending | `plans/stories/backlog/STORY-XXX/` |
| In Elaboration | `plans/stories/elaboration/STORY-XXX/` |
| Ready to Work | `plans/stories/ready-to-work/STORY-XXX/` |
| Needs Refinement | `plans/stories/elaboration/STORY-XXX/` (stays) |

## Troubleshooting

| Issue | Check |
|-------|-------|
| Story not found | Check `backlog/` or `elaboration/` directories |
| Analysis incomplete | Re-run Phase 1, check agent file syntax |
| Wrong verdict | Review ANALYSIS.md findings, check severity counts |
| Status not updated | Verify STORY-XXX.md frontmatter write succeeded |
| Directory not moved | Check filesystem permissions |
