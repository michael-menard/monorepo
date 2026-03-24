---
name: model-optimizer
description: Analyze model performance across roles and suggest optimizations. Track which models excel at which review tasks.
model: sonnet
---

See .claude/skills/model-optimizer/SKILL.md for full specification.

## Quick Usage

```bash
# Analyze performance and suggest optimizations
/model-optimizer

# Show by role
/model-optimizer --by-role

# Show by model
/model-optimizer --by-model

# Apply recommended swaps
/model-optimizer --apply-swaps
```

## What It Tracks

| Role             | Best Model | Accuracy | Why                |
| ---------------- | ---------- | -------- | ------------------ |
| AI Apps Builder  | opus       | 92%      | Deep LLM reasoning |
| Security         | opus       | 95%      | Critical patterns  |
| Devil's Advocate | haiku      | 88%      | Fast edge cases    |
| Database         | sonnet     | 90%      | Query patterns     |

## Sample Output

```
═══════════════════════════════════════════════════════════
  MODEL OPTIMIZATION
═══════════════════════════════════════════════════════════
  Sessions analyzed: 47
  Quality: +2%  Cost: -$0.28/review
═══════════════════════════════════════════════════════════
  RECOMMENDED SWAPS:
    Security: sonnet → opus  (+7% quality)
    DA: sonnet → haiku      (+13% quality, -$0.14)
```

## Generated Config

Creates `adversarial-review-models.yaml` with optimal mappings.
