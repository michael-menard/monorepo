# Integration Tests: pm-story-risk-predictor

Integration tests for WKFL-007 PM pipeline integration and graceful degradation.

---

## Test Suite: PM Pipeline Integration

### Test 1.1: Full PM pipeline with risk predictor

**Scenario**: PM story generation with risk predictor enabled

**Steps**:
1. User calls `/pm-story generate {INDEX_PATH} {STORY_ID}`
2. pm-story-generation-leader reads STORY-SEED.md
3. Spawns parallel workers (in single message):
   - pm-draft-test-plan
   - pm-uiux-recommendations (if UI)
   - pm-dev-feasibility-review
   - **pm-story-risk-predictor** (NEW)
4. Waits for all workers with TaskOutput
5. Synthesizes story file, merges predictions section
6. Writes story to filesystem
7. Persists to KB
8. Updates index

**Expected Output**:
- Story file `{STORY_ID}.md` created
- Predictions section present in YAML frontmatter:
  ```yaml
  predictions:
    split_risk: 0.7
    review_cycles: 3
    token_estimate: 180000
    confidence: medium
    similar_stories: [...]
  ```
- PM pipeline completes with `PM COMPLETE` signal
- Index updated with story entry

**Verification**:
- Story file exists
- Predictions section present and valid
- PM pipeline did not block
- All quality gates passed

### Test 1.2: PM pipeline with predictor timeout

**Scenario**: Risk predictor times out (>30 seconds)

**Steps**:
1. PM pipeline spawns risk predictor
2. Predictor takes >30 seconds (simulated delay)
3. PM pipeline timeout mechanism triggers
4. Pipeline continues without predictions

**Expected Output**:
- Story file created WITHOUT predictions section
- Log entry: "Risk predictor timeout, continuing without predictions"
- PM pipeline completes with `PM COMPLETE` signal

**Verification**:
- Story file exists
- No predictions section in YAML
- Pipeline did not block or fail
- Index updated successfully

### Test 1.3: PM pipeline with predictor crash

**Scenario**: Risk predictor throws unhandled exception

**Steps**:
1. PM pipeline spawns risk predictor
2. Predictor crashes (e.g., syntax error in STORY-SEED.md)
3. Predictor returns error signal
4. PM pipeline catches error and continues

**Expected Output**:
- Story file created WITHOUT predictions section
- Log entry: "Risk predictor failed: {error message}"
- PM pipeline completes with `PM COMPLETE` signal

**Verification**:
- Story file exists
- Error logged with sufficient context
- Pipeline did not block
- Index updated

---

## Test Suite: Graceful Degradation Scenarios

### Test 2.1: KB unavailable (connection error)

**Scenario**: Knowledge Base is unavailable when predictor runs

**Steps**:
1. Risk predictor attempts kb_search for similar stories
2. KB connection fails (timeout or error)
3. Predictor catches error and returns fallback predictions

**Expected Output**:
```yaml
predictions:
  split_risk: 0.5
  review_cycles: 2
  token_estimate: 150000
  confidence: low
  similar_stories: []
  generated_at: "2026-02-07T10:00:00Z"
  model: haiku
  wkfl_version: "007-v1"
```

**Verification**:
- Fallback predictions returned
- confidence = low
- similar_stories = [] (empty)
- No exception thrown
- PM pipeline continues

### Test 2.2: No WKFL-006 patterns available

**Scenario**: PATTERNS-{month}.yaml does not exist (WKFL-006 not yet implemented)

**Steps**:
1. Risk predictor attempts to read PATTERNS-{month}.yaml
2. File not found
3. Predictor logs warning and uses heuristics-only mode

**Expected Output**:
- Predictions calculated using heuristics only (AC count + scope keywords)
- No pattern boost applied
- confidence = low or medium (depending on similar stories)
- Log entry: "WKFL-006 patterns unavailable, using heuristics-only mode"

