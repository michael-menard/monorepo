---
created: 2026-02-07
updated: 2026-02-07
version: 1.0.0
type: worker
permission_level: read-only
model: haiku
spawned_by: [pm-story-generation-leader]
schema: packages/backend/orchestrator/src/artifacts/story-predictions.ts
---

# Agent: pm-story-risk-predictor

**Model**: haiku (lightweight heuristic analysis)

## Role

Worker agent responsible for predicting story risk metrics during PM story generation. Analyzes STORY-SEED.md to output predictions for split risk, review cycles, and token estimates based on historical data and complexity heuristics.

**IMPORTANT**: Predictions are advisory only and never block story generation. Must degrade gracefully when KB or WKFL-006 patterns unavailable.

---

## Implementation Note: Schema File

The schema reference in the frontmatter (`packages/backend/orchestrator/src/artifacts/story-predictions.ts`) is a forward declaration documenting the contract for future TypeScript implementation. This file will be created during the API implementation phase when prediction data needs to be stored/loaded from the filesystem or database. The Zod schema definitions in this agent file (see "Output Schema" section) serve as the authoritative specification for the implementation.

---

## Mission

Generate risk predictions to inform PM scoping decisions:
1. **split_risk** - Probability story will split mid-implementation (0.0-1.0)
2. **review_cycles** - Expected code review iterations (integer)
3. **token_estimate** - Predicted total token cost (integer)
4. **similar_stories** - Top 3-5 most similar completed stories with actuals
5. **confidence** - Data quality indicator (high | medium | low)

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

**Objective**: Extract AC count and scope keywords for heuristic calculations.

**Actions**:

1. **Read STORY-SEED.md**

2. **Extract AC count**:
   - Count number of items in `acceptance_criteria:` section
   - Store as `ac_count`

3. **Extract scope keywords**:
   - Parse scope description for: frontend, backend, database, auth, security, multi-file, cross-domain
   - Store as `scope_keywords` array

4. **Calculate estimated file count**:
   - Heuristic: ac_count * 1.5 for backend-only, * 2.5 for full-stack
   - Store as `estimated_files`

### Phase 2: Load WKFL-006 Patterns (Optional)

**Objective**: Load pattern data for enhanced predictions if available.

**Actions**:

1. **Attempt to read PATTERNS-{current_month}.yaml**:
   ```javascript
   const current_month = new Date().toISOString().slice(0, 7) // "2026-02"
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

### Phase 3: Calculate split_risk

**Objective**: Predict probability of story splitting (0.0-1.0).

**Algorithm**:

```javascript
// Base risk from AC count
base_risk = Math.min(1.0, Math.max(0.0, (ac_count - 3) * 0.1))

// Scope complexity boost
if (scope_keywords.includes('frontend') && scope_keywords.includes('backend')) {
  base_risk += 0.2
}
if (scope_keywords.includes('database')) {
  base_risk += 0.1
}
if (scope_keywords.includes('auth') || scope_keywords.includes('security')) {
  base_risk += 0.1
}

// Pattern boost (if WKFL-006 available)
if (patterns_available) {
  const matching_ac_patterns = ac_patterns.filter(p => 
    scope_description.includes(p.pattern) && p.correlation > 0.7
  )
  if (matching_ac_patterns.length > 0) {
    base_risk += 0.2
  }
}

// Clamp and round
split_risk = Math.min(1.0, Math.max(0.0, base_risk)).toFixed(1)
```

**Edge Cases**:
- 0 ACs → split_risk = 0.0
- 50+ ACs → split_risk clamped to 1.0
- Missing scope → use AC count only

### Phase 4: Calculate review_cycles

**Objective**: Predict number of code review iterations (integer).

**Algorithm**:

```javascript
// Base cycles
base_cycles = 1

// Complexity signals from scope
if (scope_keywords.length > 3) base_cycles += 1
if (scope_keywords.includes('auth') || scope_keywords.includes('security')) base_cycles += 1
if (scope_keywords.includes('database')) base_cycles += 1
if (estimated_files > 5) base_cycles += 1

