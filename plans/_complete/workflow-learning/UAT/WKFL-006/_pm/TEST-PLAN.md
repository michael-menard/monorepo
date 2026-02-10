# Test Plan: WKFL-006 - Cross-Story Pattern Mining

## Scope Summary

- **Endpoints touched:** None (workflow analysis agent)
- **UI touched:** No
- **Data/storage touched:** Yes (reads OUTCOME.yaml, VERIFICATION.yaml files; writes PATTERNS-{month}.yaml, AGENT-HINTS.yaml, ANTI-PATTERNS.md; KB writes)

## Happy Path Tests

### Test 1: Basic Pattern Mining Run (≥10 stories with patterns)

**Setup:**
- Create 15 synthetic OUTCOME.yaml files with patterns:
  - 5 files with token overrun (actual > estimated by 20%+)
  - 4 files with routes.ts lint failures
  - 3 files with vague AC patterns ("intuitive", "obvious")
  - 3 files with agent correlation patterns (security ↔ architecture disagreements)
- Place files in test fixture directory

**Action:**
- Run: `/pattern-mine --days 30`

**Expected outcome:**
- PATTERNS-{month}.yaml generated with:
  - file_patterns section: routes.ts correlation ≥ 0.75
  - ac_patterns section: vague phrase pattern correlation ≥ 0.60
  - agent_correlations section: security/architecture disagreement rate
  - cycle_predictors section (if applicable)
- AGENT-HINTS.yaml generated with per-agent hints
- ANTI-PATTERNS.md generated with human-readable patterns
- KB writes for significant patterns (min 3 occurrences)

**Evidence:**
- All three output files exist
- PATTERNS-{month}.yaml validates against schema
- file_patterns array contains routes.ts entry
- ac_patterns array contains vague phrase entry
- KB search returns persisted patterns

### Test 2: Clustering Similar Findings (Embedding Similarity)

**Setup:**
- Create 12 synthetic OUTCOME.yaml files with similar findings:
  - 4 with "import order violation in routes.ts"
  - 4 with "import ordering issue in routes.ts"
  - 4 with "missing import sort in route files"

**Action:**
- Run: `/pattern-mine --days 30`

**Expected outcome:**
- Findings clustered into single pattern (similarity > 0.85)
- PATTERNS-{month}.yaml shows clustered pattern with sample_size=12
- Pattern description representative of all variants

**Evidence:**
- Clustered findings grouped in output
- Single pattern entry (not 3 separate)
- Recommendation actionable for agent enhancement

### Test 3: Dual-Mode Data Source (VERIFICATION.yaml Fallback)

**Setup:**
- No OUTCOME.yaml files present
- 20 VERIFICATION.yaml files with lint failures

**Action:**
- Run: `/pattern-mine --days 30`

**Expected outcome:**
- Falls back to VERIFICATION.yaml analysis
- Warning logged: "Using VERIFICATION.yaml fallback (no OUTCOME.yaml files found)"
- Patterns still generated from VERIFICATION.yaml findings
- Output format identical to OUTCOME.yaml mode

**Evidence:**
- Warning in command output
- PATTERNS-{month}.yaml generated
- file_patterns section populated from VERIFICATION.yaml data

## Error Cases

### Error 1: Insufficient Data (< 10 stories)

**Setup:**
- Only 7 OUTCOME.yaml files available

**Action:**
- Run: `/pattern-mine --days 30`

**Expected outcome:**
- Command skips with warning: "Insufficient stories for pattern mining (found 7, requires 10)"
- No output files generated
- Exit code 0 (graceful skip, not error)

**Evidence:**
- Warning message in output
- No PATTERNS-{month}.yaml file created
- Command exits cleanly

### Error 2: Invalid OUTCOME.yaml Schema

**Setup:**
- 15 OUTCOME.yaml files, 3 with invalid schema (missing required fields)

**Action:**
- Run: `/pattern-mine --days 30`

**Expected outcome:**
- Invalid files skipped with warning per file
- Analysis proceeds with 12 valid files
- Pattern mining succeeds

**Evidence:**
- Warning logs for 3 invalid files
- PATTERNS-{month}.yaml shows stories_analyzed: 12
- Output generated successfully

### Error 3: No Patterns Detected

**Setup:**
- 20 OUTCOME.yaml files with no recurring patterns (all unique)

**Action:**
- Run: `/pattern-mine --days 30`

**Expected outcome:**
- PATTERNS-{month}.yaml generated with empty arrays
- ANTI-PATTERNS.md states "No significant patterns detected"
- AGENT-HINTS.yaml empty or minimal
- No KB writes (no patterns to persist)

**Evidence:**
- Output files exist but show no patterns
- Command completes successfully
- Clear messaging about lack of patterns

## Edge Cases (Reasonable)

### Edge Case 1: Threshold Boundary (Exactly 3 Occurrences)

**Setup:**
- Pattern appears exactly 3 times (minimum threshold)

**Action:**
- Run: `/pattern-mine --days 30`

**Expected outcome:**
- Pattern included in output (meets threshold)
- sample_size: 3 in PATTERNS-{month}.yaml

**Evidence:**
- Pattern appears in output
- Threshold logic correct (≥ 3, not > 3)

### Edge Case 2: Similarity Boundary (0.84 vs 0.85)

