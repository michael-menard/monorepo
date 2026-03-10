# Token Summary - STORY-016

## Sub-Agent Token Usage

| Phase | Agent | Input Tokens | Output Tokens | Total |
|-------|-------|--------------|---------------|-------|
| 1A: Plan | Planner | ~48,500 | ~4,000 | ~52,500 |
| 1B: Validate | Validator | ~30,000 | ~3,000 | ~33,000 |
| 2: Backend | Backend Coder | ~75,000 | ~25,000 | ~100,000 |
| 2B: Contracts | Contracts | ~25,000 | ~5,000 | ~30,000 |
| 3: Verify | Verifier | ~20,000 | ~3,000 | ~23,000 |
| 3-FIX: Fix | Backend Coder (Fix) | ~40,000 | ~35,000 | ~75,000 |
| 3: Re-Verify | Verifier | ~10,000 | ~2,000 | ~12,000 |
| 4: Proof | Proof Writer | ~35,000 | ~8,000 | ~43,000 |
| 5: Learnings | Learnings | ~25,000 | ~3,000 | ~28,000 |
| **Total** | — | **~308,500** | **~88,000** | **~396,500** |

## High-Cost Operations

List any operations that consumed >10k tokens:

| Operation | Tokens | Reason |
|-----------|--------|--------|
| Backend implementation | ~100k | Large scope (57 ACs), 5 core functions, 5 handlers |
| Fix phase (tests) | ~75k | 141 unit tests written, reading existing test patterns |
| Planner reading AWS handlers | ~48k | 5 AWS Lambda handlers (~50KB total) for reference |
| Proof writer reading all artifacts | ~35k | Synthesis of all implementation artifacts |

## Optimization Notes

1. **Test Writing in Fix Phase**: 141 tests (~75k tokens) were written in a fix phase after verification caught AC-57 non-compliance. If tests had been written alongside implementation, this would have been more efficient.

2. **Large Story Scope**: 57 ACs is a large story. Consider breaking into 2-3 smaller stories for future similar migrations (e.g., delete/upload in one story, edit presign/finalize in another).

3. **Planner Efficiency**: The planner read all 5 AWS handlers (~50KB). For future stories, consider providing targeted excerpts rather than full handler files.

4. **Redundant Pattern Reading**: Multiple agents read the same test patterns (initialize-with-files.test.ts, finalize-with-files.test.ts). Consider caching these patterns or providing them as system context.

## Cost Breakdown by Category

| Category | Tokens | Percentage |
|----------|--------|------------|
| Planning & Validation | ~85,500 | 22% |
| Implementation | ~175,000 | 44% |
| Verification | ~35,000 | 9% |
| Documentation (Contracts, Proof) | ~73,000 | 18% |
| Learnings | ~28,000 | 7% |
| **Total** | **~396,500** | **100%** |

## Comparison to Estimates

From STORY-016.md Token Budget:

| Phase | Estimated | Actual | Delta |
|-------|-----------|--------|-------|
| Dev Phase (Implementation) | 124k | 200k | +76k (+61%) |
| Total | 340k | 396k | +56k (+16%) |

The overage is primarily due to:
1. Fix phase not originally planned (~75k)
2. Re-verification after fixes (~12k)

## Recommendations

1. **Include tests in implementation chunk**: Don't defer tests to verification phase
2. **Run lint per file, not per chunk**: Catches formatting issues earlier
3. **Consider story size**: 57 ACs may be too large for single implementation session
