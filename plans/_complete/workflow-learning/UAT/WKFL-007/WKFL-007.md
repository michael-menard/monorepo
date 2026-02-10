---
id: WKFL-007
title: "Story Risk Predictor"
status: backlog
priority: P2
phase: adaptation
created_at: 2026-02-06T17:00:00-07:00
epic: workflow-learning
prefix: WKFL
tags:
  - adaptation
  - prediction
  - risk
dependencies:
  - WKFL-006
estimated_tokens: 45000
---

# WKFL-007: Story Risk Predictor

## Context

Before elaboration begins, PMs and analysts have limited signal about story risk. Questions like "Will this split?" or "How many review cycles?" or "What's the token budget?" rely on manual estimation without historical data. This leads to:
- Under-scoped stories requiring mid-flight splits
- Inaccurate token budgets causing overruns
- No visibility into high-risk stories before commitment

The Workflow Learning System (WKFL epic) is building a learning flywheel: stories complete → outcomes captured (WKFL-001) → patterns mined (WKFL-006) → predictions improve future stories.

### Current State

**Available Infrastructure:**
- OUTCOME.yaml from WKFL-001 captures historical story metrics (tokens, cycles, splits)
- KB MCP Server provides semantic search for similar stories
- PM story generation pipeline creates stories with YAML frontmatter
- Pattern mining (WKFL-006) will produce pattern correlation data

**Problem:**
Without predictive signals at story generation time:
- **Split Risk Unknown**: Stories with 10+ ACs often split, but we don't flag this proactively
- **Review Cycle Variance**: Complex stories average 2.8 cycles, simple stories 1.2 cycles - but we can't predict which is which
- **Token Budget Guesswork**: Estimates are based on gut feel, not similar story actuals
- **No Learning Loop**: Pattern mining (WKFL-006) produces insights, but they're not actionable at story creation time

This creates rework, budget overruns, and missed opportunities to split high-risk stories early.

### Dependency Note

WKFL-007 depends on WKFL-006 (Cross-Story Pattern Mining) which is currently in `pending` status. WKFL-006 provides:
- PATTERNS-{month}.yaml with file patterns, AC patterns, cycle predictors
- AGENT-HINTS.yaml for query optimization
- KB entries tagged 'pattern' for similar story search

**Mitigation**: WKFL-007 implements degraded mode with heuristic-only predictions as fallback when WKFL-006 data unavailable. This allows implementation to proceed while maintaining graceful degradation.

## Goal

Build a story risk predictor agent that runs during PM story generation and outputs predictions to inform scoping decisions.

The predictor will:
1. **Predict split_risk (0.0-1.0)**: Probability story will split mid-implementation
   - Based on: AC count, scope keywords, file count estimates
   - Informed by: WKFL-006 patterns (AC patterns, file patterns)
   - Example: Story with 8 ACs touching "frontend + backend + database" → 0.7 split risk

2. **Predict review_cycles (integer)**: Expected code review iterations
   - Based on: Complexity signals, file types, domain
   - Informed by: WKFL-006 cycle predictors
   - Example: Story touching routes.ts + auth logic → 3 cycles (routes.ts has 0.78 correlation with lint failures)

3. **Predict token_estimate (integer)**: Predicted total token cost
   - Based on: Similar story token costs (via KB similarity search)
   - Informed by: OUTCOME.yaml from completed stories
   - Example: Similar wishlist CRUD stories averaged 180K tokens → estimate 175K-185K

4. **Include similar_stories (reference array)**: Top 3-5 most similar completed stories
   - Based on: KB semantic search + epic/domain matching
   - Includes: story_id, similarity_score, actual outcomes (cycles, tokens, split)
   - Purpose: Transparency - show PM why prediction was made

### Integration

- Runs as haiku worker in PM story generation pipeline
- Input: STORY-SEED.md (has AC count, scope description)
- Output: Prediction YAML section merged into story file
- Advisory only: Never blocks story generation
- Tracks accuracy: Predictions vs actuals stored in OUTCOME.yaml for calibration

### Measurable Outcomes

- Reduce story splits by 30% (better upfront scoping)
- Improve token estimate accuracy from ±50% to ±25%
- Surface high-risk stories for PM review before elaboration

## Non-Goals

