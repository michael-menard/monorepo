---
story_id: WKFL-018
title: Standardize Deferred KB Write Pattern with Batch Flush Skill
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: WKFL
feature: Workflow Learning
type: feature
priority: high
source: workflow-retro-2026-02-22
---

# WKFL-018: Standardize Deferred KB Write Pattern with Batch Flush Skill

## Context

Batch retrospective (2026-02-22) found that 4 of 9 WKFL stories (44%) encountered KB tool unavailability:

| Story | Impact |
|-------|--------|
| WKFL-002 | KB unavailable — wrote DEFERRED-KB-WRITES.yaml independently |
| WKFL-003 | KB unavailable — wrote DEFERRED-KB-WRITES.yaml independently |
| WKFL-008 | KB unavailable — wrote DEFERRED-KB-WRITES.yaml independently |
| WKFL-010 | KB unavailable — wrote DEFERRED-KB-WRITES.yaml independently |

Each story re-invented the same fallback pattern from scratch. There is no canonical schema, no shared location convention, and no automated flush mechanism. The result is KB data siloed in per-story YAML files that may never be written to KB.

## Goal

Promote the deferred KB write pattern from an ad-hoc fallback to a first-class, documented workflow primitive with a standard schema and a `/kb-flush` skill that automatically processes pending writes at session start.

## Non-goals

- Fixing the underlying KB tool availability issues (infrastructure concern)
- Replacing synchronous KB writes when tools are available
- Auto-flushing across repos or remote contexts

## Scope

### 1. Create `.claude/schemas/deferred-kb-writes-schema.md`

Canonical schema all agents write to when KB tools are unavailable:

```yaml
schema_version: 1
generated_at: "{ISO_TIMESTAMP}"
source: "{agent-name}"
story_id: "{STORY_ID}"        # story that generated these writes
reason: "{why KB was unavailable}"
status: pending | flushed
flushed_at: null              # set when batch processor flushes

entries:
  - id: "{unique-id}"
    type: lesson | decision | pattern
    title: "{title}"
    category: "{category}"
    what_happened: "{prose}"
    recommendation: "{prose}"
    tags: []
```

### 2. Update `_shared/kb-integration.md`

Add a **Fallback: Deferred Write** section:

```markdown
### When KB Tools Are Unavailable

If kb_add_lesson / kb_search are not available:
1. Check for existing DEFERRED-KB-WRITES.yaml in story _implementation/
2. If not found, create it using `.claude/schemas/deferred-kb-writes-schema.md`
3. Append your entry to `entries[]`
4. Log: "KB unavailable — entry deferred to DEFERRED-KB-WRITES.yaml"
5. Continue — do NOT block on KB unavailability
```

### 3. Create `.claude/skills/kb-flush/SKILL.md`

A `/kb-flush` skill that:
1. Scans all story directories for `DEFERRED-KB-WRITES.yaml` with `status: pending`
2. For each file, attempts to write each entry via `kb_add_lesson`
3. On success, updates `status: flushed` and sets `flushed_at`
4. Reports: total found, written, failed

Skill invocation:
```
/kb-flush                           # scan all feature dirs
/kb-flush plans/future/platform/    # scan specific scope
/kb-flush --dry-run                 # report pending without writing
```

### 4. Update `dev-documentation-leader.agent.md`

Add to Phase 4 (post-OUTCOME.yaml): attempt to flush any `DEFERRED-KB-WRITES.yaml` in `_implementation/`. If KB tools now available, flush inline. If not, leave as-is.

## Acceptance Criteria

- [ ] AC-1: `.claude/schemas/deferred-kb-writes-schema.md` exists with the canonical schema documented
- [ ] AC-2: `_shared/kb-integration.md` has a Fallback section with clear instructions for writing to DEFERRED-KB-WRITES.yaml when KB is unavailable
- [ ] AC-3: `/kb-flush` skill exists and correctly reads all `DEFERRED-KB-WRITES.yaml` files with `status: pending`
- [ ] AC-4: `/kb-flush` calls `kb_add_lesson` for each entry and marks the file `status: flushed` on success
- [ ] AC-5: `/kb-flush --dry-run` reports pending entries without writing
- [ ] AC-6: `dev-documentation-leader` attempts inline flush of `DEFERRED-KB-WRITES.yaml` during documentation phase

## Test Plan

- Create a mock `DEFERRED-KB-WRITES.yaml` with `status: pending` and 2 entries
- Run `/kb-flush` and verify entries are written to KB and file is marked `status: flushed`
- Run `/kb-flush --dry-run` and verify it reports without writing
- Verify `_shared/kb-integration.md` fallback section is present and correctly formatted

## Evidence Source

RETRO pattern `deferred-002` from `DEFERRED-KB-WRITES.yaml` (2026-02-22 batch retro).
WORKFLOW-RECOMMENDATIONS.md High Priority #2.
