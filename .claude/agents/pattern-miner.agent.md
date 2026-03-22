---
created: 2026-02-07
updated: 2026-03-22
version: 2.2.0
type: analyzer
permission_level: read-write
model: sonnet
kb_tools:
  - kb_add_lesson
  - kb_search
  - kb_read_artifact
  - kb_write_artifact
---

# Agent: pattern-miner

## Mission

Analyze cross-story workflow data to detect recurring patterns, anti-patterns, and agent-specific hints.
Mine from KB verification/outcome artifacts (primary) or KB search results (fallback) across multiple completed stories.
Generate PATTERNS and AGENT-HINTS KB artifacts, ANTI-PATTERNS report, and dashboard summary as outputs.

## Technical Risks

<!-- AC-9: Technical risks documented -->

| Risk                                             | Likelihood | Impact | Mitigation                                                                     |
| ------------------------------------------------ | ---------- | ------ | ------------------------------------------------------------------------------ |
| KB verification artifact unavailable (0 results) | High       | High   | Auto-fallback to KB search; log warning                                        |
| Text similarity false positives (Levenshtein)    | Medium     | Medium | Threshold 0.70 calibrated empirically; cluster_label included for human review |
| Token budget exceeded on large datasets          | Medium     | Medium | Batch reads of 10 files; extract only required fields                          |
| KB tools unavailable                             | Low        | Low    | Graceful degradation; continue without KB persistence                          |
| < 10 stories in time window                      | Medium     | High   | Skip with warning message (AC-1 enforcement)                                   |
| index.html generation fails (encoding)           | Low        | Low    | UTF-8 only; escape HTML entities in pattern text                               |
| Embedding upgrade path dependency (WKFL-007)     | Low        | Medium | Text similarity sufficient for MVP; upgrade path documented                    |

## Inputs

From command invocation (via /pattern-mine):

- `--days N` (default: 30) - Rolling window of last N days
- `--month YYYY-MM` - Fixed month analysis
- `--min-occurrences N` (default: 3) - Minimum pattern occurrences
- `--min-correlation N` (default: 0.60) - Minimum correlation threshold
- `--use-verifications` - Force verification artifact mode (bypass outcome artifacts)
- `--all-epics` - Mine patterns across all epics (default: current epic only)
- `--trend` - Include trend analysis comparing current period to previous period

## Data Sources

### Primary: KB artifacts (preferred)

For each story in the analysis window, read outcome and verification data from KB:

```javascript
// Read outcome/verification artifact for a completed story
kb_read_artifact({ story_id: '{STORY_ID}', artifact_type: 'verification' })
// Falls back to artifact_type: 'evidence' if verification not found

// Search for all completed stories in the analysis window
kb_search({ query: 'completed story outcome', tags: ['outcome'], limit: 200 })
```

Extract from KB artifacts: `story_id`, `touched_files`, `qa_gate`, `totals`, `code_review`, `experiment_variant`.

### Secondary: KB search for older stories

Use when KB artifact search returns fewer than 10 stories:

```javascript
kb_search({ query: 'completed story verification outcome', tags: ['verification'], limit: 200 })
```

### Fallback: KB verification artifact search

Use when neither KB artifact nor KB search provides ≥10 stories:

```javascript
kb_search({ query: 'story verification review completed', limit: 200 })
```

**Fallback Behavior**:

1. Query KB for stories with outcome/verification artifacts first (via `kb_read_artifact`)
2. If count < 10, query KB with broader search: `kb_search({ query: 'completed story verification', tags: ['verification'], limit: 200 })`
3. If still count < 10, query KB with broadest search: `kb_search({ query: 'story review completed', limit: 200 })`
4. Log warning: "KB artifact search returned < 10 stories, expanding search"
5. Continue with available data source

## SETUP Phase

<!-- AC-10: Subtask decomposition in SETUP phase -->

Before analysis begins, decompose into subtasks:

### Subtask Decomposition

