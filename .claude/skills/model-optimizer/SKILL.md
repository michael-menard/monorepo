---
name: model-optimizer
description: Analyze model performance across roles and suggest optimizations. Track which models excel at which review tasks and recommend swaps based on historical accuracy, cost, and speed.
kb_tools:
  - kb_search
  - kb_add_lesson
  - kb_write_artifact
---

# /model-optimizer - Model Performance Optimizer

## Description

Analyze which models excel at which review roles based on historical data. Track:

- **Accuracy**: Did findings from this model lead to correct rulings?
- **Cost**: Token efficiency per role
- **Speed**: Round completion time
- **Quality**: Severity accuracy, contested rate

Suggest model swaps to improve quality or reduce cost.

## Usage

```bash
# Analyze model performance and suggest optimizations
/model-optimizer

# Show performance by role
/model-optimizer --by-role

# Show performance by model
/model-optimizer --by-model

# Suggest swaps for a specific role
/model-optimizer --role langgraph

# Apply recommended swaps
/model-optimizer --apply-swaps

# Cost optimization mode
/model-optimizer --cost-target "$20/month"
```

## Parameters

- **--by-role** - Show which models excel at each role
- **--by-model** - Show how each model performs across roles
- **--role** - Focus on specific role
- **--apply-swaps** - Generate new role → model mappings
- **--cost-target** - Optimize for cost target
- **--quality-target** - Optimize for quality threshold

---

## How It Works

### 1. Query Historical Data

```
# Get all review sessions with model info
kb_search(
  query: "arbiter-review session model performance",
  artifact_type: "arbiter-review",
  limit: 100
)

# Get rulings with outcome tracking
kb_search(
  query: "arbiter-ruling outcome accuracy",
  entry_type: "lesson",
  tags: ["arbiter-outcome"],
  limit: 100
)
```

### 2. Build Performance Matrix

```
Model Performance Matrix:

                    │ LangGraph │ Database │ AI-Apps │ MultiAgent │ Security │ Perf  │ Arch  │ DA    │
────────────────────┼───────────┼─────────┼─────────┼────────────┼──────────┼───────┼───────┼───────┤
claude-opus        │  85% ✓   │  78%    │  92% ✓  │   80%     │   95% ✓ │  88%  │  94% ✓ │  70%  │
claude-sonnet      │  88% ✓   │  90% ✓  │  82%    │   89% ✓   │   88%   │  92% ✓│  85%   │  75%  │
claude-haiku       │  65%     │  72%    │  60%    │   68%     │   70%   │  70%  │  62%   │  88% ✓│

Cost per 1K tokens: opus=$15, sonnet=$3, haiku=$0.25
```

### 3. Generate Recommendations

```
═══════════════════════════════════════════════════════════════════
  MODEL OPTIMIZATION RECOMMENDATIONS
═══════════════════════════════════════════════════════════════════

QUALITY IMPROVEMENTS:
  • LangGraph: sonnet (88%) > opus (85%) → KEEP sonnet
  • Security: opus (95%) > sonnet (88%) → SWAP to opus
  • DA: haiku (88%) > sonnet (75%) > opus (70%) → SWAP to haiku

COST SAVINGS (maintaining quality):
  • AI-Apps: opus→sonnet saves $0.36/review, quality drop 10%
  • MultiAgent: Keep sonnet (best cost/quality)

APPLIED SWAPS:
  Security: sonnet → opus  (+7% quality)
  DA: sonnet → haiku      (+13% quality, -$0.14/review)

NET IMPACT:
  Quality: +2% average
  Cost: -$0.28/review (-8%)
  Estimated monthly savings: $8.40 (30 reviews/month)
```

---

## Performance Metrics Tracked

### Per Role × Model

| Metric              | Description                               |
| ------------------- | ----------------------------------------- |
| `findings_count`    | Total findings from this model/role       |
| `upheld_rate`       | % of findings that were upheld by arbiter |
| `severity_accurate` | % where severity was correct              |
| `contested_rate`    | % that were challenged                    |
| `avg_tokens`        | Average tokens per review                 |
| `cost_per_review`   | Estimated cost                            |

### Per Model

| Metric            | Description                      |
| ----------------- | -------------------------------- |
| `total_reviews`   | Sessions using this model        |
| `role_affinity`   | Roles where this model excels    |
| `weak_roles`      | Roles where this model struggles |
| `cost_efficiency` | Quality per dollar               |

---

## Optimization Strategies

### Strategy 1: Quality Maximization

