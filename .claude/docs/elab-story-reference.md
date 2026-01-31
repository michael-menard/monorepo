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
    ├─→ Phase 2: Completion Leader (haiku)
    │       └─→ ELAB-STORY-XXX.md, status update, directory move
    │
    ├─→ Phase 3: Follow-up Creation (sonnet workers, parallel)
    │       └─→ Ask user, spawn worker per follow-up
    │       └─→ Each worker: create story + ADD to stories.index.md
    │
    └─→ Phase 4: Split Handling (if SPLIT REQUIRED)
            ├─→ 4a: /pm-story split
            │       └─→ DELETE original from index, ADD splits
            │       └─→ DELETE original story directory
            ├─→ 4b: Handle downstream dependency updates
            └─→ 4c: Offer to elaborate splits (parallel workers)
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
| 3 Follow-ups | `PM COMPLETE` (per worker) | `PM FAILED: <reason>` |
| 4 Split | `PM COMPLETE` (split created) | `PM FAILED: <reason>` |
| 4b Split Elab | `ELABORATION COMPLETE: <verdict>` (per worker) | Worker reports failure |

## Token Tracking

See: `.claude/agents/_shared/token-tracking.md`

Estimated tokens per phase:
| Phase | Input | Output | Total |
|-------|-------|--------|-------|
| 0 Setup | ~500 | ~200 | ~700 |
| 1 Analysis | ~15k | ~3k | ~18k |
| 2 Completion | ~5k | ~2k | ~7k |
| 3 Follow-ups | ~3k/ea | ~2k/ea | ~5k/ea |
| 4 Split | ~2k | ~1k | ~3k |
| 4b Split Elab | ~25k/ea | ~5k/ea | ~30k/ea |
| **Total** | ~20k+ | ~5k+ | **~25k+** |

Notes:
- Phase 3 tokens scale with number of follow-up stories created
- Phase 4b runs full elaboration per split (recursive ~25k each)

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

## Index Updates (stories.index.md)

Each phase updates the stories index as needed:

| Phase | Index Update |
|-------|--------------|
| Phase 3 (Follow-ups) | ADD new follow-up entries, SET `Depends On: {parent}` |
| Phase 4a (Split) | DELETE original entry, ADD split entries, UPDATE Progress Summary |
| Phase 4 (Dependencies) | UPDATE downstream `Depends On` to reference splits |
| Phase 4b (Split Elab) | UPDATE split story status on completion |

### Split Index Behavior

When a story is split:
1. **Original story entry is DELETED** from index (not marked superseded)
2. **Original story directory is DELETED** (not preserved)
3. **New entries are ADDED** for each split ({PREFIX}-XX01, {PREFIX}-XX02, etc.)
4. **Downstream dependencies are flagged** for user review/update

### Follow-up Index Behavior

When follow-ups are created:
1. **New entries are ADDED** with `status: pending`
2. **Depends On** is set to the parent story
3. **Progress Summary** count is incremented

## Troubleshooting

| Issue | Check |
|-------|-------|
| Story not found | Check `backlog/` or `elaboration/` directories |
| Analysis incomplete | Re-run Phase 1, check agent file syntax |
| Wrong verdict | Review ANALYSIS.md findings, check severity counts |
| Status not updated | Verify STORY-XXX.md frontmatter write succeeded |
| Directory not moved | Check filesystem permissions |