**Setup:**
- Two findings with similarity 0.84 (below threshold)
- Two findings with similarity 0.86 (above threshold)

**Action:**
- Run: `/pattern-mine --days 30`

**Expected outcome:**
- 0.84 pair NOT clustered (separate patterns)
- 0.86 pair clustered (single pattern)

**Evidence:**
- Clustering respects exact threshold
- Output shows 3 patterns (not 2)

### Edge Case 3: Multiple Pattern Types in Single Story

**Setup:**
- Single OUTCOME.yaml with multiple patterns:
  - Token overrun
  - routes.ts lint failure
  - Vague AC pattern

**Action:**
- Run: `/pattern-mine --days 30`

**Expected outcome:**
- Story contributes to all three pattern types
- Each pattern type tracked independently
- No double-counting issues

**Evidence:**
- file_patterns sample includes story
- ac_patterns sample includes same story
- Token patterns sample includes same story

### Edge Case 4: Large Dataset (100+ stories)

**Setup:**
- 120 OUTCOME.yaml files

**Action:**
- Run: `/pattern-mine --days 30`

**Expected outcome:**
- Analysis completes within token budget (70,000 tokens)
- Patterns detected across full dataset
- No memory or performance issues

**Evidence:**
- Command completes successfully
- Output reflects full dataset analysis
- Token usage logged and within budget

### Edge Case 5: Empty VERIFICATION.yaml Files

**Setup:**
- 15 VERIFICATION.yaml files with empty findings arrays

**Action:**
- Run: `/pattern-mine --days 30`

**Expected outcome:**
- Files counted but no patterns extracted
- Warning: "No findings in 15 verification files"
- Graceful skip

**Evidence:**
- Warning logged
- No patterns output
- Clean exit

## Required Tooling Evidence

### Backend

Since this is a workflow analysis agent (no API endpoints):

**Agent Execution:**
- Command: `/pattern-mine --days 30 [--use-outcomes] [--use-verifications]`
- Pattern-miner agent invoked with correct parameters
- Agent completes with COMPLETE signal

**File System Checks:**
- PATTERNS-{month}.yaml exists at `.claude/patterns/PATTERNS-{YYYY-MM}.yaml`
- AGENT-HINTS.yaml exists at `.claude/patterns/AGENT-HINTS.yaml`
- ANTI-PATTERNS.md exists at `.claude/patterns/ANTI-PATTERNS.md`

**Schema Validation:**
- PATTERNS-{month}.yaml validates against `.claude/schemas/patterns-schema.yaml`
- AGENT-HINTS.yaml validates against `.claude/schemas/agent-hints-schema.yaml`
- Required sections present: mining_period, stories_analyzed, file_patterns, ac_patterns

**KB Verification:**
- Query: `kb_search({ query: "pattern mining {month}", entry_type: "lesson", limit: 10 })`
- Results contain persisted patterns from mining run
- Each pattern has: title, category="pattern", story_id, sample_size

### Frontend

Not applicable - no UI component.

## Risks to Call Out

### Risk 1: Embedding Similarity Implementation Deferred

**Description:**
AC-4 requires clustering with embedding similarity > 0.85, but embeddings require external API (OpenAI) or local model (sentence-transformers).

**Mitigation Options:**
1. Start with simple text similarity (Levenshtein distance) as MVP
2. Document embedding upgrade as future enhancement
3. Accept partial AC-4 compliance (clustering without embeddings)

**Test Impact:**
- Test 2 (Clustering) may use text similarity instead of embeddings
- Adjust expected correlation thresholds accordingly

### Risk 2: OUTCOME.yaml Data Availability

**Description:**
OUTCOME.yaml generation is defined (WKFL-001) but not yet activated. Zero files currently exist in repository.

**Mitigation:**
- Implement dual-mode support (VERIFICATION.yaml fallback)
- Test primarily with VERIFICATION.yaml data (37 files available)
- Add OUTCOME.yaml tests as future enhancement when data available

**Test Impact:**
- Most tests use VERIFICATION.yaml fixtures
- OUTCOME.yaml tests marked as "future" until generation active

### Risk 3: Pattern Detection Threshold Subjectivity

**Description:**
Determining "significant" patterns requires threshold tuning (3+ occurrences, 20%+ variance, 0.85 similarity).

**Mitigation:**
- Use thresholds from workflow-retro agent as baseline
- Document threshold rationale in patterns schema
- Allow future calibration based on feedback

**Test Impact:**
- Edge case tests critical for validating threshold logic
- May need threshold adjustments after initial runs

### Risk 4: Output Schema Not Yet Defined

**Description:**
PATTERNS-{month}.yaml and AGENT-HINTS.yaml schemas must be defined before implementation.

**Mitigation:**
- Define schemas in `.claude/schemas/` during implementation phase
- Validate schemas in tests
- Use story.yaml technical_notes section as initial schema draft

**Test Impact:**
- Tests blocked until schemas defined
- Schema validation tests required before agent tests

### Risk 5: Weekly Cron Infrastructure

**Description:**
Story mentions "weekly cron" but no cron infrastructure currently exists.

**Mitigation:**
- Implement `/pattern-mine` command first (manual trigger)
- Document cron setup for future infrastructure work
- Out of scope for initial implementation

**Test Impact:**
- No cron tests required for MVP
- Command-based tests sufficient
