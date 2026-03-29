---
name: token-report
description: Generate a summary report aggregating all logged token usage for a story. Queries KB storyTokenUsage and produces TOKEN-SUMMARY.md with cost estimates and analysis.
kb_tools:
  - kb_get_story
  - kb_search
  - kb_write_artifact
---

# /token-report - Generate Token Summary Report

## Usage

```
/token-report STORY-XXX
```

## Arguments

- `STORY-XXX` — story ID (e.g., STORY-001, WRKF-1021)

## Locate Story

Use KB:

```javascript
kb_get_story({ story_id: 'STORY-XXX' })
// Returns story metadata including current state/phase
```

If story is not found in KB, report: "Story STORY-XXX not found in KB — ensure it has been created via the KB workflow."

## Preconditions

- KB must have token entries for the story (logged via `/token-log`)
- If no entries found: STOP and report "No token entries found in KB for STORY-XXX — run /token-log phases first"

## Task

1. Query KB for token entries:
   ```javascript
   kb_search({ type: 'token_usage', story_id: 'STORY-XXX' })
   // Returns array of { phase, input_tokens, output_tokens, timestamp }
   ```
2. Aggregate phase data
3. Write summary to KB: `kb_write_artifact({ story_id: "STORY-XXX", artifact_type: "evidence", artifact_name: "TOKEN-SUMMARY", content: { ... } })`

## Token Summary Format

```markdown
# Token Summary - STORY-XXX

Generated: YYYY-MM-DD HH:MM

## Phase Breakdown

| Phase              | Input       | Output     | Total       | % of Total |
| ------------------ | ----------- | ---------- | ----------- | ---------- |
| pm-generate        | 15,000      | 5,000      | 20,000      | 12.6%      |
| elaboration        | 20,000      | 2,000      | 22,000      | 13.8%      |
| dev-implementation | 80,000      | 37,000     | 117,000     | 73.6%      |
| **Total**          | **115,000** | **44,000** | **159,000** | **100%**   |

## Cost Estimate

Using Claude Opus pricing:

- Input: $0.003 / 1K tokens
- Output: $0.015 / 1K tokens

| Category  | Tokens      | Cost      |
| --------- | ----------- | --------- |
| Input     | 115,000     | $0.35     |
| Output    | 44,000      | $0.66     |
| **Total** | **159,000** | **$1.01** |

## High-Cost Operations

Phases exceeding 30,000 tokens:

| Phase              | Total Tokens | Notes                       |
| ------------------ | ------------ | --------------------------- |
| dev-implementation | 117,000      | Primary implementation work |

## Comparison to Typical Budget

| Metric     | This Story | Typical | Variance |
| ---------- | ---------- | ------- | -------- |
| PM phases  | 42,000     | 50,000  | -16%     |
| Dev phases | 117,000    | 100,000 | +17%     |
| Total      | 159,000    | 200,000 | -21%     |

## Timeline

| First Entry      | Last Entry       | Duration |
| ---------------- | ---------------- | -------- |
| YYYY-MM-DD HH:MM | YYYY-MM-DD HH:MM | X hours  |

## Raw Log

(From KB storyTokenUsage)

| Timestamp | Phase | Input | Output | Total | Cumulative |
| --------- | ----- | ----- | ------ | ----- | ---------- |

...
```

## Calculations

**Percentage of Total:**

```
phase_percent = (phase_total / grand_total) * 100
```

**Cost Estimate:**

```
input_cost = (input_tokens / 1000) * 0.003
output_cost = (output_tokens / 1000) * 0.015
total_cost = input_cost + output_cost
```

**Typical Budget Reference:**

| Phase Group                                  | Typical Total |
| -------------------------------------------- | ------------- |
| PM phases (pm-generate, pm-fix, elaboration) | 50,000        |
| Dev phases (dev-\*, code-review)             | 100,000       |
| QA phases (qa-verify)                        | 50,000        |
| Full story lifecycle                         | 200,000       |

**Variance:**

```
variance_percent = ((actual - typical) / typical) * 100
```

## High-Cost Threshold

Flag phases exceeding 30,000 tokens as "high-cost operations"

Phase groups for analysis:

- PM: pm-generate, pm-fix
- Elaboration: elaboration
- Dev Setup: dev-setup
- Dev Planning: dev-planning
- Dev Implementation: dev-implementation (often highest)
- Dev Verification: dev-verification
- Dev Documentation: dev-documentation
- Review: code-review
- QA: qa-verify
- Fix: dev-fix

## Output

After generating the summary, report:

```
Token summary generated for STORY-XXX:

Total: XXX,XXX tokens (~$X.XX)
Phases: N phases logged
Highest: phase-name (XX,XXX tokens)
Status: [Under budget / On budget / Over budget]

KB artifact: TOKEN-SUMMARY written to story STORY-XXX (artifact_type: evidence)
```

## Error Handling

If KB returns no entries for the story:

- Report: "No token entries found in KB for STORY-XXX"
- Suggest running `/token-log` for each phase

If KB query fails:

- Report the error message
- Suggest checking that the KB MCP server is running
