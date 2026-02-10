# Dev Feasibility Review: WKFL-008 - Workflow Experimentation Framework

## Feasibility Summary

**Feasible for MVP**: Yes

**Confidence**: High

**Why**:
- All required dependencies are in place (WKFL-001 OUTCOME.yaml schema exists)
- No new packages required (pure agent/config framework)
- Statistical analysis logic is well-defined (Welch's t-test)
- Schema evolution is backward compatible
- Clear integration points with existing workflow
- Reuses established patterns (Zod schemas, KB integration, YAML config)
- Graceful degradation strategy for edge cases

---

## Likely Change Surface (Core Only)

### Files/Directories to Create

1. **`.claude/config/experiments.yaml`**
   - New config file for experiment definitions
   - Schema: id, description, status, traffic, eligibility, metrics, min_sample_size

2. **`.claude/agents/experiment-analyzer.agent.md`**
   - New Sonnet worker agent
   - Statistical analysis and recommendation logic
   - ~25k tokens estimated

3. **`.claude/commands/experiment-report.md`**
   - New command to trigger experiment analysis
   - Spawns experiment-analyzer agent
   - ~5k tokens estimated

4. **`.claude/schemas/experiment-schema.md`** (optional)
   - Zod schema documentation for experiments.yaml
   - Defines ExperimentSchema, ExperimentReportSchema
   - ~5k tokens estimated

### Files to Modify

1. **`pm-story-generation-leader.agent.md`** or **`pm-story-seed-agent.agent.md`**
   - Add Phase 0.5: Traffic Routing Logic
   - Load experiments.yaml, evaluate eligibility, assign variant
   - ~10k tokens addition
   - Integration point: After seed generation, before story.yaml write

2. **`dev-documentation-leader.agent.md`**
   - Add experiment_variant to OUTCOME.yaml generation
   - Read story.yaml for variant, include in OUTCOME.yaml
   - ~3k tokens addition
   - Integration point: OUTCOME.yaml write phase

3. **`.claude/schemas/outcome-schema.md`**
   - Add `experiment_variant: string | null` field to v1 schema
   - Backward compatible (nullable for old stories)
   - ~1k tokens addition

4. **Story YAML Schema** (wherever defined)
   - Add `experiment_variant: string | null` field to frontmatter
   - ~500 tokens addition

### Critical Endpoints

**None** - This is a pure workflow framework with no HTTP endpoints.

### Critical Deploy Touchpoints

**None** - Agent and config files deployed via git commits only. No infrastructure changes required.

---

## MVP-Critical Risks

### Risk 1: Statistical Library Implementation Correctness

**Why it blocks MVP**:
- If t-test computation is incorrect, rollout recommendations will be wrong
- Could lead to rolling out harmful experiments or stopping beneficial ones
- Core value proposition is data-driven decisions

**Required Mitigation**:
- Test t-test implementation against known datasets with expected p-values
- Document formula used (Welch's t-test for unequal variances)
- Include test cases:
  - Known significant difference (p < 0.05)
  - Known non-significant difference (p > 0.05)
  - Edge case: zero variance in one group
  - Edge case: identical distributions (p ≈ 1.0)
- Consider using simplified z-test for large samples (n > 30) as fallback

**Estimated Effort**: +5k tokens for t-test implementation and tests

---

### Risk 2: Variant Pollution (Story in Multiple Experiments)

**Why it blocks MVP**:
- If a story is accidentally assigned to multiple experiments, results are invalid
- Violates statistical independence assumption
- Cannot cleanly attribute results to single experiment

**Required Mitigation**:
- Implement "first match wins" logic strictly (break after first assignment)
- Test overlapping eligibility scenarios (EC-3 in test plan)
- Add assertion in story.yaml write: `experiment_variant` must be string or null, never array
- Log when multiple experiments match (for audit trail)

**Estimated Effort**: +2k tokens for additional validation and logging

---

### Risk 3: Missing OUTCOME.yaml Handling

**Why it blocks MVP**:
- In-progress stories don't have OUTCOME.yaml yet
- experiment-analyzer must gracefully skip incomplete stories
- If analyzer crashes on missing files, no reports can be generated

**Required Mitigation**:
- Wrap OUTCOME.yaml load in try/catch for each story
- Log skipped stories: "OUTCOME.yaml not found for STORY-XXX, skipping"
- Proceed with analysis using available stories only
- Test E-6 scenario (missing OUTCOME.yaml)

**Estimated Effort**: +1k tokens for error handling

---

### Risk 4: Insufficient Sample Size Handling

**Why it blocks MVP**:
- Early experiments will have < 10 stories per variant
- Cannot make statistically valid claims with insufficient data
- If analyzer crashes or makes false claims, framework is unusable

**Required Mitigation**:
- Check sample sizes before statistical analysis
- If n_treatment < min_sample_size OR n_control < min_sample_size:
  - Return recommendation: `action: continue`
  - Rationale: "Insufficient data: X treatment, Y control (need Z+ each)"
  - Confidence: low
- Test E-8 scenario (insufficient samples)

**Estimated Effort**: +1k tokens for sample size check

---

### Risk 5: Backward Compatibility (Legacy OUTCOME.yaml)

**Why it blocks MVP**:
- Stories completed before WKFL-008 have OUTCOME.yaml without `experiment_variant` field
- If analyzer requires this field, it will crash on legacy data
- Breaks historical analysis and reporting

**Required Mitigation**:
- Treat missing `experiment_variant` as `null` (not control, not treatment)
- Exclude legacy stories from experiment analysis
- Log info: "Story STORY-XXX predates experiment tracking, excluding"
- Test E-7 scenario (backward compatibility)

**Estimated Effort**: +1k tokens for backward compatibility logic

---

## Missing Requirements for MVP

### MR-1: Control Group Selection Strategy

**What's Missing**:
- Seed describes two options for control group selection:
  1. Same calendar period as experiment (experiment.created_at to present)
  2. Rolling window (last N control stories)
- Story does not specify which approach to use

**Required PM Decision**:
Add to story AC-4 or implementation notes:
> "Control group consists of all stories with `experiment_variant: 'control'` created in the same calendar period as the experiment (from experiment.created_at to present). This ensures temporal consistency and reduces confounding variables."

**Why it's MVP-critical**:
- Different selection strategies yield different results
- Inconsistent control selection invalidates statistical comparison
- Must be documented for reproducibility

---

### MR-2: Confidence Threshold for Rollout

**What's Missing**:
- Seed asks: "What confidence level required for rollout?"
- Story AC-5 defines confidence levels but not minimum required for rollout action

**Required PM Decision**:
Add to story AC-5:
> "Rollout recommendation requires minimum 'medium' confidence (p < 0.05, sample_size >= 10 per variant). 'Low' confidence experiments can only produce 'continue' or 'stop' recommendations, never 'rollout' or 'expand_traffic'."

**Why it's MVP-critical**:
- Without threshold, low-confidence rollouts could occur
- Safety mechanism to prevent premature decisions
- Affects recommendation logic directly

---

### MR-3: Experiment Lifecycle Transition Rules

**What's Missing**:
- Seed asks: "When to mark experiment 'complete'?"
- Story does not define status transition rules (active → paused → complete)

**Required PM Decision**:
Add to story implementation notes:
> "Experiment status transitions are manual (human updates experiments.yaml). Recommended workflow:
> - active: Currently routing traffic, collecting data
> - paused: Stop routing new stories, keep historical data intact for analysis
> - complete: Experiment concluded, rollout decision made, archive EXPERIMENT-REPORT.yaml
>
> No automatic status transitions in MVP."

**Why it's MVP-critical**:
- Determines whether new stories are assigned to experiment
- Affects experiment-analyzer filtering logic (active vs all)
- Prevents zombie experiments

---

## MVP Evidence Expectations

### 1. Zod Schema Validation

**What**: All YAML files validated with Zod schemas

**Evidence**:
- experiments.yaml parses without validation errors
- story.yaml with experiment_variant field validates
- OUTCOME.yaml with experiment_variant field validates
- EXPERIMENT-REPORT.yaml structure validates

**How to Verify**:
- Unit tests for Zod schemas
- Test fixtures with valid and invalid YAML
- Assert error messages for invalid structures

---

### 2. Traffic Routing Correctness

**What**: Stories assigned to treatment at expected rate

**Evidence**:
- Create 100 stories with traffic 0.2
- Expect ~20 stories assigned to treatment (15-25 acceptable range due to randomness)
- Expect ~80 stories assigned to control

**How to Verify**:
- Mock Math.random() for deterministic tests (HP-2, HP-3)
- Statistical test with large sample size (EC-13)
- Log assignment decisions for audit

---

### 3. Variant Propagation

**What**: experiment_variant flows correctly from story.yaml → OUTCOME.yaml

**Evidence**:
- story.yaml has `experiment_variant: "exp-test-01"`
- OUTCOME.yaml has matching `experiment_variant: "exp-test-01"`
- Values are identical (string comparison)

**How to Verify**:
- HP-4 test case
- Integration test: generate story → complete implementation → verify OUTCOME.yaml

---

### 4. Statistical Analysis Output

**What**: EXPERIMENT-REPORT.yaml contains valid statistical analysis

**Evidence**:
- report_date present
- experiment_id matches input
- variants.control.sample_size >= 0
- variants.treatment.sample_size >= 0
- analysis.p_value between 0.0 and 1.0
- analysis.confidence in [high, medium, low]
- recommendation.action in [expand_traffic, rollout, stop, continue]

**How to Verify**:
- HP-6, HP-7 test cases
- Mock statistical scenarios (known p-values)
- Assert YAML structure matches schema

---

### 5. Graceful Degradation

**What**: Framework continues to work when experiments.yaml missing or malformed

**Evidence**:
- experiments.yaml missing → all stories assigned to control
- experiments.yaml malformed → log warning, default to control
- OUTCOME.yaml missing → skip story in analysis
- Insufficient samples → "continue" recommendation

**How to Verify**:
- E-1, E-2, E-6, E-8 test cases
- Assert no crashes, only warnings
- Verify workflow continues without blocking

---

### 6. Command Execution

**What**: `/experiment-report` command runs successfully

**Evidence**:
- Command spawns experiment-analyzer agent
- EXPERIMENT-REPORT.yaml written to correct path
- Console output shows summary (action recommendation)

**How to Verify**:
- HP-8 test case
- Manual test: `/experiment-report exp-test-01`
- Assert file written, no errors

---

## Implementation Notes

### Reuse Candidates (MUST REUSE)

1. **OUTCOME.yaml from WKFL-001**
   - Location: `.claude/schemas/outcome-schema.md`
   - Fields to reuse: totals.tokens_total, totals.duration_ms, qa_gate.verdict, totals.review_cycles
   - Extension: Add `experiment_variant` field

2. **KB Tools**
   - kb_search for querying outcomes
   - kb_add_lesson for persisting experiment results
   - Pattern from WKFL-002, WKFL-006

3. **Zod-First Schema Pattern**
   - All schemas defined as Zod objects
   - Type inference via `z.infer<typeof Schema>`
   - Pattern from entire codebase (CLAUDE.md requirement)

4. **Sonnet Agent Pattern**
   - Complex cross-story analysis
   - YAML output format
   - Pattern from pattern-miner, workflow-retro

5. **Statistical Significance Patterns (WKFL-002)**
   - Minimum sample sizes
   - p-value thresholds
   - Confidence levels based on sample size and p-values

### Components to Create

1. **experiments.yaml Schema (Zod)**

```typescript
import { z } from 'zod'

const ExperimentEligibilitySchema = z.object({
  ac_count_max: z.number().int().positive().optional(),
  ac_count_min: z.number().int().positive().optional(),
  complexity: z.enum(['simple', 'medium', 'complex']).optional(),
  domain: z.array(z.string()).optional(),
  all: z.boolean().optional()
})

const ExperimentMetricsSchema = z.object({
  primary: z.string(),
  secondary: z.array(z.string())
})

const ExperimentSchema = z.object({
  id: z.string(),
  description: z.string(),
  status: z.enum(['active', 'paused', 'complete']),
  created_at: z.string().datetime(),
  traffic: z.number().min(0.0).max(1.0),
  eligibility: ExperimentEligibilitySchema,
  metrics: ExperimentMetricsSchema,
  min_sample_size: z.number().int().positive().default(10)
})

const ExperimentsConfigSchema = z.object({
  experiments: z.array(ExperimentSchema)
})
```

2. **EXPERIMENT-REPORT.yaml Schema (Zod)**

```typescript
const VariantMetricsSchema = z.object({
  sample_size: z.number().int().nonnegative(),
  metrics: z.record(z.number()) // { gate_pass_rate: 0.82, cycle_time_hours: 4.2 }
})

const AnalysisSchema = z.object({
  primary_metric: z.string(),
  difference: z.number(),
  p_value: z.number().min(0.0).max(1.0),
  confidence: z.enum(['high', 'medium', 'low'])
})

const SecondaryMetricAnalysisSchema = z.object({
  metric: z.string(),
  difference: z.number(),
  p_value: z.number().min(0.0).max(1.0),
  confidence: z.enum(['high', 'medium', 'low'])
})

const RecommendationSchema = z.object({
  action: z.enum(['expand_traffic', 'rollout', 'stop', 'continue']),
  rationale: z.string(),
  confidence: z.enum(['high', 'medium', 'low'])
})

const ExperimentReportSchema = z.object({
  report_date: z.string().datetime(),
  experiment_id: z.string(),
  variants: z.object({
    control: VariantMetricsSchema,
    treatment: VariantMetricsSchema
  }),
  analysis: AnalysisSchema,
  secondary_metrics: z.array(SecondaryMetricAnalysisSchema),
  recommendation: RecommendationSchema
})
```

3. **Traffic Routing Logic (pm-story-generation-leader)**

```javascript
// Phase 0.5: Experiment Variant Assignment (after seed generation)

// Load experiments config
let experiments = null
try {
  const experimentsPath = '.claude/config/experiments.yaml'
  experiments = parseYaml(readFile(experimentsPath))
  ExperimentsConfigSchema.parse(experiments) // Validate with Zod
} catch (error) {
  logger.warn('Failed to load experiments.yaml, defaulting to control', { error })
  story.experiment_variant = 'control'
  // Continue story generation
}

// Filter to active experiments
const activeExperiments = experiments?.experiments.filter(e => e.status === 'active') || []

// Assign variant (first match wins)
let experiment_variant = 'control'

for (const exp of activeExperiments) {
  if (isEligible(story, exp.eligibility)) {
    // Random traffic routing
    if (Math.random() < exp.traffic) {
      experiment_variant = exp.id
      logger.info(`Story ${story.id} assigned to experiment ${exp.id}`)
      break  // First match wins, no double-assignment
    }
  }
}

// If no experiment matched or random roll failed, default to control
if (experiment_variant === 'control') {
  logger.info(`Story ${story.id} assigned to control group`)
}

// Add to story.yaml
story.experiment_variant = experiment_variant
```

4. **Eligibility Check Function**

```javascript
function isEligible(story, eligibility) {
  // Special case: match all stories
  if (eligibility.all === true) {
    return true
  }

  // AC count filters
  if (eligibility.ac_count_max !== undefined && story.ac_count > eligibility.ac_count_max) {
    return false
  }
  if (eligibility.ac_count_min !== undefined && story.ac_count < eligibility.ac_count_min) {
    return false
  }

  // Complexity filter (heuristic based on scope)
  if (eligibility.complexity !== undefined) {
    const story_complexity = estimateComplexity(story.scope_keywords)
    if (story_complexity !== eligibility.complexity) {
      return false
    }
  }

  // Domain filter (epic or feature)
  if (eligibility.domain !== undefined && eligibility.domain.length > 0) {
    if (!eligibility.domain.includes(story.epic)) {
      return false
    }
  }

  return true
}

function estimateComplexity(scope_keywords) {
  // Heuristic complexity estimation
  if (scope_keywords.length <= 2) return 'simple'
  if (scope_keywords.length >= 5) return 'complex'
  if (scope_keywords.includes('auth') || scope_keywords.includes('security')) return 'complex'
  return 'medium'
}
```

5. **Welch's t-test Implementation**

```javascript
function welchTTest(controlValues, treatmentValues) {
  const n1 = controlValues.length
  const n2 = treatmentValues.length

  const mean1 = mean(controlValues)
  const mean2 = treatmentValues)

  const variance1 = variance(controlValues)
  const variance2 = variance(treatmentValues)

  // Standard error
  const se = Math.sqrt((variance1 / n1) + (variance2 / n2))

  // t-statistic
  const t = (mean2 - mean1) / se

  // Degrees of freedom (Welch-Satterthwaite equation)
  const df = Math.pow((variance1/n1) + (variance2/n2), 2) /
             (Math.pow(variance1/n1, 2)/(n1-1) + Math.pow(variance2/n2, 2)/(n2-1))

  // Two-tailed p-value (approximation using t-distribution)
  const pValue = tDistribution(Math.abs(t), Math.floor(df))

  return {
    difference: mean2 - mean1,
    p_value: pValue,
    confidence: determineConfidence(pValue, n1, n2)
  }
}

function determineConfidence(pValue, n1, n2) {
  if (pValue < 0.01 && n1 >= 20 && n2 >= 20) {
    return 'high'
  } else if (pValue < 0.05 && n1 >= 10 && n2 >= 10) {
    return 'medium'
  } else {
    return 'low'
  }
}
```

### Estimated Effort Breakdown

| Component | Estimated Tokens |
|-----------|------------------|
| experiments.yaml schema | 5k |
| Traffic routing integration | 10k |
| OUTCOME.yaml extension | 3k |
| experiment-analyzer agent | 25k |
| Statistical functions (t-test) | 8k |
| /experiment-report command | 5k |
| EXPERIMENT-REPORT.yaml schema | 5k |
| Error handling and logging | 7k |
| Testing fixtures and tests | 12k |
| Documentation | 5k |
| **Subtotal** | **85k tokens** |
| **Risk mitigation** | +10k |
| **Total** | **95k tokens** |

**Variance from Estimate**: +15k tokens (95k vs 80k)

**Reason**: Additional error handling, validation, and test coverage for MVP-critical risks.

**Recommendation**: Acceptable variance (<20%), proceed with implementation.

---

## Critical Success Factors

1. **Statistical Correctness**: t-test implementation must be validated against known datasets
2. **Graceful Degradation**: All error scenarios must be handled without blocking workflow
3. **Variant Isolation**: "First match wins" logic must prevent double-assignment
4. **Backward Compatibility**: Legacy OUTCOME.yaml files must be handled gracefully
5. **Minimum Sample Enforcement**: Never make statistical claims with < 10 samples per variant

---

## Implementation Order

1. **Phase 1**: Schema definitions (experiments.yaml, EXPERIMENT-REPORT.yaml)
2. **Phase 2**: Traffic routing in pm-story-generation-leader (with tests)
3. **Phase 3**: OUTCOME.yaml extension in dev-documentation-leader
4. **Phase 4**: experiment-analyzer agent (statistical analysis)
5. **Phase 5**: /experiment-report command
6. **Phase 6**: Integration testing with mock data
7. **Phase 7**: Documentation and example experiments.yaml

---

**Feasibility Review Complete - MVP APPROVED**
