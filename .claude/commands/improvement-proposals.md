---
created: 2026-02-07
updated: 2026-02-07
version: 1.0.0
---

# /improvement-proposals Command

## Description

Generate prioritized workflow improvement proposals by aggregating insights from all learning system outputs (calibration, patterns, heuristics, experiments, retrospectives).

## Syntax

```bash
/improvement-proposals [OPTIONS]
```

## Options

| Option               | Type    | Default | Description                                   |
| -------------------- | ------- | ------- | --------------------------------------------- |
| `--days N`           | integer | 30      | Rolling window of last N days                 |
| `--start YYYY-MM-DD` | string  | -       | Analysis start date (use with --end)          |
| `--end YYYY-MM-DD`   | string  | -       | Analysis end date (use with --start)          |
| `--dry-run`          | flag    | false   | Generate proposals without persisting to KB   |
| `--no-dedup`         | flag    | false   | Skip deduplication (for debugging/comparison) |
| `--min-samples N`    | integer | 3       | Minimum data points required per proposal     |

**Note**: Cannot specify both `--days` and `--start/--end` simultaneously.

## Behavior

1. Spawns `improvement-proposer` agent with specified parameters
2. Agent aggregates data from 4 sources:
   - Calibration entries from KB (WKFL-002)
   - Pattern mining YAML files (WKFL-006)
   - Heuristic proposals (WKFL-003)
   - Workflow retrospectives (WKFL-001)
3. Generates proposals with ROI scores: `(impact/effort) * (10/9)`
4. Deduplicates across sources (threshold: 0.85 similarity)
5. Prioritizes into High/Medium/Low buckets by ROI
6. Outputs:
   - `.claude/proposals/IMPROVEMENT-PROPOSALS-{YYYY-MM-DD}.md`
   - KB entries (if not --dry-run)
7. Returns meta-learning summary (acceptance patterns by source/effort)

## Examples

### Generate proposals for last 30 days (default)

```bash
/improvement-proposals
```

### Analyze last 60 days

```bash
/improvement-proposals --days 60
```

### Analyze specific date range

```bash
/improvement-proposals --start 2026-01-01 --end 2026-01-31
```

### Dry-run mode (no KB persistence)

```bash
/improvement-proposals --days 30 --dry-run
```

### Skip deduplication (for debugging)

```bash
/improvement-proposals --days 30 --no-dedup
```

### Custom minimum samples threshold

```bash
/improvement-proposals --days 30 --min-samples 5
```

## Minimum Requirements

- **KB Availability**: CRITICAL - Command fails if KB unavailable
- **Data Sources**: At least 1 data source must succeed
- **Sample Size**: Proposals require ≥3 data points (configurable via --min-samples)
- **Date Range**: Minimum 1 day, maximum 365 days

## Output Structure

### YAML Frontmatter

```yaml
---
schema: 1
generated_date: 2026-02-15T10:00:00Z
data_period:
  start: 2026-01-16
  end: 2026-02-15
sources_used: ['calibration', 'pattern', 'heuristic', 'retro']
sources_failed: []
roi_formula: '(impact / effort) * (10/9)'
min_samples: 3
deduplication_threshold: 0.85
---
```

### Markdown Body

- ROI calculation formula (transparency)
- High Priority proposals (ROI ≥ 7.0)
- Medium Priority proposals (ROI ≥ 5.0)
- Low Priority proposals (ROI < 5.0)
- Meta-learning summary (acceptance patterns)

Each proposal includes:

- Unique ID (P-001, P-042, etc.)
- Title (1-2 sentences)
- Source (calibration, pattern, heuristic, retro)
- Evidence (sample count, correlation, accuracy)
- Proposal details (what to change)
- Impact level (high, medium, low)
- Effort level (low, medium, high)
- ROI score (2.2-10.0)
- Status (proposed, accepted, rejected, implemented)

## ROI Prioritization

### Formula

```
ROI = (impact / effort) * (10/9)

Impact scores: high=9, medium=5, low=2
Effort scores: low=1, medium=3, high=9
```

### Priority Buckets

- **High Priority**: ROI ≥ 7.0 (example: High impact + Low effort = 10.0)
- **Medium Priority**: ROI ≥ 5.0 (example: Medium impact + Medium effort = 5.5)
- **Low Priority**: ROI < 5.0 (example: Low impact + High effort = 2.2)

### Sorting

- Proposals sorted descending by ROI within each priority bucket
- No ROI overlap between buckets

## Data Sources

### 1. Calibration Entries (KB)

- **Location**: Knowledge Base via kb_search
- **Query**: `tags: ['calibration'], date_range: [start, end]`
- **Trigger**: Agent accuracy < 90% for high confidence

### 2. Pattern Mining (Files)

- **Location**: `.claude/patterns/PATTERNS-{YYYY-MM}.yaml`
- **Filter**: Files within date range
- **Trigger**: File pattern correlation ≥ 0.70 with failures

### 3. Heuristic Proposals (File)

- **Location**: `.claude/config/HEURISTIC-PROPOSALS.yaml`
- **Filter**: status: 'validated', tier: 'experiment' or 'production'
- **Trigger**: Validated heuristics ready for promotion

