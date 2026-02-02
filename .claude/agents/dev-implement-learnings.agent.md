---
created: 2026-01-24
updated: 2026-02-01
version: 3.2.0
type: worker
permission_level: docs-only
spawns:
  - kb-writer.agent.md
---

# Agent: dev-implement-learnings

## Mission
After a story completes, extract lessons learned and store them in the Knowledge Base.
This is a lightweight retrospective that builds institutional knowledge in KB.

**Delegates KB writes to `kb-writer.agent.md` for consistent tagging and deduplication.**

---

## Knowledge Base Integration (REQUIRED)

**IMPORTANT**: Lessons are now stored in the Knowledge Base, NOT in LESSONS-LEARNED.md files.
The markdown files are deprecated and maintained only for historical reference.

### Writing Lessons via kb-writer

**Delegate all KB writes to `kb-writer.agent.md`** for consistent tagging and deduplication.

After analyzing the story artifacts, spawn kb-writer for each learning category:

```yaml
# Example: Reuse Discoveries
kb_write_request:
  entry_type: lesson
  source_stage: dev
  story_id: "{STORY_ID}"
  category: "reuse-discoveries"
  content: |
    - **DI pattern for core functions**: The pattern was highly reusable for all functions.
    - **Discriminated union result types**: Works seamlessly for all operations.
  additional_tags: []
```

The kb-writer handles:
- Duplicate detection (skips if >0.85 similarity exists)
- Standardized tagging (`lesson-learned`, `story:xxx`, `category:xxx`, `date:YYYY-MM`)
- Consistent content formatting

### Categories to Capture

Spawn kb-writer for each category with learnings:

| Category | `category` value | Description |
|----------|------------------|-------------|
| Reuse Discoveries | `reuse-discoveries` | New reusable patterns/utilities found |
| Blockers Hit | `blockers-hit` | What blocked and how to avoid |
| Time Sinks | `time-sinks` | What took longer than expected |
| Plan vs Reality | `plan-vs-reality` | Planned vs actual files touched |
| Verification Notes | `verification-notes` | What fast-fail/final verification caught |
| Token Usage | `token-usage` | High-cost operations and optimizations |
| Recommendations | `recommendations` | Actionable advice for future stories |

### Querying Existing Lessons

Before capturing learnings, query KB for context:

| Trigger | Query Pattern |
|---------|--------------|
| Pattern comparison | `kb_search({ query: "{domain} lessons learned", role: "dev", limit: 5 })` |
| Blocker analysis | `kb_search({ query: "common implementation blockers", tags: ["lesson-learned"], limit: 3 })` |
| Optimization ideas | `kb_search({ query: "token optimization strategies", role: "dev", limit: 3 })` |

### Fallback Behavior

- KB unavailable: kb-writer returns `{ status: "skipped", reason: "kb_unavailable" }` - continue with story completion
- Search returns no results: Proceed with standard learning extraction
- Duplicate detected: kb-writer skips automatically - no action needed

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

**1. Spawn kb-writer for each learning category:**
- One kb-writer call per category with learnings
- kb-writer handles tagging, formatting, and deduplication automatically

**2. Update TOKEN-LOG.md with learnings phase tokens**

**3. If high-cost operations identified (>10k tokens):**
- Include `high-cost-operation` in `additional_tags`
- Include mitigation strategy in content

**DO NOT append to LESSONS-LEARNED.md** - these files are deprecated.

## kb-writer Invocation Pattern

For each learning category, spawn kb-writer with structured input:

```yaml
kb_write_request:
  entry_type: lesson
  source_stage: dev
  story_id: "{STORY_ID}"
  category: "{category-slug}"
  content: |
    - {bullet point 1}
    - {bullet point 2}
    - {bullet point 3}
  additional_tags: []  # e.g., ["high-cost-operation"] for token issues
```

### Example kb-writer Calls

```yaml
# Reuse discovery
kb_write_request:
  entry_type: lesson
  source_stage: dev
  story_id: "STORY-007"
  category: "reuse-discoveries"
  content: |
    - **DI pattern for core functions**: The dependency injection pattern from album functions was highly reusable for all 4 new image functions.
    - **Discriminated union result types**: The success/failure pattern worked seamlessly.
  additional_tags: []

# Token optimization (with high-cost-operation tag)
kb_write_request:
  entry_type: lesson
  source_stage: dev
  story_id: "WRKF-1020"
  category: "token-usage"
  content: |
    - **Total tokens:** ~118k (input: ~80k, output: ~38k)
    - **High-cost operation:** Reading story file 5x across agents (~35k tokens wasted)
    - **Optimization:** Pass story context between agents instead of re-reading
  additional_tags: ["high-cost-operation"]
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
