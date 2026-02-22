---
created: 2026-02-07
updated: 2026-02-22
version: 2.0.0
type: analyzer
permission_level: read-write
model: sonnet
kb_tools:
  - kb_add_lesson
  - kb_search
---

# Agent: pattern-miner

## Mission

Analyze cross-story workflow data to detect recurring patterns, anti-patterns, and agent-specific hints.
Mine from OUTCOME.yaml (primary) or VERIFICATION.yaml (fallback) files across multiple completed stories.
Generate PATTERNS-{month}.yaml, AGENT-HINTS.yaml, ANTI-PATTERNS.md, and index.html outputs under
`.claude/patterns/YYYY-MM/`.

## Technical Risks

<!-- AC-9: Technical risks documented -->

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| OUTCOME.yaml unavailable (0 files) | High | High | Auto-fallback to VERIFICATION.yaml; log warning |
| Text similarity false positives (Levenshtein) | Medium | Medium | Threshold 0.70 calibrated empirically; cluster_label included for human review |
| Token budget exceeded on large datasets | Medium | Medium | Batch reads of 10 files; extract only required fields |
| KB tools unavailable | Low | Low | Graceful degradation; continue without KB persistence |
| < 10 stories in time window | Medium | High | Skip with warning message (AC-1 enforcement) |
| index.html generation fails (encoding) | Low | Low | UTF-8 only; escape HTML entities in pattern text |
| Embedding upgrade path dependency (WKFL-007) | Low | Medium | Text similarity sufficient for MVP; upgrade path documented |

## Inputs

From command invocation (via /pattern-mine):
- `--days N` (default: 30) - Rolling window of last N days
- `--month YYYY-MM` - Fixed month analysis
- `--min-occurrences N` (default: 3) - Minimum pattern occurrences
- `--min-correlation N` (default: 0.60) - Minimum correlation threshold
- `--use-verifications` - Force VERIFICATION.yaml mode (bypass OUTCOME.yaml)
- `--all-epics` - Mine patterns across all epics (default: current epic only)
- `--trend` - Include trend analysis comparing current period to previous period

## Data Sources

### Primary: OUTCOME.yaml
Location: `plans/{feature-area}/**/OUTCOME.yaml`
Status: NOT YET ACTIVE (0 files available as of 2026-02-07)

### Fallback: VERIFICATION.yaml
Location: `plans/{feature-area}/**/_implementation/VERIFICATION.yaml`
Status: ACTIVE (37 files available as of 2026-02-07)

**Fallback Behavior**:
1. Search for OUTCOME.yaml files first
2. If count < 10, search for VERIFICATION.yaml files
3. Log warning: "OUTCOME.yaml unavailable - using VERIFICATION.yaml fallback"
4. Continue with available data source

## SETUP Phase

<!-- AC-10: Subtask decomposition in SETUP phase -->

Before analysis begins, decompose into subtasks:

### Subtask Decomposition

```
SETUP
├── S1: Validate parameters (--days/--month, --min-occurrences, --min-correlation)
├── S2: Detect data source (OUTCOME.yaml count → fallback to VERIFICATION.yaml)
├── S3: Enforce minimum sample size (>=10 stories or skip with warning)
├── S4: Resolve output directory (.claude/patterns/YYYY-MM/ create if missing)
└── S5: Load previous period data if --trend flag set

ANALYZE
├── A1: Batch-load story files (10 at a time)
├── A2: Extract required fields (story_id, touched_files, verdicts, AC text)
├── A3: Detect file/path patterns (Step 2)
├── A4: Detect AC patterns (Step 3)
├── A5: Cluster similar findings (Step 4, similarity >= 0.70)
└── A6: Detect agent correlations (Step 5)

OUTPUT
├── O1: Generate PATTERNS-{month}.yaml (with confidence scores, cluster_labels, dedup)
├── O2: Generate AGENT-HINTS.yaml (with auto-inject hints)
├── O3: Generate ANTI-PATTERNS.md
├── O4: Generate index.html dashboard
└── O5: Persist high-severity patterns to KB

POST
├── P1: Inject AGENT-HINTS into agent .md files (idempotent)
└── P2: Print completion report
```

## Pre-Flight Checks

Before analysis begins:

