---
created: 2026-01-24
updated: 2026-02-22
version: 4.0.0
type: leader
permission_level: docs-only
triggers: ["/pm-bootstrap-workflow"]
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

Insert all stories and related FK data directly into the DB. Do NOT write `story.yaml` files or `stories.index.md`. Return `SUMMARY` inline — do not write a SUMMARY file.

### File Mode

Read context and analysis from `{FEATURE_DIR}/_bootstrap/`. Write all output to `{FEATURE_DIR}/` as before.

## Inputs

### KB Mode (from prompt)
- `SETUP-CONTEXT` — prefix, feature_dir, project_name
- `ANALYSIS` — stories, phases, dependencies, metrics

### File Mode (from disk)
- `{FEATURE_DIR}/_bootstrap/AGENT-CONTEXT.md`
- `{FEATURE_DIR}/_bootstrap/ANALYSIS.yaml`

## File Mode Output

### Story Files (File Mode only)

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

## KB Stories Insert (Full)

Insert all story data into **5 tables** in order. Run all steps as a single `psql` invocation writing to a temp SQL file, wrapped in a transaction. Non-blocking — if DB is unavailable, log a warning and continue.

Use the psql connection: `postgresql://kbuser:TestPassword123!@localhost:5433/knowledgebase`

**Step 1 — stories (all stories, no dependencies yet)**

```sql
INSERT INTO stories (story_id, title, feature, epic, story_type, priority, state, phase)
VALUES ('{story_id}', '{title}', '{feature}', '{project_name}', 'feature', 'medium', 'backlog', {phase})
ON CONFLICT (story_id) DO NOTHING;
```

One row per story. Repeat for all stories before proceeding.

**Step 2 — story_details (no story_dir / story_file since no files exist in KB Mode)**

```sql
INSERT INTO story_details (story_id, touches_backend, touches_frontend, touches_database, touches_infra)
VALUES ('{story_id}', false, false, false, false)
ON CONFLICT (story_id) DO NOTHING;
```

Set `touches_backend`, `touches_frontend`, `touches_database`, `touches_infra` from ANALYSIS where available; default to `false`.

**Step 3 — plan_story_links (spawned_from link to the plan)**

```sql
INSERT INTO plan_story_links (plan_slug, story_id, link_type)
VALUES ('{plan_slug}', '{story_id}', 'spawned_from')
ON CONFLICT (plan_slug, story_id) DO NOTHING;
```

One row per story. `plan_slug` comes from SETUP-CONTEXT.

**Step 4 — story_dependencies (after all stories exist to satisfy FKs)**

For each story with a non-empty `depends_on` list:

```sql
INSERT INTO story_dependencies (story_id, target_story_id, dependency_type, satisfied)
SELECT '{story_id}', '{target_id}', 'depends_on', false
WHERE NOT EXISTS (
  SELECT 1 FROM story_dependencies
  WHERE story_id='{story_id}' AND target_story_id='{target_id}'
);
```

Skip this step entirely if no story has dependencies.

**Step 5 — story_artifacts (one 'analysis' artifact per story)**

```sql
INSERT INTO story_artifacts (story_id, artifact_type, phase, summary)
VALUES (
  '{story_id}',
  'analysis',
  'planning',
  '{"goal":"...","feature":"...","risk_notes":"...","sizing_warning":false,"endpoints":[],"infrastructure":[],"phase":1}'::jsonb
)
ON CONFLICT DO NOTHING;
```

The `summary` JSONB stores per-story analysis fields from Phase 1: `goal`, `feature`, `risk_notes`, `sizing_warning`, `endpoints`, `infrastructure`, `phase`.

## No Stage Directories

Do NOT create `backlog/`, `elaboration/`, `ready-to-work/`, `in-progress/`, or `UAT/` directories, `story.yaml` files, `stories.index.md`, or any other status-tracking artifacts. All story data is written to the DB in KB Mode. File Mode creates story scaffold files only in flat `{feature_dir}/{story_id}/` directories.

## Output

### KB Mode — Return Inline

Emit a fenced YAML block labelled `SUMMARY`:

```yaml
# SUMMARY
schema: 3
mode: kb
plan_slug: "{plan_slug}"
feature_dir: "{feature_dir}"
prefix: "{PREFIX}"
completed: "{ISO timestamp}"

phases_completed:
  # Array of strings. Allowed values: setup, analysis, generation, review, done
  # This field replaces _bootstrap/CHECKPOINT.md entirely — CHECKPOINT.md is no longer written.
  - setup
  - analysis
  - generation

kb_stories_inserted: N        # rows inserted into stories table
kb_plan_links_inserted: N     # rows inserted into plan_story_links
kb_dependencies_inserted: N   # rows inserted into story_dependencies
kb_artifacts_inserted: N      # rows inserted into story_artifacts (analysis type)

metrics:
  total_stories: N
  ready_to_start: N
  critical_path_length: N
  max_parallel: N
  phases: N

next_step: "/elab-epic {PREFIX}"
```

### File Mode — Write to Disk

Write the same structure to `{FEATURE_DIR}/_bootstrap/SUMMARY.yaml`, including the `phases_completed` field.

**CHECKPOINT.md is no longer written in any mode.** Do not create `{FEATURE_DIR}/_bootstrap/CHECKPOINT.md`. Phase completion state is tracked via `phases_completed` in SUMMARY.yaml instead.

## Error Handling

| Error | Action |
|-------|--------|
| ANALYSIS missing/empty | BLOCKED: "No analysis data received — run Phase 1 first" |
| File write failed | BLOCKED: "Cannot write to {path}" |
| DB insert failed | Log warning: "KB insert failed — DB unavailable, stories not seeded" |

## Signals

- `GENERATION COMPLETE` — all KB tables populated (stories, story_details, plan_story_links, story_dependencies, story_artifacts)
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
