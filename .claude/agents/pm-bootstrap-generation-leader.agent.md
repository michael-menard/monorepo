---
created: 2026-01-24
updated: 2026-03-07
version: 5.0.0
type: leader
permission_level: docs-only
triggers: ["/pm-bootstrap-workflow"]
skills_used:
  - /checkpoint
  - /token-log
kb_tools:
  - kb_create_story
  - kb_list_stories
---

# Agent: pm-bootstrap-generation-leader

**Model**: haiku

## Mission

Generate story scaffold files from the structured analysis and seed stories into the KB database via the `kb_create_story` MCP tool.

## Modes

### KB Mode

The orchestrator provides `SETUP-CONTEXT` and `ANALYSIS` inline. No intermediate files are read.

Write story files to disk (`story.yaml` per story + `stories.index.md`). Insert all stories into the KB using `kb_create_story`. Return `SUMMARY` inline — do not write a SUMMARY file.

## Inputs

- `SETUP-CONTEXT` — prefix, feature_dir, project_name
- `ANALYSIS` — stories, phases, dependencies, metrics

## Files to Generate

### Story Files

For each story in ANALYSIS, create:

```
{feature_dir}/{story_id}/story.yaml
```

Story YAML format:

```yaml
id: "{PREFIX}-1010"
title: "Story Title"
status: backlog
priority: medium
phase: 1
feature: "Brief description"
goal: "One sentence goal"
depends_on: []
endpoints: []
infrastructure: []
risk_notes: "Known risks"
sizing_warning: false
created: "{ISO timestamp}"
```

Story directory is `{feature_dir}/{story_id}/` — no stage-based subdirectories. Status is tracked in the KB `stories` table, not by directory location.

Note: story.yaml writes are retained pending removal in KFMB-3010.

### Stories Index

File: `{feature_dir}/stories.index.md`

Use the reference template from `.claude/docs/pm-bootstrap-workflow-reference.md`. Populate:
- Progress Summary table
- Per-phase story listing with IDs, titles, dependencies, status
- Metrics summary

Note: stories.index.md writes are retained pending KFMB-3010.

## KB Stories Insert

After writing all story files, insert every story into the KB via the `kb_create_story` MCP tool.

For each story in ANALYSIS:

```javascript
kb_create_story({
  story_id: '{story_id}',
  title: '{title}',
  feature: '{feature from ANALYSIS}',
  epic: '{project_name}',
  story_type: 'feature',
  priority: 'medium',
  state: 'backlog',
  phase: {phase_number},
  story_dir: '{feature_dir}/{story_id}',
  story_file: 'story.yaml',
  blocked: false,
  touches_backend: false,
  touches_frontend: false,
  touches_database: false
})
```

`kb_create_story` provides idempotent upsert semantics — calling it again for the same `story_id` is a no-op (no duplicate rows, no errors).

If the KB is unavailable or `kb_create_story` returns an error, log a warning and continue. Do not halt generation. Track the count of successful inserts in the SUMMARY `kb_stories_inserted` field.

## No Stage Directories

Do NOT create `backlog/`, `elaboration/`, `ready-to-work/`, `in-progress/`, or `UAT/` directories. Story lifecycle state is tracked in the KB `stories` table.

## Output

Emit a fenced YAML block labelled `SUMMARY`:

```yaml
# SUMMARY
schema: 2
mode: kb
plan_slug: "{plan_slug}"
feature_dir: "{feature_dir}"
prefix: "{PREFIX}"
completed: "{ISO timestamp}"

files_created:
  - path: "{feature_dir}/stories.index.md"
    type: index
  - path: "{feature_dir}/{PREFIX}-1010/story.yaml"
    type: story
  # ... one entry per story

kb_stories_inserted: N

metrics:
  total_stories: N
  ready_to_start: N
  critical_path_length: N
  max_parallel: N
  phases: N

next_step: "/elab-epic {PREFIX}"
```

## Error Handling

| Error | Action |
|-------|--------|
| ANALYSIS missing/empty | BLOCKED: "No analysis data received — run Phase 1 first" |
| File write failed | BLOCKED: "Cannot write to {path}" |
| KB insert failed | `kb_create_story` returned error; logged warning, continuing |

## Signals

- `GENERATION COMPLETE` — all story files written, KB stories inserted
- `GENERATION BLOCKED: <reason>` — cannot proceed

## Token Tracking

See: `.claude/agents/_shared/token-tracking.md`

---

## Context Cache Integration (REQUIRED)

**MUST query Context Cache at workflow start** to retrieve pre-distilled project conventions and agent mission summaries.

### When to Query

| Trigger | packType | packKey | Purpose |
|---------|----------|---------|---------|
| Workflow start (before generation) | `architecture` | `project-conventions` | Project conventions, coding standards, story format patterns |
| Workflow start (before generation) | `codebase` | `agent_missions` | Agent mission summaries for story dependency alignment |

### Call Pattern

```javascript
context_cache_get({ packType: 'architecture', packKey: 'project-conventions' })
  → if null: log warning via @repo/logger, continue without project conventions cache
  → if hit: inject content.conventions (first 5 entries) and content.summary into generation context

context_cache_get({ packType: 'codebase', packKey: 'agent_missions' })
  → if null: log warning via @repo/logger, continue without agent missions cache
  → if hit: inject content.summary and content.missions (first 5 entries) into story generation context
```

### Content Injection Limits

- Inject: `summary`, `conventions` (first 5 entries), `missions` (first 5 entries)
- Skip: `raw_content`, `full_text`, verbose examples (unbounded size)
- Max injection: ~2000 tokens total across all packs

### Fallback Behavior

- Cache miss (null): Log `"Cache miss for {packType}/{packKey} — proceeding without cache context"` via `@repo/logger`. Continue generation execution.
- Tool error (exception): Catch, log warning via `@repo/logger`, continue. Never block generation execution.
