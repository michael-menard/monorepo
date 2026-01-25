# UI/UX Review - Reference

## Architecture

```
/ui-ux-review STORY-XXX
    │
    ├─→ Phase 0: ui-ux-review-setup-leader (haiku)
    │       ├─→ Validate story exists
    │       ├─→ Check if touches UI
    │       ├─→ SKIPPED fast-path if no UI
    │       └─→ Write AGENT-CONTEXT.md
    │
    ├─→ Phase 1: ui-ux-review-reviewer (sonnet)
    │       ├─→ Design system compliance
    │       ├─→ Accessibility (Playwright MCP + axe)
    │       ├─→ Performance (Chrome DevTools + Lighthouse)
    │       ├─→ Visual sanity (screenshots)
    │       └─→ Write UI-UX-FINDINGS.yaml
    │
    └─→ Phase 2: ui-ux-review-report-leader (haiku)
            └─→ Compile UI-UX-REVIEW-STORY-XXX.md
```

## Output Format

All agents follow `.claude/agents/_shared/lean-docs.md`:
- YAML for structured findings
- Skip empty sections
- Evidence as file:line references
- One-line verdicts

## Artifacts

| File | Created By | Purpose |
|------|------------|---------|
| `_implementation/AGENT-CONTEXT.md` | Setup Leader | Story context for all phases |
| `_implementation/UI-UX-FINDINGS.yaml` | Reviewer | Raw check results |
| `_implementation/screenshots/` | Reviewer | Visual evidence |
| `UI-UX-REVIEW-STORY-XXX.md` | Report Leader | Final human-readable report |

## Required Tooling

| Tool | Used For | Fallback |
|------|----------|----------|
| Playwright MCP | Navigation, screenshots, axe | Code-only checks |
| Chrome DevTools MCP | Lighthouse, web vitals | Skip metrics |

## Signals

See: `.claude/agents/_shared/completion-signals.md`

| Phase | Success | Blocked | Failed |
|-------|---------|---------|--------|
| Setup | `SETUP COMPLETE` | — | `SETUP FAILED: <reason>` |
| Setup (skip) | `SETUP COMPLETE: SKIPPED` | — | — |
| Review | `REVIEW COMPLETE` | `REVIEW BLOCKED: <reason>` | — |
| Report | `REPORT COMPLETE` | — | `REPORT FAILED: <reason>` |

## Token Tracking

See: `.claude/agents/_shared/token-tracking.md`

## Retry Policy

| Phase | Error | Retries | Action |
|-------|-------|---------|--------|
| Setup | File not found | 0 | Fail with clear message |
| Review | MCP unavailable | 0 | Continue with code-only checks |
| Review | App won't start | 1 | Retry after 30s, then BLOCKED |
| Report | Missing findings | 0 | Fail - must have Phase 1 output |

## Hard Gates (Zero Tolerance)

1. **Design System** - Any violation = FAIL
   - Arbitrary colors (`text-[#...]`)
   - Custom fonts
   - Inline styles
   - Direct shadcn imports

2. **Accessibility** - Critical/Serious = FAIL
   - Missing labels
   - Keyboard inaccessible
   - ARIA violations

## Troubleshooting

| Issue | Check |
|-------|-------|
| MCP tools not working | Verify Playwright and Chrome DevTools MCPs installed |
| App won't start | Check `pnpm dev` works, story has correct run instructions |
| SKIPPED when UI exists | Review UI indicators in setup phase |
| False positives on style | Check if style usage is explicitly permitted in story |
