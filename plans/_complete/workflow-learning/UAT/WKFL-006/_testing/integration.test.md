# Pattern Mining Integration Tests

End-to-end test suite for full pattern-miner workflow.

---

## Test 1: Full Mining Flow (Happy Path)

### Scenario
Run pattern-miner with 37 existing VERIFICATION.yaml files.

### Command
```bash
/pattern-mine --days 30 --use-verifications
```

### Pre-Conditions
- 37 VERIFICATION.yaml files exist in `plans/`
- `.claude/schemas/patterns-schema.yaml` exists
- `.claude/schemas/agent-hints-schema.yaml` exists
- `.claude/patterns/` directory created (or will be created)

### Expected Execution Flow

1. **Data Loading**:
   - Search for OUTCOME.yaml: 0 files found
   - Fallback to VERIFICATION.yaml: 37 files found
   - Log warning: "OUTCOME.yaml unavailable - using VERIFICATION.yaml fallback"
   - Filter by date (last 30 days): ~15-20 stories
   - Check minimum: ≥10 stories → PROCEED

2. **Pattern Detection**:
   - Extract touched_files from all stories
   - Group by file patterns
   - Calculate correlations with failures
   - Filter: occurrences ≥3, correlation ≥0.60
   - Expected: 5-10 file patterns detected

3. **AC Pattern Detection**:
   - Extract AC text from qa_verify.acs_verified
   - Scan for vague phrases (properly, correctly, etc.)
   - Calculate impact metrics (failure_rate, review_cycles_avg)
   - Filter: occurrences ≥3, impact ≥thresholds
   - Expected: 3-5 AC patterns detected

4. **Clustering**:
   - Apply Levenshtein distance similarity
   - Threshold: 0.70
   - Group similar file patterns (e.g., `apps/api/*/routes.ts`)
   - Expected: Reduce patterns by ~30% through clustering

5. **Agent Correlations**:
   - Detect agent behavior patterns
   - Calculate correlations
   - Expected: 2-4 agent correlations

6. **Output Generation**:
   - Generate `.claude/patterns/PATTERNS-2026-02.yaml`
   - Generate `.claude/patterns/AGENT-HINTS.yaml`
   - Generate `.claude/patterns/ANTI-PATTERNS.md`
   - All files created successfully

7. **KB Integration**:
   - For each high-severity pattern:
     - Call `kb_add_lesson({ category: 'pattern', ... })`
     - Expected: 3-8 KB entries created
   - If KB unavailable: Log warning, continue

8. **Completion Report**:
   ```
   Pattern Mining Complete
   ======================
   
   Analysis Period: 2026-01-08 to 2026-02-07 (30 days)
   Stories Analyzed: 17
   Data Source: VERIFICATION.yaml
   
   Outputs Generated:
   - .claude/patterns/PATTERNS-2026-02.yaml
   - .claude/patterns/AGENT-HINTS.yaml
   - .claude/patterns/ANTI-PATTERNS.md
   
   Patterns Detected:
   - File Patterns: 8 (3 high, 5 medium)
   - AC Patterns: 4 (2 high, 2 medium)
   - Agent Correlations: 3 (2 high, 1 medium)
   
   KB Entries Created: 7
   
   Warnings:
   - OUTCOME.yaml unavailable - used VERIFICATION.yaml fallback
   ```

### Assertions

1. **PATTERNS-2026-02.yaml**:
   - Valid YAML syntax
   - Matches schema from `.claude/schemas/patterns-schema.yaml`
   - Contains:
     - `schema: 1`
     - `generated_at` timestamp
     - `analysis_period` with start/end/days
     - `stories_analyzed` count
     - `data_sources: [verification]`
     - `file_patterns[]` with ≥1 entries
     - `ac_patterns[]` with ≥1 entries
     - `metadata.fallback_mode: true`
     - `metadata.warnings` includes OUTCOME.yaml fallback message

2. **AGENT-HINTS.yaml**:
   - Valid YAML syntax
   - Matches schema from `.claude/schemas/agent-hints-schema.yaml`
   - Contains:
     - `schema: 1`
     - `agents[]` with at least `backend-coder` entry
     - Each agent has:
       - `priority_hints[]`
       - `file_hints[]`
       - `effectiveness_metrics`

3. **ANTI-PATTERNS.md**:
   - Valid Markdown syntax
   - Contains sections:
     - "# Anti-Patterns Detected"
     - "## Overview"
     - "## File Patterns"
     - "## AC Patterns"
   - Human-readable format
   - Evidence includes STORY-IDs

