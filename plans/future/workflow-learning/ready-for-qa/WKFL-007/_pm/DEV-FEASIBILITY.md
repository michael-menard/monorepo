# Dev Feasibility Review: WKFL-007 - Story Risk Predictor

## Executive Summary

**Recommendation**: PROCEED with implementation

**Confidence**: High

**Estimated Effort**: 45K tokens (matches story.yaml estimate)

**Key Risks**:
1. WKFL-006 dependency (pattern data source) - **MITIGATED** by degraded mode
2. KB performance with large datasets - **MITIGATED** by query limits and timeouts
3. OUTCOME.yaml schema evolution - **MITIGATED** by safe property access

**Critical Path**: Implement heuristics-first, enhance with WKFL-006 patterns when available

---

## Technical Feasibility

### ✅ Reuse Candidates (All Available)

| Component | Status | Location |
|-----------|--------|----------|
| KB MCP Server | ✅ Active | MCP tools: `kb_search`, `kb_add` |
| OUTCOME.yaml Schema | ✅ Active | From WKFL-001, v1 schema stable |
| Haiku Agent Pattern | ✅ Active | Reference: `ttdc-metrics-agent`, `gap-analytics-agent` |
| PM Worker Integration | ✅ Active | `pm-story-generation-leader` spawns workers |
| Zod Validation | ✅ Active | Monorepo standard, no new setup |

**Assessment**: All required infrastructure exists. No new packages needed.

### ⚠️ Dependencies

| Dependency | Status | Impact | Mitigation |
|------------|--------|--------|------------|
| WKFL-006 (Pattern Mining) | Pending | Pattern data unavailable | Implement degraded mode (heuristics-only) |
| WKFL-001 (OUTCOME.yaml) | UAT | Historical data available | No blocker |
| KB availability | Active | Similar story search | Fallback to defaults on failure |

**Assessment**: WKFL-006 is the only blocker for full functionality. Degraded mode unblocks implementation.

---

## Implementation Approach

### Agent Architecture

```
.claude/agents/pm-story-risk-predictor.agent.md
  ↓ (reads)
STORY-SEED.md (AC count, scope keywords)
  ↓ (queries)
KB MCP Server (similar stories)
  ↓ (loads)
OUTCOME.yaml files (historical actuals)
  ↓ (loads if available)
PATTERNS-{month}.yaml (from WKFL-006)
  ↓ (outputs)
PREDICTIONS.yaml (merged into story file)
```

**Model**: haiku (lightweight analysis, fast execution)

**Trigger**: Spawned by `pm-story-generation-leader` after STORY-SEED.md generation

**Integration**: Output merged into final story YAML under `predictions:` section

---

## Data Flow

### Input Sources

1. **STORY-SEED.md** (primary input)
   - AC count: Parse `acceptance_criteria:` section
   - Scope keywords: Extract from `scope.in:` array
   - Story context: Title, description

2. **KB Similar Story Search**
   - Query: `kb_search({ query: "{epic} {scope}", tags: ['outcome'], limit: 10 })`
   - Returns: story_id, similarity_score
   - Filter: Top 5 with score > 0.70

3. **OUTCOME.yaml Files** (historical actuals)
   - Load for each similar story
   - Extract: `totals.tokens_total`, `phases.dev_implementation.review_cycles`, `split_occurred`
   - Graceful skip if file missing or malformed

4. **PATTERNS-{month}.yaml** (from WKFL-006, optional)
   - Load if exists: `plans/future/workflow-learning/_patterns/PATTERNS-{YYYY-MM}.yaml`
   - Extract: `file_patterns`, `ac_patterns`, `cycle_predictors`
   - Fallback: If missing, use heuristics only

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
  generated_at: "2026-02-07T10:00:00Z"
  model: haiku
  wkfl_version: "007-v1"
