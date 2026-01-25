---
created: 2026-01-24
updated: 2026-01-24
version: 2.0.0
---

# /dev-code-review - Reference

## Architecture

```
/dev-code-review STORY-XXX
    │
    ├─→ Phase 0: Setup (haiku)
    │       └─→ Validate status, extract touched files
    │
    ├─→ Phase 1: Reviews (sonnet, PARALLEL)
    │       ├─→ code-review-lint.agent.md ────────┐
    │       ├─→ code-review-style-compliance.agent.md ─┼─→ YAML findings
    │       ├─→ code-review-syntax.agent.md ──────┤
    │       └─→ code-review-security.agent.md ────┘
    │
    ├─→ Phase 2: Aggregate (haiku)
    │       └─→ Merge findings → VERIFICATION.yaml
    │
    └─→ Phase 3: Finalize (haiku)
            └─→ Update status, call /token-log
```

## Output Format

All agents follow `.claude/agents/_shared/lean-docs.md`:
- YAML over markdown
- Skip empty sections
- Structured findings

Primary artifact: `VERIFICATION.yaml` (code_review section)

## Artifacts

| File | Created By | Purpose |
|------|------------|---------|
| `VERIFICATION.yaml` | Orchestrator | Unified review results |

**Note**: Workers return YAML directly to orchestrator. No intermediate files.

## VERIFICATION.yaml Structure

```yaml
schema: 1
story: STORY-XXX
updated: 2026-01-24T10:30:00Z

code_review:
  verdict: PASS | FAIL
  lint:
    verdict: PASS | FAIL
    errors: 0
    warnings: 2
    findings: []
  style:
    verdict: PASS | FAIL
    violations: 0
    findings: []
  syntax:
    verdict: PASS | FAIL
    blocking: 0
    suggestions: 1
    findings: []
  security:
    verdict: PASS | FAIL
    critical: 0
    high: 0
    medium: 1
    findings: []

# qa_verify section added by /qa-verify-story
# gate section added by /qa-gate
```

## Workers

| Worker | Focus | Blocking Conditions |
|--------|-------|---------------------|
| `code-review-lint.agent.md` | ESLint errors | Any error (warnings OK) |
| `code-review-style-compliance.agent.md` | Tailwind compliance | Any custom CSS |
| `code-review-syntax.agent.md` | ES7+ patterns | var, unhandled promises |
| `code-review-security.agent.md` | OWASP top 10 | Critical or High issues |

## Signals

See: `.claude/agents/_shared/completion-signals.md`

| Signal | Meaning |
|--------|---------|
| `CODE-REVIEW COMPLETE: PASS` | All checks passed |
| `CODE-REVIEW COMPLETE: FAIL` | One or more checks failed |
| `CODE-REVIEW BLOCKED: <reason>` | Cannot proceed |

## Token Tracking

See: `.claude/agents/_shared/token-tracking.md`

Workers report `tokens.in` and `tokens.out` in their YAML response.
Orchestrator aggregates and calls `/token-log STORY-XXX code-review <total-in> <total-out>`.

## Retry Policy

| Phase | Error | Retries |
|-------|-------|---------|
| Setup | Missing files | 0 - fail fast |
| Review workers | Timeout | 1 |
| Review workers | Parse error | 1 |
| Aggregate | N/A | 0 |

## Status Transitions

| Review Verdict | Story Status | Next Command |
|----------------|--------------|--------------|
| PASS | `ready-for-qa` | `/qa-verify-story STORY-XXX` |
| FAIL | `code-review-failed` | `/dev-fix-story STORY-XXX` |

## Verdict Logic

| Condition | Verdict |
|-----------|---------|
| ANY worker FAIL | FAIL |
| All PASS | PASS |

## Hard Rules

1. **Style Compliance is MANDATORY**
   - ALL styling MUST come from Tailwind CSS or `@repo/app-component-library`
   - NO custom CSS, inline styles, or arbitrary Tailwind values
   - ZERO TOLERANCE - any violation = FAIL

2. **Lint on Touched Files Only**
   - Do NOT lint the entire codebase
   - Only lint files created/modified by the story

3. **ES7+ Syntax Required**
   - Modern JavaScript/TypeScript patterns required
   - Do NOT fail on stylistic differences (Prettier handles that)

## Troubleshooting

| Issue | Check |
|-------|-------|
| Workers timeout | Reduce file count, check file sizes |
| YAML parse error | Validate worker output format |
| Missing PROOF file | Run `/dev-implement-story` first |
| Wrong status | Story must be `ready-for-code-review` |

## Token Estimation

```
tokens ≈ bytes / 4
```

Typical code review: 15,000-30,000 input tokens, 2,000-5,000 output tokens.