- **Pattern mining itself** - WKFL-006 provides pattern data, WKFL-007 consumes it
- **Blocking workflow** - Predictions never prevent story generation
- **Machine learning models** - Simple heuristics + similarity search sufficient
- **Real-time prediction updates** - Predictions generated once at story creation
- **Cross-project patterns** - Single-repo only (per PLAN.md)
- **Automatic story splitting** - Flag risk, don't auto-split (human decision)

## Scope

### In Scope

**Core Capabilities:**
- Split risk calculation (AC count + scope keywords + WKFL-006 patterns)
- Review cycles prediction (complexity signals + WKFL-006 cycle predictors)
- Token estimate (similar story search via KB + median calculation)
- Similar stories array (top 5 by similarity score with actuals from OUTCOME.yaml)
- Prediction accuracy tracking (compare predictions vs actuals, write to KB)
- Graceful degradation (heuristics-only mode when WKFL-006 unavailable)

**Deliverables:**
- `.claude/agents/pm-story-risk-predictor.agent.md` (haiku model)
- Prediction schema in story YAML output
- Similar story finder via KB query
- Integration with PM story generation pipeline
- Accuracy tracking when stories complete

**Protected Features (Must Not Modify):**
- OUTCOME.yaml schema from WKFL-001
- PATTERNS-{month}.yaml schema from WKFL-006
- PM story generation pipeline structure
- KB query patterns and timeout handling

### Out of Scope

- Pattern mining (WKFL-006 provides input)
- Blocking workflow based on risk
- Real-time prediction updates (one-time at story creation)
- Cross-repository pattern sharing
- Automatic story splitting or rescoping

## Acceptance Criteria

### AC-1: Predict split_risk based on AC count and scope

**Given** a STORY-SEED.md file with acceptance criteria and scope
**When** the risk predictor agent runs
**Then** it should:
- Parse the AC count from `acceptance_criteria:` section
- Extract scope keywords (frontend, backend, database, auth, security)
- Calculate base_risk = (ac_count - 3) * 0.1
- Apply scope complexity boost (+0.2 if frontend+backend, +0.1 if database, +0.1 if auth/security)
- Apply WKFL-006 pattern boost (+0.2 if scope matches high-split patterns, if available)
- Clamp to [0.0, 1.0] and round to 1 decimal place
- Output `split_risk: 0.7` in predictions section

**Verification**:
- Test with 3 ACs, frontend-only → split_risk ≈ 0.0-0.2
- Test with 10 ACs, full-stack → split_risk ≈ 0.7-0.9
- Test with pattern match → split_risk includes +0.2 boost
- Test edge cases: 0 ACs → 0.0, 50+ ACs → clamped to 1.0

### AC-2: Predict review_cycles based on complexity signals

**Given** a STORY-SEED.md file with scope description
**When** the risk predictor agent runs
**Then** it should:
- Parse scope for complexity keywords (multi-file, cross-domain, auth, security, database)
- Apply heuristic: base_cycles = 1, +1 per complexity signal
- Query WKFL-006 cycle_predictors for matching patterns (if available)
- Apply pattern data: if file patterns match high-cycle patterns, +1
- Output integer value: `review_cycles: 3`

**Verification**:
- Test with simple frontend → review_cycles = 1
- Test with full-stack + auth + security → review_cycles ≥ 3
- Test with WKFL-006 pattern match (e.g., routes.ts) → +1 cycle
- Test without WKFL-006 → heuristics only, no pattern boost

### AC-3: Predict token_estimate based on similar stories

**Given** access to KB with completed stories and OUTCOME.yaml files
**When** the risk predictor agent runs
**Then** it should:
- Query KB for similar stories: `kb_search({ query: "{epic} {scope}", tags: ['outcome'], limit: 10 })`
- Filter to top 5 stories with similarity_score > 0.70
- Load OUTCOME.yaml for each similar story
- Extract `totals.tokens_total` from each
- Calculate median if ≥3 similar stories, otherwise average
- If <3 similar stories, fall back to epic average or global default (150K)
- Output: `token_estimate: 180000`

**Verification**:
- Test with 5+ similar stories → token_estimate = median(tokens)
- Test with 1-2 similar stories → token_estimate = average(tokens) or fallback
- Test with 0 similar stories → token_estimate = 150000 (global default)
- Test with KB unavailable → graceful fallback to 150000
- Test range: 50K-500K for typical stories

### AC-4: Include similar_stories array for reference

