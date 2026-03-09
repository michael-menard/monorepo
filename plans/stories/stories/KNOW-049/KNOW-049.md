---
story_id: KNOW-049
title: Close the Risk Predictor Accuracy Loop — Merge, Track, Tune
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: KNOW
feature: Knowledge Base
type: feature
priority: medium
depends_on:
  - WKFL-013  # OUTCOME.yaml must exist before accuracy comparison can run
  - LNGG-006  # blocked until LangGraph migration completes
---

# KNOW-049: Close the Risk Predictor Accuracy Loop — Merge, Track, Tune

## Context

`pm-story-risk-predictor` generates split risk, review cycle, and token estimates during story generation. The intent (per WKFL-007) is that these predictions are compared against actual OUTCOME.yaml data after story completion, with accuracy lessons written to the KB and later used to tune the predictor's heuristics.

The loop has two open breaks:

**Break 1 — Predictions never reach the story file.** `pm-story-generation-leader` Phase 4 synthesizes outputs from all PM workers (test-plan, dev-feasibility, uiux-notes) but has no code to read the risk predictor's output and merge it into the story frontmatter. The predictions YAML structure is defined in WKFL-007's schema note but is never actually embedded. The predictor runs and its output is discarded.

**Break 2 — No agent tunes the predictor.** The accuracy tracking function is documented in `pm-story-risk-predictor.agent.md` and would write `kb_add_lesson` entries tagged `prediction-accuracy` after each story completes. But even if those entries were written (which requires WKFL-013's OUTCOME.yaml to exist), no agent ever reads them. There is no analytics agent that computes mean error, detects systematic bias, or proposes adjustments to the predictor's heuristics. The accuracy data accumulates and is never acted on.

The consequence: the predictor's heuristics are frozen at their initial manual values regardless of how many stories complete. Every estimate is generated as if no history exists.

## Goal

Fix the predictions merge in `pm-story-generation-leader`. Add a `kb_analyze_prediction_accuracy` MCP tool (or a dedicated analytics agent) that reads historical prediction-accuracy lessons and produces bias/error reports. Wire the report output into `pm-story-risk-predictor` so it adjusts its estimates based on observed patterns.

## Non-goals

- Machine-learning-based predictor updates (heuristic adjustments only — no model training)
- Retroactively adding predictions to stories that completed before this story
- Real-time predictor updates mid-story (adjustments apply to the next story generated)

## Scope

### Fix 1: Merge Predictions into Story File

In `pm-story-generation-leader.agent.md` Phase 4 synthesis, add:

```
# After spawning all PM workers including risk-predictor, collect outputs:

Read risk predictor output from Task result (or temp file if background):
  predictions:
    split_risk: {value}
    review_cycles: {value}
    token_estimate: {value}
    confidence: {level}
    similar_stories: [{story_id, actual_cycles, actual_tokens}]
    generated_at: {timestamp}
    model: haiku

Merge into story YAML frontmatter under `predictions:` key.
Log: "Risk predictions merged: split_risk={X}, cycles={Y}, tokens={Z}, confidence={C}"
```

If the risk predictor task fails or times out, set `predictions: null` and log a warning — do not block story generation.

### Fix 2: Ensure Accuracy Tracking Fires in `dev-documentation-leader`

Step 4.5 in `dev-documentation-leader.agent.md` documents the accuracy comparison but has no explicit Task invocation. Add the call:

```
## Step 4.5: Risk Prediction Accuracy Tracking

IF story.predictions is not null AND OUTCOME.yaml exists:
  Compare:
    predicted_cycles vs OUTCOME.yaml.totals.review_cycles
    predicted_tokens vs OUTCOME.yaml.totals.tokens_total
    predicted_split_risk vs (did story actually split? from CHECKPOINT.yaml)

  cycle_error = abs(predicted - actual) / actual
  token_error = abs(predicted - actual) / actual
  split_outcome = true_positive | false_positive | true_negative | false_negative

  kb_add_lesson({
    title: "Prediction accuracy: {STORY_ID}",
    story_id: STORY_ID,
    category: "prediction-accuracy",
    content: { predictions, actuals, variance: { cycle_error, token_error, split_outcome } },
    tags: ["prediction-accuracy", "wkfl-007", "story:{STORY_ID}", "date:{YYYY-MM}"]
  })

  Log: "Prediction accuracy tracked: cycle_error={X}%, token_error={Y}%, split={split_outcome}"
ELSE:
  Log: "Skipping prediction accuracy tracking: predictions=null or OUTCOME.yaml missing"
```

### Fix 3: `kb_analyze_prediction_accuracy` MCP Tool

Add a new MCP tool that aggregates historical prediction-accuracy lessons:

```typescript
kb_analyze_prediction_accuracy({
  period_days?: number   // default: 90
  min_stories?: number   // minimum stories required to report (default: 5)
  epic?: string          // scope to one epic
})
```

**Returns:**

```typescript
interface PredictionAccuracyReport {
  stories_analyzed: number
  period: { from: string; to: string }
  token_accuracy: {
    mean_absolute_error_pct: number   // avg abs(predicted-actual)/actual
    bias_pct: number                   // positive = consistent over-prediction
    within_20pct: number               // % of predictions within 20% of actual
  }
  cycle_accuracy: {
    mean_absolute_error: number        // avg abs cycles off
    bias: number                       // positive = consistent over-estimate
    exact_match_rate: number           // % exact cycle count match
  }
  split_prediction: {
    true_positive_rate: number         // correctly predicted splits
    false_positive_rate: number        // predicted split, didn't split
    false_negative_rate: number        // predicted no split, did split
  }
  recommendations: string[]            // human-readable tuning suggestions
  // e.g. "Token estimates are +35% high on average — reduce multiplier"
  //      "Split risk > 0.6 has 70% false positive rate — raise threshold to 0.75"
}
```

### Fix 4: Wire Report into Predictor at Generation Time

At the start of `pm-story-risk-predictor.agent.md`, call the analytics tool:

```
# Step 0: Load accuracy calibration
accuracy = kb_analyze_prediction_accuracy({ period_days: 90 })

IF accuracy.stories_analyzed >= 5:
  Apply bias corrections:
    token_estimate *= (1 - accuracy.token_accuracy.bias_pct / 100)
    review_cycles_base += accuracy.cycle_accuracy.bias * -1  # correct for systematic error
  Log: "Accuracy calibration applied: token_bias={X}%, cycle_bias={Y}"
ELSE:
  Log: "Insufficient history for calibration ({N} stories) — using baseline heuristics"
```

This closes the loop: predictions → outcomes → accuracy analysis → corrected predictions.

### Packages Affected

- `.claude/agents/pm-story-generation-leader.agent.md` — Phase 4: merge risk predictor output into story frontmatter
- `.claude/agents/dev-documentation-leader.agent.md` — Step 4.5: add explicit accuracy tracking Task invocation
- `.claude/agents/pm-story-risk-predictor.agent.md` — Step 0: load and apply accuracy calibration from KB
- `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` — add `kb_analyze_prediction_accuracy` schema
- `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` — implement handler
- `apps/api/knowledge-base/src/crud-operations/prediction-accuracy-operations.ts` — new file for aggregation queries

## Acceptance Criteria

- [ ] After `pm-story-generation-leader` completes, the generated story YAML contains a `predictions:` section with `split_risk`, `review_cycles`, `token_estimate`, and `confidence`
- [ ] If the risk predictor task fails, the story is still generated with `predictions: null` and a warning is logged
- [ ] After a story completes and OUTCOME.yaml exists, `dev-documentation-leader` Step 4.5 writes a `prediction-accuracy` KB lesson with variance metrics
- [ ] `kb_analyze_prediction_accuracy` returns a report with mean error, bias, and split prediction accuracy across the last 90 days
- [ ] `pm-story-risk-predictor` reads the accuracy report at generation time and adjusts estimates when 5+ stories of history exist
- [ ] `kb_analyze_prediction_accuracy` returns gracefully (no error) when fewer than 5 stories exist, with `stories_analyzed: N` and empty recommendations
- [ ] Running the predictor on a project with 10+ completed stories produces estimates that are demonstrably closer to actuals than the baseline heuristics (measured by mean absolute error < baseline)
