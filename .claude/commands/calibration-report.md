---
created: 2026-02-07
updated: 2026-02-07
version: 1.0.0
type: utility
permission_level: read-only
---

/calibration-report [--since=YYYY-MM-DD] [--until=YYYY-MM-DD] [--agent=NAME]

Generate agent confidence calibration report showing accuracy metrics per agent per confidence level.

## Usage

```bash
# Generate report for last 7 days (default)
/calibration-report

# Specific date range
/calibration-report --since=2026-01-15 --until=2026-02-07

# Specific agent only
/calibration-report --agent=code-review-security

# Specific date range and agent
/calibration-report --since=2026-02-01 --agent=qa-verify-completion

# Custom alert threshold (default 0.90)
/calibration-report --since=2026-01-01 --alert-threshold=0.85
```

## Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `--since` | No | 7 days ago | Start date for analysis (YYYY-MM-DD format) |
| `--until` | No | Today | End date for analysis (YYYY-MM-DD format) |
| `--agent` | No | All agents | Filter to specific agent ID |
| `--alert-threshold` | No | 0.90 | Minimum accuracy for high confidence before alerting |

---

## Implementation

### Step 1: Parse Command Arguments

Extract and validate command arguments.

```typescript
// Pseudo-code for parsing
const args = parseCommandArgs(input)

// Extract args with defaults
const since = args.flags['since'] || getDateNDaysAgo(7) // YYYY-MM-DD
const until = args.flags['until'] || getTodayDate() // YYYY-MM-DD
const agent = args.flags['agent'] || null
const alertThreshold = parseFloat(args.flags['alert-threshold'] || '0.90')

// Validation
if (!isValidDate(since)) {
  error('--since must be in YYYY-MM-DD format')
}
if (!isValidDate(until)) {
  error('--until must be in YYYY-MM-DD format')
}
if (since > until) {
  error('--since date must be before or equal to --until date')
}
if (alertThreshold < 0 || alertThreshold > 1) {
  error('--alert-threshold must be between 0.0 and 1.0')
}

// Helper functions
function getDateNDaysAgo(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().split('T')[0] // YYYY-MM-DD
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0] // YYYY-MM-DD
}

function isValidDate(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/
  if (!regex.test(dateString)) return false
  const date = new Date(dateString)
  return date.toISOString().split('T')[0] === dateString
}
```

### Step 2: Spawn confidence-calibrator Agent

Use Task tool to spawn the calibration analysis agent.

```typescript
// Spawn agent with context
Task({
  subagent_type: "general-purpose",
  description: "Generate calibration report for agent confidence analysis",
  prompt: `
You are generating a confidence calibration report.

Read agent file: .claude/agents/confidence-calibrator.agent.md

CONTEXT:
  since: ${since}
  until: ${until}
  agent: ${agent || 'all'}
  alert_threshold: ${alertThreshold}
  output_file: _implementation/CALIBRATION-${until}.yaml

INSTRUCTIONS:
Follow the agent's execution flow:
1. Query KB for calibration entries in date range
2. Group by (agent_id, stated_confidence)
3. Compute accuracy metrics
4. Identify alerts (high confidence < ${alertThreshold})
5. Generate recommendations
6. Write CALIBRATION-${until}.yaml
7. Log systemic issues to KB if detected

Signal when complete: CALIBRATION ANALYSIS COMPLETE
`
})
```

### Step 3: Wait for Agent Completion

Wait for Task to complete and capture output.

```typescript
// Wait for agent to complete
const result = await waitForTaskCompletion()

if (result.status === 'error') {
  error(`Calibration analysis failed: ${result.error}`)
}

// Extract report location from agent output
const reportPath = extractReportPath(result.output)
// Expected: "_implementation/CALIBRATION-{until}.yaml"
```

### Step 4: Output Report Location

Inform user of report location and summary.

```typescript
// Read report to get summary stats
const report = parseYAML(reportPath)

console.log(`
✓ Calibration Report Generated