**Given** KB search returns similar stories
**When** the risk predictor agent runs
**Then** it should:
- For each similar story found in AC-3, extract:
  - story_id
  - similarity_score (from KB search result)
  - actual_cycles (from OUTCOME.yaml `phases.dev_implementation.review_cycles`)
  - actual_tokens (from OUTCOME.yaml `totals.tokens_total`)
  - split_occurred (from OUTCOME.yaml, boolean)
- Sort by similarity_score descending
- Include top 3-5 stories
- Output in predictions section:
  ```yaml
  similar_stories:
    - story_id: WISH-2042
      similarity_score: 0.89
      actual_cycles: 2
      actual_tokens: 175000
      split_occurred: false
  ```

**Verification**:
- Test with 10 similar stories → includes top 5 by similarity
- Test with missing OUTCOME.yaml → skip that story gracefully
- Test with malformed OUTCOME.yaml → skip and continue
- Test sorting is descending by similarity_score

### AC-5: Track prediction accuracy for improvement

**Given** a story completes with OUTCOME.yaml generated
**And** predictions exist in the story YAML file
**When** the accuracy tracker compares predictions vs actuals
**Then** it should:
- Calculate variance for each metric:
  - cycles_variance = |predicted_cycles - actual_cycles| / actual_cycles
  - tokens_variance = |predicted_tokens - actual_tokens| / actual_tokens
  - split_risk_outcome = predicted high/medium/low vs actual split occurrence
- Write accuracy metrics to KB with tags: ['prediction-accuracy', 'wkfl-007', 'story:{story_id}', 'date:{YYYY-MM}']
- Include: predicted values, actual values, variances, confidence level
- Support monthly aggregation: aggregate accuracy by prediction type across all completed stories

**Verification**:
- Test accuracy calculation with known predictions and actuals
- Test KB write includes all required fields and tags
- Test handling when predictions missing (story created before WKFL-007) → skip gracefully
- Test monthly aggregation calculates average variance across 10+ stories

### AC-6: Specify accuracy tracking trigger mechanism

**Given** the story completion workflow generates OUTCOME.yaml
**When** dev-documentation-leader completes its documentation tasks
**Then** it should:
- Trigger accuracy tracking as final step after OUTCOME.yaml write
- Pass story_id and OUTCOME.yaml path to accuracy tracker
- Load predictions from story YAML file (if present)
- Calculate and write accuracy metrics to KB (per AC-5)
- Log success/failure but never block OUTCOME.yaml generation
- Handle gracefully if predictions missing (story created before WKFL-007)

**Verification**:
- Test dev-documentation-leader spawns accuracy tracker after OUTCOME.yaml write
- Test accuracy tracker receives correct story_id and file path
- Test workflow completes even if accuracy tracking fails
- Test no accuracy tracking attempted if predictions section missing
- Integration test: full story completion → OUTCOME.yaml → accuracy tracking → KB entry

_Added by autonomous elaboration_

### AC-7: Handle predictor failure in PM pipeline gracefully

**Given** pm-story-generation-leader spawns pm-story-risk-predictor worker
**When** the predictor crashes or throws unhandled exception
**Then** the PM pipeline should:
- Log warning with error details
- Continue story generation without predictions section
- Mark story as "predictions unavailable" in generation log
- Complete successfully without blocking

**And when** predictor returns degraded/fallback predictions (KB unavailable, no patterns)
**Then** the PM pipeline should:
- Accept fallback predictions (split_risk: 0.5, cycles: 2, tokens: 150000, confidence: low)
- Include predictions in story YAML with confidence: low
- Log degraded mode reason (e.g., "KB unavailable", "no similar stories")
- Continue normally

**Verification**:
- Test predictor crash → PM pipeline completes, story has no predictions section
- Test predictor timeout → PM pipeline continues after max wait (30 seconds)
- Test KB unavailable → predictor returns fallback, pipeline accepts
- Test no WKFL-006 patterns → predictor returns heuristics-only, pipeline accepts
- Test error logged with sufficient context for debugging
- Integration test: full PM pipeline with intentional predictor failure

_Added by autonomous elaboration_

## Reuse Plan

### Components to Reuse

