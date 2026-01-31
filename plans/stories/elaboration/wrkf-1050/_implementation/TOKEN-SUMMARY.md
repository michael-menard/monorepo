# Token Summary - WRKF-1050

Generated: 2026-01-27 17:45

## Phase Breakdown

| Phase | Input | Output | Total | % of Total |
|-------|-------|--------|-------|------------|
| pm-generate | 69,615 | 6,500 | 76,115 | 81.5% |
| elab-setup | 12,200 | 5,100 | 17,300 | 18.5% |
| **Total** | **81,815** | **11,600** | **93,415** | **100%** |

## Cost Estimate

Using Claude Opus pricing:
- Input: $0.003 / 1K tokens
- Output: $0.015 / 1K tokens

| Category | Tokens | Cost |
|----------|--------|------|
| Input | 81,815 | $0.25 |
| Output | 11,600 | $0.17 |
| **Total** | **93,415** | **$0.42** |

## High-Cost Operations

Phases exceeding 30,000 tokens:

| Phase | Total Tokens | Notes |
|-------|-------------|-------|
| pm-generate | 76,115 | Initial story generation |

## Comparison to Typical Budget

| Metric | This Story | Typical | Variance |
|--------|-----------|---------|----------|
| PM phases | 76,115 | 50,000 | +52% |
| Elaboration phases | 17,300 | 50,000 | -65% |
| Total (so far) | 93,415 | 100,000 | -7% |

**Note:** Story was split into WRKF-1051, WRKF-1052, WRKF-1053, WRKF-1054. Implementation tokens will be tracked in those split stories.

## Timeline

| First Entry | Last Entry | Duration |
|-------------|------------|----------|
| 2026-01-25 19:30 | 2026-01-27 17:33 | ~46 hours |

## Split Information

This story was split due to QA elaboration identifying 26 acceptance criteria (exceeding 8-10 threshold).

**Splits created:**
- WRKF-1051: elab_graph MVP (15 AC) - ready-to-work
- WRKF-1052: Observability & Quality (5 AC) - backlog
- WRKF-1053: Advanced Features (4 AC) - backlog
- WRKF-1054: Metadata & Linking (2 AC) - backlog

## Raw Log

| Timestamp | Phase | Input | Output | Total | Cumulative |
|-----------|-------|-------|--------|-------|------------|
| 2026-01-25 19:30 | pm-generate | 69,615 | 6,500 | 76,115 | 76,115 |
| 2026-01-25 19:44 | elab-setup | 8,000 | 3,000 | 11,000 | 87,115 |
| 2026-01-27 17:33 | elab-setup | 4,200 | 2,100 | 6,300 | 93,415 |
