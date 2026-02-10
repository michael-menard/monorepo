---
created: 2026-02-07
updated: 2026-02-07
version: 1.0.0
---

# /pattern-mine Command

## Description

Analyze cross-story workflow patterns from OUTCOME.yaml and VERIFICATION.yaml files.
Generates PATTERNS-{month}.yaml, AGENT-HINTS.yaml, and ANTI-PATTERNS.md outputs.

## Syntax

```bash
/pattern-mine [OPTIONS]
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--days N` | integer | 30 | Rolling window of last N days |
| `--month YYYY-MM` | string | - | Fixed month analysis (e.g., 2026-02) |
| `--min-occurrences N` | integer | 3 | Minimum pattern occurrences to report |
| `--min-correlation N` | float | 0.60 | Minimum correlation threshold (0.0-1.0) |
| `--use-verifications` | flag | false | Force VERIFICATION.yaml mode (bypass OUTCOME.yaml) |

**Note**: Cannot specify both `--days` and `--month` simultaneously.

## Behavior

1. Spawns `pattern-miner` agent with specified parameters
2. Agent loads OUTCOME.yaml (or VERIFICATION.yaml fallback) files within time period
3. Detects patterns:
   - File patterns (correlation between file paths and failures)
   - AC patterns (vague/problematic phrasing in acceptance criteria)
   - Agent correlations (agent behavior patterns)
4. Generates outputs:
   - `.claude/patterns/PATTERNS-{YYYY-MM}.yaml` - Full pattern data
   - `.claude/patterns/AGENT-HINTS.yaml` - Per-agent actionable hints
   - `.claude/patterns/ANTI-PATTERNS.md` - Human-readable documentation
5. Persists high-severity patterns to KB

## Examples

### Analyze last 30 days (default)
```bash
/pattern-mine
```

### Analyze last 60 days
```bash
/pattern-mine --days 60
```

### Analyze specific month
```bash
/pattern-mine --month 2026-01
```

### Force VERIFICATION.yaml mode
```bash
/pattern-mine --days 30 --use-verifications
```

### Custom thresholds
```bash
/pattern-mine --days 30 --min-occurrences 5 --min-correlation 0.70
```

## Minimum Requirements

- **Sample Size**: ≥10 stories recommended (warns if <10, proceeds if confirmed)
- **Data Sources**: OUTCOME.yaml files (primary) or VERIFICATION.yaml files (fallback)
- **Time Period**: At least 7 days (enforced minimum)

## Output Location

All outputs written to `.claude/patterns/`:
- `PATTERNS-{YYYY-MM}.yaml` - Named by analysis end month
- `AGENT-HINTS.yaml` - Overwrites previous version
- `ANTI-PATTERNS.md` - Overwrites previous version

## Data Sources

### Primary: OUTCOME.yaml
- Location: `plans/**/OUTCOME.yaml`
- Status: NOT YET ACTIVE (0 files as of 2026-02-07)
- Will auto-activate when OUTCOME.yaml generation enabled

### Fallback: VERIFICATION.yaml
- Location: `plans/**/_implementation/VERIFICATION.yaml`
- Status: ACTIVE (37 files as of 2026-02-07)
- Automatically used when OUTCOME.yaml unavailable
- Logs warning in output metadata

## Pattern Detection

### File Patterns
- Correlation between file paths and failures (lint, typecheck, security, build)
- Significance: ≥3 occurrences, correlation ≥0.60
- Severity: high (≥0.80), medium (≥0.60)

### AC Patterns
- Detects vague phrases: "properly", "correctly", "fast", "good", "etc."
- Impact: failure_rate ≥0.40 OR review_cycles ≥2.5
- Severity: high (≥0.60 failure rate OR ≥3.0 cycles), medium (≥0.40 OR ≥2.5)

### Agent Correlations
- Patterns in agent behavior and dependencies
- Types: coder_to_reviewer, phase_to_phase, ac_type_to_failure
- Significance: ≥3 occurrences, correlation ≥0.60

## KB Integration

High-severity patterns (severity: high) automatically persisted to KB:
- Category: `pattern`
- Tags: `['pattern', 'workflow', 'cross-story']`
- Queryable by agents: `kb_search({ category: 'pattern' })`

## Error Handling

| Scenario | Behavior |
|----------|----------|
| <10 stories found | Warns user, offers to continue |
| No data files | Error: "No data files found for analysis period" |
| Invalid time period | Error: "Invalid --month format (use YYYY-MM)" |
| Both --days and --month | Error: "Cannot specify both --days and --month" |
| KB unavailable | Warning logged, continues without KB persistence |

## Implementation

Agent: `.claude/agents/pattern-miner.agent.md`

Schemas:
- PATTERNS.yaml: `.claude/schemas/patterns-schema.yaml`
- AGENT-HINTS.yaml: `.claude/schemas/agent-hints-schema.yaml`

## Token Budget

Estimated: 35k-50k tokens for 30-day analysis of 15-20 stories

## Use Cases

1. **Monthly Review**: Run at end of month to generate pattern report
   ```bash
   /pattern-mine --month 2026-02
   ```

2. **Pre-Sprint Planning**: Identify recent patterns before sprint starts
   ```bash
   /pattern-mine --days 14
   ```

3. **Calibration**: Generate agent hints for improved future performance
   ```bash
   /pattern-mine --days 30
   ```

4. **Troubleshooting**: Analyze patterns when seeing repeated failures
   ```bash
   /pattern-mine --days 60 --min-correlation 0.70
   ```

## Future Enhancements

- Weekly cron automation (requires infrastructure setup)
- Embedding-based clustering (upgrade from text similarity)
- Real-time pattern detection during story execution
- Pattern trend analysis (month-over-month comparison)