**Verification**:
- split_risk calculated without pattern boost
- review_cycles calculated without cycle_predictors
- Predictions still returned
- PM pipeline continues

### Test 2.3: No similar stories found

**Scenario**: KB search returns 0 results or all below similarity threshold

**Steps**:
1. Risk predictor queries KB for similar stories
2. KB returns 0 results OR all have similarity_score < 0.70
3. Predictor falls back to global default for token_estimate

**Expected Output**:
```yaml
predictions:
  split_risk: 0.5  # Heuristics only
  review_cycles: 2  # Heuristics only
  token_estimate: 150000  # Global default
  confidence: low
  similar_stories: []
  ...
```

**Verification**:
- token_estimate = 150000 (fallback)
- similar_stories = []
- confidence = low
- Predictions still returned

### Test 2.4: Malformed OUTCOME.yaml files

**Scenario**: Similar stories found, but some OUTCOME.yaml files are malformed

**Steps**:
1. KB search returns 5 similar stories
2. Load OUTCOME.yaml for each:
   - 3 parse successfully
   - 2 fail to parse (invalid YAML)
3. Predictor skips malformed files and uses 3 valid token values

**Expected Output**:
- token_estimate = median of 3 valid values
- similar_stories array includes only 3 stories (malformed ones skipped)
- Log warnings for skipped files
- Predictions returned with confidence = medium

**Verification**:
- No exception thrown
- Partial data used successfully
- Warnings logged with file paths
- Pipeline continues

### Test 2.5: Cold-start scenario (no historical data)

**Scenario**: First story in epic, no OUTCOME.yaml files exist yet

**Steps**:
1. Risk predictor runs for first story in epic
2. KB search returns 0 results (no historical data)
3. WKFL-006 patterns not yet available
4. Predictor uses pure heuristics and global defaults

**Expected Output**:
```yaml
predictions:
  split_risk: 0.5  # Heuristics only
  review_cycles: 2  # Heuristics only
  token_estimate: 150000  # Global default
  confidence: low
  similar_stories: []
  ...
```

**Verification**:
- Fallback values used
- confidence = low
- No errors or exceptions
- Pipeline continues

---

## Test Suite: Accuracy Tracking Integration

### Test 3.1: Full story completion with accuracy tracking

**Scenario**: Story completes with predictions, OUTCOME.yaml generated, accuracy tracked

**Steps**:
1. Story created with predictions in YAML frontmatter
2. Story implementation completes
3. dev-documentation-leader generates OUTCOME.yaml
4. dev-documentation-leader triggers accuracy tracking (Step 5.5)
5. Accuracy tracker:
   - Loads predictions from story YAML
   - Loads actuals from OUTCOME.yaml
   - Calculates variance
   - Writes to KB with tags

**Expected Output**:
- KB entry created with category: 'prediction-accuracy'
- Tags: ['prediction-accuracy', 'wkfl-007', 'story:{story_id}', 'date:{YYYY-MM}']
- Variance calculated for cycles, tokens, split_outcome
- OUTCOME.yaml generation completes successfully

**Verification**:
- KB entry exists with correct structure
- Variance calculations accurate
- Story status updated to ready-for-code-review
- Accuracy tracking did not block documentation phase

### Test 3.2: Accuracy tracking with missing predictions

**Scenario**: Story created before WKFL-007, no predictions section

**Steps**:
1. Old story (no predictions) completes
2. dev-documentation-leader triggers accuracy tracking
3. Accuracy tracker checks for predictions, finds none
4. Tracker skips gracefully with log message

**Expected Output**:
- Log entry: "No predictions found for story, skipping accuracy tracking"
- No KB entry created
- OUTCOME.yaml generation completes
- Story status updated

**Verification**:
- No error thrown
- Documentation phase completes
- No KB entry created
- Story status updated successfully

### Test 3.3: Accuracy tracking with KB unavailable

**Scenario**: KB unavailable when accuracy tracking runs

