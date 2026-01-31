# PM Story Command - Reference

## Architecture

```
/pm-story <action> [args]
    │
    ├── action: generate ─────────────────────────────────────┐
    │   ├── STORY-XXX | next ─→ pm-story-generation-leader   │
    │   │                       ├── pm-draft-test-plan       │
    │   │                       ├── pm-uiux-recommendations  │ parallel
    │   │                       └── pm-dev-feasibility       │
    │   │                                                    │
    │   └── --ad-hoc [ID] ────→ pm-story-adhoc-leader        │
    │                                                        │
    ├── action: bug [BUG-XXX] ─→ pm-story-bug-leader         │
    │                                                        │
    ├── action: followup ─────→ pm-story-followup-leader     │
    │   └── STORY-XXX [#]                                    │
    │                                                        │
    └── action: split ────────→ pm-story-split-leader        │
        └── STORY-XXX                                        │
```

## Output Format

All leaders follow `.claude/agents/_shared/lean-docs.md`:
- YAML summaries over prose
- Skip empty sections
- Structured data (tables/lists, not paragraphs)

## Actions

| Action | Usage | Leader Agent | Output |
|--------|-------|--------------|--------|
| `generate` | `/pm-story generate STORY-XXX \| next` | `pm-story-generation-leader.agent.md` | Story + PM artifacts |
| `generate --ad-hoc` | `/pm-story generate --ad-hoc [ID]` | `pm-story-adhoc-leader.agent.md` | Ad-hoc story |
| `bug` | `/pm-story bug [BUG-XXX]` | `pm-story-bug-leader.agent.md` | Bug story |
| `followup` | `/pm-story followup STORY-XXX [#]` | `pm-story-followup-leader.agent.md` | Follow-up story |
| `split` | `/pm-story split STORY-XXX` | `pm-story-split-leader.agent.md` | Split stories |

## Artifacts by Action

### Generate (from index)

| File | Location | Purpose |
|------|----------|---------|
| `STORY-XXX.md` | `plans/stories/backlog/STORY-XXX/` | Main story file |
| `TEST-PLAN.md` | `plans/stories/backlog/STORY-XXX/_pm/` | Test scenarios |
| `UIUX-NOTES.md` | `plans/stories/backlog/STORY-XXX/_pm/` | UI/UX guidance |
| `DEV-FEASIBILITY.md` | `plans/stories/backlog/STORY-XXX/_pm/` | Risk assessment |
| `BLOCKERS.md` | `plans/stories/backlog/STORY-XXX/_pm/` | Blocking issues |

### Generate --ad-hoc

| File | Location | Purpose |
|------|----------|---------|
| `{STORY_ID}.md` | `plans/stories/backlog/{STORY_ID}/` | Ad-hoc story |
| `BLOCKERS.md` | `plans/stories/backlog/{STORY_ID}/_pm/` | Blocking issues |

### Bug

| File | Location | Purpose |
|------|----------|---------|
| `{BUG_ID}.md` | `plans/stories/backlog/{BUG_ID}/` | Bug story |
| `BLOCKERS.md` | `plans/stories/backlog/{BUG_ID}/_pm/` | Blocking issues |

### Followup

| File | Location | Purpose |
|------|----------|---------|
| `STORY-NNN.md` | `plans/stories/backlog/STORY-NNN/` | Follow-up story |
| Index updates | `plans/stories/*.stories.index.md` | New entry |
| Source updates | Parent `STORY-XXX.md` | Checkbox marked |

### Split

| File | Location | Purpose |
|------|----------|---------|
| `{PREFIX}-XX1Z.md` | `plans/stories/backlog/{PREFIX}-XX1Z/` | First split (Y=1) |
| `{PREFIX}-XX2Z.md` | `plans/stories/backlog/{PREFIX}-XX2Z/` | Second split (Y=2) |
| Index updates | `plans/stories/*.stories.index.md` | Original superseded, splits added |

**Note:** Splits increment the Y digit (3rd position), keeping Z unchanged. Example: `WISH-0100` splits into `WISH-0110`, `WISH-0120`.

## Signals

See: `.claude/agents/_shared/completion-signals.md`

| Signal | Meaning |
|--------|---------|
| `PM COMPLETE` | Action succeeded |
| `PM BLOCKED: <reason>` | Needs user input |
| `PM FAILED: <reason>` | Action failed |

## Token Tracking

See: `.claude/agents/_shared/token-tracking.md`

Leaders call `/token-log` before completion:
```
/token-log STORY-XXX pm-generate <input> <output>
/token-log STORY-XXX pm-adhoc <input> <output>
/token-log BUG-XXX pm-bug <input> <output>
/token-log STORY-NNN pm-followup <input> <output>
/token-log STORY-XXX pm-split <input> <output>
```

## Retry Policy

| Phase | Error | Retries |
|-------|-------|---------|
| Setup | Missing index | 0 - fail |
| Worker spawn | Task failure | 1 |
| Worker blocked | Needs decision | 0 - escalate |
| Synthesis | Missing artifact | 0 - fail |

## Troubleshooting

| Issue | Check |
|-------|-------|
| "Not in index" | Verify story ID in `*.stories.index.md` |
| "Already generated" | Check story status isn't `generated` |
| "No follow-ups found" | Verify `## QA Discovery Notes` exists |
| "Missing SPLIT REQUIRED" | Verify ELAB verdict is SPLIT REQUIRED |
| "AC not allocated" | Ensure all ACs assigned to splits |
| "Story ID already exists" | Collision detected - directory or index entry exists |
| "No available split IDs" | Y range 1-9 exhausted for parent story |
| "No available follow-up IDs" | Z range 1-9 exhausted for parent story |

## Collision Detection

All story generation operations perform collision detection before creating IDs:

1. **Directory check**: Verifies `{OUTPUT_DIR}/{STORY_ID}/` doesn't already exist
2. **Index check**: Verifies `stories.index.md` doesn't already contain the ID

If collision detected:
- **Splits**: Increment Y until unique (Y=1→2→3...)
- **Follow-ups**: Increment Z until unique (Z=1→2→3...)
- **New stories**: Either skip to next eligible story or fail if explicit ID provided

## Shared Constraints (All Actions)

- Act STRICTLY as PM agent
- Do NOT implement code
- Do NOT generate QA or Dev outputs
- Reuse-first: prefer existing packages
- No per-story one-off utilities
- Ports & adapters clarity

## Status Transitions

| Action | From | To |
|--------|------|----|
| generate | `pending` (index) | `backlog` |
| generate --ad-hoc | — | `backlog` |
| bug | — | `backlog` |
| followup | — | `backlog` (new), parent unchanged |
| split | `needs-split` | `superseded` (parent), `backlog` (splits) |

## Next Steps by Action

| Action | Next Command |
|--------|--------------|
| generate | `/elab-story STORY-XXX` |
| generate --ad-hoc | `/elab-story {STORY_ID}` |
| bug | `/elab-story {BUG_ID}` |
| followup | `/elab-story {PREFIX}-XXY(Z+1)` (Z incremented) |
| split | `/elab-story {PREFIX}-XX1Z` (first split, Y=1) |
