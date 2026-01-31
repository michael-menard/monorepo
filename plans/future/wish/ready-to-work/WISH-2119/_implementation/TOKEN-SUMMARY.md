# Token Summary - WISH-2119

Generated: 2026-01-31 05:02

## Phase Breakdown

| Phase | Input | Output | Total | % of Total |
|-------|-------|--------|-------|------------|
| pm-generate | 92,175 | 6,695 | 98,870 | 50.7% |
| elab-setup | 8,000 | 5,000 | 13,000 | 6.7% |
| elab-completion | 68,000 | 15,000 | 83,000 | 42.6% |
| **Total** | **168,175** | **26,695** | **194,870** | **100%** |

## Cost Estimate

Using Claude Opus pricing:
- Input: $0.003 / 1K tokens
- Output: $0.015 / 1K tokens

| Category | Tokens | Cost |
|----------|--------|------|
| Input | 168,175 | $0.50 |
| Output | 26,695 | $0.40 |
| **Total** | **194,870** | **$0.90** |

## High-Cost Operations

Phases exceeding 30,000 tokens:

| Phase | Total Tokens | Notes |
|-------|-------------|-------|
| pm-generate | 98,870 | Initial story generation with comprehensive scope |
| elab-completion | 83,000 | QA elaboration with audit and documentation |

## Comparison to Typical Budget

| Metric | This Story | Typical | Variance |
|--------|-----------|---------|----------|
| PM phases | 98,870 | 50,000 | +98% |
| Elaboration phases | 96,000 | 50,000 | +92% |
| Total (pre-dev) | 194,870 | 100,000 | +95% |
| Full lifecycle budget | 194,870 | 200,000 | -3% |

**Note:** This story is currently at 97% of typical full lifecycle budget but has not yet entered development. PM and elaboration phases ran high due to comprehensive scope definition for the flag scheduling infrastructure. The story has 19 acceptance criteria and extensive test plan documentation.

## Timeline

| First Entry | Last Entry | Duration |
|-------------|------------|----------|
| 2026-01-28 22:08 | 2026-01-31 04:59 | ~55 hours |

## Raw Log

| Timestamp | Phase | Input | Output | Total | Cumulative |
|-----------|-------|-------|--------|-------|------------|
| 2026-01-28 22:08 | pm-generate | 92,175 | 6,695 | 98,870 | 98,870 |
| 2026-01-30 22:00 | elab-setup | 8,000 | 5,000 | 13,000 | 111,870 |
| 2026-01-31 04:59 | elab-completion | 68,000 | 15,000 | 83,000 | 194,870 |
