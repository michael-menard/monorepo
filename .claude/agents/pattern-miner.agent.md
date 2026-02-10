---
created: 2026-02-07
updated: 2026-02-07
version: 1.0.0
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
Generate PATTERNS-{month}.yaml, AGENT-HINTS.yaml, and ANTI-PATTERNS.md outputs.

## Inputs

From command invocation (via /pattern-mine):
- `--days N` (default: 30) - Rolling window of last N days
- `--month YYYY-MM` - Fixed month analysis
- `--min-occurrences N` (default: 3) - Minimum pattern occurrences
- `--min-correlation N` (default: 0.60) - Minimum correlation threshold
- `--use-verifications` - Force VERIFICATION.yaml mode (bypass OUTCOME.yaml)

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

## Pre-Flight Checks

Before analysis begins:

1. **Minimum Sample Size**: Require ≥10 stories
   - If <10: Log warning, offer to continue anyway
   - Warning message: "Only {N} stories found. Pattern mining works best with ≥10 stories. Continue? (y/n)"
   - If user declines: Exit gracefully

2. **Time Period Validation**:
   - If `--days`: Calculate start_date = today - N days
   - If `--month`: Parse YYYY-MM, validate format
   - Cannot specify both `--days` and `--month`

3. **Output Directory**: Create `.claude/patterns/` if missing

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

4. **Filtering**:
   - Include only patterns with:
     - `occurrences >= min_occurrences` (default: 3)
     - `correlation_score >= min_correlation` (default: 0.60)

5. **Severity Assignment**:
   - high: correlation_score >= 0.80
   - medium: correlation_score >= 0.60
   - low: correlation_score < 0.60 (excluded)

6. **Recommendation Generation**:
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

3. **Filtering**:
   - Include only phrases with:
     - `occurrences >= min_occurrences` (default: 3)
     - `failure_rate >= 0.40` OR `review_cycles_avg >= 2.5`

4. **Severity Assignment**:
   - high: failure_rate >= 0.60 OR review_cycles_avg >= 3.0
   - medium: failure_rate >= 0.40 OR review_cycles_avg >= 2.5
   - low: below medium thresholds (excluded)

5. **Improved Phrasing**:
   - Suggest specific alternatives:
     - "properly" → "validated with Zod schema", "authenticated via JWT"
     - "fast" → "responds within 200ms", "renders within 100ms"
     - "correctly" → "returns 200 status", "includes all required fields"

**Output structure**: See `.claude/schemas/patterns-schema.yaml` → `ac_patterns` section

### Step 4: Clustering Algorithm

**MVP Approach**: Text similarity using Levenshtein distance

**Threshold**: 0.70 (calibrated to approximate embedding similarity 0.85)

**Algorithm**:
1. For each pattern type (file, AC):
   - Compare all pairs of findings using Levenshtein distance
   - Normalize distance: `similarity = 1 - (distance / max_length)`
   - If `similarity >= 0.70`: Group together as cluster
2. For each cluster:
   - Select most frequent item as representative
   - Merge evidence from all cluster members
   - Sum occurrences

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

### Step 6: Output Generation

Generate three output files:

#### 6.1: PATTERNS-{month}.yaml

Filename: `.claude/patterns/PATTERNS-{YYYY-MM}.yaml`

Content:
- `schema: 1`
- `generated_at`: ISO timestamp
- `analysis_period`: {start, end, days}
- `stories_analyzed`: count
- `data_sources`: [outcome | verification]
- `file_patterns`: from Step 2
- `ac_patterns`: from Step 3
- `agent_correlations`: from Step 5
- `metadata`:
  - `min_sample_size`: 3
  - `min_correlation`: value used
  - `clustering_threshold`: 0.70
  - `clustering_method`: levenshtein
  - `warnings`: any warnings logged
  - `data_quality`: {outcome_files, verification_files, fallback_mode}

**Schema**: `.claude/schemas/patterns-schema.yaml`

#### 6.2: AGENT-HINTS.yaml

Filename: `.claude/patterns/AGENT-HINTS.yaml`

Transform patterns into per-agent actionable hints:

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

#### 6.3: ANTI-PATTERNS.md

Filename: `.claude/patterns/ANTI-PATTERNS.md`

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
- **Improved Phrasing**: {suggestion}
- **Evidence**: {STORY-IDs, AC-IDs}

{...}

## Agent Correlations

{...}
```

### Step 7: KB Integration

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

### Step 8: Completion Report

Output to console:

```
Pattern Mining Complete
======================

Analysis Period: {start} to {end} ({N} days)
Stories Analyzed: {N}
Data Source: {OUTCOME.yaml | VERIFICATION.yaml}

Outputs Generated:
- .claude/patterns/PATTERNS-{YYYY-MM}.yaml
- .claude/patterns/AGENT-HINTS.yaml
- .claude/patterns/ANTI-PATTERNS.md

Patterns Detected:
- File Patterns: {N} ({high} high, {medium} medium)
- AC Patterns: {N} ({high} high, {medium} medium)
- Agent Correlations: {N} ({high} high, {medium} medium)

KB Entries Created: {N}

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
| <10 stories found | Warn user, offer to continue |
| No OUTCOME.yaml files | Log warning, fallback to VERIFICATION.yaml |
| No data files at all | Error: "No data files found for analysis period" |
| Invalid schema version | Skip file, log warning |
| Missing required fields | Skip file, log warning |
| KB unavailable | Log warning, continue without KB persistence |

## Limitations (MVP)

1. **Clustering**: Text similarity (Levenshtein) instead of embeddings
   - Upgrade path: WKFL-007 (embeddings integration)
2. **Automation**: Manual command only (no cron)
   - Infrastructure Notes: Weekly cron TBD in future story
3. **Data Source**: VERIFICATION.yaml fallback until OUTCOME.yaml active
   - Will auto-switch when OUTCOME.yaml generation enabled

## Testing

Manual validation:
```bash
/pattern-mine --days 30 --use-verifications
```

Expected behavior with 37 VERIFICATION.yaml files:
- Analysis proceeds (≥10 stories)
- Detects file patterns from touched_files
- Detects AC vague phrases
- Generates all three output files
- Creates KB entries for high-severity patterns
- Logs warning about VERIFICATION.yaml fallback mode

## References

- PATTERNS.yaml schema: `.claude/schemas/patterns-schema.yaml`
- AGENT-HINTS.yaml schema: `.claude/schemas/agent-hints-schema.yaml`
- OUTCOME.yaml schema: `.claude/schemas/outcome-schema.md`
- Example VERIFICATION.yaml: `plans/stories/UAT/STORY-01711/_implementation/VERIFICATION.yaml`

## Non-Negotiables

- Minimum 10 stories for meaningful analysis (warn if less)
- Text similarity threshold 0.70 for MVP clustering
- Default significance: 3+ occurrences, 0.60+ correlation
- VERIFICATION.yaml fallback support (CRITICAL for MVP)
- All three outputs generated (PATTERNS, AGENT-HINTS, ANTI-PATTERNS)
- KB integration for high-severity patterns only
- Metadata includes warnings and data quality info
