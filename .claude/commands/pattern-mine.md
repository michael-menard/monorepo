---
created: 2026-02-07
updated: 2026-02-22
version: 2.0.0
---

# /pattern-mine Command

## Description

Analyze cross-story workflow patterns from OUTCOME.yaml and VERIFICATION.yaml files.
Generates PATTERNS-{month}.yaml, AGENT-HINTS.yaml, ANTI-PATTERNS.md, and index.html
under `.claude/patterns/YYYY-MM/`.

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
| `--all-epics` | flag | false | Mine patterns across all epics (default: current epic only) |
| `--trend` | flag | false | Include trend analysis comparing current period to previous period |

**Note**: Cannot specify both `--days` and `--month` simultaneously.

## Behavior

1. Spawns `pattern-miner` agent with specified parameters
2. Agent runs SETUP phase subtask decomposition (S1-S5)
3. Agent loads OUTCOME.yaml (or VERIFICATION.yaml fallback) files within time period
4. Enforces minimum sample size: **skips with warning if < 10 stories found**
5. Detects patterns:
   - File patterns (correlation between file paths and failures)
   - AC patterns (vague/problematic phrasing in acceptance criteria)
   - Agent correlations (agent behavior patterns)
6. Clusters similar findings (text similarity >= 0.70, cluster_label assigned)
7. Scores confidence: null if < 5 samples, 0.0-1.0 otherwise
8. Generates outputs under `.claude/patterns/YYYY-MM/`:
   - `PATTERNS-{YYYY-MM}.yaml` - Full pattern data with cluster_labels, confidence, dedup
   - `AGENT-HINTS.yaml` - Per-agent actionable hints
   - `ANTI-PATTERNS.md` - Human-readable documentation
   - `index.html` - Dashboard (written after each run)
9. Injects hints into agent .md files idempotently
10. Persists high-severity patterns to KB
11. If `--trend`: compares current period to previous period PATTERNS file

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

### Mine across all epics
```bash
/pattern-mine --days 30 --all-epics
```

### Trend analysis (compare to previous period)
```bash
/pattern-mine --month 2026-02 --trend
```

### Full cross-epic run with trends
```bash
/pattern-mine --days 30 --all-epics --trend --use-verifications
```

## Minimum Requirements

- **Sample Size**: ≥10 stories required (skips with warning if <10 - no confirmation prompt)
- **Data Sources**: OUTCOME.yaml files (primary) or VERIFICATION.yaml files (fallback)
- **Time Period**: At least 7 days (enforced minimum)

## Output Location

All outputs written to `.claude/patterns/YYYY-MM/` where YYYY-MM is the analysis end month:
- `PATTERNS-{YYYY-MM}.yaml` - Named by analysis end month
- `AGENT-HINTS.yaml` - Per-agent hints (overwritten on each run)
- `ANTI-PATTERNS.md` - Human-readable anti-patterns (overwritten on each run)
- `index.html` - Dashboard (overwritten on each run)

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
- Confidence: null if < 5 samples; 0.0-1.0 otherwise

### AC Patterns
- Detects vague phrases: "properly", "correctly", "fast", "good", "etc."
- Impact: failure_rate ≥0.40 OR review_cycles ≥2.5
- Severity: high (≥0.60 failure rate OR ≥3.0 cycles), medium (≥0.40 OR ≥2.5)
- Confidence: null if < 5 samples; 0.0-1.0 otherwise

### Agent Correlations
- Patterns in agent behavior and dependencies
- Types: coder_to_reviewer, phase_to_phase, ac_type_to_failure
- Significance: ≥3 occurrences, correlation ≥0.60

## Clustering

- Algorithm: Levenshtein text similarity (MVP)
- Threshold: 0.70 (approximates embedding cosine similarity 0.85)
- Each pattern assigned `cluster_label` and `similarity_score`
- Cross-period deduplication: patterns matching previous period marked with `deduplicated_from_previous: true`

## Trend Analysis (--trend)

Requires a previous period PATTERNS-{prev-month}.yaml to exist.

Trend values:
- `improving` - correlation decreased ≥0.10 or occurrences decreased ≥20%
- `regressing` - correlation increased ≥0.10 or occurrences increased ≥20%
- `stable` - within thresholds
- `new` - not in previous period
- `resolved` - in previous period but absent now

## KB Integration

High-severity patterns (severity: high) automatically persisted to KB:
- Category: `pattern`
- Tags: `['pattern', 'workflow', 'cross-story']`
- Queryable by agents: `kb_search({ category: 'pattern' })`

## Agent Hint Injection

After AGENT-HINTS.yaml is written, hints are injected into agent .md files:
- Idempotent: replaces existing `<!-- PATTERN-HINTS:START -->` block or appends
- Only injects for agents with non-empty hints
- Logs each injection result

## Error Handling

| Scenario | Behavior |
|----------|----------|
| <10 stories found | **Skips run** with warning message (no confirmation) |
| No data files | Error: "No data files found for analysis period" |
| Invalid time period | Error: "Invalid --month format (use YYYY-MM)" |
| Both --days and --month | Error: "Cannot specify both --days and --month" |
| KB unavailable | Warning logged, continues without KB persistence |
| Previous period missing (--trend) | Warning logged, trend section omitted |
| Agent file not found for injection | Warning logged, injection skipped |

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

5. **Cross-Epic Analysis**: Mine patterns across all epics
   ```bash
   /pattern-mine --days 30 --all-epics --use-verifications
   ```

6. **Monthly Trend Report**: Compare this month to last
   ```bash
   /pattern-mine --month 2026-02 --trend
   ```

## Future Enhancements

- Weekly cron automation (requires infrastructure setup)
- Embedding-based clustering (upgrade from text similarity, WKFL-007)
- Real-time pattern detection during story execution
- Interactive pattern exploration (`/pattern-query`)