```

---

## Prediction Algorithms

### 1. Split Risk (AC-1)

```javascript
function calculateSplitRisk(seed, patterns) {
  const ac_count = seed.acceptance_criteria.length

  // Base heuristic
  let base_risk = Math.max(0.0, (ac_count - 3) * 0.1)

  // Scope complexity boost
  const scope = seed.scope.in || []
  if (scope.includes('frontend') && scope.includes('backend')) {
    base_risk += 0.2
  }
  if (scope.includes('database')) {
    base_risk += 0.1
  }
  if (scope.includes('auth') || scope.includes('security')) {
    base_risk += 0.1
  }

  // Pattern boost (if WKFL-006 available)
  if (patterns && patterns.ac_patterns) {
    const high_split_patterns = patterns.ac_patterns.filter(p =>
      p.finding_type === 'split' && p.correlation > 0.65
    )
    for (const pattern of high_split_patterns) {
      if (matchesPattern(seed, pattern)) {
        base_risk += 0.2
        break
      }
    }
  }

  // Clamp and round
  return Math.min(1.0, base_risk).toFixed(1)
}
```

**Test Cases**:
- 3 ACs, frontend-only → 0.0
- 8 ACs, full-stack → 0.7
- 12 ACs, full-stack + patterns → 0.9 (clamped to 1.0 if higher)

### 2. Review Cycles (AC-2)

```javascript
function predictReviewCycles(seed, patterns) {
  let base_cycles = 1

  // Complexity signals
  const scope = seed.scope.in || []
  if (scope.length > 3) base_cycles += 1
  if (scope.includes('auth') || scope.includes('security')) base_cycles += 1
  if (scope.includes('database')) base_cycles += 1

  // File count estimate
  const estimated_files = estimateFileCount(seed.scope)
  if (estimated_files > 5) base_cycles += 1

  // Pattern boost (if WKFL-006 available)
  if (patterns && patterns.cycle_predictors) {
    const matching_predictors = patterns.cycle_predictors.filter(p =>
      matchesPredictor(seed, p)
    )
    if (matching_predictors.length > 0) {
      const avg_pattern_cycles = matching_predictors.reduce((sum, p) =>
        sum + p.avg_cycles, 0
      ) / matching_predictors.length
      base_cycles = Math.max(base_cycles, Math.floor(avg_pattern_cycles))
    }
  }

  return Math.floor(base_cycles)
}
```

**Test Cases**:
- Simple frontend → 1 cycle
- Full-stack + auth → 3 cycles
- Matches high-cycle pattern → max(heuristic, pattern_avg)

### 3. Token Estimate (AC-3)

```javascript
async function predictTokens(seed, kb) {
  // Query similar stories
  const query = `${seed.epic} ${seed.scope.in.join(' ')}`
  const similar = await kb.search({
    query: query,
    tags: ['outcome'],
    limit: 10
  })

  // Load OUTCOME.yaml for each
  const token_values = []
  for (const story of similar.slice(0, 5)) {
    try {
      const outcome = loadOutcomeYaml(story.story_id)
      if (outcome?.totals?.tokens_total) {
        token_values.push(outcome.totals.tokens_total)
      }
    } catch (err) {
      // Skip malformed OUTCOME.yaml
      continue
    }
  }

  // Calculate estimate
  if (token_values.length >= 3) {
    return median(token_values)
  } else if (token_values.length > 0) {
    return average(token_values)
  } else {
    // Fallback to epic average or global default
    return 150000
  }
}
```

**Test Cases**:
- 5+ similar stories → median(tokens)
- 1-2 similar stories → average(tokens)
- 0 similar stories → 150000 default

### 4. Confidence Levels

```javascript
function calculateConfidence(similar_stories, patterns_available) {
  if (similar_stories.length >= 5 && patterns_available) {
    return 'high'
  } else if (similar_stories.length >= 3 || patterns_available) {
    return 'medium'
  } else {
    return 'low'
  }
}
```

---

## Error Handling & Degradation

### Graceful Degradation Matrix

| Failure Scenario | Fallback Behavior | Confidence Level |
|------------------|-------------------|------------------|
| WKFL-006 patterns missing | Heuristics-only mode | low/medium |
| KB unavailable | Conservative defaults (0.5 split, 2 cycles, 150K tokens) | low |
| No similar stories | Use global/epic averages | low |
| OUTCOME.yaml parse error | Skip that story, continue with others | depends on remaining data |
| STORY-SEED.md malformed | Log warning, use conservative estimates | low |

### Never Block Principle

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

**Critical**: PM story generation MUST continue even if predictor fails entirely.

---

## Integration with PM Pipeline

### Current PM Pipeline

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

### With Risk Predictor (New)

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

**Change Required**: Update `pm-story-generation-leader.agent.md` to spawn risk predictor

**Merge Logic**:
```javascript
const storyYaml = {
  ...baseStory,
  predictions: riskPredictorOutput
}
```

---

## File Structure

```
.claude/agents/
  pm-story-risk-predictor.agent.md   # New agent file