4. **KB Entries**:
   - `kb_add_lesson` called for high-severity patterns only
   - Each entry has:
     - `category: 'pattern'`
     - `tags: ['pattern', 'workflow', 'cross-story']`
     - `related_stories: [...]`

---

## Test 2: Fallback Mode (VERIFICATION.yaml)

### Scenario
Verify fallback behavior when OUTCOME.yaml unavailable.

### Command
```bash
/pattern-mine --days 30
```

### Expected Behavior

1. Search for OUTCOME.yaml: 0 files
2. Automatically fallback to VERIFICATION.yaml: 37 files
3. Log warning in console and metadata
4. Proceed with VERIFICATION.yaml data
5. Output metadata includes:
   ```yaml
   metadata:
     data_quality:
       outcome_files: 0
       verification_files: 37
       fallback_mode: true
     warnings:
       - "OUTCOME.yaml unavailable - used VERIFICATION.yaml fallback"
   ```

### Assertions

- No errors or failures
- All outputs generated successfully
- Warning appears in both console and PATTERNS.yaml metadata
- Data extracted from VERIFICATION.yaml fields:
  - `touched_files` from root level
  - `code_review.*` verdicts
  - `qa_verify.acs_verified` for AC text
  - `iteration` for review cycles

---

## Test 3: Minimum Stories Warning

### Scenario
Run pattern-miner with only 5 stories (below threshold).

### Setup
Filter to recent week with limited activity.

### Command
```bash
/pattern-mine --days 7
```

### Expected Behavior

1. Load stories: 5 found (< 10 minimum)
2. Display warning:
   ```
   Only 5 stories found. Pattern mining works best with ≥10 stories. Continue? (y/n)
   ```
3. Wait for user input:
   - If `y`: Proceed with warning in metadata
   - If `n`: Exit gracefully with message "Pattern mining cancelled"

### Assertions

**If user confirms (y)**:
- Analysis proceeds
- Outputs generated
- Metadata includes:
  ```yaml
  metadata:
    warnings:
      - "Sample size (5) below recommended minimum (10) - results may not be statistically significant"
  ```

**If user declines (n)**:
- No outputs generated
- Console message: "Pattern mining cancelled"
- Exit code: 0 (graceful exit, not error)

---

## Test 4: KB Integration

### Scenario
Verify KB persistence of high-severity patterns.

### Command
```bash
/pattern-mine --days 30 --use-verifications
```

### Expected KB Calls

For each high-severity pattern (severity: high):