Report: ${reportPath}
Time Range: ${since} to ${until}
Agents Analyzed: ${report.summary.agents_covered.length}
Findings Analyzed: ${report.summary.total_findings_analyzed}
Alerts: ${report.alerts.length}
KB Entries: ${report.kb_entries.length}

${report.alerts.length > 0 ? `
⚠️  ALERTS
${report.alerts.map(a => 
  `- ${a.agent} (${a.confidence_level}): ${(a.accuracy * 100).toFixed(1)}% accuracy (threshold: ${(a.threshold * 100).toFixed(0)}%)`
).join('\n')}
` : ''}

View full report: ${reportPath}
`)
```

---

## Output Files

### Primary Output

**File:** `_implementation/CALIBRATION-{until-date}.yaml`

**Format:**
```yaml
schema: 1
report_type: calibration
generated_at: "2026-02-07T18:30:00Z"
time_range:
  since: "2026-01-31"
  until: "2026-02-07"

summary:
  total_findings_analyzed: 42
  agents_covered: ["code-review-security", "code-review-architecture", "qa-verify-completion"]
  date_range_days: 7
  completion_timestamp: "2026-02-07T18:30:00Z"

accuracy:
  code-review-security:
    high:
      accuracy: 0.85
      sample_size: 20
      breakdown:
        correct: 17
        false_positive: 2
        severity_wrong: 1
    medium:
      accuracy: 0.75
      sample_size: 12
      breakdown:
        correct: 9
        false_positive: 2
        severity_wrong: 1

alerts:
  - agent: "code-review-security"
    confidence_level: "high"
    accuracy: 0.85
    threshold: 0.90
    sample_size: 20
    message: "High confidence accuracy below threshold"

recommendations:
  - agent: "code-review-security"
    current_state:
      confidence_level: "high"
      accuracy: 0.85
      sample_size: 20
    recommendation: "Tighten high confidence threshold - consider requiring stronger evidence for high confidence assertions"
    rationale: "High confidence findings have 85% accuracy, below 90% target. False positive rate indicates threshold may be too lenient."
    priority: high

kb_entries:
  - id: "550e8400-e29b-41d4-a716-446655440000"
    pattern: "Agent code-review-security high confidence accuracy < 90%"
    tags: ["calibration", "agent:code-review-security", "confidence:high"]

notes:
  - "Report generated for 3 agents across 7 days"
  - "Minimum sample size for alerts: 10"
  - "Alert threshold for high confidence: 90%"
```

---

## Integration Points

### Data Source: WKFL-004 (Feedback)

This command analyzes calibration entries created by `/feedback` command.

**Data Flow:**
1. User runs `/feedback {finding_id} --helpful "reason"` or other feedback types
2. `/feedback` writes calibration entry to KB (entry_type: 'calibration')
3. `/calibration-report` queries these calibration entries and computes metrics

### Downstream: WKFL-003 (Emergent Heuristics)

Generated recommendations inform threshold adjustments in WKFL-003.

**Data Flow:**
1. `/calibration-report` identifies accuracy issues
2. Recommendations suggest threshold adjustments
3. WKFL-003 uses recommendations to adjust heuristics (manual approval required)

---

## Error Scenarios

### No Calibration Data

If no calibration entries exist for the time range:

```
✓ Calibration Report Generated (NO DATA)

No calibration entries found for time range 2026-01-31 to 2026-02-07.

To start collecting calibration data:
1. Run code reviews/QA verification to generate VERIFICATION.yaml
2. Use /feedback command to mark findings as helpful/false_positive/etc.
3. Calibration entries will be created automatically
4. Run /calibration-report again after collecting feedback

Report: _implementation/CALIBRATION-2026-02-07.yaml
```

### KB Unavailable

If Knowledge Base is unavailable:

```
✗ Calibration Analysis Failed

Error: Knowledge Base unavailable - cannot query calibration entries

The calibration report requires access to the Knowledge Base to:
- Query calibration entries created by /feedback command
- Log systemic patterns for future reference

Please ensure the Knowledge Base MCP server is running and try again.
```

### Invalid Date Range

If date range is invalid:

```
✗ Invalid Arguments

Error: --since date (2026-02-15) must be before or equal to --until date (2026-02-07)

Usage: /calibration-report [--since=YYYY-MM-DD] [--until=YYYY-MM-DD] [--agent=NAME]

Examples:
  /calibration-report --since=2026-01-01 --until=2026-02-07
  /calibration-report --agent=code-review-security
```

### Agent Not Found

If --agent filter matches no data:

```
✓ Calibration Report Generated (NO DATA)

No calibration entries found for agent "code-review-xyz" in time range 2026-01-31 to 2026-02-07.

Available agents with calibration data:
- code-review-security
- code-review-architecture
- qa-verify-completion

Report: _implementation/CALIBRATION-2026-02-07.yaml
```

---

## Examples

### Example 1: Default (Last 7 Days)

```bash
$ /calibration-report

✓ Calibration Report Generated

Report: _implementation/CALIBRATION-2026-02-07.yaml
Time Range: 2026-01-31 to 2026-02-07
Agents Analyzed: 3
Findings Analyzed: 42
Alerts: 1
KB Entries: 0

⚠️  ALERTS
- code-review-security (high): 85.0% accuracy (threshold: 90%)

View full report: _implementation/CALIBRATION-2026-02-07.yaml
```

### Example 2: Specific Date Range

```bash
$ /calibration-report --since=2026-01-01 --until=2026-02-07

✓ Calibration Report Generated

Report: _implementation/CALIBRATION-2026-02-07.yaml
Time Range: 2026-01-01 to 2026-02-07
Agents Analyzed: 5
Findings Analyzed: 127
Alerts: 2
KB Entries: 1

⚠️  ALERTS
- code-review-security (high): 85.0% accuracy (threshold: 90%)
- qa-verify-completion (high): 88.0% accuracy (threshold: 90%)

View full report: _implementation/CALIBRATION-2026-02-07.yaml
```

### Example 3: Specific Agent

```bash
$ /calibration-report --agent=code-review-security

✓ Calibration Report Generated

Report: _implementation/CALIBRATION-2026-02-07.yaml
Time Range: 2026-01-31 to 2026-02-07
Agents Analyzed: 1
Findings Analyzed: 20
Alerts: 1
KB Entries: 0

⚠️  ALERTS
- code-review-security (high): 85.0% accuracy (threshold: 90%)

View full report: _implementation/CALIBRATION-2026-02-07.yaml
```

### Example 4: No Data

```bash
$ /calibration-report --since=2025-12-01 --until=2025-12-31

✓ Calibration Report Generated (NO DATA)

No calibration entries found for time range 2025-12-01 to 2025-12-31.

To start collecting calibration data:
1. Run code reviews/QA verification to generate VERIFICATION.yaml
2. Use /feedback command to mark findings as helpful/false_positive/etc.
3. Calibration entries will be created automatically
4. Run /calibration-report again after collecting feedback

Report: _implementation/CALIBRATION-2025-12-31.yaml
```

---

## Testing

To test this command:

1. **Setup**: Create calibration entries via `/feedback` command
2. **Run**: Execute `/calibration-report` with various arguments
3. **Verify**: Check CALIBRATION-{date}.yaml contains expected metrics
4. **Edge Cases**: Test with no data, invalid dates, specific agents

---

## Related Commands

- `/feedback` - Create calibration entries by providing feedback on findings
- `/workflow-retro` - Analyze broader workflow patterns across stories

---

## Future Enhancements

- Weekly automated calibration reports (scheduled job)
- Trend visualization (accuracy over time)
- Agent comparison matrix
- Export to CSV for external analysis