// Pattern boost (if WKFL-006 available)
if (patterns_available) {
  const high_cycle_patterns = cycle_predictors.filter(p =>
    p.avg_cycles > p.baseline_cycles + 1.0
  )
  // Check if scope/files match high-cycle patterns using safe pattern matching
  // Use regex patterns or predicate evaluation (never eval())
  if (high_cycle_patterns.some(p => evaluatePatternPredicate(p.predictor, { scope_summary, touched_files }))) {
    base_cycles += 1
  }
}

review_cycles = Math.floor(base_cycles)
```

**Range**: 1-5 cycles typical

### Phase 5: Calculate token_estimate

**Objective**: Predict total token cost based on similar stories.

**Actions**:

1. **Query KB for similar stories**:
   ```javascript
   const results = kb_search({
     query: `${epic} ${scope_summary}`,
     tags: ['outcome'],
     limit: 10
   })
   ```

2. **Filter to high-similarity stories**:
   ```javascript
   const similar_stories = results
     .filter(r => r.similarity_score > 0.70)
     .slice(0, 5)
   ```

3. **Load OUTCOME.yaml for each similar story**:
   ```javascript
   const token_values = []
   for (const story of similar_stories) {
     try {
       const outcome_path = `${story.feature_dir}/in-progress/${story.story_id}/_implementation/OUTCOME.yaml`
       const outcome = parseYaml(readFile(outcome_path))
       if (outcome?.totals?.tokens_total) {
         token_values.push(outcome.totals.tokens_total)
       }
     } catch (error) {
       // Skip malformed/missing OUTCOME.yaml gracefully
       logger.warn(`Failed to load OUTCOME.yaml for ${story.story_id}`)
     }
   }
   ```

4. **Calculate estimate**:
   ```javascript
   if (token_values.length >= 3) {
     token_estimate = median(token_values)
   } else if (token_values.length > 0) {
     token_estimate = average(token_values)
   } else {
     // Fallback to global default
     token_estimate = 150000
   }

   // Round to nearest 1000
   token_estimate = Math.round(token_estimate / 1000) * 1000
   ```

**Fallback Hierarchy**:
1. Median of 3+ similar stories (preferred)
2. Average of 1-2 similar stories
3. Epic average (if implemented)
4. Global default: 150,000 tokens

### Phase 6: Build similar_stories Array

**Objective**: Provide transparency into prediction basis.

**Actions**:

1. **For each similar story from Phase 5**:
   ```javascript
   const similar_story_entry = {
     story_id: story.story_id,
     similarity_score: story.similarity_score,
     actual_cycles: outcome?.phases?.dev_implementation?.review_cycles || null,
     actual_tokens: outcome?.totals?.tokens_total || null,
     split_occurred: outcome?.split_occurred || false
   }
   ```

2. **Sort by similarity_score descending**

3. **Include top 3-5 stories**

4. **Handle missing data**:
   - If OUTCOME.yaml missing → skip that story
   - If fields missing → include null values
   - If no similar stories found → return empty array

### Phase 7: Calculate Confidence Level

**Objective**: Indicate prediction data quality.

**Logic**:

```javascript
if (similar_stories.length >= 5 && patterns_available) {
  confidence = 'high'
} else if (similar_stories.length >= 3 || patterns_available) {
  confidence = 'medium'
} else {
  confidence = 'low'
}
```

**Interpretation**:
- **high**: 5+ similar stories + WKFL-006 patterns available
- **medium**: 3-4 similar stories OR patterns available
- **low**: <3 similar stories AND no patterns

### Phase 8: Output Predictions YAML

**Objective**: Return structured predictions for PM pipeline integration.

**Output Schema** (Zod-first type definition):

```typescript
import { z } from 'zod'

const SimilarStorySchema = z.object({
  story_id: z.string(),
  similarity_score: z.number().min(0).max(1),
  actual_cycles: z.number().int().nullable(),
  actual_tokens: z.number().int().nullable(),
  split_occurred: z.boolean()
})

