---
created: 2026-02-07
updated: 2026-02-22
version: 1.1.0
type: worker
permission_level: read-only
task_contract:
  reasoning_depth: shallow
  max_cost_usd: 0.003
  structured_output: true
spawned_by: [pm-story-generation-leader]
schema: packages/backend/orchestrator/src/artifacts/story-predictions.ts
---

# Agent: risk-predictor

## Role

Worker agent responsible for predicting story risk metrics during PM story generation. Analyzes STORY-SEED.md to output predictions for split risk, review cycles, and token estimates based on historical data and complexity heuristics.

**IMPORTANT**: Predictions are advisory only and never block story generation. Must degrade gracefully when KB or WKFL-006 patterns unavailable.

---

## Implementation Note: Schema File

The schema reference in the frontmatter (`packages/backend/orchestrator/src/artifacts/story-predictions.ts`) is a forward declaration documenting the contract for future TypeScript implementation. This file will be created during the API implementation phase when prediction data needs to be stored/loaded from the filesystem or database. The Zod schema definitions in this agent file (see "Output Schema" section) serve as the authoritative specification for the implementation.

---

## Mission

Generate risk predictions to inform PM scoping decisions:
1. **split_risk** - Probability story will split mid-implementation (0.0–1.0)
2. **review_cycles** - Expected code review iterations (float)
3. **token_estimate** - Predicted total token cost (integer)
4. **similar_stories** - Top 3–5 most similar completed stories with actuals
5. **confidence** - Data quality indicator (high | medium | low | none)
6. **model_version** - Predictor version string (1.0.0)

Output is written as YAML predictions section merged into story file by pm-story-generation-leader.

---

## Inputs

From orchestrator context:
- `story_id`: Story identifier
- `story_seed_path`: Path to STORY-SEED.md
- `epic`: Epic/domain (for similar story search)

From filesystem:
- STORY-SEED.md at `{story_seed_path}` (contains ACs, scope description)
- PATTERNS-{month}.yaml from WKFL-006 (optional, degrades gracefully if missing)

From Knowledge Base:
- Similar stories via `kb_search` with tags: ['outcome']
- OUTCOME.yaml files for similar stories

---

## Core Logic (Sequential Phases)

### Phase 1: Parse STORY-SEED.md

**Objective**: Extract AC count, title, and scope keywords for heuristic calculations.

**Actions**:

1. **Read STORY-SEED.md**

2. **Extract AC count**:
   - Count number of items in `acceptance_criteria:` section
   - Store as `ac_count`
   - **Edge case**: If 0 ACs, set `ac_count = 0`

3. **Extract story title**:
   - Read `title:` field from STORY-SEED.md frontmatter
   - Store as `story_title` (used for similarity search and title-based heuristics)

4. **Extract scope keywords**:
   - Parse scope description for: frontend, backend, database, auth, security, multi-file, cross-domain, refactor
   - Store as `scope_keywords` array
   - **Missing scope**: If scope section absent, use AC count only for heuristics

### Phase 2: Load WKFL-006 Patterns (Optional)

**Objective**: Load pattern data for enhanced predictions if available.

**Actions**:

1. **Attempt to read PATTERNS-{current_month}.yaml**:
   ```javascript
   const current_month = new Date().toISOString().slice(0, 7) // e.g. "2026-02"
   const patterns_path = `plans/future/workflow-learning/patterns/PATTERNS-${current_month}.yaml`
   ```

2. **If file exists**:
   - Parse `file_patterns` array
   - Parse `ac_patterns` array
   - Parse `cycle_predictors` array
   - Set `patterns_available = true`

3. **If file missing or parse error**:
   - Log warning: "WKFL-006 patterns unavailable, using heuristics-only mode"
   - Set `patterns_available = false`
   - Continue execution (graceful degradation)

**Bootstrap Fallback (primary v1 path)**:

Because WKFL-006 is still in-progress at v1 launch, `patterns_available = false` is the expected default path for all v1 predictions. The heuristic formulas below are fully self-contained and do not require WKFL-006 output. The bootstrap path must be documented as primary, not as an error condition.

### Phase 3: Find Similar Stories (KB Query)

**Objective**: Locate completed stories with outcome data to inform token and cycle estimates.

**Actions**:

1. **Query KB for similar stories**:
   ```javascript
   const results = kb_search({
     query: story_title + ' ' + scope_keywords.join(' '),
     tags: ['outcome'],
     limit: 5
   })
   ```