```javascript
kb_add_lesson({
  category: 'pattern',
  title: 'Pattern: apps/api/*/routes.ts - High lint failure correlation',
  content: `
    File Pattern: apps/api/*/routes.ts
    Occurrences: 8 stories
    Correlation Score: 0.85 (high)
    
    Common Issues:
    - Missing type annotations on handler params
    - Implicit any on request/response objects
    
    Recommendation:
    Add lint pre-check to backend-coder for route handlers. Consider type annotation template.
    
    Evidence:
    - WISH-001: Missing type annotations in handler params
    - WISH-003: Implicit any on request object
    - ...
  `,
  tags: ['pattern', 'workflow', 'cross-story', 'high', 'file_pattern'],
  source: 'pattern-miner',
  related_stories: ['WISH-001', 'WISH-003', 'WISH-007', 'WISH-010']
})
```

### Assertions

1. KB called only for high-severity patterns (not medium/low)
2. Each pattern type creates separate entry (file, AC, agent correlation)
3. KB content includes:
   - Pattern description
   - Occurrences and correlation score
   - Common issues
   - Recommendations
   - Evidence with story IDs
4. Tags include: `['pattern', 'workflow', 'cross-story', '{severity}', '{pattern_type}']`

### KB Unavailable Scenario

If `kb_add_lesson` throws error:
- Log warning: "KB unavailable - patterns not persisted to knowledge base"
- Continue execution (don't fail)
- Include warning in metadata
- Outputs still generated

---

## Test 5: Custom Thresholds

### Scenario
Run with custom significance thresholds.

### Command
```bash
/pattern-mine --days 30 --min-occurrences 5 --min-correlation 0.70
```

### Expected Behavior

1. Pattern detection uses custom thresholds:
   - Filter: occurrences ≥5 (instead of default 3)
   - Filter: correlation ≥0.70 (instead of default 0.60)
2. Fewer patterns detected (stricter criteria)
3. Metadata reflects custom values:
   ```yaml
   metadata:
     min_sample_size: 5
     min_correlation: 0.70
   ```

### Assertions

- All detected patterns have:
  - `occurrences ≥ 5`
  - `correlation_score ≥ 0.70`
- Patterns below thresholds excluded
- No errors or warnings about thresholds

---

## Test 6: Time Period Filtering

### Scenario A: Rolling Window

**Command**: `/pattern-mine --days 60`

**Expected**:
- Analysis period: Last 60 days from today
- `analysis_period.days: 60`
- `analysis_period.start`: 60 days ago
- `analysis_period.end`: today

### Scenario B: Fixed Month

**Command**: `/pattern-mine --month 2026-01`

**Expected**:
- Analysis period: January 2026 only
- `analysis_period.start: "2026-01-01"`
- `analysis_period.end: "2026-01-31"`
- `analysis_period.days: 31`
- Output filename: `PATTERNS-2026-01.yaml`

### Scenario C: Invalid Parameters

**Command**: `/pattern-mine --days 30 --month 2026-01`

**Expected**:
- Error: "Cannot specify both --days and --month"
- Exit without processing

---

## Test 7: Schema Validation

### Scenario
Verify output files match schemas.

### Setup
Run pattern-miner, then validate outputs.

### Validation Commands

```bash
# After /pattern-mine completes:

# Validate PATTERNS.yaml against schema
# (Manual inspection - YAML schema validator not in stack)

# Validate AGENT-HINTS.yaml against schema
# (Manual inspection)
```

### Assertions

1. **PATTERNS.yaml**:
   - All required fields present
   - Field types match schema (string, number, array, object)
   - `file_patterns[]` entries have all required fields
   - `ac_patterns[]` entries have all required fields
   - Severity values: only `high` or `medium` (no `low`)

2. **AGENT-HINTS.yaml**:
   - All required fields present
   - `agents[]` entries have required sections
   - `priority_hints[]` entries complete
   - `effectiveness_metrics` calculated

---

## Test 8: No Patterns Found

### Scenario
Run with filters that produce no results.

### Command
```bash
/pattern-mine --days 7 --min-occurrences 20 --min-correlation 0.95
```

### Expected Behavior

1. Load stories: 5 found
2. Pattern detection: 0 patterns meet thresholds
3. Generate outputs with empty pattern arrays
4. Log warning in metadata

### Output Structure

```yaml
schema: 1
# ... metadata ...

file_patterns: []
ac_patterns: []
agent_correlations: []

metadata:
  warnings:
    - "No patterns met significance thresholds (min_occurrences: 20, min_correlation: 0.95)"
    - "Sample size (5) below recommended minimum (10)"
```

### Assertions

- Outputs still generated (not errors)
- Empty pattern arrays valid
- Warning in metadata explains why
- ANTI-PATTERNS.md includes "No patterns detected" message

---

## Test 9: Data Quality

### Scenario
Verify handling of incomplete/invalid data files.

### Setup
Include VERIFICATION.yaml files with:
- Missing `touched_files` field
- Invalid schema version
- Missing required code_review sections

### Expected Behavior

1. Load all VERIFICATION.yaml files
2. Skip files with schema version != 4
   - Log: "Story {ID}: Unsupported schema version {N}, skipping"
3. Skip stories missing critical fields
   - Log: "Story {ID}: Missing touched_files, skipping file pattern analysis"
4. Continue with valid files
5. Include skip reasons in metadata:
   ```yaml
   metadata:
     processing:
       stories_skipped: 3
       skip_reasons:
         - story_id: "OLD-001"
           reason: "Unsupported schema version 2"
         - story_id: "INCOMPLETE-002"
           reason: "Missing touched_files field"
   ```

### Assertions

- No errors/failures from invalid data
- Valid files processed successfully
- Skip reasons logged clearly
- Warning count in metadata matches skipped count

---

## Test Execution

These are integration test scenarios for manual validation.

**Test Plan**:
1. Run each test scenario manually
2. Verify outputs match expected behavior
3. Check console output, generated files, KB entries
4. Confirm error handling works as documented

**Success Criteria**:
- All 9 test scenarios pass
- No unexpected errors
- Outputs match schemas
- Edge cases handled gracefully
