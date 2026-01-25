# Token Budget Template

Add this section to each story to track token usage per phase.

## Usage

1. Before starting a phase, note the session cost using `/cost`
2. After completing the phase, note the new cost
3. Record the delta in the Actual column

---

## Token Budget

### Phase Summary

| Phase | Agent | Est. Input | Est. Output | Est. Total | Actual | Cost |
|-------|-------|------------|-------------|------------|--------|------|
| Story Generation | PM | 15k | 5k | 20k | — | — |
| Test Plan | PM | 20k | 6k | 26k | — | — |
| Dev Feasibility | PM | 25k | 4k | 29k | — | — |
| UI/UX Notes | PM | 15k | 1k | 16k | — | — |
| Elaboration | PM | 20k | 2k | 22k | — | — |
| Implementation | Dev | 50k | 20k | 70k | — | — |
| Proof | Dev | 30k | 3k | 33k | — | — |
| Code Review | Review | 40k | 2k | 42k | — | — |
| QA Verification | QA | 35k | 3k | 38k | — | — |
| **Total** | — | **250k** | **46k** | **296k** | **—** | **—** |

### Estimation Formula

```
Input tokens ≈ (context_files_bytes / 4) + conversation_history
Output tokens ≈ output_file_bytes / 4
Cost ≈ (input × $0.003 + output × $0.015) / 1000  # Opus pricing
```

### Context Loading per Phase

| Phase | Files Read | Est. Bytes | Est. Tokens |
|-------|------------|------------|-------------|
| PM: Story Gen | CLAUDE.md, stories.index.md, AWS handlers | ~80KB | ~20k |
| PM: Test Plan | Above + STORY-XXX.md | ~100KB | ~25k |
| PM: Feasibility | Above + code files | ~120KB | ~30k |
| Dev: Implement | STORY-XXX.md, TEST-PLAN.md, existing code | ~150KB | ~38k |
| QA: Verify | All story artifacts, implementation | ~200KB | ~50k |

### Actual Measurements

| Date | Phase | Before `/cost` | After `/cost` | Delta | Notes |
|------|-------|----------------|---------------|-------|-------|
| — | — | — | — | — | — |

---

## Token Optimization Tips

1. **Avoid re-reading large files** - Reference by line numbers when possible
2. **Use Task agents for exploration** - They have isolated context
3. **Keep story docs focused** - Move verbose details to _pm/ subfolder
4. **Batch related operations** - Reduces conversation turns

## High-Cost Patterns to Watch

| Pattern | Why Expensive | Alternative |
|---------|---------------|-------------|
| Reading serverless.yml (70KB) | ~18k tokens each time | Extract relevant section |
| Full codebase search | Loads many files | Use targeted Grep |
| Agent spawning | Copies full context | Use Explore agent for search |
| Re-reading same story | Accumulates | Reference specific sections |