2. **Filter to completed stories with outcome data**:
   ```javascript
   const similar_stories = results
     .filter(r => r.similarity_score > 0.70)
     .slice(0, 5)
   ```

3. **Load OUTCOME.yaml for each similar story to extract actual_tokens**:
   ```javascript
   const story_data = []
   for (const story of similar_stories) {
     try {
       const outcome_path = `${story.feature_dir}/in-progress/${story.story_id}/_implementation/OUTCOME.yaml`
       const outcome = parseYaml(readFile(outcome_path))
       story_data.push({
         id: story.story_id,
         similarity: story.similarity_score,
         actual_tokens: outcome?.totals?.tokens_total || null
       })
     } catch (error) {
       logger.warn(`Failed to load OUTCOME.yaml for ${story.story_id}`)
       story_data.push({
         id: story.story_id,
         similarity: story.similarity_score,
         actual_tokens: null
       })
     }
   }
   ```

4. **Bootstrap fallback — no similar stories found**:
   - If `similar_stories` is empty (no KB results or similarity < 0.70):
     - Set `similar_stories = []`
     - Set `token_estimate = 150000` (heuristic default)
     - Set `confidence = 'none'`
   - This is the expected v1 path for novel story types

### Phase 4: Calculate split_risk

**Objective**: Predict probability of story splitting (0.0–1.0).

**Algorithm** (from WKFL-007 Technical Notes, canonical):

```javascript
// Base risk
split_risk = 0.1

// AC count boosts
if (ac_count > 5)  split_risk += 0.2   // first threshold
if (ac_count > 8)  split_risk += 0.3   // second threshold (additive, not replacement)

// Scope complexity boosts
if (scope_keywords.includes('backend') && scope_keywords.includes('frontend')) {
  split_risk += 0.2   // cross-boundary full-stack
}
if (story_title.toLowerCase().includes('refactor')) {
  split_risk += 0.15  // refactors tend to scope-creep
}

// Clamp to [0.0, 1.0]
split_risk = Math.min(1.0, Math.max(0.0, split_risk))
```

**Edge Cases**:
- 0 ACs → split_risk starts at 0.1 (base), no AC boosts applied → split_risk = 0.1
- 50+ ACs → clamped to 1.0
- Missing scope section → AC count and title heuristics only (no scope boosts)

### Phase 5: Calculate review_cycles

**Objective**: Predict number of code review iterations (float, typically 1.5–3.5).

**Algorithm** (from WKFL-007 Technical Notes, canonical):

```javascript
// Base cycles
review_cycles = 1.5

// Security scope boost
if (scope_keywords.includes('security')) {
  review_cycles += 0.3
}

// Weighted average with similar story data (if available)
if (similar_stories.length > 0) {
  const stories_with_cycles = similar_stories.filter(s => s.actual_cycles != null)
  if (stories_with_cycles.length > 0) {
    const similar_avg = stories_with_cycles.reduce((sum, s) => sum + s.actual_cycles, 0) / stories_with_cycles.length
    // Weighted: 60% heuristic, 40% historical
    review_cycles = (review_cycles * 0.6) + (similar_avg * 0.4)
  }
}

// NOTE: files_touched_estimate signal is deferred to a future heuristic improvement pass.
// See FUTURE-OPPORTUNITIES.md Gap #1. For v1, the +0.5 for files_touched > 5 boost is omitted.
```

### Phase 6: Calculate token_estimate

**Objective**: Predict total token cost.

**Algorithm** (from WKFL-007 Technical Notes, canonical):

```javascript
const stories_with_tokens = similar_stories.filter(s => s.actual_tokens != null)

if (stories_with_tokens.length > 0) {
  // Average of similar story tokens with 10% buffer
  const avg_tokens = stories_with_tokens.reduce((sum, s) => sum + s.actual_tokens, 0) / stories_with_tokens.length
  token_estimate = Math.round(avg_tokens * 1.1)
} else {
  // Bootstrap default — no historical data available
  token_estimate = 150000
}
```

### Phase 7: Calculate confidence

**Objective**: Indicate prediction data quality.

**Algorithm** (from WKFL-007 Technical Notes, canonical):

```javascript
const count = similar_stories.length
if (count >= 5)      confidence = 'high'
else if (count >= 2) confidence = 'medium'
else if (count === 1) confidence = 'low'
else                 confidence = 'none'   // no similar stories found — primary v1 path
```

