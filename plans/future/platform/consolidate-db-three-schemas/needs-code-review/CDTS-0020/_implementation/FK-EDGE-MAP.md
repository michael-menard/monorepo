# CDTS-0020 — FK Edge Map

**Source**: Ground-truth query against live knowledgebase DB (localhost:5433)
**Date**: 2026-03-08
**References**: AC-4, AC-5, AC-6

---

## Query Executed

```sql
SELECT
  tc.constraint_name,
  tc.table_schema AS source_schema,
  tc.table_name AS source_table,
  kcu.column_name AS source_column,
  ccu.table_schema AS target_schema,
  ccu.table_name AS target_table,
  ccu.column_name AS target_column,
  rc.delete_rule AS on_delete
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
  AND tc.constraint_schema = rc.constraint_schema
JOIN information_schema.constraint_column_usage ccu
  ON rc.unique_constraint_name = ccu.constraint_name
  AND rc.unique_constraint_schema = ccu.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_catalog = 'knowledgebase'
ORDER BY source_schema, source_table, constraint_name;
```

---

## FK Constraints Found (7 total)

| constraint_name | source_schema | source_table | source_column | target_schema | target_table | target_column | on_delete |
|-----------------|--------------|--------------|---------------|--------------|--------------|---------------|-----------|
| audit_log_entry_id_knowledge_entries_id_fk | public | audit_log | entry_id | public | knowledge_entries | id | SET NULL |
| knowledge_entries_canonical_id_knowledge_entries_id_fk | public | knowledge_entries | canonical_id | public | knowledge_entries | id | NO ACTION |
| plans_kb_entry_id_knowledge_entries_id_fk | public | plans | kb_entry_id | public | knowledge_entries | id | SET NULL |
| plans_parent_plan_id_fkey | public | plans | parent_plan_id | public | plans | id | SET NULL |
| story_artifacts_kb_entry_id_knowledge_entries_id_fk | public | story_artifacts | kb_entry_id | public | knowledge_entries | id | SET NULL |
| task_audit_log_task_id_fkey | public | task_audit_log | task_id | public | tasks | id | CASCADE |
| tasks_blocked_by_fkey | public | tasks | blocked_by | public | tasks | id | SET NULL |

---

## FK Graph (Directed Edges)

```
audit_log.entry_id ──────────────────────────────────────────────> knowledge_entries.id  (SET NULL)
knowledge_entries.canonical_id ──────────────────────────────────> knowledge_entries.id  (NO ACTION, self-ref)
plans.kb_entry_id ───────────────────────────────────────────────> knowledge_entries.id  (SET NULL)
plans.parent_plan_id ────────────────────────────────────────────> plans.id              (SET NULL, self-ref)
story_artifacts.kb_entry_id ─────────────────────────────────────> knowledge_entries.id  (SET NULL)
task_audit_log.task_id ──────────────────────────────────────────> tasks.id              (CASCADE)
tasks.blocked_by ────────────────────────────────────────────────> tasks.id              (SET NULL, self-ref)
```

---

## Tables With No FK Constraints (potentially missing)

The following tables have columns that semantically should be FK-constrained but currently are NOT:

| Table | Column | Expected FK Target | Status |
|-------|--------|--------------------|--------|
| story_artifacts | story_id (TEXT) | stories.story_id | **MISSING FK** |
| work_state | story_id (TEXT) | stories.story_id | **MISSING FK** |
| story_audit_log | story_id (TEXT) | stories.story_id | **MISSING FK** |
| story_dependencies | story_id (TEXT) | stories.story_id | **MISSING FK** |
| story_dependencies | depends_on (TEXT) | stories.story_id | **MISSING FK** |
| plan_story_links | story_id (TEXT) | stories.story_id | **MISSING FK** |
| story_token_usage | story_id (TEXT) | stories.story_id | **MISSING FK** |
| work_state_history | story_id (TEXT) | stories.story_id | **MISSING FK** |

**Note**: `stories.story_id` is a TEXT column (not UUID). These TEXT-to-TEXT FK relationships are technically possible in PostgreSQL (referencing a UNIQUE constraint on story_id), but they are not currently defined.

### Flagged Missing FKs (per AC-6)

The CDTS plan specifically calls out two missing FKs to add in CDTS-1020:
1. `story_artifacts.story_id -> stories.story_id` — currently unlinked
2. `work_state.story_id -> stories.story_id` — currently unlinked

---

## Notes on ON DELETE Behavior

| on_delete | Count | Tables Using It |
|-----------|-------|-----------------|
| SET NULL  | 5     | audit_log, knowledge_entries (self-ref), plans (×2), story_artifacts |
| NO ACTION | 1     | knowledge_entries (self-ref canonical_id) |
| CASCADE   | 1     | task_audit_log → tasks |

The CDTS plan calls for all **new** FKs to use `ON DELETE RESTRICT`. Existing FKs will not be altered in behavior.