| Component | Source | Usage |
|-----------|--------|-------|
| KB MCP Server | Existing infrastructure | `kb_search` for similar stories, `kb_add` for accuracy tracking |
| OUTCOME.yaml | WKFL-001 | Historical story metrics (tokens, cycles, splits) |
| PATTERNS-{month}.yaml | WKFL-006 (future) | Pattern correlations for risk/cycle prediction |
| AGENT-HINTS.yaml | WKFL-006 (future) | Optimized query patterns |
| Haiku agent pattern | ttdc-metrics-agent, gap-analytics-agent | Lightweight analysis, YAML output |
| PM worker pattern | pm-draft-test-plan, pm-dev-feasibility | Spawned by pm-story-generation-leader |
| Zod-first validation | Monorepo standard | Schema validation for prediction output |

### Packages

**No new packages required.**

All logic implemented in:
- `.claude/agents/pm-story-risk-predictor.agent.md` (new agent file)
- Schema definitions inline or in shared `__types__` directory

## Architecture Notes

### Agent Structure

```
.claude/agents/pm-story-risk-predictor.agent.md
  Frontmatter:
    model: haiku
    type: worker
    spawned_by: pm-story-generation-leader
    triggers: After STORY-SEED.md generation

  Implementation:
    1. Read STORY-SEED.md (input)
    2. Parse AC count, scope keywords
    3. Query WKFL-006 patterns (if available)
    4. Query KB for similar stories
    5. Load OUTCOME.yaml for similar stories
    6. Calculate predictions (split_risk, cycles, tokens)
    7. Build similar_stories array
    8. Calculate confidence level
    9. Output prediction YAML
```

### Data Flow

```
STORY-SEED.md (input)
  ↓
Parse ACs, scope keywords
  ↓
Query WKFL-006 patterns (optional)
  ↓
Query KB for similar stories
  ↓
Calculate predictions:
  - split_risk (heuristics + patterns)
  - review_cycles (complexity + patterns)
  - token_estimate (similar story median)
  ↓
Load similar story OUTCOME.yaml
  ↓
Build similar_stories array
  ↓
Calculate confidence level
  ↓
Output prediction YAML
  ↓
Merge into story file (pm-story-generation-leader)
```

### Prediction Algorithms

**Split Risk:**
```javascript
base_risk = Math.min(1.0, Math.max(0.0, (ac_count - 3) * 0.1))

// Scope complexity boost
if (scope includes frontend && backend) base_risk += 0.2
if (scope includes database) base_risk += 0.1
if (scope includes auth || security) base_risk += 0.1

// Pattern boost (if WKFL-006 available)
if (scope matches high-split pattern from WKFL-006) base_risk += 0.2

split_risk = Math.min(1.0, base_risk).toFixed(1)
```

**Review Cycles:**
```javascript
base_cycles = 1

// Complexity signals
if (scope length > 3) base_cycles += 1
if (scope includes auth || security) base_cycles += 1
if (scope includes database) base_cycles += 1
if (estimated_files > 5) base_cycles += 1

// Pattern boost (if WKFL-006 available)
if (file_patterns match high-cycle patterns) base_cycles += 1

review_cycles = Math.floor(base_cycles)
```

**Token Estimate:**
```javascript
similar_stories = kb_search({
  query: `${epic} ${scope_summary}`,
  tags: ['outcome'],
  limit: 10
})

// Load OUTCOME.yaml for each similar story
token_values = similar_stories
  .map(s => loadOutcome(s.story_id)?.totals?.tokens_total)
  .filter(t => t != null)

if (token_values.length >= 3) {
  token_estimate = median(token_values)
} else if (token_values.length > 0) {
  token_estimate = average(token_values)
} else {
  token_estimate = 150000  // Global fallback
}
```

**Confidence Level:**
```javascript
if (similar_stories.length >= 5 && patterns_available) {
  confidence = 'high'
} else if (similar_stories.length >= 3 || patterns_available) {
  confidence = 'medium'
} else {
  confidence = 'low'
}
```

### Output Schema

```yaml
predictions:
  split_risk: 0.7           # float [0.0, 1.0], 1 decimal
  review_cycles: 3          # integer >= 1
  token_estimate: 180000    # integer, rounded to nearest 1000
  confidence: medium        # high | medium | low
  similar_stories:
    - story_id: WISH-2042
      similarity_score: 0.89
      actual_cycles: 2
      actual_tokens: 175000
      split_occurred: false
    - story_id: AUTH-015
      similarity_score: 0.82
      actual_cycles: 3
      actual_tokens: 195000
      split_occurred: false
  generated_at: "2026-02-07T10:00:00Z"
  model: haiku
  wkfl_version: "007-v1"
```

