# Token Logging Specification

## Purpose

All agents MUST log their token usage to enable cost analysis and optimization.
This is a REQUIRED output for every agent invocation.

## Token Estimation Formula

```
Input tokens ≈ bytes_read / 4
Output tokens ≈ bytes_written / 4
```

## Required Log Format

Every agent MUST append to its output artifact a `## Token Log` section:

```markdown
## Token Log

| Operation | Type | Bytes | Tokens (est) |
|-----------|------|-------|--------------|
| Read: STORY-XXX.md | input | 18,397 | ~4,600 |
| Read: serverless.yml | input | 70,000 | ~17,500 |
| Read: handler.ts | input | 3,200 | ~800 |
| Write: IMPLEMENTATION-PLAN.md | output | 8,000 | ~2,000 |
| **Total Input** | — | 91,597 | **~22,900** |
| **Total Output** | — | 8,000 | **~2,000** |
| **Grand Total** | — | 99,597 | **~24,900** |
```

## What to Log

### Input Operations (log each)
- `Read` tool calls - log file path and size
- `Glob` results - log number of files returned
- `Grep` results - log bytes of output
- Context files loaded (estimate from conversation)

### Output Operations (log each)
- `Write` tool calls - log file path and size
- `Edit` tool calls - log file path and change size (estimate)
- Artifacts created - log final file size

## Orchestrator Tracking

Orchestrator commands (like `/dev-implement-story`) MUST track sub-agent totals:

```markdown
## Sub-Agent Token Summary

| Phase | Agent | Input | Output | Total | Duration |
|-------|-------|-------|--------|-------|----------|
| 1A: Plan | Planner | 25,000 | 3,000 | 28,000 | 2m |
| 1B: Validate | Validator | 30,000 | 1,500 | 31,500 | 1m |
| 2: Backend | Backend Coder | 45,000 | 15,000 | 60,000 | 5m |
| 2: Frontend | Frontend Coder | 40,000 | 12,000 | 52,000 | 4m |
| 3: Verify | Verifier | 35,000 | 2,000 | 37,000 | 3m |
| 4: Proof | Proof Writer | 50,000 | 4,000 | 54,000 | 2m |
| **Total** | — | **225,000** | **37,500** | **262,500** | **17m** |
```

## Story-Level Aggregation

The final PROOF-STORY-XXX.md MUST include aggregated token usage from all phases.

## High-Cost Operations Reference

| Operation | Typical Tokens | Notes |
|-----------|----------------|-------|
| Read serverless.yml | ~17,500 | Avoid if possible |
| Read full story + PM docs | ~10,000 | Required context |
| Explore agent base | ~25,000 | Full context copy |
| code-reviewer agent base | ~30,000 | Full context + diff |
| Write implementation log | ~2,000-5,000 | Varies by complexity |

## Optimization Tips

1. **Avoid re-reading large files** - Cache in conversation
2. **Use targeted Grep** - Don't read entire files for small searches
3. **Batch file reads** - Read multiple small files in one turn
4. **Reference by line** - Instead of re-reading, cite line numbers