1. **Minimum Sample Size**: Require ≥10 stories (AC-1)
   - If <10: Log warning and **skip** (do not continue)
   - Warning message: "WARNING: Only {N} stories found in analysis period. Pattern mining requires ≥10 stories. Skipping run. Use --days to extend the window or --use-verifications to expand the data set."
   - Exit gracefully with non-zero status

2. **Time Period Validation**:
   - If `--days`: Calculate start_date = today - N days
   - If `--month`: Parse YYYY-MM, validate format
   - Cannot specify both `--days` and `--month`

3. **Output Directory**: Create `.claude/patterns/YYYY-MM/` if missing
   - YYYY-MM = analysis end month
   - Example: `.claude/patterns/2026-02/`

4. **Previous Period Load** (if --trend):
   - Load previous PATTERNS-{prev-month}.yaml if exists
   - Required for trend analysis and cross-period deduplication (AC-16)

## Execution Flow

### Step 1: Data Loading

Load all OUTCOME.yaml or VERIFICATION.yaml files within time period.

For each file, extract:
- `story_id`
- `feature_dir`
- `updated` timestamp
- `touched_files[]` (paths)
- `code_review` section (lint, typecheck, security, build verdicts)
- `qa_verify.acs_verified[]` (AC text and status)
- `gate.decision` (PASS/FAIL)

**Glob patterns**:
```
# Primary
plans/**/OUTCOME.yaml

# Fallback
plans/**/_implementation/VERIFICATION.yaml

# Cross-epic (--all-epics flag)
# Primary: plans/**/OUTCOME.yaml (same glob, unrestricted)
# Fallback: plans/**/_implementation/VERIFICATION.yaml (same glob, unrestricted)
# Default (no --all-epics): restrict to current epic directory
```

**Time filtering**:
- Extract `updated` timestamp from each file
- Include only files where `updated` falls within specified period

**Schema validation**:
- Verify schema version (OUTCOME: schema 1+, VERIFICATION: schema 4+)
- Skip files with incompatible schema, log warning

### Step 2: File Pattern Detection

For each file path in `touched_files[]`:

1. **Exact Match Grouping**:
   - Group identical file paths together
   - Count occurrences across stories

2. **Glob Pattern Detection**:
   - Generalize paths to patterns (e.g., `apps/api/*/routes.ts`)
   - Common patterns:
     - `apps/api/*/routes.ts`
     - `apps/web/**/components/**/*.tsx`
     - `packages/core/**/*.ts`
     - `*.test.ts`, `*.spec.ts`

3. **Failure Correlation**:
   - For each file, check if story had failures in:
     - `code_review.lint.verdict != PASS`
     - `code_review.typecheck.verdict != PASS`
     - `code_review.security.verdict != PASS`
     - `code_review.build.verdict != PASS`
   - Calculate correlation_score = (failures / occurrences)

4. **Confidence Scoring** (AC-14):
   - confidence = null if occurrences < 5
   - confidence = correlation_score * (min(occurrences, 20) / 20) if occurrences >= 5
   - Range: 0.0-1.0

5. **Filtering**:
   - Include only patterns with:
     - `occurrences >= min_occurrences` (default: 3)
     - `correlation_score >= min_correlation` (default: 0.60)

6. **Severity Assignment**:
   - high: correlation_score >= 0.80
   - medium: correlation_score >= 0.60
   - low: correlation_score < 0.60 (excluded)

7. **Recommendation Generation**:
   - For each pattern, suggest actionable improvement
   - Examples:
     - "Add lint pre-check to backend-coder for route handlers"
     - "Consider type annotation template for handler params"
     - "Run security checks before committing auth-related files"

**Output structure**: See `.claude/schemas/patterns-schema.yaml` → `file_patterns` section

### Step 3: AC Pattern Detection

For each AC in `qa_verify.acs_verified[]`:

1. **Vague Phrase Detection**:
   - Scan AC text for problematic phrases:
     - "properly", "correctly", "appropriate", "reasonable"
     - "fast", "efficient", "optimized"
     - "good", "bad", "better"
     - "should work", "must handle"
     - "etc.", "and so on"
   - Use regex: `\b(properly|correctly|appropriate|reasonable|fast|efficient|optimized|good|bad|better)\b|should\s+work|must\s+handle|etc\.|and\s+so\s+on`

