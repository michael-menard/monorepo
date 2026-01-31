# Token Summary - STORY-0171

Generated: 2026-01-25 20:20

## Phase Breakdown

| Phase | Input | Output | Total | % of Total |
|-------|-------|--------|-------|------------|
| elab-setup | 12,000 | 8,000 | 20,000 | 30.3% |
| elab-completion | 28,000 | 18,000 | 46,000 | 69.7% |
| **Total** | **40,000** | **26,000** | **66,000** | **100%** |

## Cost Estimate

Using Claude Opus pricing:
- Input: $0.003 / 1K tokens
- Output: $0.015 / 1K tokens

| Category | Tokens | Cost |
|----------|--------|------|
| Input | 40,000 | $0.12 |
| Output | 26,000 | $0.39 |
| **Total** | **66,000** | **$0.51** |

## High-Cost Operations

Phases exceeding 30,000 tokens:

| Phase | Total Tokens | Notes |
|-------|-------------|-------|
| elab-completion | 46,000 | Elaboration completion with user decisions |

## Comparison to Typical Budget

| Metric | This Story | Typical | Variance |
|--------|-----------|---------|----------|
| Elaboration phases | 66,000 | 50,000 | +32% |
| Total | 66,000 | 200,000 | -67% |

Note: Story was split before implementation. Budget comparison reflects elaboration-only phases.

## Timeline

| First Entry | Last Entry | Duration |
|-------------|------------|----------|
| 2026-01-25 19:51 | 2026-01-25 20:15 | ~24 minutes |

## Raw Log

(Copied from TOKEN-LOG.md for reference)

| Timestamp | Phase | Input | Output | Total | Cumulative |
|-----------|-------|-------|--------|-------|------------|
| 2026-01-25 19:51 | elab-setup | 12,000 | 8,000 | 20,000 | 20,000 |
| 2026-01-25 20:15 | elab-completion | 28,000 | 18,000 | 46,000 | 66,000 |

## Notes

- Story STORY-0171 was split into STORY-01711 and STORY-01712 during elaboration
- Implementation tokens will be tracked under the split story IDs
- Elaboration budget exceeded typical by 32% due to extensive user decision collection (16 findings reviewed)