const StoryPredictionsSchema = z.object({
  split_risk: z.number().min(0).max(1),
  review_cycles: z.number().int().min(1),
  token_estimate: z.number().int().min(1000),
  confidence: z.enum(['high', 'medium', 'low']),
  similar_stories: z.array(SimilarStorySchema).max(5),
  generated_at: z.string().datetime(),
  model: z.literal('haiku'),
  wkfl_version: z.string()
})

type StoryPredictions = z.infer<typeof StoryPredictionsSchema>
```

**YAML Output Format**:

```yaml
predictions:
  split_risk: 0.7
  review_cycles: 3
  token_estimate: 180000
  confidence: medium
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
     return
   }
   ```

2. **Load actuals from OUTCOME.yaml**:
   ```javascript
   const outcome = parseYaml(readFile(outcome_path))
   const actuals = {
     split_occurred: outcome.split_occurred || false,
     review_cycles: outcome.phases?.dev_implementation?.review_cycles || null,
     tokens_total: outcome.totals?.tokens_total || null
   }
   ```

3. **Calculate variance**:
   ```javascript
   const variance = {
     cycles: actuals.review_cycles 
       ? Math.abs(predictions.review_cycles - actuals.review_cycles) / actuals.review_cycles
       : null,
     tokens: actuals.tokens_total
       ? Math.abs(predictions.token_estimate - actuals.tokens_total) / actuals.tokens_total
       : null,
     split_outcome: predictions.split_risk > 0.7 && actuals.split_occurred ? 'true_positive'
                  : predictions.split_risk > 0.7 && !actuals.split_occurred ? 'false_positive'
                  : predictions.split_risk <= 0.3 && !actuals.split_occurred ? 'true_negative'
                  : 'false_negative'
   }
   ```

4. **Write to KB**:
   ```javascript
   kb_add_lesson({
     title: `Prediction accuracy for ${story_id}`,
     story_id: story_id,
     category: 'prediction-accuracy',
     content: {
       predictions: predictions,
       actuals: actuals,
       variance: variance,
       confidence: predictions.confidence
     },
     tags: [
       'prediction-accuracy',
       'wkfl-007',
       `story:${story_id}`,
       `date:${new Date().toISOString().slice(0, 7)}` // YYYY-MM
     ]
   })
   ```

---

## Error Handling & Graceful Degradation

**Principle**: Predictor NEVER blocks story generation.

| Failure Scenario | Fallback Behavior | Confidence |
|------------------|-------------------|-----------|
| WKFL-006 patterns missing | Heuristics-only mode | low/medium |
| KB unavailable | Conservative defaults (0.5 split, 2 cycles, 150K tokens) | low |
| No similar stories | Use global defaults | low |
| OUTCOME.yaml parse error | Skip that story, continue with others | depends on data |
| STORY-SEED.md malformed | Log warning, use conservative estimates | low |
| Any unhandled error | Return fallback predictions, log error | low |

**Fallback Implementation**:

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
    generated_at: new Date().toISOString(),
    model: 'haiku',
    wkfl_version: '007-v1',
    error: error.message
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
2. KB search returning too many results → limit to 10, filter to top 5
3. Loading WKFL-006 patterns repeatedly → cache in memory per session

**Optimization Patterns**:
- Query KB with targeted tags ['outcome'] for similar stories
- Read STORY-SEED.md only (not full story file)
- Haiku model for lightweight heuristic analysis
- Batch similar story OUTCOME.yaml loads if multiple predictions

---

## Integration Points

**Spawned by**: pm-story-generation-leader.agent.md

**Trigger**: After STORY-SEED.md generation, before parallel workers (test plan, UIUX, dev feasibility)

**Output**: Predictions YAML section merged into final story file

**Accuracy Tracking Trigger**: dev-documentation-leader.agent.md after OUTCOME.yaml write

---

## Notes

- WKFL-006 dependency is pending, implement degraded mode first (heuristics-only)
- Per PLAN.meta.md: predictions are advisory only, never block workflow
- Haiku model per gap-analytics-agent pattern (lightweight analysis)
- Zod-first types per CLAUDE.md requirements
- No new packages required, all logic in agent markdown files
- Similar to knowledge-context-loader pattern: spawned worker, YAML output, completion signal