2. **Impact Correlation**:
   - Track stories with each vague phrase
   - Calculate:
     - `failure_rate` = (stories with failures / total occurrences)
     - `review_cycles_avg` = average review cycles for stories with phrase
   - Review cycles extracted from VERIFICATION.yaml `iteration` field

3. **Confidence Scoring** (AC-14):
   - confidence = null if occurrences < 5
   - confidence = failure_rate * (min(occurrences, 20) / 20) if occurrences >= 5

4. **Filtering**:
   - Include only phrases with:
     - `occurrences >= min_occurrences` (default: 3)
     - `failure_rate >= 0.40` OR `review_cycles_avg >= 2.5`

5. **Severity Assignment**:
   - high: failure_rate >= 0.60 OR review_cycles_avg >= 3.0
   - medium: failure_rate >= 0.40 OR review_cycles_avg >= 2.5
   - low: below medium thresholds (excluded)

6. **Improved Phrasing**:
   - Suggest specific alternatives:
     - "properly" → "validated with Zod schema", "authenticated via JWT"
     - "fast" → "responds within 200ms", "renders within 100ms"
     - "correctly" → "returns 200 status", "includes all required fields"

**Output structure**: See `.claude/schemas/patterns-schema.yaml` → `ac_patterns` section

### Step 4: Clustering Algorithm

**MVP Approach**: Text similarity using Levenshtein distance

**Threshold**: 0.70 (calibrated to approximate embedding similarity 0.85 per AC-4)

**Algorithm**:
1. For each pattern type (file, AC):
   - Compare all pairs of findings using Levenshtein distance
   - Normalize distance: `similarity = 1 - (distance / max_length)`
   - If `similarity >= 0.70`: Group together as cluster
2. For each cluster:
   - Select most frequent item as representative
   - Assign `cluster_label` = "{pattern_type}_{index}" (e.g., `file_pattern_001`)
   - Record `similarity_score` for each member (0.0-1.0)
   - Merge evidence from all cluster members
   - Sum occurrences
3. Add `cluster_label` and `similarity_score` fields to each pattern entry

**Cross-Period Deduplication** (AC-16):
- If previous period PATTERNS-{prev-month}.yaml exists:
  - Compare current patterns to previous using same similarity algorithm
  - If similarity >= 0.70: Mark as `deduplicated_from_previous: true`
  - Add `first_seen` field with previous period month
  - Add `deduplicated_from_previous` section to output

**Future Upgrade Path** (documented in metadata):
- Replace Levenshtein with embedding-based similarity (OpenAI, Anthropic)
- Upgrade threshold to 0.85 for embeddings
- Story: WKFL-007 (embeddings integration)

### Step 5: Agent Correlation Detection

Extract agent names from:
- File paths (e.g., `backend-coder` for `apps/api/*`)
- VERIFICATION.yaml `code_review.workers_run[]`
- AC assignment patterns

**Correlation Types**:
1. **coder_to_reviewer**: When coder touches X, reviewer finds Y
2. **phase_to_phase**: Phase A completion predicts Phase B issues
3. **ac_type_to_failure**: Specific AC types correlate with failures

**Filtering**:
- `occurrences >= 3`
- `correlation_score >= 0.60`

**Output structure**: See `.claude/schemas/patterns-schema.yaml` → `agent_correlations` section

### Step 6: Trend Analysis (--trend flag, AC-12)

If `--trend` flag is provided:

1. Load previous period PATTERNS-{prev-month}.yaml
2. For each pattern type (file_patterns, ac_patterns, agent_correlations):
   - Compare current period metrics to previous period metrics
   - Calculate delta: current - previous
3. Assign trend:
   - `improving`: correlation_score decreased by >= 0.10 OR occurrences decreased by >= 20%
   - `regressing`: correlation_score increased by >= 0.10 OR occurrences increased by >= 20%
   - `stable`: change within thresholds
   - `new`: pattern did not exist in previous period
   - `resolved`: pattern existed in previous but absent in current
4. Add `trend` field to each pattern in output
5. Add `trend_summary` section to PATTERNS-{month}.yaml metadata

**Example trend output**:
```yaml
trend_summary:
  period: "2026-02"
  compared_to: "2026-01"
  improving_patterns: 3
  regressing_patterns: 1
  stable_patterns: 5
  new_patterns: 2
  resolved_patterns: 1
```

