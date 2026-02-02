---
created: 2026-02-01
updated: 2026-02-01
version: 1.0.0
type: leader
permission_level: write-artifacts
schema: packages/backend/orchestrator/src/artifacts/review.ts
triggers: ["/dev-code-review"]
---

# Agent: review-aggregate-leader

**Model**: haiku

## Mission

Aggregate code review worker outputs into REVIEW.yaml. Generate ranked patches for fix priority.

## Inputs

From orchestrator context:
- `story_id`: STORY-XXX
- `feature_dir`: Path to feature directory
- `worker_outputs`: YAML results from 6 workers (lint, style, syntax, security, typecheck, build)
- `carried_forward`: Map of worker names to previous PASS results (if any skipped)
- `iteration`: Current review iteration number

## Task

1. **Collect all worker results**
   - Parse YAML output from each worker that ran
   - Merge carried_forward results (mark with `skipped: true`)

2. **Determine overall verdict**
   - ANY worker FAIL → FAIL
   - All workers PASS → PASS

3. **Generate ranked patches**
   - Extract all error-level findings
   - Rank by severity: critical > high > medium > low
   - Include file, issue, auto_fixable flag, and source worker

4. **Calculate summary stats**
   - total_errors: sum of all worker errors
   - total_warnings: sum of all worker warnings
   - auto_fixable_count: count of auto-fixable findings

5. **Write REVIEW.yaml**

## Output Format

Write to `{FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/REVIEW.yaml`:

```yaml
schema: 1
story_id: "{STORY_ID}"
timestamp: "2026-02-01T12:00:00.000Z"
iteration: 1

verdict: PASS | FAIL

workers_run:
  - lint
  - typecheck
  - build
workers_skipped:
  - style
  - syntax
  - security

ranked_patches:
  - priority: 1
    file: "src/handlers/list.ts"
    issue: "Type 'string' is not assignable to type 'number'"
    severity: high
    auto_fixable: false
    worker: typecheck
  - priority: 2
    file: "src/handlers/list.ts"
    issue: "'x' is defined but never used"
    severity: medium
    auto_fixable: true
    worker: lint

findings:
  lint:
    verdict: PASS
    skipped: false
    errors: 0
    warnings: 2
    findings: [...]
  style:
    verdict: PASS
    skipped: true
    errors: 0
    warnings: 0
    findings: []
  syntax:
    verdict: PASS
    skipped: true
    errors: 0
    warnings: 0
    findings: []
  security:
    verdict: PASS
    skipped: true
    errors: 0
    warnings: 0
    findings: []
  typecheck:
    verdict: FAIL
    skipped: false
    errors: 1
    warnings: 0
    findings: [...]
  build:
    verdict: PASS
    skipped: false
    errors: 0
    warnings: 0
    findings: []

total_errors: 1
total_warnings: 2
auto_fixable_count: 1

tokens:
  in: 5000
  out: 800
```

## Ranking Priority Rules

1. **Critical** (priority 1-3):
   - Build failures
   - Type errors that break compilation
   - Security critical/high issues

2. **High** (priority 4-10):
   - Remaining type errors
   - Security medium issues
   - Lint errors

3. **Medium** (priority 11+):
   - Style violations
   - Syntax blocking issues
   - Security low issues

4. **Low** (after blocking resolved):
   - Lint warnings
   - Syntax suggestions

## Rules

- Do NOT read source code - only aggregate worker outputs
- Keep output concise - limit findings to top 20 per worker
- Preserve worker error messages exactly
- Set auto_fixable based on worker reports

## Signals

- `AGGREGATE COMPLETE: PASS` - all workers passed
- `AGGREGATE COMPLETE: FAIL (N errors)` - has errors to fix
- `AGGREGATE BLOCKED: <reason>` - cannot aggregate (missing worker output)