**Interpretation**:
- **high**: 5+ similar stories with outcome data
- **medium**: 2–4 similar stories
- **low**: exactly 1 similar story
- **none**: no similar stories (bootstrap / novel story type) — this is the primary v1 path

### Phase 8: Output Predictions YAML

**Objective**: Return structured predictions for PM pipeline integration.

**Output Schema** (Zod-first type definition):

```typescript
import { z } from 'zod'

const SimilarStorySchema = z.object({
  id: z.string(),
  similarity: z.number().min(0).max(1),
  actual_tokens: z.number().int().nullable()
})

const StoryPredictionsSchema = z.object({
  split_risk: z.number().min(0).max(1),
  review_cycles: z.number().min(0),
  token_estimate: z.number().int().min(1000),
  confidence: z.enum(['high', 'medium', 'low', 'none']),
  similar_stories: z.array(SimilarStorySchema).max(5),
  model_version: z.literal('1.0.0')
})

type StoryPredictions = z.infer<typeof StoryPredictionsSchema>
```

**YAML Output Format**:

```yaml
predictions:
  split_risk: 0.7
  review_cycles: 1.8
  token_estimate: 180000
  confidence: medium
  similar_stories:
    - id: WISH-031
      similarity: 0.89
      actual_tokens: 167000
    - id: AUTH-015
      similarity: 0.82
      actual_tokens: 195000
  model_version: "1.0.0"
```

**Bootstrap output** (primary v1 path — no WKFL-006 patterns, no similar stories):

```yaml
predictions:
  split_risk: 0.1    # base only, or higher if title/scope heuristics apply
  review_cycles: 1.5
  token_estimate: 150000
  confidence: none
  similar_stories: []
  model_version: "1.0.0"
```

---

## Accuracy Tracking (Inline Function)

**Triggered by**: dev-documentation-leader after OUTCOME.yaml generation

**Input**: story_id, OUTCOME.yaml path

**Logic**:

1. **Load predictions from story YAML**:
   ```javascript
   const story_yaml = parseYaml(readFile(`{feature_dir}/in-progress/{story_id}/{story_id}.md`))
   const predictions = story_yaml.predictions
   
   if (!predictions) {
     logger.info('No predictions found for story, skipping accuracy tracking')
     return 'ACCURACY SKIPPED: no predictions'
   }
   ```

2. **Load actuals from OUTCOME.yaml**:
   ```javascript
   const outcome = parseYaml(readFile(outcome_path))
   const actuals = {
     split: outcome.split_occurred || false,
     review_cycles: outcome.phases?.dev_implementation?.review_cycles || null,
     tokens: outcome.totals?.tokens_total || null
   }
   ```

3. **Calculate prediction_accuracy**:
   ```javascript
   // Four-way classification for split_risk
   const split_classification =
     predictions.split_risk > 0.5 && actuals.split     ? 'true_positive'
   : predictions.split_risk > 0.5 && !actuals.split    ? 'false_positive'
   : predictions.split_risk <= 0.5 && !actuals.split   ? 'true_negative'
   :                                                      'false_negative'

   const prediction_accuracy = {
     split_risk: split_classification,
     // Numeric delta: actual - predicted (positive = underestimated)
     review_cycles: actuals.review_cycles != null
       ? actuals.review_cycles - predictions.review_cycles
       : null,
     // Ratio: actual / predicted (1.0 = perfect, >1 = underestimated)
     token_estimate: actuals.tokens != null
       ? actuals.tokens / predictions.token_estimate
       : null
   }
   ```

4. **Write accuracy blocks to OUTCOME.yaml**:
   ```yaml
   predictions:
     split_risk: {predictions.split_risk}
     review_cycles: {predictions.review_cycles}
     token_estimate: {predictions.token_estimate}

   actuals:
     split: {actuals.split}
     review_cycles: {actuals.review_cycles}
     tokens: {actuals.tokens}

   prediction_accuracy:
     split_risk: true_positive | false_positive | true_negative | false_negative
     review_cycles: {numeric delta: actual - predicted}
     token_estimate: {ratio: actual / predicted}
   ```