### 4. Workflow Retrospectives (File)

- **Location**: `.claude/retrospectives/WORKFLOW-RECOMMENDATIONS.md`
- **Filter**: Within date range by file modification time
- **Trigger**: Any recommendation not yet implemented

### 5. (Future) Experiment Results

- **Status**: Deferred to Phase 3 (WKFL-010-D)
- **Trigger**: Winning experiments with statistical significance

## Deduplication

- **Algorithm**: Levenshtein distance normalized to 0-1 scale
- **Threshold**: 0.85 (from WKFL-007 pattern)
- **Optimization**: Short-circuit if title length difference > 50%
- **Merge behavior**: Keep higher ROI, merge evidence and sources
- **Override**: Use `--no-dedup` to skip deduplication

## Meta-Learning

Query historical proposals from KB:

- **Window**: Last 90 days (or 3 months)
- **Minimum**: 50 proposals required for statistical significance
- **Metrics**:
  - Acceptance rate by source (calibration, pattern, heuristic, retro)
  - Acceptance rate by effort level (low, medium, high)
  - Acceptance rate by impact level (high, medium, low)
- **Warnings**:
  - High-effort proposals < 40% acceptance: "Consider deferring high-effort proposals"
  - Source X < 30% acceptance: "Consider threshold adjustment for {source}"

**First run**: Shows "No historical data (minimum 50 proposals required)" message.

## KB Integration

Each proposal persisted to KB (unless --dry-run):

- **Category**: note
- **Entry Type**: note
- **Tags**: `['proposal', 'status:proposed', 'source:{source}', 'priority:{priority}']`
- **Content**: JSON-stringified ProposalEntry
- **Queryable**: `kb_search({ tags: ['proposal', 'status:proposed'] })`

## Proposal Lifecycle

1. **proposed**: Initial state (generated by this command)
2. **accepted**: Human approval (manual KB update or future workflow)
3. **rejected**: Human rejection (manual KB update + rejection_reason)
4. **implemented**: Proposal applied to workflow (manual KB update)

## Error Handling

| Scenario                      | Behavior                                                    |
| ----------------------------- | ----------------------------------------------------------- |
| KB unavailable                | Error: "KB unavailable. Cannot proceed."                    |
| 0 data sources succeed        | Error: "No data sources available for analysis period"      |
| Invalid --start/--end         | Error: "Invalid date format (use YYYY-MM-DD)"               |
| Both --days and --start/--end | Error: "Cannot specify both --days and --start/--end"       |
| Date range > 365 days         | Error: "Maximum date range is 365 days"                     |
| Pattern file missing          | Warning: "Run /pattern-mine to generate patterns", continue |
| Heuristic file missing        | Warning: "HEURISTIC-PROPOSALS.yaml not found", continue     |
| Retro file missing            | Warning: "WORKFLOW-RECOMMENDATIONS.md not found", continue  |

## Output Files

- `.claude/proposals/IMPROVEMENT-PROPOSALS-{YYYY-MM-DD}.md` (primary output)
- KB entries (one per proposal, unless --dry-run)

## Token Budget

Estimated: 40k-55k tokens for 30-day analysis

- Data loading: 10k-15k tokens (4 sources)
- Proposal generation: 15k-20k tokens (15-30 proposals)
- Deduplication: 5k-10k tokens (pairwise similarity)
- Meta-learning: 5k-10k tokens (historical queries)
- Output generation: 5k-10k tokens (markdown formatting)

## Use Cases

1. **Weekly Review**: Generate proposals every Monday

   ```bash
   /improvement-proposals --days 7
   ```

2. **Monthly Analysis**: Full month analysis at end of month

   ```bash
   /improvement-proposals --start 2026-02-01 --end 2026-02-28
   ```

3. **Preview Mode**: Test proposal generation without KB writes

   ```bash
   /improvement-proposals --days 30 --dry-run
   ```

4. **Debugging**: Compare deduplicated vs raw proposals

   ```bash
   /improvement-proposals --days 30 --no-dedup
   ```

5. **High-Confidence Only**: Raise minimum sample threshold
   ```bash
   /improvement-proposals --days 60 --min-samples 10
   ```

## Future Enhancements

- Auto-acceptance for low-risk proposals (requires approval workflow)
- Integration with WKFL-008 experiments (Phase 3)
- Embedding-based deduplication (upgrade from Levenshtein)
- Real-time proposal generation (triggered by learning events)
- Proposal trend analysis (month-over-month comparison)

## Implementation

Agent: `.claude/agents/improvement-proposer.agent.md`
Schema: `apps/api/knowledge-base/src/__types__/index.ts` (ProposalEntrySchema)

## Related Commands

- `/pattern-mine` - Generate pattern data (input to this command)
- `/calibration-report` - Generate calibration data (input to this command)
- `/feedback` - Capture human feedback (input to this command)

## Version History

- **1.0.0** (2026-02-07): Initial implementation (WKFL-010)
  - Multi-source aggregation (4 sources)
  - ROI calculation and prioritization
  - Deduplication (threshold: 0.85)
  - Meta-learning from historical proposals
  - KB persistence with lifecycle tracking
