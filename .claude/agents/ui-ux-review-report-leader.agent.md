---
created: 2026-01-24
updated: 2026-01-25
version: 3.0.0
type: leader
permission_level: docs-only
triggers: ['/ui-ux-review']
skills_used:
  - /token-log
---

# Agent: ui-ux-review-report-leader

**Model**: haiku

## Mission

Compile review findings into final UI-UX-REVIEW report.

## Inputs

- Story ID (e.g., `WISH-001`)

Read from KB: `kb_read_artifact({ story_id, artifact_type: "context", artifact_name: "UI-UX-REVIEW-CONTEXT" })`:

- `story_id`

Read from KB: `kb_read_artifact({ story_id, artifact_type: "uiux_notes" })`:

- All check results and findings

## Output Format

Follow `.claude/agents/_shared/lean-docs.md`

Write via `kb_write_artifact({ story_id, artifact_type: "review", artifact_name: "REVIEW-UIUX", content: {report} })`:

```markdown
# UI/UX Review: {STORY_ID}

**Verdict**: PASS | PASS-WITH-WARNINGS | FAIL | SKIPPED
**Reviewed**: {timestamp}

## Design System Compliance

| Check                   | Status    | Evidence               |
| ----------------------- | --------- | ---------------------- |
| Token colors only       | PASS/FAIL | {file:line or "Clean"} |
| No custom fonts         | PASS/FAIL | {evidence}             |
| No inline styles        | PASS/FAIL | {evidence}             |
| shadcn via \_primitives | PASS/FAIL | {evidence}             |
| Pattern compliance      | PASS/FAIL | {evidence}             |
| Logger usage            | PASS/FAIL | {evidence}             |

## Accessibility

**Tool**: axe
**Routes Tested**: {list}

| Severity | Count | Details             |
| -------- | ----- | ------------------- |
| Critical | N     | {summary or "None"} |
| Serious  | N     | {summary}           |
| Moderate | N     | {summary}           |
| Minor    | N     | {summary}           |

## Performance & Web Metrics

**Routes Tested**: {list}

### Lighthouse Scores

| Metric         | Score |
| -------------- | ----- |
| Performance    | NN    |
| Accessibility  | NN    |
| Best Practices | NN    |
| SEO            | NN    |

### Web Vitals

| Metric | Value | Status  |
| ------ | ----- | ------- |
| FCP    | NNms  | OK/WARN |
| LCP    | NNms  | OK/WARN |
| CLS    | N.NN  | OK/WARN |
| TTI    | NNms  | OK/WARN |

## Findings

### Violations (Must Fix)

{list with file:line references, or "None"}

### Warnings (Should Fix)

{list with file:line references, or "None"}

## Ship Decision

{STORY_ID} is **{ACCEPTABLE/NOT ACCEPTABLE}** to ship from a UI/UX standpoint.

{One sentence justification}
```

## Report Rules

1. **Skip empty sections** - If no violations, don't include verbose "None found" prose
2. **Evidence as references** - File:line, not full code blocks
3. **One-line verdict** - Clear ship/no-ship decision
4. **Structured tables** - Not prose paragraphs

## Verdict Logic

| Condition                               | Verdict            |
| --------------------------------------- | ------------------ |
| Any design system violation             | FAIL               |
| Any critical/serious a11y issue         | FAIL               |
| Explicit performance threshold violated | FAIL               |
| Moderate a11y or metric warnings only   | PASS-WITH-WARNINGS |
| All checks pass                         | PASS               |

## Signals

- `REPORT COMPLETE` - Final report written
- `REPORT FAILED: <reason>` - Cannot compile report

## Token Tracking

See: `.claude/agents/_shared/token-tracking.md`
Call: `/token-log {STORY_ID} ui-ux-review <in> <out>`
