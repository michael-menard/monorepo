# CDTS Epic Aggregation - Complete Review Set

**Aggregation Date**: 2026-03-07
**Updated**: 2026-03-07 (redesigned to two-schema graph DB architecture)
**Status**: COMPLETE
**Overall Verdict**: CONCERNS (7 MVP blockers identified, all now have resolution stories)

## Architecture Change Summary

The epic was redesigned from a three-schema model (public + workflow) to a **two-schema graph database architecture** (public + analytics):

1. **No `workflow` schema.** All traversable data stays in `public` to optimize graph traversal patterns.
2. **`analytics` schema** holds only append-only telemetry (token usage, model experiments).
3. **Phase 0 added** for migration infrastructure (runner, safety preamble, live audit).
4. **Phase 2 redesigned** from "operations tables" to **graph infrastructure** (story embeddings, composite context tool).
5. **CDTS-3030 collapsed** into CDTS-3020 (end-to-end verification is part of the DROP story).
6. **Story count**: 10 -> 11 (2 new Phase 0 stories, 1 deleted CDTS-3030).

## Document Map

### 1. AGGREGATION-SUMMARY.txt
**Purpose**: Executive summary for quick reference
**Content**: Overall verdict, 7 MVP blockers, implementation priority, resolution map

### 2. AGGREGATED-REVIEW.md
**Purpose**: Comprehensive blocker analysis with rationale
**Content**: Detailed blocker explanations, resolution stories, affected stories per blocker

### 3. BLOCKER-IMPACT-MATRIX.md
**Purpose**: Story-level impact analysis
**Content**: Impact matrix, story-by-story breakdown, release criteria, implementation order

### 4. FUTURE-ROADMAP.md
**Purpose**: Non-MVP enhancements and deferred items
**Content**: Post-MVP security, observability, and quality improvements

## Quick Facts

| Metric | Value |
|--------|-------|
| **MVP Blockers** | 7 |
| **Stories** | 11 (all required for core journey) |
| **Phases** | 4 (0, 1, 2, 3) |
| **Perspectives with Concerns** | 3 (Engineering, QA, Platform) |
| **Perspectives Ready** | 3 (Product, UX, Security) |
| **Most Constrained Story** | CDTS-1050 (5 blocker resolutions) |
| **Max Parallel** | 2 (Phase 2 + Phase 3 after CDTS-1050) |
| **Non-MVP Enhancements** | 6 (deferred to post-MVP) |

## Blocker Resolution Map

All 7 blockers now have explicit resolution stories:

| Blocker | Severity | Resolved By |
|---------|----------|-------------|
| PLAT-001: No migration runner | CRITICAL | CDTS-0010 |
| PLAT-002: No safety guardrails | CRITICAL | CDTS-0010 |
| ENG-001: Table inventory mismatch | HIGH | CDTS-0020 |
| ENG-002: wint FK dependencies | HIGH | CDTS-1010 |
| ENG-003: Atomic deployment | HIGH | CDTS-1040/1050 |
| QA-001: No test strategy | HIGH | CDTS-0020 (template), CDTS-1050 (execution) |
| QA-002: No FK verification AC | MEDIUM | CDTS-1020 + CDTS-1050 |

## Key Design Decisions

1. **No `workflow` schema** — graph traversal is the primary query pattern
2. **`story_knowledge_links`** graph edge table with typed relationships and confidence scores
3. **No backward-compatibility views** — nothing moves out of `public` except analytics data
4. **Story embeddings** enable semantic similarity search across stories

## Files

```
_epic/
├── README.md                     (you are here)
├── AGGREGATION-SUMMARY.txt       (executive summary)
├── AGGREGATED-REVIEW.md          (blocker analysis)
├── BLOCKER-IMPACT-MATRIX.md      (story-level matrix)
└── FUTURE-ROADMAP.md             (non-MVP items)
```

## Next Steps

1. Start with **CDTS-0010: Establish Migration Runner and Safety Preamble**
2. Proceed through critical path: CDTS-0010 -> 0020 -> 1010 -> 1020 -> 1030 -> 1040 -> 1050
3. After CDTS-1050, Phase 2 and Phase 3 can run in parallel
