# Token Summary - WISH-2008

Generated: 2026-01-29 17:30

## Phase Breakdown

| Phase | Input | Output | Total | % of Total |
|-------|-------|--------|-------|------------|
| elab-setup | 43,500 | 7,100 | 50,600 | 40.4% |
| elab-analysis | 14,000 | 2,000 | 16,000 | 12.8% |
| elab-completion | 30,500 | 6,200 | 36,700 | 29.3% |
| pm-followup | 18,000 | 4,000 | 22,000 | 17.6% |
| **Total** | **106,000** | **19,300** | **125,300** | **100%** |

## Cost Estimate

Using Claude Opus pricing:
- Input: $0.003 / 1K tokens
- Output: $0.015 / 1K tokens

| Category | Tokens | Cost |
|----------|--------|------|
| Input | 106,000 | $0.32 |
| Output | 19,300 | $0.29 |
| **Total** | **125,300** | **$0.61** |

## High-Cost Operations

Phases exceeding 30,000 tokens:

| Phase | Total Tokens | Notes |
|-------|-------------|-------|
| elab-setup | 50,600 | Initial setup + re-run setup (2 passes) |
| elab-completion | 36,700 | Completion phase (2 passes) |

## Comparison to Typical Budget

| Metric | This Story | Typical | Variance |
|--------|-----------|---------|----------|
| Elaboration phases | 103,300 | 50,000 | +107% |
| PM phases | 22,000 | 50,000 | -56% |
| Total | 125,300 | 100,000 | +25% |

**Note:** Higher elaboration cost due to re-run of setup and completion phases (story was elaborated twice).

## Timeline

| First Entry | Last Entry | Duration |
|-------------|------------|----------|
| 2026-01-28 19:44 | 2026-01-29 17:27 | ~22 hours |

## Raw Log

(Copied from TOKEN-LOG.md for reference)

| Timestamp | Phase | Input | Output | Total | Cumulative |
|-----------|-------|-------|--------|-------|------------|
| 2026-01-28 19:44 | elab-setup | 35,000 | 5,000 | 40,000 | 40,000 |
| 2026-01-28 19:45 | elab-analysis | 14,000 | 2,000 | 16,000 | 56,000 |
| 2026-01-28 19:55 | elab-completion | 12,000 | 3,000 | 15,000 | 71,000 |
| 2026-01-28 19:58 | pm-followup | 18,000 | 4,000 | 22,000 | 93,000 |
| 2026-01-29 06:31 | elab-setup | 8,500 | 2,100 | 10,600 | 103,600 |
| 2026-01-29 17:27 | elab-completion | 18,500 | 3,200 | 21,700 | 125,300 |