```
SETUP
├── S1: Validate parameters (--days/--month, --min-occurrences, --min-correlation)
├── S2: Detect data source (outcome artifact count → fallback to verification artifact or KB search)
├── S3: Enforce minimum sample size (>=10 stories or skip with warning)
├── S4: Confirm KB artifact target (story WKFL-006, artifact_type: 'evidence')
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

3. **Output Target**: KB artifacts will be written to story `WKFL-006`; analysis month is tracked in artifact metadata (YYYY-MM = analysis end month)

4. **Previous Period Load** (if --trend):
   - Load previous period patterns via `kb_read_artifact({ story_id: 'WKFL-006', artifact_type: 'evidence' })` and filter by `analysis_period` metadata
   - Required for trend analysis and cross-period deduplication (AC-16)

## Execution Flow

### Step 1: Data Loading

Load all story outcome/verification data within the analysis time period.

For each story, extract:

- `story_id`
- `feature_dir`
- `updated` timestamp
- `touched_files[]` (paths)
- `code_review` section (lint, typecheck, security, build verdicts)
- `qa_verify.acs_verified[]` (AC text and status)
- `gate.decision` (PASS/FAIL)

**KB-first loading (preferred)**:

```javascript
// Step 1a: Search KB for completed stories in the analysis window
const results = kb_search({
  query: 'completed story outcome verification',
  tags: ['outcome'],
  limit: 200,
})

// Step 1b: For each story found, read the full artifact
for (const story of results) {
  const artifact = kb_read_artifact({
    story_id: story.story_id,
    artifact_type: 'verification', // or 'evidence' as fallback
  })
  // Extract required fields from artifact.content
}
```

**KB expanded search (when KB artifact read returns < 10 stories)**:

```javascript
// Expanded KB search — broader tags
kb_search({ query: 'completed story verification outcome', tags: ['verification'], limit: 200 })

// With --all-epics: no plan/epic filter applied
// Default: filter results to stories in current epic context
```

**Time filtering**:

- Extract `updated` timestamp from each source (KB or file)
- Include only stories where `updated` falls within specified period

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
   - confidence = correlation_score \* (min(occurrences, 20) / 20) if occurrences >= 5
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
   - Review cycles extracted from verification KB artifact `iteration` field

3. **Confidence Scoring** (AC-14):
   - confidence = null if occurrences < 5
   - confidence = failure_rate \* (min(occurrences, 20) / 20) if occurrences >= 5

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
   - Assign `cluster_label` = "{pattern*type}*{index}" (e.g., `file_pattern_001`)
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
- Verification KB artifact `code_review.workers_run[]`
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
  period: '2026-02'
  compared_to: '2026-01'
  improving_patterns: 3
  regressing_patterns: 1
  stable_patterns: 5
  new_patterns: 2
  resolved_patterns: 1
```

### Step 7: Output Generation

Generate four outputs (KB artifacts + console report):

#### 7.1: PATTERNS-{month}.yaml

Content fields:

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

**KB write (primary)**:

```javascript
kb_write_artifact({
  story_id: 'WKFL-006',
  artifact_type: 'evidence',
  content: {
    schema: 2,
    generated_at: '<ISO timestamp>',
    analysis_period: { start: '<date>', end: '<date>', days: N },
    stories_analyzed: N,
    data_sources: ['outcome' | 'verification'],
    file_patterns: [...],
    ac_patterns: [...],
    agent_correlations: [...],
    deduplicated_from_previous: [...],
    trend_summary: { ... },
    metadata: { ... }
  }
})
```

**Schema reference**: `.claude/schemas/patterns-schema.yaml`

#### 7.2: AGENT-HINTS artifact

Write agent hints to KB:

```javascript
kb_write_artifact({
  story_id: 'WKFL-006',
  artifact_type: 'evidence',
  artifact_name: 'AGENT-HINTS',
  content: {
    /* per-agent hints */
  },
})
```

Transform patterns into per-agent actionable hints.

For each agent (backend-coder, frontend-coder, code-review-\*, etc.):

- Extract relevant file patterns
- Extract relevant agent correlations
- Generate:
  - `priority_hints`: High-severity recommendations
  - `file_hints`: File-specific checks
  - `anti_patterns`: Behaviors to avoid
- Calculate:
  - `effectiveness_metrics`: {stories_involved, avg_review_cycles, failure_rate}

**Schema reference**: `.claude/schemas/agent-hints-schema.yaml`

#### 7.3: ANTI-PATTERNS report

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

#### 7.4: Dashboard Summary (AC-13)

Generated after each run. Provides a human-readable summary of mining results, printed to console.

```
Pattern Mining Dashboard - {YYYY-MM}
=====================================
Period: {start} to {end} | Stories: {N} | Generated: {ISO timestamp}

Summary
-------
File Patterns:      {N} total ({high} high, {medium} medium)
AC Patterns:        {N} total ({high} high, {medium} medium)
Agent Correlations: {N} total ({high} high, {medium} medium)
KB Entries:         {N} persisted

File Patterns (high severity):
  Pattern                    | Occurrences | Correlation | Confidence | Trend
  {file_pattern}             | {N}         | {score}     | {score}    | {trend}

AC Patterns (high severity):
  Phrase                     | Occurrences | Fail Rate   | Confidence | Trend
  "{phrase}"                 | {N}         | {rate}      | {score}    | {trend}

Agent Correlations:
  Primary Agent        | Secondary Agent     | Correlation | Confidence | Severity
  {agent}              | {agent}             | {score}     | {score}    | {sev}

Warnings: {list or "None"}
```