### Integration with PM Pipeline

**Current Pipeline:**
```
pm-story-generation-leader
  ↓
pm-story-seed-agent (creates STORY-SEED.md)
  ↓
[parallel workers]
  ├─ pm-draft-test-plan
  ├─ pm-uiux-recommendations (if UI)
  └─ pm-dev-feasibility-review
  ↓
Synthesize final story file
```

**Enhanced Pipeline (with WKFL-007):**
```
pm-story-generation-leader
  ↓
pm-story-seed-agent (creates STORY-SEED.md)
  ↓
[parallel workers]
  ├─ pm-draft-test-plan
  ├─ pm-uiux-recommendations (if UI)
  ├─ pm-dev-feasibility-review
  └─ pm-story-risk-predictor (NEW)  ← Reads STORY-SEED.md
  ↓
Synthesize final story file (merge predictions section)
```

**Change Required**: Update `pm-story-generation-leader.agent.md` to spawn risk predictor worker.

### Error Handling & Graceful Degradation

**Principle**: Predictor NEVER blocks story generation.

| Failure Scenario | Fallback Behavior | Confidence |
|------------------|-------------------|-----------|
| WKFL-006 patterns missing | Heuristics-only mode | low/medium |
| KB unavailable | Conservative defaults (0.5 split, 2 cycles, 150K tokens) | low |
| No similar stories | Use global/epic averages | low |
| OUTCOME.yaml parse error | Skip that story, continue with others | depends on data |
| STORY-SEED.md malformed | Log warning, use conservative estimates | low |
| Any error in predictor | Log warning, PM pipeline continues without predictions | N/A |

**Implementation**:
```javascript
try {
  const predictions = await generatePredictions(seed)
  return predictions
} catch (error) {
  logger.warn('Prediction failed, using fallback', { error })
  return {
    split_risk: 0.5,
    review_cycles: 2,
    token_estimate: 150000,
    confidence: 'low',
    similar_stories: [],
    error: error.message
  }
}
```

### Accuracy Tracking (AC-5)

**Triggered when**: OUTCOME.yaml generated (story complete)

**Process**:
1. Load story YAML file, extract predictions section
2. Load OUTCOME.yaml, extract actuals (cycles, tokens, split_occurred)
3. Calculate variances
4. Write to KB with tags for aggregation

**KB Entry Schema**:
```javascript
kb_add_lesson({
  title: `Prediction accuracy for ${story_id}`,
  story_id: story_id,
  category: 'prediction-accuracy',
  content: {
    predictions: {
      split_risk: 0.7,
      review_cycles: 3,
      token_estimate: 180000,
      confidence: 'medium'
    },
    actuals: {
      split_occurred: false,
      review_cycles: 2,
      tokens_total: 175000
    },
    variance: {
      cycles: 0.5,        // |3-2|/2 = 0.5 (50% error)
      tokens: 0.029,      // |180K-175K|/175K ≈ 0.029 (2.9% error)
      split_outcome: 'false_positive'  // Predicted high risk, didn't split
    }
  },
  tags: ['prediction-accuracy', 'wkfl-007', `story:${story_id}`, 'date:2026-02']
})
```

## Test Plan

### Unit Tests

**Split Risk Calculation:**
- Test with varying AC counts (1, 3, 5, 8, 12 ACs)
- Test with scope keywords (frontend-only, backend-only, full-stack)
- Test with WKFL-006 pattern matches (should boost risk)
- Test edge cases: 0 ACs, 50+ ACs (should clamp to [0.0, 1.0])
- Verify output format: single decimal (0.3, not 0.34829)

**Review Cycles Prediction:**
- Test with complexity signals (single-file, multi-file, auth, security)
- Test with WKFL-006 cycle_predictors match
- Test fallback when no patterns available
- Verify integer output (not float)

**Token Estimate:**
- Test KB query with various epic/scope combinations
- Test median calculation with 0, 1, 3, 5, 10 similar stories
- Test fallback to epic average when < 3 similar stories
- Test fallback to global average when no OUTCOME.yaml exists
- Verify reasonable output (50K-500K range for typical stories)

### Integration Tests

