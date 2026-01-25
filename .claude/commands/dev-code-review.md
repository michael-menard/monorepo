Usage: /dev-code-review STORY-XXX

Code Review ORCHESTRATOR. Spawn sub-agents - do NOT review yourself.

## Output
Single file: `VERIFICATION.yaml` (code_review section)

## Phase Leaders
| Phase | Agent | Focus | Signal |
|-------|-------|-------|--------|
| 1A | `code-review-lint.agent.md` | Lint/format | LINT PASS/FAIL |
| 1B | `code-review-style-compliance.agent.md` | Style guide | STYLE PASS/FAIL |
| 1C | `code-review-syntax.agent.md` | Types/syntax | SYNTAX PASS/FAIL |
| 1D | `code-review-security.agent.md` | Security | SECURITY PASS/FAIL |

## Phase 0 — Setup
Validate (HARD STOP if fail):
- `STORY-XXX.md` has `status: ready-for-code-review`
- `PROOF-STORY-XXX.md` exists

Read `BACKEND-LOG.md`, `FRONTEND-LOG.md`, `PROOF-STORY-XXX.md` → touched files list.

## Phase 1 — Parallel Reviews
Spawn ALL 4 agents in SINGLE message with context:
```
STORY: STORY-XXX | DIR: plans/stories/in-progress/STORY-XXX/ | FILES: <list>
Return YAML findings only - no prose.
```

## Phase 2 — Write VERIFICATION.yaml
Create/update `plans/stories/in-progress/STORY-XXX/VERIFICATION.yaml`:

```yaml
schema: 1
story: STORY-XXX
updated: <timestamp>

code_review:
  verdict: PASS | FAIL
  lint: PASS | FAIL
  types: PASS | FAIL
  style: PASS | FAIL
  security: PASS | FAIL
  findings:  # Only if issues exist
    - id: <PREFIX>-001
      severity: high | medium | low
      issue: "one line"
      file: path/to/file.ts
      line: 42
      action: "one line fix"

# qa_verify section added by /qa-verify-story
# gate section added by /qa-gate
```

Verdict: ANY FAIL → FAIL | All PASS → PASS

## Phase 3 — Status Update
| Verdict | Status | Next |
|---------|--------|------|
| PASS | `ready-for-qa` | `/qa-verify-story STORY-XXX` |
| FAIL | `code-review-failed` | `/dev-fix-story STORY-XXX` |

## Phase 4 — Token Log
`/token-log STORY-XXX code-review <input> <output>`

## Done
VERIFICATION.yaml updated, status set, next step stated.

## Standards
See `.claude/agents/_shared/lean-docs.md` for output format rules.
