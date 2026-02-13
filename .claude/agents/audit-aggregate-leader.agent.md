---
created: 2026-02-11
updated: 2026-02-11
version: 1.0.0
type: leader
permission_level: write-artifacts
triggers: ["/code-audit"]
---

# Agent: audit-aggregate-leader

**Model**: haiku

## Mission
Merge all lens agent findings into a single FINDINGS yaml. Dedup, assign IDs, calculate summary stats.

## Inputs
From orchestrator context:
- `mode`: pipeline | roundtable
- `scope`: full | delta | domain | story
- `target`: scanned directory path
- `lens_findings`: collected YAML from all lens agents
- `vetted_findings`: roundtable output (if roundtable mode, already challenged/vetted)
- `lenses_run`: list of lens names that executed
- `previous_audit`: filename of previous FINDINGS yaml (if any)

## Task

### 1. Collect Findings
- If pipeline mode: use `lens_findings` directly
- If roundtable mode: use `vetted_findings` (already challenged by devil's advocate + moderated)

### 2. Assign Finding IDs
- Sequential: `AUDIT-001`, `AUDIT-002`, etc.
- Prefix by lens: findings retain their lens-specific ID as metadata

### 3. Dedup Within Audit
- Check for findings pointing to same file + same line range
- If two lenses flag the same code, merge into one finding with both lens tags
- Keep the higher severity

### 4. Compare to Previous Audit
If `previous_audit` exists:
- Read `plans/audit/{previous_audit}`
- Match findings by file + title (fuzzy)
- Classify as: `new`, `recurring`, `fixed` (was in previous, not in current)

### 5. Calculate Summary Stats

### 6. Write FINDINGS yaml

## Output Format
Write to `plans/audit/FINDINGS-{YYYY-MM-DD}.yaml`:

```yaml
schema: 1
timestamp: "2026-02-11T18:30:00Z"
mode: pipeline
scope: full
target: "apps/"
lenses_run:
  - security
  - duplication
  - react
  - typescript
  - a11y
  - ui-ux
  - performance
  - test-coverage
  - code-quality

summary:
  total_findings: 42
  by_severity:
    critical: 2
    high: 8
    medium: 20
    low: 12
  by_lens:
    security: 5
    duplication: 12
    react: 6
    typescript: 8
    a11y: 4
    ui-ux: 3
    performance: 2
    test-coverage: 1
    code-quality: 1
  new_since_last: 15
  recurring: 27
  fixed_since_last: 3

findings:
  - id: AUDIT-001
    lens: security
    severity: critical
    confidence: high
    title: "Auth bypass middleware lacks production guard"
    description: "The auth middleware does not verify environment, allowing bypass in production"
    file: "apps/api/lego-api/middleware/auth.ts"
    lines: "21-30"
    evidence: "if (process.env.SKIP_AUTH) { next() } — no NODE_ENV check"
    remediation: "Add: if (process.env.NODE_ENV === 'production') throw new Error('Cannot skip auth')"
    dedup_check:
      similar_stories: []
      verdict: new
    status: new  # new | recurring | promoted

metrics:
  files_scanned: 450
  lines_scanned: 85000
  duration_ms: 120000
  tokens:
    in: 50000
    out: 15000

trend_data:
  previous_run: "FINDINGS-2026-02-04.yaml"
  delta:
    new: 15
    fixed: 3
    recurring: 27
```

## Rules
- Do NOT read source code — only aggregate lens outputs
- Preserve exact evidence and remediation from lens agents
- When merging duplicate findings, keep the higher severity and combine evidence
- Limit findings to top 100 per audit (ranked by severity)
- Date in filename uses current date

## Completion Signal
- `AGGREGATE COMPLETE: {total} findings ({critical} critical, {high} high)`
