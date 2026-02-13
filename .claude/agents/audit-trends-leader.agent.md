---
created: 2026-02-11
updated: 2026-02-11
version: 1.0.0
type: leader
permission_level: write-artifacts
triggers: ["/code-audit trends"]
---

# Agent: audit-trends-leader

**Model**: haiku

## Mission
Analyze trends across multiple audit runs. Compute violations over time, identify worst offenders, and track improvement or regression.

## Inputs
From orchestrator context:
- `lens_filter`: specific lens to analyze (optional)
- `file_filter`: specific file to analyze (optional)
- `days`: time window in days (default: 30)

## Task

### 1. Load All Findings Files
Read all `plans/audit/FINDINGS-*.yaml` files.
Filter to files within the `--days` window.

### 2. Compute Trend Metrics

**Overall Trends:**
- Total findings per audit run (line over time)
- Findings by severity per run
- Findings by lens per run
- New vs recurring vs fixed per run

**Worst Offender Files:**
- Files that appear most frequently across audits
- Files with highest total severity score
- Files that are getting worse (increasing findings)

**Lens Trends:**
- Which lenses are improving over time?
- Which lenses are regressing?
- Which lenses have the most persistent issues?

**Fix Rate:**
- Percentage of findings fixed between audits
- Average time to fix by severity
- Which lenses get fixed fastest?

### 3. Generate Trend Summary

## Output Format
Write to `plans/audit/TRENDS.yaml` (overwrite existing):

```yaml
schema: 1
generated: "2026-02-11T18:30:00Z"
window_days: 30
audits_analyzed: 4

overall:
  trend: improving | stable | regressing
  total_findings_current: 42
  total_findings_previous: 50
  delta: -8
  fix_rate: 0.16

by_severity:
  critical:
    current: 2
    previous: 3
    trend: improving
  high:
    current: 8
    previous: 10
    trend: improving
  medium:
    current: 20
    previous: 22
    trend: stable
  low:
    current: 12
    previous: 15
    trend: improving

by_lens:
  security:
    current: 5
    previous: 7
    trend: improving
  duplication:
    current: 12
    previous: 12
    trend: stable
  # ... etc

worst_offenders:
  - file: "apps/web/main-app/src/App.tsx"
    total_findings: 8
    appearances: 4
    trend: stable
  - file: "apps/api/lego-api/src/handlers/sets.ts"
    total_findings: 6
    appearances: 3
    trend: regressing

timeline:
  - date: "2026-02-11"
    total: 42
    critical: 2
    high: 8
    medium: 20
    low: 12
  - date: "2026-02-04"
    total: 50
    critical: 3
    high: 10
    medium: 22
    low: 15

tokens:
  in: 3000
  out: 800
```

Also present a formatted summary to the user:

```
## Audit Trends (last 30 days)

Trend: IMPROVING (-8 findings, fix rate 16%)

| Metric | Current | Previous | Delta |
|--------|---------|----------|-------|
| Total | 42 | 50 | -8 |
| Critical | 2 | 3 | -1 |
| High | 8 | 10 | -2 |

Top 3 Worst Offenders:
1. apps/web/main-app/src/App.tsx (8 findings, stable)
2. apps/api/lego-api/src/handlers/sets.ts (6 findings, regressing)
3. ...
```

## Rules
- Read all FINDINGS yaml files in the time window
- If only 1 audit exists, report current state without trend comparison
- If no audits exist, report error
- Trend classification: improving (>10% reduction), stable (<10% change), regressing (>10% increase)
- Worst offenders = files appearing in 2+ audits with high cumulative severity

## Completion Signal
- `TRENDS COMPLETE: {audits_analyzed} audits, trend: {overall_trend}`
