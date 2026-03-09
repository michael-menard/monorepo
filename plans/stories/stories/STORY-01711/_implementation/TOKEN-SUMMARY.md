# Token Summary - STORY-01711

Generated: 2026-01-25 20:25

## Phase Breakdown

| Phase | Input | Output | Total | % of Total |
|-------|-------|--------|-------|------------|
| elab-setup | 2,800 | 1,200 | 4,000 | 4.4% |
| elab-analyst | 38,000 | 2,400 | 40,400 | 44.5% |
| elab-completion | 38,000 | 8,400 | 46,400 | 51.1% |
| **Total** | **78,800** | **12,000** | **90,800** | **100%** |

## Cost Estimate

Using Claude Opus pricing:
- Input: $0.003 / 1K tokens
- Output: $0.015 / 1K tokens

| Category | Tokens | Cost |
|----------|--------|------|
| Input | 78,800 | $0.24 |
| Output | 12,000 | $0.18 |
| **Total** | **90,800** | **$0.42** |

## High-Cost Operations

Phases exceeding 30,000 tokens:

| Phase | Total Tokens | Notes |
|-------|-------------|-------|
| elab-analyst | 40,400 | Story analysis with schema and pattern review |
| elab-completion | 46,400 | Elaboration finalization with 16 user decisions |

## Comparison to Typical Budget

| Metric | This Story | Typical | Variance |
|--------|-----------|---------|----------|
| Elaboration phases | 90,800 | 50,000 | +82% |
| Total (so far) | 90,800 | 200,000 | -55% |

Note: Higher elaboration cost due to comprehensive interactive review of 16 findings (8 gaps + 8 enhancements), all marked "Add as AC".

## Timeline

| First Entry | Last Entry | Duration |
|-------------|------------|----------|
| 2026-01-25 20:07 | 2026-01-25 20:20 | ~13 minutes |

## Raw Log

| Timestamp | Phase | Input | Output | Total | Cumulative |
|-----------|-------|-------|--------|-------|------------|
| 2026-01-25 20:07 | elab-setup | 2,800 | 1,200 | 4,000 | 4,000 |
| 2026-01-25 20:15 | elab-analyst | 38,000 | 2,400 | 40,400 | 44,400 |
| 2026-01-25 20:20 | elab-completion | 38,000 | 8,400 | 46,400 | 90,800 |
