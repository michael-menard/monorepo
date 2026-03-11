---
story_id: KNOW-044
title: Dynamic Baseline Reality Generated from KB
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: KNOW
feature: Knowledge Base
type: feature
priority: critical
depends_on:
  - KNOW-038  # ADRs must be in DB to populate established patterns section
  - WKFL-014  # dependency cascade needed so completed stories are reliably marked done
---

# KNOW-044: Dynamic Baseline Reality Generated from KB

## Context

The `pm-story-seed-agent` grounds every new story in a "baseline reality" document that describes:
- **Deployed Features** — what has been shipped
- **What Is In-Progress** — active stories
- **Established Patterns** — architectural conventions
- **Invalid Assumptions** — deprecated patterns and changed constraints
- **Do Not Rework** — protected features

This document is currently maintained manually as a dated markdown file at `plans/baselines/BASELINE-REALITY-{date}.md`. The most recent baseline was last updated **2026-02-13** — 9 days ago at time of writing. There are already 7+ divergent copies across worktrees.

The consequence: every story generated today is grounded in a snapshot that may be missing recently-completed features, new ADRs, and updated constraints. The seed agent detects conflicts by comparing against a stale reality.

All five sections of the baseline can be derived directly from the KB:

| Baseline Section | KB Source |
|---|---|
| Deployed Features | `stories` where `state IN ('completed', 'uat')` — what shipped |
| In-Progress | `stories` where `state IN ('in_progress', 'elaboration')` |
| Established Patterns | `knowledge_entries` where `entry_type='decision'` and `status: active` (ADRs) |
| Invalid Assumptions | `knowledge_entries` tagged `deprecated-pattern` or `invalid-assumption` |
| Do Not Rework | `knowledge_entries` tagged `protected-feature` |

The KB is updated in real-time as stories complete and ADRs are written. A dynamically-generated baseline is always current, always single-source, and never diverges across worktrees.

## Goal

Replace the manually-maintained `BASELINE-REALITY.md` with a `kb_generate_baseline` MCP tool that synthesizes current baseline reality from live KB data. Update `pm-story-seed-agent` to call this tool instead of reading a file.

## Non-goals

- Removing the baseline file format entirely — the tool generates a document in the same format for backwards compatibility with the seed agent
- Capturing deployed infrastructure state (Docker, AWS) — that remains manually curated in the baseline
- Real-time streaming updates to the baseline during story generation

## Scope

### `kb_generate_baseline` MCP Tool

```typescript
kb_generate_baseline({
  epic?: string           // Scope to a specific epic's stories (default: all)
  include_sections?: Array<'deployed' | 'in_progress' | 'patterns' | 'invalid' | 'protected'>
  format?: 'markdown' | 'structured'  // default: markdown (for seed agent compatibility)
})
```

**Implementation:**

```typescript
async function generateBaseline(input) {
  // Section 1: Deployed Features
  const deployedStories = await db
    .select({ story_id, title, epic, feature, completed_at })
    .from(stories)
    .where(inArray(stories.state, ['completed', 'uat']))
    .orderBy(desc(stories.completed_at))
    .limit(100)

  // Section 2: In-Progress
  const activeStories = await db
    .select({ story_id, title, epic, state })
    .from(stories)
    .where(inArray(stories.state, ['in_progress', 'elaboration', 'ready_for_review', 'ready_for_qa']))

  // Section 3: Established Patterns (ADRs)
  const adrs = await kb_search({
    entry_type: 'decision',
    tags: ['adr'],
    limit: 30
  })

  // Section 4: Invalid Assumptions
  const deprecated = await kb_search({
    tags: ['deprecated-pattern', 'invalid-assumption'],
    limit: 20
  })

  // Section 5: Protected Features
  const protected_ = await kb_search({
    tags: ['protected-feature', 'do-not-rework'],
    limit: 20
  })

  return formatAsBaseline({ deployedStories, activeStories, adrs, deprecated, protected_ })
}
```

**Output format** — identical to current `BASELINE-REALITY.md` structure so `pm-story-seed-agent` requires minimal changes:

```markdown
---
doc_type: baseline_reality
status: active
generated_at: "{ISO timestamp}"
source: kb-generated
---

# Baseline Reality — {date}

## Deployed Features
{grouped by epic, derived from completed/uat stories}

## What Is In-Progress
{active stories with status}

## Established Patterns
{active ADRs from knowledge_entries}

## Invalid Assumptions
{deprecated-pattern entries}

## Do Not Rework
{protected-feature entries}

---
*Generated dynamically from KB. Last story completed: {timestamp}. ADRs: {count}.*
```

### Baseline Versioning in KB

Store each generated baseline as a `story_artifact` with type `baseline_reality`:

```typescript
kb_write_artifact({
  artifact_type: 'baseline_reality',
  story_id: null,  // not story-specific
  content: {
    generated_at: timestamp,
    story_count_deployed: N,
    story_count_active: N,
    adr_count: N,
    markdown: fullMarkdownContent
  }
})
```

This creates a version history of baselines — the seed agent can query the latest, and retros can compare baseline versions over time.

### `pm-story-seed-agent` Update

Replace the file read:
```
# BEFORE
Read baseline file at `baseline_path`

# AFTER
Call kb_generate_baseline({ epic: derived_from_index_path })
Use returned markdown as baseline context
Log: "Baseline generated from KB: {deployed_count} deployed, {active_count} active, {adr_count} ADRs"
```

The `baseline_path` parameter becomes optional — if provided and the KB is unavailable, fall back to reading the file. If not provided, always generate from KB.

### Automatic Refresh Trigger

Extend `kb_update_story_status` (from WKFL-014) — after cascading dependency resolution on `completed`/`uat`, invalidate any cached baseline by writing a new generated baseline to `story_artifacts`. This ensures the next story generation always sees the freshly-completed story.

### Tagging Conventions for Baseline Sections

Add documentation for agents writing to the KB so baseline sections populate correctly:

- "Do Not Rework" entries: tag with `protected-feature` when writing via `kb_add`
- "Invalid Assumptions": tag with `deprecated-pattern` when writing lessons about obsolete patterns
- These tags are already writable by existing agents — just need documented conventions

### Packages Affected

- `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` — `kb_generate_baseline`
- `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` — implement handler
- `apps/api/knowledge-base/src/crud-operations/baseline-operations.ts` — new file
- `.claude/agents/pm-story-seed-agent.agent.md` — call `kb_generate_baseline` instead of reading file
- `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` — trigger baseline refresh on story completion
- `plans/baselines/BASELINE-REALITY-2026-02-13.md` — add deprecation notice after migration

## Acceptance Criteria

- [ ] `kb_generate_baseline` returns a markdown document in the existing BASELINE-REALITY format
- [ ] Deployed Features section includes all stories with `state IN ('completed', 'uat')` grouped by epic
- [ ] In-Progress section includes all active stories
- [ ] Established Patterns section includes all active ADRs from `knowledge_entries`
- [ ] `pm-story-seed-agent` calls `kb_generate_baseline` instead of reading `BASELINE-REALITY.md`
- [ ] Generated baseline is written to `story_artifacts` with type `baseline_reality` for versioning
- [ ] A new baseline is generated and cached whenever a story transitions to `completed`
- [ ] When KB is unavailable, seed agent falls back to the file gracefully
- [ ] All developers in any worktree generating a story see the same baseline (no divergence)
- [ ] The baseline includes the timestamp of the most recently completed story so staleness is visible
- [ ] The existing `plans/baselines/BASELINE-REALITY-2026-02-13.md` gets a deprecation notice
