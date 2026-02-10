# Experiment Schema Documentation

Zod schemas for experiment definitions and analysis reports.

---

## ExperimentEligibilitySchema

Defines which stories are eligible for an experiment.

```typescript
import { z } from 'zod'

export const ExperimentEligibilitySchema = z.object({
  // Maximum AC count (story.ac_count <= threshold)
  ac_count_max: z.number().int().positive().optional(),
  
  // Minimum AC count (story.ac_count >= threshold)
  ac_count_min: z.number().int().positive().optional(),
  
  // Complexity level: simple | medium | complex
  // simple: <= 2 ACs
  // complex: >= 5 ACs or auth/security scope
  // medium: otherwise
  complexity: z.enum(['simple', 'medium', 'complex']).optional(),
  
  // Story epic/domain must match one of these
  domain: z.array(z.string()).optional(),
  
  // Match all stories (ignores other filters)
  all: z.boolean().optional(),
})

export type ExperimentEligibility = z.infer<typeof ExperimentEligibilitySchema>
```

---

## ExperimentMetricsSchema

Defines which metrics to track and compare.

```typescript
export const ExperimentMetricsSchema = z.object({
  // Primary metric for rollout decision
  primary: z.enum([
    'gate_pass_rate',
    'cycle_time',
    'token_cost',
    'review_cycles',
    'rework_rate',
  ]),
  
  // Secondary metrics for additional context
  secondary: z.array(
    z.enum([
      'gate_pass_rate',
      'cycle_time', 
      'token_cost',
      'review_cycles',
      'rework_rate',
    ])
  ),
  
  // Minimum sample size per variant (default: 10)
  min_sample_size: z.number().int().positive().default(10),
})

export type ExperimentMetrics = z.infer<typeof ExperimentMetricsSchema>
```

---

## ExperimentSchema

Full experiment definition.

```typescript
export const ExperimentSchema = z.object({
  // Unique experiment identifier
  id: z.string().regex(/^exp-[a-z0-9-]+$/),
  
  // Human-readable description
  description: z.string().min(10),
  
  // Experiment lifecycle status
  status: z.enum(['active', 'paused', 'complete']),
  
  // When experiment was created (for control group selection)
  created_at: z.string().datetime(),
  
  // Traffic percentage (0.0-1.0)
  traffic: z.number().min(0.0).max(1.0),
  
  // Eligibility criteria
  eligibility: ExperimentEligibilitySchema,
  
  // Metrics configuration
  metrics: ExperimentMetricsSchema,
})

export type Experiment = z.infer<typeof ExperimentSchema>
```

---

## ExperimentsConfigSchema

Top-level experiments.yaml config file.

```typescript
export const ExperimentsConfigSchema = z.object({
  experiments: z.array(ExperimentSchema),
})

export type ExperimentsConfig = z.infer<typeof ExperimentsConfigSchema>
```

---

## ExperimentVariantStatsSchema

Statistical analysis results for one variant.

```typescript
export const ExperimentVariantStatsSchema = z.object({
  sample_size: z.number().int().nonnegative(),
  mean: z.number(),
  std_dev: z.number().nonnegative(),
  min: z.number(),
  max: z.number(),
})

export type ExperimentVariantStats = z.infer<typeof ExperimentVariantStatsSchema>
```

---

## ExperimentMetricAnalysisSchema

Statistical comparison for one metric.

```typescript
export const ExperimentMetricAnalysisSchema = z.object({
  metric_name: z.string(),
  treatment: ExperimentVariantStatsSchema,
  control: ExperimentVariantStatsSchema,
  difference: z.number(),
  percent_change: z.number(),
  p_value: z.number().min(0).max(1),
  confidence: z.enum(['high', 'medium', 'low']),
  significant: z.boolean(),
})

export type ExperimentMetricAnalysis = z.infer<typeof ExperimentMetricAnalysisSchema>
```

---

## ExperimentRecommendationSchema

Rollout recommendation output.

```typescript
export const ExperimentRecommendationSchema = z.object({
  // Recommended action
  action: z.enum(['rollout', 'expand_traffic', 'stop', 'continue']),
  
  // Explanation of recommendation
  rationale: z.string().min(20),
  
  // Confidence in recommendation
  confidence: z.enum(['high', 'medium', 'low']),
})

export type ExperimentRecommendation = z.infer<typeof ExperimentRecommendationSchema>
```

---

## ExperimentReportSchema

Complete experiment analysis report.

```typescript
export const ExperimentReportSchema = z.object({
  schema: z.literal(1),
  report_date: z.string().datetime(),
  experiment_id: z.string(),
  
  // Sample sizes
  sample_sizes: z.object({
    treatment: z.number().int().nonnegative(),
    control: z.number().int().nonnegative(),
    skipped: z.number().int().nonnegative().optional(),
  }),
  
  // Primary metric analysis
  primary_metric: ExperimentMetricAnalysisSchema,
  
  // Secondary metrics analysis
  secondary_metrics: z.array(ExperimentMetricAnalysisSchema),
  
  // Rollout recommendation
  recommendation: ExperimentRecommendationSchema,
})

export type ExperimentReport = z.infer<typeof ExperimentReportSchema>
```

---

## Metric Extraction from OUTCOME.yaml

How metrics are computed from OUTCOME.yaml fields:

| Metric | Extraction Logic |
|--------|-----------------|
| `gate_pass_rate` | `qa_gate.verdict === 'PASS' ? 1.0 : 0.0` |
| `cycle_time` | `totals.duration_ms / (1000 * 60 * 60)` (hours) |
| `token_cost` | `totals.tokens_total` |
| `review_cycles` | `totals.review_cycles` |
| `rework_rate` | `totals.gate_attempts > 1 ? 1.0 : 0.0` |

---

## Confidence Level Calculation

```typescript
function calculateConfidence(pValue: number, sampleSize1: number, sampleSize2: number): 'high' | 'medium' | 'low' {
  if (pValue < 0.01 && sampleSize1 >= 20 && sampleSize2 >= 20) {
    return 'high'
  } else if (pValue < 0.05 && sampleSize1 >= 10 && sampleSize2 >= 10) {
    return 'medium'
  } else {
    return 'low'
  }
}
```

---

## Validation Rules

1. **Traffic**: Must be between 0.0 and 1.0 inclusive
2. **Status**: Must be 'active', 'paused', or 'complete'
3. **Experiment ID**: Must match pattern `exp-[a-z0-9-]+`
4. **Metrics**: Must be valid OUTCOME.yaml field names
5. **Sample Size**: Must be >= 1 (default 10)
6. **P-value**: Must be between 0.0 and 1.0
7. **Dates**: Must be valid ISO 8601 datetime strings

---

## Usage Example

```typescript
import { ExperimentSchema, ExperimentsConfigSchema } from './__types__'

// Validate single experiment
const experiment = ExperimentSchema.parse({
  id: 'exp-fast-track',
  description: 'Skip elaboration for simple stories',
  status: 'active',
  created_at: '2026-02-01T00:00:00Z',
  traffic: 0.2,
  eligibility: {
    ac_count_max: 3,
  },
  metrics: {
    primary: 'cycle_time',
    secondary: ['gate_pass_rate', 'token_cost'],
    min_sample_size: 10,
  },
})

// Validate experiments.yaml config
const config = ExperimentsConfigSchema.parse({
  experiments: [experiment],
})
```

---

**Schema Version**: 1  
**Created**: 2026-02-07  
**Last Updated**: 2026-02-07