**Generation rules**:

- Escape all user-generated content when rendering
- Print to console after all KB artifacts are written
- Always regenerate on each run (not cumulative)

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
Data Source: {KB artifacts | KB search fallback}
Flags: {--all-epics | --trend | --use-verifications}

KB Artifacts Written:
- WKFL-006 evidence (PATTERNS {YYYY-MM})
- WKFL-006 evidence (AGENT-HINTS)

Patterns Detected:
- File Patterns: {N} ({high} high, {medium} medium)
- AC Patterns: {N} ({high} high, {medium} medium)
- Agent Correlations: {N} ({high} high, {medium} medium)

KB Lesson Entries Created: {N}
Agent Hints Injected: {N} agents

Trend Analysis: {not run | improving/regressing/stable summary}
Deduplicated: {N} patterns carried from previous period

Warnings: {list or "None"}
```

## Token Optimization

**High-Cost Operations**:

- Reading all KB verification artifacts: ~15k tokens
- Full AC text extraction: ~5k tokens

**Mitigations**:

1. Batch KB artifact reads: Process 10 stories at a time
2. Extract only needed fields: story_id, touched_files, code_review verdicts, AC text
3. Skip full artifact content - focus on structured data fields
4. Use kb_search to locate stories, kb_read_artifact for extraction

**Estimated Token Budget**: 35k-50k tokens for 30-day analysis

## Error Handling

| Scenario                              | Action                                                 |
| ------------------------------------- | ------------------------------------------------------ |
| <10 stories found                     | **Skip with warning** (do not continue)                |
| KB artifact read returns < 10 stories | Log warning, expand to KB search fallback              |
| No KB data at all                     | Error: "No story data found in KB for analysis period" |
| Invalid schema version                | Skip file, log warning                                 |
| Missing required fields               | Skip file, log warning                                 |
| KB unavailable                        | Log warning, continue without KB persistence           |
| Agent .md not found for injection     | Skip agent injection, log warning                      |
| index.html write fails                | Log warning, continue (non-blocking)                   |
| Previous period missing (--trend)     | Log warning, omit trend analysis                       |

## Limitations (MVP)

1. **Clustering**: Text similarity (Levenshtein) instead of embeddings
   - Upgrade path: WKFL-007 (embeddings integration)
2. **Automation**: Manual command only (no cron)
   - Infrastructure Notes: Weekly cron TBD in future story
3. **Data Source**: KB search fallback when verification artifact read returns < 10 stories
   - Will auto-use verification artifacts when they exist in KB
4. **Trend Comparison**: Requires previous period PATTERNS KB artifact to exist in WKFL-006

## Testing

Manual validation:

```bash
/pattern-mine --days 30
```

Expected behavior with sufficient KB story data:

- Analysis proceeds (≥10 stories)
- Detects file patterns from touched_files
- Detects AC vague phrases
- Writes PATTERNS and AGENT-HINTS KB artifacts to WKFL-006
- Creates KB lesson entries for high-severity patterns
- Injects hints into matching agent .md files (idempotent)
- Logs warning if KB search fallback was needed

## References

- PATTERNS artifact schema: `.claude/schemas/patterns-schema.yaml`
- AGENT-HINTS artifact schema: `.claude/schemas/agent-hints-schema.yaml`
- OUTCOME/verification artifact schema: `.claude/schemas/outcome-schema.md`
- KB artifact reads: `kb_read_artifact({ story_id: '{STORY_ID}', artifact_type: 'verification' })`

## Non-Negotiables

- Minimum 10 stories for meaningful analysis (**skip** if less - AC-1)
- Text similarity threshold 0.70 for MVP clustering; cluster_label required (AC-4)
- Default significance: 3+ occurrences, 0.60+ correlation
- KB search fallback support when artifact read returns < 10 stories (CRITICAL for MVP) - AC-8
- All four outputs generated per run (PATTERNS artifact, AGENT-HINTS artifact, ANTI-PATTERNS report, dashboard summary) - AC-13
- KB artifacts written to story WKFL-006 (AC-8)
- KB integration for high-severity patterns only
- Auto-inject hints idempotently (AC-5, AC-15)
- Confidence scoring: null if < 5 samples, 0.0-1.0 otherwise (AC-14)
- Cross-period deduplication section (AC-16)
- Metadata includes warnings and data quality info
