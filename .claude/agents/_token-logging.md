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

Token data MUST be logged to the KB via the `/token-log` skill, which calls `kb_log_tokens`. Do NOT write to a TOKEN-LOG.md file.

```bash
/token-log {STORY_ID} {PHASE} --model={MODEL} --input={INPUT_TOKENS} --output={OUTPUT_TOKENS}
```

The `/token-log` skill handles all KB persistence. Agents do not need to manage token storage directly.

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
| 4: Learnings | Learnings Worker | 30,000 | 2,000 | 32,000 | 1m |
| **Total** | — | **205,000** | **35,500** | **240,500** | **16m** |
```

## Story-Level Aggregation

Token data is stored in KB via `kb_log_tokens` after each phase. OUTCOME.yaml queries KB for the full story aggregate.

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
