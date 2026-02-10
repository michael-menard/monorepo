---
created: 2026-02-07
updated: 2026-02-07
version: 1.0.0
type: utility
permission_level: docs-only
story_id: WKFL-002
---

/calibration-report [--since=YYYY-MM-DD] [--agent=NAME]

Generate a confidence calibration report analyzing how well agent confidence levels match actual outcomes.

## Usage

```bash
# Default: analyze last 7 days, all agents
/calibration-report

# Analyze from a specific date
/calibration-report --since=2026-01-01

# Analyze a specific agent
/calibration-report --agent=code-review-security

# Combined: specific agent and date range
/calibration-report --since=2026-01-15 --agent=code-review-security
```

## Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `--since` | No | 7 days ago | Start date for analysis (ISO format: YYYY-MM-DD) |
| `--agent` | No | all agents | Filter to specific agent ID |

---

## Implementation

### Step 1: Parse Arguments

```typescript
const args = parseCommandArgs(input)
const sinceDate = args.flags['since'] || subtractDays(new Date(), 7).toISOString().slice(0, 10)
const agentFilter = args.flags['agent'] || null

// Validate date format
if (sinceDate && !/^\d{4}-\d{2}-\d{2}$/.test(sinceDate)) {
  error('Invalid date format. Use YYYY-MM-DD')
}
```

### Step 2: Spawn Confidence Calibrator Agent

```typescript
// Spawn the confidence-calibrator agent with context
spawn('confidence-calibrator', {
  context: {
    since: sinceDate,
    agent: agentFilter,
  }
})
```

The confidence-calibrator agent (haiku model) will:
1. Query KB for calibration entries in the specified date range
2. Group entries by (agent_id, stated_confidence)
3. Compute accuracy metrics per group
4. Generate alerts for agents below threshold
5. Write CALIBRATION-{date}.yaml
6. Log significant findings to KB

### Step 3: Output Report Location

```typescript
const reportDate = new Date().toISOString().slice(0, 10)
const reportFile = `CALIBRATION-${reportDate}.yaml`

output(`
Calibration Report Generated

Report: ${reportFile}
Date Range: ${sinceDate} to ${new Date().toISOString().slice(0, 10)}
Agent Filter: ${agentFilter || 'all agents'}

Review the report for:
- Accuracy scores per agent per confidence level
- Alerts for agents below threshold
- Threshold adjustment recommendations
`)
```

---

## Output Format

The command produces `CALIBRATION-{date}.yaml` with the following sections:

### Summary
- Total calibration entries analyzed
- Number of agents covered
- Date range
- Number of alerts generated

### Accuracy
Per (agent_id, confidence_level):
- Total findings
- Correct count
- False positive count
- Severity wrong count
- Accuracy percentage
- Whether sample size is sufficient (>= 5 for report, >= 10 for alerts)

### Alerts
Triggered when accuracy drops below thresholds:
- **high** confidence: alert if accuracy < 90% (10+ samples)
- **medium** confidence: alert if accuracy < 75% (10+ samples)
- **low** confidence: alert if accuracy < 50% (10+ samples)

### Recommendations
Specific threshold adjustment proposals based on accuracy data:
- Tighten confidence criteria when false positive rate is high
- Review severity logic when severity misclassification rate is high
- Recalibrate thresholds when overall accuracy is low

### KB Entries Created
List of KB entries logged for significant alerts.

---

## Data Source

Calibration entries are written to KB by the `/feedback` command (WKFL-004). Each feedback entry automatically creates a corresponding calibration entry with:
- `agent_id`: Agent that made the finding
- `finding_id`: Finding identifier
- `story_id`: Story context
- `stated_confidence`: Confidence from VERIFICATION.yaml
- `actual_outcome`: Mapped from feedback type (helpful=correct, false_positive=false_positive, severity_wrong=severity_wrong)
- `timestamp`: When calibration was recorded

---

## Error Handling

| Error | Message |
|-------|---------|
| Invalid date format | "Invalid date format. Use YYYY-MM-DD (e.g., 2026-01-15)" |
| No calibration data | "No calibration data found for the specified date range. Use /feedback to capture agent finding outcomes." |
| KB unavailable | "Knowledge Base unavailable. Ensure KB service is running." |
| Agent not found | "No calibration data found for agent '{name}'. Available agents: {list}" |

---

## Example Report

```yaml
schema: 1
generated_at: "2026-02-07T15:30:00Z"
date_range:
  since: "2026-01-31"
  until: "2026-02-07"
agent_filter: "all"

summary:
  total_entries: 47
  agents_analyzed: 3
  date_range_days: 7
  alerts_generated: 1

accuracy:
  - agent_id: "code-review-security"
    confidence_level: "high"
    total: 15
    correct: 12
    false_positives: 2
    severity_wrong: 1
    accuracy: 0.80
    sample_sufficient: true
    alert_eligible: true

  - agent_id: "code-review-security"
    confidence_level: "medium"
    total: 8
    correct: 6
    false_positives: 1
    severity_wrong: 1
    accuracy: 0.75
    sample_sufficient: true
    alert_eligible: false

  - agent_id: "code-review-architecture"
    confidence_level: "high"
    total: 12
    correct: 11
    false_positives: 1
    severity_wrong: 0
    accuracy: 0.92
    sample_sufficient: true
    alert_eligible: true

alerts:
  - agent_id: "code-review-security"
    confidence_level: "high"
    accuracy: 0.80
    threshold: 0.90
    sample_size: 15
    severity: "critical"
    recommendation: "code-review-security has 13% false positive rate at high confidence. Consider tightening high confidence criteria to reduce false positives."

recommendations:
  - agent_id: "code-review-security"
    type: "threshold_adjustment"
    description: "Tighten high confidence criteria - current 80% accuracy is below 90% threshold"
    evidence:
      accuracy: 0.80
      false_positive_rate: 0.13
      sample_size: 15
      stories: ["WISH-2045", "WISH-2048", "WKFL-001"]

kb_entries_created:
  - id: "kb_abc123"
    type: "calibration_alert"
    agent_id: "code-review-security"
```

---

## Notes

- Calibration data accumulates over time as `/feedback` is used
- First meaningful reports require at least 5 feedback entries per agent
- Alerts require at least 10 entries for statistical stability
- Reports are additive - run weekly for ongoing monitoring
- This command pairs with WKFL-003 (Heuristic Discovery) which uses calibration data to propose autonomy tier changes