```
For each role:
  SELECT model WITH HIGHEST upheld_rate
  IF tied: SELECT model WITH HIGHEST severity_accuracy
  IF tied: SELECT model WITH LOWEST contested_rate
```

### Strategy 2: Cost Optimization

```
For each role:
  SELECT model meeting MINIMUM_QUALITY_THRESHOLD (e.g., 75%)
  PREFER lowest cost option

CONSTRAINTS:
  security: MIN_QUALITY = 90% (never compromise security)
  critical findings: MIN_QUALITY = 85%
```

### Strategy 3: Balanced

```
For each role:
  score = (quality_weight * upheld_rate) - (cost_weight * normalized_cost)
  SELECT model WITH HIGHEST score

DEFAULT_WEIGHTS:
  quality_weight: 0.7
  cost_weight: 0.3
```

---

## Current Default Mappings

| Role                  | Model  | Rationale                          |
| --------------------- | ------ | ---------------------------------- |
| LangGraph Expert      | sonnet | Good at state/graph reasoning      |
| Database Expert       | sonnet | Good at query patterns             |
| AI Apps Builder       | opus   | Deep reasoning for LLM integration |
| MultiAgent Workflow   | sonnet | Good at orchestration patterns     |
| Security Auditor      | sonnet | Good at security patterns          |
| Performance Profiler  | sonnet | Good at complexity analysis        |
| Architecture Reviewer | opus   | Deep reasoning for design          |
| Devil's Advocate      | haiku  | Fast edge case generation          |
| Arbiter               | opus   | Final binding decisions need depth |

---

## Output: Model Config

Write to KB: `kb_write_artifact({ story_id: 'WINT-7080', artifact_type: 'evidence', content: { role_model_mapping: { ... }, ... } })`
Also generate `adversarial-review-models.yaml` as human-readable side output:

```yaml
# Auto-generated by /model-optimizer
# Generated: 2026-03-20
# Based on: 47 review sessions

role_model_mapping:
  langgraph: sonnet
  database: sonnet
  ai_apps: opus
  multiagent: sonnet
  security: sonnet
  performance: sonnet
  architecture: opus
  devils_advocate: haiku
  arbiter: opus

quality_thresholds:
  minimum: 0.75
  security: 0.90
  critical: 0.85

optimization_strategy: balanced
# quality_weight: 0.7
# cost_weight: 0.3

last_optimized: '2026-03-20'
sessions_analyzed: 47
```

---

## Model Recommendations by Role

### LangGraph Expert

| Model      | Accuracy | Cost     | Best For                    |
| ---------- | -------- | -------- | --------------------------- |
| **sonnet** | 88%      | $3/1K    | State, nodes, checkpointing |
| opus       | 85%      | $15/1K   | Complex graph composition   |
| haiku      | 65%      | $0.25/1K | ✗ Not recommended           |

### Database Expert

| Model      | Accuracy | Cost     | Best For                |
| ---------- | -------- | -------- | ----------------------- |
| **sonnet** | 90%      | $3/1K    | Query patterns, indexes |
| opus       | 78%      | $15/1K   | Complex schema design   |
| haiku      | 72%      | $0.25/1K | Simple queries          |

### AI Apps Builder

| Model    | Accuracy | Cost     | Best For                  |
| -------- | -------- | -------- | ------------------------- |
| **opus** | 92%      | $15/1K   | LLM integration, prompts  |
| sonnet   | 82%      | $3/1K    | Standard function calling |
| haiku    | 60%      | $0.25/1K | ✗ Not recommended         |

### Security Auditor

| Model    | Accuracy | Cost     | Best For                   |
| -------- | -------- | -------- | -------------------------- |
| **opus** | 95%      | $15/1K   | Critical security patterns |
| sonnet   | 88%      | $3/1K    | Standard security          |
| haiku    | 70%      | $0.25/1K | Quick scan                 |

### Devil's Advocate

| Model  | Accuracy | Cost     | Best For                 |
| ------ | -------- | -------- | ------------------------ |
| haiku  | 88%      | $0.25/1K | ✗ BEST - Fast edge cases |
| sonnet | 75%      | $3/1K    | Thorough challenges      |
| opus   | 70%      | $15/1K   | Overthinking             |

---

## Integration

The model optimizer can be run:

1. **Before review** - Optimize for upcoming review
2. **After tracking** - Recalibrate with new data
3. **Scheduled** - Weekly/monthly optimization
4. **Onboarding** - Set up for new codebase

```
# Pre-review optimization
/model-optimizer --apply-swaps
/adversarial-review packages/langgraph/ --deep

# Weekly recalibration
/model-optimizer --apply-swaps --quality-threshold 0.80
```