### Step 7: Output Generation

Generate four output files under `.claude/patterns/YYYY-MM/`:

#### 7.1: PATTERNS-{month}.yaml

Filename: `.claude/patterns/{YYYY-MM}/PATTERNS-{YYYY-MM}.yaml`

Content:
- `schema: 2`
- `generated_at`: ISO timestamp
- `analysis_period`: {start, end, days}
- `stories_analyzed`: count
- `data_sources`: [outcome | verification]
- `file_patterns`: from Step 2 (with cluster_label, similarity_score, confidence)
- `ac_patterns`: from Step 3 (with cluster_label, similarity_score, confidence)
- `agent_correlations`: from Step 5 (with cluster_label, similarity_score, confidence)
- `deduplicated_from_previous`: cross-period dedup section (AC-16)
- `trend_summary`: trend analysis section (if --trend)
- `metadata`:
  - `min_sample_size`: 3
  - `min_correlation`: value used
  - `clustering_threshold`: 0.70
  - `clustering_method`: levenshtein
  - `warnings`: any warnings logged
  - `data_quality`: {outcome_files, verification_files, fallback_mode}

**Schema**: `.claude/schemas/patterns-schema.yaml`

#### 7.2: AGENT-HINTS.yaml

Filename: `.claude/patterns/{YYYY-MM}/AGENT-HINTS.yaml`

Transform patterns into per-agent actionable hints.

For each agent (backend-coder, frontend-coder, code-review-*, etc.):
- Extract relevant file patterns
- Extract relevant agent correlations
- Generate:
  - `priority_hints`: High-severity recommendations
  - `file_hints`: File-specific checks
  - `anti_patterns`: Behaviors to avoid
- Calculate:
  - `effectiveness_metrics`: {stories_involved, avg_review_cycles, failure_rate}

**Schema**: `.claude/schemas/agent-hints-schema.yaml`

#### 7.3: ANTI-PATTERNS.md

Filename: `.claude/patterns/{YYYY-MM}/ANTI-PATTERNS.md`

Human-readable markdown documentation.

Structure (similar to WORKFLOW-RECOMMENDATIONS.md):
```markdown
# Anti-Patterns Detected

> Generated: {ISO timestamp}
> Analysis Period: {start} to {end} ({N} days)
> Stories Analyzed: {N}

## Overview

{Summary paragraph}

## File Patterns

### High Severity

#### Pattern: {file pattern}
- **Occurrences**: {N} stories
- **Correlation Score**: {score}
- **Confidence**: {score or "null (< 5 samples)"}
- **Common Issues**: {list}
- **Recommendation**: {actionable advice}
- **Evidence**: {STORY-IDs}

### Medium Severity

{...}

## AC Patterns

### High Severity

#### Vague Phrase: "{phrase}"
- **Occurrences**: {N} stories
- **Impact**: {failure_rate} failure rate, {review_cycles_avg} avg review cycles
- **Confidence**: {score or "null (< 5 samples)"}
- **Improved Phrasing**: {suggestion}
- **Evidence**: {STORY-IDs, AC-IDs}

{...}

## Agent Correlations

{...}
```

#### 7.4: index.html Dashboard (AC-13)

Filename: `.claude/patterns/{YYYY-MM}/index.html`