**Steps**:
1. Story completes with predictions
2. dev-documentation-leader triggers accuracy tracking
3. Accuracy tracker attempts kb_add_lesson
4. KB connection fails
5. Tracker logs warning and continues

**Expected Output**:
- Warning logged: "Failed to write prediction accuracy to KB"
- OUTCOME.yaml generation completes
- Story status updated
- Documentation phase completes with `DOCUMENTATION COMPLETE`

**Verification**:
- No exception thrown
- Documentation phase not blocked
- Warning logged with error details
- Story status updated successfully

---

## Test Suite: Agent File Structure Validation

### Test 4.1: pm-story-risk-predictor.agent.md exists

**Verification**:
- File exists at `.claude/agents/pm-story-risk-predictor.agent.md`
- File has valid YAML frontmatter with required fields:
  - created
  - updated
  - version
  - type: worker
  - model: haiku
  - spawned_by: [pm-story-generation-leader]

### Test 4.2: pm-story-generation-leader.agent.md updated

**Verification**:
- Workers table includes Risk Predictor entry
- Execution flow references pm-spawn-patterns.md
- pm-spawn-patterns.md includes Risk Predictor pattern

### Test 4.3: dev-documentation-leader.agent.md updated

**Verification**:
- Step 5.5 exists: "Trigger Prediction Accuracy Tracking"
- Accuracy tracking trigger documented
- Fallback behavior specified
- Never blocks OUTCOME.yaml generation

### Test 4.4: Test files exist

**Verification**:
- `.claude/agents/__tests__/pm-story-risk-predictor.test.md` exists
- `.claude/agents/__tests__/pm-story-risk-predictor-integration.test.md` exists
- Test coverage for all ACs documented

---

## Test Data Setup

**Mock STORY-SEED.md:**
```yaml
---
story_id: WISH-2099
epic: wishlist
---
acceptance_criteria:
  - AC-1: Display wishlist
  - AC-2: Add item
  - AC-3: Remove item
  - AC-4: Update quantity
  - AC-5: Save to backend

scope: "Full-stack wishlist feature with frontend UI and backend API integration"
```

**Mock OUTCOME.yaml (for similar story):**
```yaml
schema_version: 1
story_id: WISH-2042
epic_id: wishlist
completed_at: "2026-01-15T10:00:00Z"

phases:
  dev_implementation:
    review_cycles: 2
    duration_ms: 3600000

totals:
  tokens_total: 175000

split_occurred: false
```

**Mock PATTERNS-{month}.yaml:**
```yaml
file_patterns:
  - pattern: "**/routes.ts"
    correlation: 0.78
    finding_type: lint_failure

ac_patterns:
  - pattern: "intuitive"
    correlation: 0.80
    finding_type: verification_failure

cycle_predictors:
  - predictor: "files_touched > 5"
    avg_cycles: 2.8
    baseline_cycles: 1.8
```

---

## Test Execution Notes

For workflow/agent stories, integration tests are **conceptual specifications** that verify:
1. Agent files exist with correct structure
2. Pipeline integration points documented
3. Graceful degradation paths specified
4. Error handling behaviors defined

Manual verification checklist:
- [ ] pm-story-risk-predictor.agent.md created
- [ ] pm-story-generation-leader.agent.md updated (workers table)
- [ ] pm-spawn-patterns.md updated (risk predictor pattern)
- [ ] dev-documentation-leader.agent.md updated (accuracy tracking)
- [ ] Unit tests document algorithm specifications
- [ ] Integration tests document pipeline behavior
- [ ] All 7 ACs have evidence mapped

---

## Success Criteria

Integration tests pass when:
1. **Agent files exist** with valid frontmatter and structure
2. **PM pipeline integration** documented in pm-story-generation-leader
3. **Accuracy tracking** documented in dev-documentation-leader
4. **Graceful degradation** paths specified for all failure modes
5. **Error handling** never blocks story generation
6. **Test documentation** covers all ACs (AC-1 through AC-7)