**KB Integration:**
- Test `kb_search` with various query patterns
- Test similarity_score extraction and filtering
- Test handling KB timeout (10 second limit)
- Test handling KB unavailable (connection error)

**OUTCOME.yaml Loading:**
- Test loading valid OUTCOME.yaml files
- Test handling missing OUTCOME.yaml (skip gracefully)
- Test handling malformed YAML (parse error)
- Test schema evolution (v1, future v2)

**WKFL-006 Pattern Loading:**
- Test loading PATTERNS-{month}.yaml when available
- Test graceful degradation when patterns missing
- Test pattern matching algorithms
- Test pattern boost application

### E2E Tests

**Full PM Pipeline:**
- Run PM story generation with risk predictor enabled
- Verify STORY-SEED.md read successfully
- Verify predictions section appears in story file
- Verify PM pipeline completes even if predictor fails

**Graceful Degradation:**
- Test without WKFL-006 patterns available (heuristic-only mode)
- Test with KB unavailable (fall back to conservative estimates)
- Test with no historical OUTCOME.yaml (fall back to hardcoded averages)
- Test never blocks story generation (predictions can fail, story proceeds)

**Accuracy Tracking:**
- Test accuracy calculation with known predictions and actuals
- Test KB write with correct tags
- Test monthly aggregation (simulate multiple completed stories)
- Test handling when predictions missing (story created before WKFL-007)

### Test Data Requirements

**Mock STORY-SEED.md:**
- Simple story: 3 ACs, frontend-only
- Complex story: 10 ACs, full-stack + auth + security
- Edge case: 0 ACs, empty scope

**Mock OUTCOME.yaml:**
- 10+ completed stories across different epics
- Varying tokens_total (50K - 400K)
- Varying review_cycles (1 - 5)
- Mix of split_occurred (true/false)

**Mock PATTERNS-{month}.yaml:**
```yaml
file_patterns:
  - pattern: "**/routes.ts"
    correlation: 0.78
    finding_type: lint_failure
    sample_size: 15

ac_patterns:
  - pattern: "intuitive|obvious|clear"
    correlation: 0.80
    finding_type: verification_failure
    sample_size: 8

cycle_predictors:
  - predictor: "files_touched > 5"
    avg_cycles: 2.8
    baseline_cycles: 1.8
    sample_size: 9
```

## Reality Baseline

### Existing Features Referenced

| Feature | Status | Usage in WKFL-007 |
|---------|--------|-------------------|
| OUTCOME.yaml (WKFL-001) | UAT | Source of historical story metrics |
| KB MCP Server | Active | Similar story search, accuracy tracking |
| PM Story Generation Pipeline | Active | Integration point for risk predictor |
| PATTERNS-{month}.yaml (WKFL-006) | Pending | Pattern data source (degraded mode fallback) |
| Haiku agent pattern | Active | Template for lightweight analysis agent |
| Zod-first validation | Active | Schema validation for predictions |

### Constraints Applied

From **PLAN.meta.md (Workflow Learning Principles)**:
- **Proposals Over Auto-Changes**: Predictions inform but don't block workflow
- **Graceful Degradation**: Workflow works without predictions
- **Measurable Impact**: Track prediction accuracy for improvement

From **Architecture**:
- KB schema uses Zod-first types
- MCP tools follow tool-handler pattern with logging, error handling
- Story generation pipeline uses YAML output format
- PM agents must follow sonnet/haiku model guidelines
- Predictions are advisory only, never blocking

From **WKFL-006 Dependency**:
- WKFL-007 can be designed and elaborated without WKFL-006
- WKFL-007 cannot be fully tested without WKFL-006 pattern data
- Implement degraded mode (heuristics-only) as fallback
- Enhance with patterns when WKFL-006 completes

### Protected Features

**Must Not Modify:**
- OUTCOME.yaml schema (defined by WKFL-001)
- PATTERNS-{month}.yaml schema (defined by WKFL-006)
- KB MCP Server API (existing tools: kb_search, kb_add)
- PM story generation pipeline structure
- STORY-SEED.md format

### Dependencies

**Depends On:**
- WKFL-006 (Cross-Story Pattern Mining) - **Pending** ⚠️
  - Provides: PATTERNS-{month}.yaml, AGENT-HINTS.yaml
  - Mitigation: Degraded mode (heuristics-only) when unavailable
  - Unblocks: Implementation can proceed, enhancement when WKFL-006 completes