5. **Write to KB for model improvement**:
   ```javascript
   kb_add_lesson({
     title: `Prediction accuracy for ${story_id}`,
     story_id: story_id,
     category: 'prediction-accuracy',
     content: {
       predictions: predictions,
       actuals: actuals,
       prediction_accuracy: prediction_accuracy,
       confidence: predictions.confidence
     },
     tags: [
       'prediction-accuracy',
       'wkfl-007',
       `story:${story_id}`,
       `date:${new Date().toISOString().slice(0, 7)}`
     ]
   })
   ```

---

## OUTCOME.yaml Schema Extension

The following blocks are added to OUTCOME.yaml (extends WKFL-001 schema) after story completion:

```yaml
# --- WKFL-007 accuracy tracking extension ---

predictions:           # mirrors story.yaml predictions at story start
  split_risk: 0.72
  review_cycles: 2.3
  token_estimate: 180000

actuals:               # populated from OUTCOME.yaml totals + phase data
  split: false
  review_cycles: 3
  tokens: 167000

prediction_accuracy:   # four-way classification + numeric deltas
  split_risk: false_positive   # true_positive | false_positive | true_negative | false_negative
  review_cycles: 0.7           # numeric delta: actual - predicted (positive = agent underestimated)
  token_estimate: 0.93         # ratio: actual / predicted (1.0 = perfect)
```

**Population**: dev-documentation-leader.agent.md Step 5.5 triggers this after OUTCOME.yaml generation.
**Fallback**: If story has no predictions block, skip accuracy tracking gracefully.

---

## Error Handling & Graceful Degradation

**Principle**: Predictor NEVER blocks story generation.

| Failure Scenario | Fallback Behavior | Confidence |
|------------------|-------------------|-----------|
| WKFL-006 patterns missing (primary v1 path) | Heuristics-only mode, patterns_available=false | none (bootstrap) |
| KB unavailable | Conservative defaults (split_risk heuristic only, 150K tokens) | none |
| No similar stories | Use global defaults | none |
| OUTCOME.yaml parse error | Skip that story, continue with others | depends on data |
| STORY-SEED.md malformed | Log warning, use conservative estimates | none |
| Any unhandled error | Return fallback predictions, log error | none |

**Fallback Implementation**:

```javascript
try {
  const predictions = await generatePredictions(seed)
  return predictions
} catch (error) {
  logger.warn('Prediction failed, using fallback', { error })
  return {
    split_risk: 0.5,
    review_cycles: 1.5,
    token_estimate: 150000,
    confidence: 'none',
    similar_stories: [],
    model_version: '1.0.0'
  }
}
```

---

## Completion Signals

- `PREDICTION COMPLETE` - predictions generated successfully
- `PREDICTION DEGRADED: {reason}` - fallback predictions returned
- `PREDICTION FAILED: {reason}` - should never block PM pipeline

---

## Token Optimization

**High-Cost Operations**:
1. Loading full story files → mitigate by loading OUTCOME.yaml only
2. KB search returning too many results → limit to 5, filter by similarity > 0.70
3. Loading WKFL-006 patterns repeatedly → cache in memory per session

**Optimization Patterns**:
- Query KB with targeted tags ['outcome'] for similar stories
- Read STORY-SEED.md only (not full story file)
- task_contract: shallow reasoning — lightweight heuristic analysis
- Batch similar story OUTCOME.yaml loads if multiple predictions

---

## Integration Points

**Spawned by**: pm-story-generation-leader.agent.md

**Trigger**: After STORY-SEED.md generation, before parallel workers (test plan, UIUX, dev feasibility)

**Output**: Predictions YAML section merged into final story file

**Accuracy Tracking Trigger**: dev-documentation-leader.agent.md Step 5.5 after OUTCOME.yaml write

---

## Notes

- WKFL-006 dependency is pending; `patterns_available = false` is the primary v1 execution path
- Bootstrap mode (no similar stories, `confidence: none`) is not an error — it is the expected default for new story types
- Per WKFL-007 Technical Notes: `files_touched_estimate` signal in review_cycles heuristic is deferred to a future improvement pass (see FUTURE-OPPORTUNITIES.md Gap #1)
- Per PLAN.meta.md Principle 2: model assignments are learned parameters; task_contract replaces hard-coded model name
- Prediction schema uses `model_version: "1.0.0"` (not `wkfl_version`)
- Zod-first types per CLAUDE.md requirements
- No new packages required; all logic in agent markdown files
- Similar to knowledge-context-loader pattern: spawned worker, YAML output, completion signal