plans/future/workflow-learning/
  _patterns/
    PATTERNS-2026-02.yaml             # From WKFL-006 (future)
  backlog/
    WKFL-007/
      WKFL-007.md                     # Story file (includes predictions:)
      _pm/
        STORY-SEED.md
        TEST-PLAN.md
        DEV-FEASIBILITY.md

_implementation/
  OUTCOME.yaml                        # From WKFL-001 (per story)
```

---

## Potential Blockers

### 1. WKFL-006 Dependency (Medium Risk)

**Issue**: Pattern mining not yet complete, no PATTERNS-{month}.yaml available

**Impact**: Predictions will be heuristic-based only, lower accuracy

**Mitigation**:
- Implement degraded mode (heuristics-only)
- Test with and without WKFL-006 patterns
- Enhance with patterns when WKFL-006 completes

**Recommendation**: Do not block on WKFL-006. Implement heuristics first, enhance later.

### 2. KB Performance (Low Risk)

**Issue**: Semantic search may be slow with large datasets (100+ stories)

**Impact**: Prediction generation timeout

**Mitigation**:
- Limit queries to 10 results
- Add 10-second timeout on KB queries
- Fall back to defaults on timeout

**Recommendation**: Monitor KB query times, optimize if needed

### 3. OUTCOME.yaml Schema Evolution (Low Risk)

**Issue**: OUTCOME.yaml schema may change (v1 → v2)

**Impact**: Prediction algorithm breaks if schema incompatible

**Mitigation**:
- Use safe property access (`outcome?.totals?.tokens_total`)
- Test with both v1 and future v2 schemas
- Version checking if needed

**Recommendation**: No blocker, handle gracefully

---

## Testing Strategy

### Unit Tests
- Split risk calculation (varying AC counts, scopes)
- Review cycles prediction (complexity signals)
- Token estimate (median, average, fallback)
- Confidence level calculation

### Integration Tests
- KB query and response parsing
- OUTCOME.yaml loading and parsing
- PATTERNS.yaml loading (optional)
- Similar story filtering and sorting

### E2E Tests
- Full PM pipeline with risk predictor
- Story file includes predictions section
- Graceful degradation scenarios
- Never blocks story generation

### Acceptance Tests
- Run on 10+ real backlog stories
- Validate prediction output format
- Track accuracy when stories complete

---

## Effort Breakdown

| Component | Estimated Tokens | Notes |
|-----------|-----------------|-------|
| Agent implementation | 15K | pm-story-risk-predictor.agent.md |
| Split risk algorithm | 3K | Heuristics + pattern matching |
| Review cycles algorithm | 3K | Complexity signals + patterns |
| Token estimate algorithm | 5K | Similar story search + median |
| Similar stories array | 4K | KB query + OUTCOME loading |
| Accuracy tracking | 7K | Compare predictions vs actuals |
| Error handling | 5K | Graceful degradation, logging |
| Integration with PM pipeline | 3K | Update pm-story-generation-leader |
| Testing | 10K | Unit, integration, E2E tests |
| Documentation | 5K | Agent docs, schema docs |

**Total**: ~60K tokens (15K buffer on 45K estimate)

**Risk**: Medium - buffer should cover unknowns

---

## Recommendation

**PROCEED** with implementation.

### Phase 1: Core Predictor (Heuristics-Only)
1. Implement `pm-story-risk-predictor.agent.md`
2. Split risk, review cycles, token estimate (heuristics)
3. KB integration for similar stories
4. Basic error handling

**Deliverable**: Working predictor with degraded mode

### Phase 2: Pattern Integration (After WKFL-006)
1. Load PATTERNS-{month}.yaml
2. Enhance algorithms with pattern data
3. Confidence level adjustments

**Deliverable**: Full-featured predictor

### Phase 3: Accuracy Tracking
1. Implement AC-5 (compare predictions vs actuals)
2. KB write for accuracy metrics
3. Monthly accuracy reports

**Deliverable**: Learning loop complete

### Dependencies to Manage
- WKFL-006 (pattern mining) - **Not blocking**, enhance when available
- WKFL-001 (OUTCOME.yaml) - **Available**, no blocker

### Success Criteria
- Predictions generated for 90%+ of stories
- No story generation blocked by predictor
- Accuracy tracking operational
- Degraded mode tested and working