**Blocks:**
- None (leaf node in dependency tree)

**Enables:**
- Better story scoping (reduce splits by 30%)
- More accurate token budgeting (±25% accuracy target)
- Data-driven risk assessment
- Foundation for WKFL-010 (Improvement Proposals)

### Open Questions for Elaboration

1. **Prediction Timing**: Run after STORY-SEED.md only (fast, less context) or after full PM pipeline (slower, more context)?
   - **Recommendation**: After STORY-SEED.md (AC count available, sufficient for predictions)

2. **Confidence Thresholds**: Sample sizes for high/medium/low confidence?
   - **Proposed**: 5+ stories = high, 3-4 = medium, <3 = low
   - Should this be configurable per epic?

3. **Pattern Weight**: How much to weight WKFL-006 patterns vs similar stories?
   - **Current**: Equal weight (patterns boost heuristics, similar stories inform estimates)
   - Should patterns override heuristics if high correlation?

4. **Prediction Display**: Where in story file should predictions appear?
   - **Proposed**: Top-level `predictions:` section in YAML frontmatter
   - Alternative: Separate PREDICTIONS.yaml file?

5. **Fallback Averages**: Global defaults when no historical data?
   - **Proposed**: 150K tokens, 2 cycles, 0.3 split risk
   - Should these be configurable or derived from all-time OUTCOME.yaml?

### Success Metrics

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Story split rate | ~20% | <15% | Track split_risk > 0.7 stories that actually split |
| Token estimate accuracy | ±50% | ±25% | `|predicted - actual| / actual` |
| Review cycle accuracy | ±1.5 cycles | ±1 cycle | Compare predicted vs actual cycles |
| Prediction coverage | 0% | 90%+ | % of stories with predictions generated |
| Confidence calibration | Unknown | >80% | High confidence predictions correct 80%+ |

**Monthly Review**:
- Aggregate prediction accuracy across all completed stories
- Identify systematic biases (over/under-estimation)
- Feed back to WKFL-006 for pattern refinement
- Tune heuristic weights and thresholds

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-07_

### MVP Gaps Resolved

| # | Finding | Resolution | AC Added |
|---|---------|------------|----------|
| 1 | Review cycles output type inconsistency | Implementation Note - already correct in story | — |
| 2 | Confidence calculation thresholds not fully specified | Implementation Note - auto-resolved with documented defaults | — |
| 3 | Pattern boost values (+0.2, +0.1) not justified | Implementation Note - document as initial heuristics | — |
| 4 | Accuracy tracking trigger mechanism not specified | **AC-6** - Specify trigger in dev-documentation-leader | AC-6 |
| 5 | Epic average fallback not defined | Implementation Note - auto-resolved with sensible default | — |
| 6 | Error handling for predictor failure incomplete | **AC-7** - Specify PM pipeline error handling | AC-7 |

### Non-Blocking Items (Logged to KB)

| # | Finding | Category | Impact |
|---|---------|----------|--------|
| 1 | Prediction accuracy trend visualization | UX Polish | Medium |
| 2 | KB query timeout formalization | Edge Case | Low |
| 3 | Re-prediction on scope change mid-elaboration | Enhancement | Medium |
| 4 | Confidence intervals for predictions | Enhancement | Medium |
| 5 | Epic-specific prediction models | Future-Proofing | High |
| 6 | Auto-suggest story splitting for high-risk stories | Integration | High |
| 7 | PM feedback loop on prediction usefulness | UX Polish | Medium |
| 8 | Semantic pattern matching using KB embeddings | Enhancement | Medium |
| 9 | Specific risk type predictions | Future-Proofing | Medium |
| 10 | Monthly accuracy report aggregation | Observability | Medium |
| 11 | A/B testing of prediction algorithms | Integration | High |
| 12 | Data-driven fallback values from historical data | Enhancement | Medium |

### Summary

- **ACs added**: 2 (AC-6: accuracy tracking trigger, AC-7: PM pipeline error handling)
- **ACs resolved via implementation notes**: 5 (output type, confidence thresholds, pattern values, epic fallback, algorithm versioning)
- **KB entries created**: 12 (all non-blocking enhancements for future work)
- **Mode**: Autonomous (no human review required)
- **Verdict**: CONDITIONAL PASS - ready for implementation after AC additions
