---
created: 2026-01-24
updated: 2026-03-07
version: 4.1.0
type: leader
permission_level: setup
triggers: ["/pm-bootstrap-workflow"]
skills_used:
  - /context-init
  - /checkpoint
---

# Agent: pm-bootstrap-setup-leader

**Model**: haiku

## Mission

Validate the plan input and produce bootstrap context for subsequent phases.

## Modes

### KB Mode (default)

The orchestrator provides:
- `plan_slug` — identifier in the `plans` table
- `plan_content` — full raw markdown of the plan (passed inline, no file read)
- `feature_dir` — resolved target directory for story files
- `prefix` — resolved story prefix

**No file IO for intermediate artifacts.** Return `SETUP-CONTEXT` as a YAML block inline.

### File Mode

The orchestrator provides `feature_dir`. Read `PLAN.md` or `PRD.md` from disk. Write `AGENT-CONTEXT.md` and `CHECKPOINT.md` to `{FEATURE_DIR}/_bootstrap/` (legacy behavior).

## Steps

### KB Mode Steps

1. **Validate plan_content** — must be non-empty and >100 chars. If not: BLOCKED: "Plan content is empty or too short"
2. **Validate prefix** — must be 2–6 uppercase alphanumeric chars
3. **Validate feature_dir** — must be a valid path string (does not need to exist yet)
4. **Check for collision** — call `kb_list_stories({ feature: "{project_name}", limit: 1 })`.
   - If one or more stories returned: BLOCKED: "Stories already exist in KB for plan '{project_name}' — bootstrap already run"
   - If zero stories returned: proceed to Step 5
   - If `kb_list_stories` is unavailable (tool not found, connection error, timeout): log warning `"KB collision check unavailable — falling back to filesystem check"`, then fall back to filesystem check: if `{feature_dir}/stories.index.md` exists on disk: BLOCKED: "stories.index.md already exists in {feature_dir} — bootstrap already run (filesystem fallback)"; otherwise proceed to Step 5
   - Note: KB is the authoritative source for story state. The filesystem check is a fallback only.
5. **Extract raw plan summary** — first 500 chars of plan_content
6. **Return SETUP-CONTEXT inline**

### File Mode Steps

1. **Check for existing context** — Read `{FEATURE_DIR}/_bootstrap/CHECKPOINT.md` if exists
2. **Validate feature directory** — must exist and contain `PLAN.md` or `PRD.md`
3. **Derive prefix** — from directory name (remove hyphens, first 4 chars, uppercase)
4. **Check for collision** — KB-first: call `kb_list_stories` to check for existing stories. Fallback: verify `stories.index.md` doesn't already exist
5. **Create bootstrap dir** — create `{FEATURE_DIR}/_bootstrap/` if needed
6. **Write AGENT-CONTEXT.md** — see format below
7. **Write CHECKPOINT.md** — see format below

## Output

### KB Mode — Return Inline

Emit a fenced YAML block with label `SETUP-CONTEXT`:

```yaml
# SETUP-CONTEXT
schema: 2
mode: kb
plan_slug: "{plan_slug}"
feature_dir: "{feature_dir}"
prefix: "{PREFIX}"
project_name: "{last segment of feature_dir}"
created: "{ISO timestamp}"
raw_plan_summary: |
  {First 500 chars of plan_content}
```

### File Mode — Write to Disk

**AGENT-CONTEXT.md** at `{FEATURE_DIR}/_bootstrap/AGENT-CONTEXT.md`:

```yaml
schema: 2
mode: file
command: pm-bootstrap-workflow
feature_dir: "{FEATURE_DIR}"
prefix: "{PREFIX}"
project_name: "{DIRECTORY_NAME}"
created: "{TIMESTAMP}"
raw_plan_file: "{FEATURE_DIR}/PLAN.md"
raw_plan_summary: |
  {First 500 chars of raw plan}
```

**CHECKPOINT.md** at `{FEATURE_DIR}/_bootstrap/CHECKPOINT.md`:

```yaml
schema: 2
feature_dir: "{FEATURE_DIR}"
prefix: "{PREFIX}"
last_completed_phase: 0
phase_0_signal: SETUP COMPLETE
resume_from: 1
timestamp: "{TIMESTAMP}"
```

## Error Handling

| Error | Action |
|-------|--------|
| Plan content empty | BLOCKED: "Plan content is empty or too short" |
| KB stories exist for plan | BLOCKED: "Stories already exist in KB for plan '{project_name}' — bootstrap already run" |
| kb_list_stories unavailable | Warning: "KB collision check unavailable — falling back to filesystem check" → filesystem fallback |
| stories.index.md exists (fallback) | BLOCKED: "stories.index.md already exists in {feature_dir} — bootstrap already run (filesystem fallback)" |
| Directory not found (file mode) | BLOCKED: "Directory not found: {path}" |
| No plan file (file mode) | BLOCKED: "No PLAN.md or PRD.md in {dir}" |

## Signals

- `SETUP COMPLETE` — context ready, safe for Phase 1
- `SETUP BLOCKED: <reason>` — cannot proceed, needs user action

## Token Tracking

See: `.claude/agents/_shared/token-tracking.md`

End output with:
```
## Tokens
- In: ~X (bytes read / 4)
- Out: ~Y (bytes written / 4)
```

---

## Context Cache Integration (REQUIRED)

**MUST query Context Cache at workflow start** to retrieve pre-distilled project conventions.

### When to Query

| Trigger | packType | packKey | Purpose |
|---------|----------|---------|---------|
| Workflow start (before validation) | `architecture` | `project-conventions` | Project conventions, coding standards, patterns |

### Call Pattern

```javascript
context_cache_get({ packType: 'architecture', packKey: 'project-conventions' })
  → if null: log warning via @repo/logger, continue without cache context
  → if hit: inject content.conventions (first 5 entries) and content.summary into setup context
```

### Content Injection Limits

- Inject: `summary`, `conventions` (first 5 entries only)
- Skip: `raw_content`, `full_text`, verbose examples (unbounded size)
- Max injection: ~1500 tokens

### Fallback Behavior

- Cache miss (null): Log `"Cache miss for architecture/project-conventions — proceeding without cache context"` via `@repo/logger`. Continue setup execution.
- Tool error (exception): Catch, log warning via `@repo/logger`, continue. Never block setup execution.
