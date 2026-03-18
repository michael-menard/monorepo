---
created: 2026-01-24
updated: 2026-02-22
version: 4.0.0
type: leader
permission_level: docs-only
triggers: ['/pm-bootstrap-workflow']
skills_used:
  - /checkpoint
  - /token-log
---

# Agent: pm-bootstrap-generation-leader

**Model**: haiku

## Mission

Generate story scaffold files from the structured analysis and seed stories into the KB database.

## Modes

### KB Mode (default)

The orchestrator provides `SETUP-CONTEXT` and `ANALYSIS` inline. No intermediate files are read.

Insert all stories into the KB `stories` table. Return `SUMMARY` inline — do not write a SUMMARY file.

### File Mode

Read context and analysis from `{FEATURE_DIR}/_bootstrap/`. Write all output to `{FEATURE_DIR}/` as before.

## Inputs

### KB Mode (from prompt)

- `SETUP-CONTEXT` — prefix, feature_dir, project_name
- `ANALYSIS` — stories, phases, dependencies, metrics

### File Mode (from disk)

- `{FEATURE_DIR}/_bootstrap/AGENT-CONTEXT.md`
- `{FEATURE_DIR}/_bootstrap/ANALYSIS.yaml`

## Files to Generate

## KB Stories Insert

After writing all story files, insert every story into the KB `stories` table.

Use the psql connection: `postgresql://kbuser:TestPassword123!@localhost:5433/knowledgebase`

For each story:

```sql
INSERT INTO stories (
  story_id, title, feature, epic, story_type,
  priority, state, phase, story_dir, story_file,
  blocked, touches_backend, touches_frontend, touches_database
) VALUES (
  '{story_id}',
  '{title}',
  '{feature from ANALYSIS}',
  '{project_name}',
  'feature',
  'medium',
  'backlog',
  '{phase number}',
  '{feature_dir}/{story_id}',
  NULL,  -- story_file no longer used; KB is source of truth
  false,
  false, false, false
)
ON CONFLICT (story_id) DO NOTHING;
```

Run as a batch via a single psql command writing all inserts to a temp SQL file. Non-blocking — if DB is unavailable, log a warning and continue.

## No Stage Directories

Do NOT create `backlog/`, `elaboration/`, `ready-to-work/`, `in-progress/`, or `UAT/` directories. Story lifecycle state is tracked in the KB `stories` table.

## Output

### KB Mode — Return Inline

Emit a fenced YAML block labelled `SUMMARY`:

```yaml
# SUMMARY
schema: 2
mode: kb
plan_slug: '{plan_slug}'
feature_dir: '{feature_dir}'
prefix: '{PREFIX}'
completed: '{ISO timestamp}'

kb_stories_inserted: N

metrics:
  total_stories: N
  ready_to_start: N
  critical_path_length: N
  max_parallel: N
  phases: N

next_step: '/elab-epic {PREFIX}'
```

### File Mode — Write to Disk

Write the same structure to `{FEATURE_DIR}/_bootstrap/SUMMARY.yaml`.

## Error Handling

| Error                  | Action                                                                        |
| ---------------------- | ----------------------------------------------------------------------------- |
| ANALYSIS missing/empty | BLOCKED: "No analysis data received — run Phase 1 first"                      |
| File write failed      | BLOCKED: "Cannot write to {path}"                                             |
| DB insert failed       | Log warning: "KB insert failed — stories seeded via migrate:stories fallback" |

## Signals

- `GENERATION COMPLETE` — all story files written, KB stories inserted
- `GENERATION BLOCKED: <reason>` — cannot proceed

## Token Tracking

See: `.claude/agents/_shared/token-tracking.md`

---

## Context Cache Integration (REQUIRED)

**MUST query Context Cache at workflow start** to retrieve pre-distilled project conventions and agent mission summaries.

### When to Query

| Trigger                            | packType       | packKey               | Purpose                                                      |
| ---------------------------------- | -------------- | --------------------- | ------------------------------------------------------------ |
| Workflow start (before generation) | `architecture` | `project-conventions` | Project conventions, coding standards, story format patterns |
| Workflow start (before generation) | `codebase`     | `agent_missions`      | Agent mission summaries for story dependency alignment       |

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
