---
created: 2026-02-11
updated: 2026-02-11
version: 1.0.0
type: leader
permission_level: test-run
triggers: ["/code-audit debt-map"]
---

# Agent: audit-debt-map-leader

**Model**: haiku

## Mission
Generate a lint/type debt map of the codebase. Score each file by violation count and severity. Identify worst offenders for cleanup-on-touch policy.

## Inputs
From orchestrator context:
- `granularity`: file | category | line (default: file)
- `top`: number of worst files to report (default: 20)

## Task

### 1. Run Linter Across Codebase
```bash
pnpm eslint apps/ packages/ --format json 2>/dev/null || true
```
Parse JSON output for error/warning counts per file.

### 2. Run TypeScript Check
```bash
pnpm check-types 2>&1 || true
```
Parse tsc output for error counts per file.

### 3. Score Each File

**Debt Score Formula:**
```
score = (critical_count * 10) + (error_count * 5) + (warning_count * 1)
```

Where:
- `critical_count` = type errors + build errors
- `error_count` = lint errors
- `warning_count` = lint warnings

### 4. Generate Debt Map

**File granularity (default):**
- Score per file, sorted by score descending
- Top N worst files

**Category granularity:**
- Group violations by ESLint rule and TS error code
- Count per category

**Line granularity:**
- Exact file:line for each violation
- Grouped by file

## Output Format
Write to `plans/audit/DEBT-MAP-{YYYY-MM-DD}.yaml`:

```yaml
schema: 1
generated: "2026-02-11T18:30:00Z"
granularity: file
total_files_scanned: 450
total_violations: 285
total_debt_score: 1420

summary:
  lint_errors: 120
  lint_warnings: 85
  type_errors: 80
  by_category:
    no-unused-vars: 45
    no-explicit-any: 30
    TS2322: 25
    prefer-const: 20

worst_offenders:
  - rank: 1
    file: "apps/web/main-app/src/App.tsx"
    debt_score: 85
    lint_errors: 8
    lint_warnings: 5
    type_errors: 6
    top_rules:
      - rule: "no-unused-vars"
        count: 3
      - rule: "TS2322"
        count: 4
  - rank: 2
    file: "apps/api/lego-api/src/handlers/sets.ts"
    debt_score: 62
    lint_errors: 5
    lint_warnings: 8
    type_errors: 3

clean_files:
  count: 320
  percentage: 71

tokens:
  in: 2000
  out: 600
```

Also present a formatted summary:

```
## Debt Map Summary

Total files: 450 | Clean: 320 (71%) | With debt: 130 (29%)
Total debt score: 1420

Top 20 Worst Offenders:
| # | File | Score | Lint Errors | Type Errors |
|---|------|-------|-------------|-------------|
| 1 | apps/web/main-app/src/App.tsx | 85 | 8 | 6 |
| 2 | apps/api/lego-api/src/handlers/sets.ts | 62 | 5 | 3 |
...
```

## Rules
- Run REAL commands and parse REAL output
- Include all `.ts`, `.tsx` files in `apps/` and `packages/`
- Exclude `node_modules/`, `dist/`, `.next/`, `coverage/`
- If linter or tsc fails to run, report the error and continue with available data
- Date in filename uses current date
- Debt map is used by code review to enforce cleanup-on-touch

## Completion Signal
- `DEBT-MAP COMPLETE: {total_files} files, {total_violations} violations, top offender: {worst_file}`
