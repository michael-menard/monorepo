# PM Refine Story - Reference

## Architecture

```
/pm-refine-story [FEAT-ID | all | top <N>]
    │
    ├─→ Phase 0: Setup (orchestrator, haiku)
    │       ├─→ Parse arguments
    │       ├─→ Bootstrap FEATURES.md if missing
    │       └─→ Load and filter features
    │
    └─→ Phase 1: Triage (pm-triage-leader, sonnet)
            ├─→ Interactive conversation
            ├─→ Update priorities
            ├─→ Save session log
            └─→ Optional: chain to /pm-story generate
```

## Output Format

All agents follow `.claude/agents/_shared/lean-docs.md`:
- Tables over prose
- Skip empty sections
- Structured data

Primary artifact: Updated `plans/future/FEATURES.md`

## Artifacts

| File | Created By | Purpose |
|------|------------|---------|
| `FEATURES.md` | Leader | Updated feature backlog |
| `triage-sessions/<date>.yaml` | Leader | Session log (optional) |

## Signals

| Phase | Success | Blocked | Failed |
|-------|---------|---------|--------|
| 0 Setup | `SETUP COMPLETE` | `SETUP BLOCKED: <reason>` | — |
| 1 Triage | `TRIAGE COMPLETE` | `TRIAGE CANCELLED` | `TRIAGE FAILED: <reason>` |

## Token Tracking

See: `.claude/agents/_shared/token-tracking.md`

Estimated tokens (interactive, varies with features reviewed):
| Phase | Input | Output | Total |
|-------|-------|--------|-------|
| 0 Setup | ~2k | ~1k | ~3k |
| 1 Triage (per feature) | ~3k | ~2k | ~5k |

## Arguments

| Argument | Mode | Description |
|----------|------|-------------|
| `FEAT-XXX` | single | Triage specific feature |
| `all` | batch | Review all pending features |
| `top <N>` | batch | Review top N pending features |
| (none) | batch | Default: top 5 |

## Quick Commands

During triage, the user can say:

| Command | Action |
|---------|--------|
| `skip` | Move to next feature without changes |
| `stop` | End session, save progress |
| `promote` | Mark current feature ready for story |
| `archive` | Mark as not doing |
| `back` | Return to previous feature |
| `reorder` | Manually set priority order |

## Conversation Phases

| Phase | Purpose | Questions |
|-------|---------|-----------|
| Understanding | Learn about feature | "What problem does this solve?" |
| Challenge | Stress-test assumptions | "What if users don't need this?" |
| Scope | Define boundaries | "What's the MVP version?" |
| Prioritize | Set priority | "Based on discussion, what priority?" |

## Priority Assessment Framework

| Factor | Questions |
|--------|-----------|
| User Impact | How many users? Value per user? |
| Strategic Fit | Aligns with direction? Enables future? |
| Effort | Days, weeks, or months? |
| Dependencies | Blocks or blocked by other work? |
| Risk | Technical unknowns? Market uncertainty? |
| Urgency | Time-sensitive? Competitive pressure? |

## Feature Entry Format

After triage, features are updated:

```markdown
### FEAT-XXX: Feature title
- **Status:** pending | promoted | archived
- **Priority:** high | medium | low
- **Added:** YYYY-MM-DD
- **Category:** <category>
- **Triaged:** YYYY-MM-DD

MVP: <minimal valuable version>

Non-goals for v1:
- <excluded scope>

Notes from triage:
- <key insights>
```

## Quick Wins

| Feature | Description |
|---------|-------------|
| Bootstrap | Creates `FEATURES.md` if missing |
| Session Log | Saves triage session to YAML |
| Chain to Story | Offers to generate story after promote |

## Status Transition

Features: `pending` → `promoted` | `archived`
Promoted features become candidates for `/pm-story generate`

## Retry Policy

| Error | Retries | Action |
|-------|---------|--------|
| FEATURES.md not found | 1 | Bootstrap empty file |
| Feature ID not found | 0 | BLOCKED - show available IDs |
| Parse error | 0 | BLOCKED - show malformed section |

## Troubleshooting

| Issue | Check |
|-------|-------|
| No features loaded | Verify `plans/future/FEATURES.md` exists |
| Feature not found | Check ID format (FEAT-XXX) |
| Changes not saved | Look for write errors in session |
| Session log missing | Check `plans/future/triage-sessions/` exists |