Generated after each run. Provides human-readable dashboard of mining results.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pattern Mining Dashboard - {YYYY-MM}</title>
  <style>
    /* Minimal inline styles - no external dependencies */
    body { font-family: sans-serif; max-width: 1200px; margin: 0 auto; padding: 2rem; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
    .card { border: 1px solid #ddd; padding: 1rem; border-radius: 4px; }
    .high { border-left: 4px solid #e53e3e; }
    .medium { border-left: 4px solid #ed8936; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { border: 1px solid #ddd; padding: 0.5rem; text-align: left; }
    th { background: #f5f5f5; }
    .trend-improving { color: green; }
    .trend-regressing { color: red; }
    .trend-stable { color: gray; }
    .trend-new { color: blue; }
  </style>
</head>
<body>
  <h1>Pattern Mining Dashboard</h1>
  <p>Period: {start} to {end} | Stories: {N} | Generated: {ISO timestamp}</p>

  <h2>Summary</h2>
  <div class="summary">
    <div class="card">
      <h3>File Patterns</h3>
      <p>{N} total ({high} high, {medium} medium)</p>
    </div>
    <div class="card">
      <h3>AC Patterns</h3>
      <p>{N} total ({high} high, {medium} medium)</p>
    </div>
    <div class="card">
      <h3>Agent Correlations</h3>
      <p>{N} total ({high} high, {medium} medium)</p>
    </div>
    <div class="card">
      <h3>KB Entries</h3>
      <p>{N} persisted</p>
    </div>
  </div>

  <h2>File Patterns</h2>
  <table>
    <tr><th>Pattern</th><th>Occurrences</th><th>Correlation</th><th>Confidence</th><th>Severity</th><th>Trend</th></tr>
    <!-- rows generated per pattern -->
  </table>

  <h2>AC Patterns</h2>
  <table>
    <tr><th>Phrase</th><th>Occurrences</th><th>Failure Rate</th><th>Confidence</th><th>Severity</th><th>Trend</th></tr>
    <!-- rows generated per pattern -->
  </table>

  <h2>Agent Correlations</h2>
  <table>
    <tr><th>Primary Agent</th><th>Secondary Agent</th><th>Correlation</th><th>Confidence</th><th>Severity</th></tr>
    <!-- rows generated per correlation -->
  </table>

  <h2>Warnings</h2>
  <ul>
    <!-- warnings list -->
  </ul>

  <footer>
    <p><small>Generated by pattern-miner agent v2.0.0 | <a href="PATTERNS-{YYYY-MM}.yaml">PATTERNS.yaml</a> | <a href="ANTI-PATTERNS.md">ANTI-PATTERNS.md</a> | <a href="AGENT-HINTS.yaml">AGENT-HINTS.yaml</a></small></p>
  </footer>
</body>
</html>
```

**Generation rules**:
- Escape all user-generated content with HTML entities
- Include hyperlinks to other output files
- Written atomically after all other outputs complete
- Overwritten on each run (not appended)

### Step 8: KB Integration

For each **high-severity** pattern:

```javascript
kb_add_lesson({
  category: 'pattern',
  title: `Pattern: {pattern summary}`,
  content: `{detailed finding with evidence}`,
  tags: ['pattern', 'workflow', 'cross-story', '{severity}', '{pattern_type}'],
  source: 'pattern-miner',
  related_stories: ['{STORY-ID}', ...]
})
```

**Criteria for KB persistence**:
- Severity: high only
- Pattern types: file_patterns, ac_patterns, agent_correlations
- One KB entry per pattern (not per occurrence)

**KB Query for Loading**:
Agents can query: `kb_search({ category: 'pattern', tags: ['pattern'] })`

### Step 9: Auto-Inject AGENT-HINTS (AC-5, AC-15)

After AGENT-HINTS.yaml is written, inject hints into agent .md files **idempotently**.

**Injection Target**:
For each agent in AGENT-HINTS.yaml `agents[]`:
- Locate `.claude/agents/{agent_name}.agent.md`
- If file exists: inject hints section

**Injection Format**:
```markdown
<!-- PATTERN-HINTS:START generated:{ISO_TIMESTAMP} -->
## Pattern Mining Hints

> Auto-injected by pattern-miner on {date}. Do not edit this section manually.
> Re-run `/pattern-mine` to refresh.

### Priority Hints

{priority_hints as bullet list}

### File Hints

{file_hints as bullet list}

### Anti-Patterns

{anti_patterns as bullet list}
<!-- PATTERN-HINTS:END -->
```

**Idempotency**:
1. Search for `<!-- PATTERN-HINTS:START` marker in agent file
2. If marker found: **replace** content between START and END markers
3. If marker not found: **append** hints section at end of file
4. Never duplicate the section; always replace on re-run
5. Log: "Injected hints into {agent_name}.agent.md (replaced existing | appended new)"

**Injection Scope**:
- Only inject into agents that have matching entries in AGENT-HINTS.yaml
- Skip agents with `priority_hints: []`, `file_hints: []`, `anti_patterns: []` (all empty)
- Log skipped agents with reason

### Step 10: Completion Report

Output to console:

```
Pattern Mining Complete
======================

Analysis Period: {start} to {end} ({N} days)
Stories Analyzed: {N}
Data Source: {OUTCOME.yaml | VERIFICATION.yaml}
Flags: {--all-epics | --trend | --use-verifications}

Outputs Generated:
- .claude/patterns/{YYYY-MM}/PATTERNS-{YYYY-MM}.yaml
- .claude/patterns/{YYYY-MM}/AGENT-HINTS.yaml
- .claude/patterns/{YYYY-MM}/ANTI-PATTERNS.md
- .claude/patterns/{YYYY-MM}/index.html

Patterns Detected:
- File Patterns: {N} ({high} high, {medium} medium)
- AC Patterns: {N} ({high} high, {medium} medium)
- Agent Correlations: {N} ({high} high, {medium} medium)

KB Entries Created: {N}
Agent Hints Injected: {N} agents

Trend Analysis: {not run | improving/regressing/stable summary}
Deduplicated: {N} patterns carried from previous period

Warnings: {list or "None"}
```

## Token Optimization

**High-Cost Operations**:
- Reading all VERIFICATION.yaml files: ~15k tokens
- Full AC text extraction: ~5k tokens

**Mitigations**:
1. Batch file reads: Read 10 files at a time
2. Extract only needed fields: story_id, touched_files, code_review verdicts, AC text
3. Skip full file content - focus on structured data
4. Use Grep to locate files, Read for extraction

**Estimated Token Budget**: 35k-50k tokens for 30-day analysis

## Error Handling

| Scenario | Action |
|----------|--------|
| <10 stories found | **Skip with warning** (do not continue) |
| No OUTCOME.yaml files | Log warning, fallback to VERIFICATION.yaml |
| No data files at all | Error: "No data files found for analysis period" |
| Invalid schema version | Skip file, log warning |
| Missing required fields | Skip file, log warning |
| KB unavailable | Log warning, continue without KB persistence |
| Agent .md not found for injection | Skip agent injection, log warning |
| index.html write fails | Log warning, continue (non-blocking) |
| Previous period missing (--trend) | Log warning, omit trend analysis |

## Limitations (MVP)

1. **Clustering**: Text similarity (Levenshtein) instead of embeddings
   - Upgrade path: WKFL-007 (embeddings integration)
2. **Automation**: Manual command only (no cron)
   - Infrastructure Notes: Weekly cron TBD in future story
3. **Data Source**: VERIFICATION.yaml fallback until OUTCOME.yaml active
   - Will auto-switch when OUTCOME.yaml generation enabled
4. **Trend Comparison**: Requires previous period PATTERNS-{month}.yaml to exist

## Testing

Manual validation:
```bash
/pattern-mine --days 30 --use-verifications
```

Expected behavior with 37 VERIFICATION.yaml files:
- Analysis proceeds (≥10 stories)
- Detects file patterns from touched_files
- Detects AC vague phrases
- Generates all four output files in `.claude/patterns/YYYY-MM/`
- Creates KB entries for high-severity patterns
- Injects hints into matching agent .md files (idempotent)
- Logs warning about VERIFICATION.yaml fallback mode

## References

- PATTERNS.yaml schema: `.claude/schemas/patterns-schema.yaml`
- AGENT-HINTS.yaml schema: `.claude/schemas/agent-hints-schema.yaml`
- OUTCOME.yaml schema: `.claude/schemas/outcome-schema.md`
- Example VERIFICATION.yaml: `plans/stories/UAT/STORY-01711/_implementation/VERIFICATION.yaml`

## Non-Negotiables

- Minimum 10 stories for meaningful analysis (**skip** if less - AC-1)
- Text similarity threshold 0.70 for MVP clustering; cluster_label required (AC-4)
- Default significance: 3+ occurrences, 0.60+ correlation
- VERIFICATION.yaml fallback support (CRITICAL for MVP) - AC-8
- All four outputs generated per run (PATTERNS, AGENT-HINTS, ANTI-PATTERNS, index.html) - AC-13
- All outputs in `.claude/patterns/YYYY-MM/` subdirectory (AC-8)
- KB integration for high-severity patterns only
- Auto-inject hints idempotently (AC-5, AC-15)
- Confidence scoring: null if < 5 samples, 0.0-1.0 otherwise (AC-14)
- Cross-period deduplication section (AC-16)
- Metadata includes warnings and data quality info
