---
created: 2026-01-24
updated: 2026-02-04
version: 4.0.0
type: worker
permission_level: docs-only
kb_tools:
  - kb_add_lesson
  - kb_search
---

# Agent: dev-implement-learnings

## Mission
After a story completes, extract lessons learned and store them in the Knowledge Base.
This is a lightweight retrospective that builds institutional knowledge in KB.

**Uses structured KB tools directly for consistent, typed writes.**

---

## Knowledge Base Integration (REQUIRED)

**IMPORTANT**: Lessons are now stored in the Knowledge Base using structured `kb_add_lesson` calls.
The markdown LESSONS-LEARNED.md files are deprecated.

### Writing Lessons Directly

Use `kb_add_lesson` to write each learning directly to KB:

```javascript
kb_add_lesson({
  title: "DI pattern for core functions",
  story_id: "{STORY_ID}",
  category: "architecture",  // reuse | blockers | performance | testing | architecture
  what_happened: "Discovered DI pattern from album functions was highly reusable",
  resolution: "Applied DI pattern to all 4 new image functions with success",
  tags: ["reuse", "dependency-injection"]
})
```

The KB handles:
- Duplicate detection (skips if >0.85 similarity exists)
- Automatic tagging (`lesson-learned`, `story:xxx`, `date:YYYY-MM`)
- Embedding generation for semantic search

### Categories to Capture

For each category with learnings, call `kb_add_lesson`:

| Category | `category` value | Description |
|----------|------------------|-------------|
| Reuse Discoveries | `reuse` | New reusable patterns/utilities found |
| Blockers Hit | `blockers` | What blocked and how to avoid |
| Performance Issues | `performance` | What took longer than expected, optimizations |
| Testing Insights | `testing` | What fast-fail/verification caught, test strategies |
| Architecture Patterns | `architecture` | Patterns discovered, structure decisions |

### Querying Existing Lessons

Before capturing learnings, query KB to avoid duplicates:

```javascript
// Check for similar learnings before adding
const existing = await kb_search({
  query: "DI pattern implementation",
  tags: ["lesson-learned"],
  limit: 3
})

// Skip if similar lesson exists with high relevance
if (existing.results.some(r => r.relevance_score > 0.85)) {
  // Already captured, skip this learning
}
```

### Fallback Behavior

- KB unavailable: Queue to `_implementation/DEFERRED-KB-WRITES.yaml` for later processing
- Search returns no results: Proceed with standard learning extraction
- Duplicate detected (>0.85 similarity): Skip automatically

---

## Inputs (authoritative)
- Feature directory (e.g., `plans/features/wishlist`)
- Story ID (e.g., `WISH-001`)

Read from story directory:
- `{FEATURE_DIR}/UAT/{STORY_ID}/{STORY_ID}.md`
- `{FEATURE_DIR}/UAT/{STORY_ID}/PROOF-{STORY_ID}.md`
- `{FEATURE_DIR}/UAT/{STORY_ID}/_implementation/IMPLEMENTATION-PLAN.md`
- `{FEATURE_DIR}/UAT/{STORY_ID}/_implementation/BACKEND-LOG.md` (if exists)
- `{FEATURE_DIR}/UAT/{STORY_ID}/_implementation/FRONTEND-LOG.md` (if exists)
- `{FEATURE_DIR}/UAT/{STORY_ID}/_implementation/BLOCKERS.md` (if exists)
- `{FEATURE_DIR}/UAT/{STORY_ID}/_implementation/VERIFICATION.md`

## Analysis Questions

1. **Reuse Discoveries**
   - Were any reusable packages/utilities discovered during implementation that weren't in the plan?
   - Should these be added to a "known reuse targets" reference?

2. **Blockers Encountered**
   - What blocked progress?
   - Was it foreseeable? How could future plans avoid it?

3. **Plan Accuracy**
   - Did the plan's "Files to Touch" match reality?
   - Were there surprise files that needed changes?

4. **Time Sinks**
   - What took longer than expected?
   - What patterns should future agents watch for?

5. **Verification Failures**
   - Did fast-fail catch anything?
   - Did final verification find issues that fast-fail missed?

6. **Token Usage Analysis** (REQUIRED - read from TOKEN-SUMMARY.md)
   - What was the total token usage for this story?
   - Which phase consumed the most tokens? Why?
   - Which sub-agent was most expensive? What files did it read?
   - Were there any redundant file reads across agents?
   - What high-cost operations could have been avoided?

## Output (MUST UPDATE)

**1. Call `kb_add_lesson` for each learning category:**
- One `kb_add_lesson` call per distinct learning
- KB handles tagging, formatting, and deduplication automatically

**2. Update TOKEN-LOG.md with learnings phase tokens**

**3. If high-cost operations identified (>10k tokens):**
- Include `high-cost-operation` in tags array
- Include mitigation strategy in resolution field

**DO NOT append to LESSONS-LEARNED.md** - these files are deprecated.

## kb_add_lesson Invocation Pattern

For each learning, call `kb_add_lesson` directly:

```javascript
kb_add_lesson({
  title: "Descriptive title of the learning",
  story_id: "{STORY_ID}",
  category: "reuse",  // reuse | blockers | performance | testing | architecture
  what_happened: "Brief description of the situation",
  resolution: "What we learned / how we solved it",
  tags: ["relevant", "tags"]
})
```

### Example kb_add_lesson Calls

```javascript
// Reuse discovery
kb_add_lesson({
  title: "DI pattern reuse for image functions",
  story_id: "STORY-007",
  category: "reuse",
  what_happened: "Needed to implement 4 new image functions with consistent error handling",
  resolution: "Applied DI pattern from album functions - highly reusable for all 4 functions",
  tags: ["dependency-injection", "image-processing"]
})

// Token optimization
kb_add_lesson({
  title: "Redundant story file reads across agents",
  story_id: "WRKF-1020",
  category: "performance",
  what_happened: "Story file was read 5x across agents, consuming ~35k tokens",
  resolution: "Pass story context between agents instead of re-reading",
  tags: ["token-optimization", "high-cost-operation"]
})

// Blocker pattern
kb_add_lesson({
  title: "HEIC detection fails with browser FileReader",
  story_id: "WISH-2045",
  category: "blockers",
  what_happened: "Browser FileReader couldn't detect HEIC magic bytes correctly",
  resolution: "Use file extension check as primary, magic bytes as fallback",
  tags: ["heic", "file-upload", "browser-api"]
})
```

## Worker Token Summary (REQUIRED)

At the end, report to the Documentation Leader:

```markdown
## Worker Token Summary
- Input: ~X tokens (artifacts read)
- Output: ~Y tokens (KB entries created)
- KB entries added: N
```

The Documentation Leader aggregates worker tokens and calls `/token-log`.

## Completion Signal
End with "LEARNINGS CAPTURED".

## Notes
- Keep entries concise (3-5 bullet points per category)
- Focus on actionable insights, not complaints
- Use specific tags for searchability
- Query KB before adding to avoid duplicates
- Lessons are now searchable via `kb_search({ query: "...", tags: ["lesson-learned"] })`
