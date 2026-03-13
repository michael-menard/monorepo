# CDBN-0020 Setup Phase - COMPLETE

**Setup completed:** 2026-03-11 21:12:34Z
**Story:** CDBN-0020 - Produce Migration Manifest of Live Data Across Old Schemas
**Feature:** consolidate-db-normalized
**Mode:** implement (autonomous_implementation)
**Status:** in_progress → ready for implementation

---

## Setup Summary

The setup phase has completed successfully. All prerequisites for implementation are in place:

- [x] Elaboration audit applied (CONDITIONAL_PASS verdict)
- [x] 4 Acceptance Criteria (AC-1 through AC-4) added to KB story record
- [x] Checkpoint artifact created with full implementation context
- [x] Work state initialized with next steps and constraints
- [x] Implementation analysis artifact created with detailed task breakdown
- [x] All critical requirements documented
- [x] Database targeting explicitly enforced (lego_dev:5432)
- [x] Phase 1 gate dependencies documented
- [x] MANIFEST specification defined

---

## Acceptance Criteria Status

| AC | Requirement | Status | Notes |
|:---|:---|:---|:---|
| AC-1 | Story body is complete with AC, Non-Goals, Subtasks (ST-1 through ST-7), Local Testing Plan | PENDING | Implementer must execute all 7 subtasks |
| AC-2 | Target lego_dev port 5432; record source DB and port in MANIFEST | PENDING | Critical: Never query knowledgebase DB (port 5433) |
| AC-3 | MANIFEST includes dedup_strategy, live_usage column, fk_violations section | PENDING | Three required Phase 1 gate outputs |
| AC-4 | MANIFEST includes SQL commands, anchored table count, row counts, verification SQL | PENDING | Reproducible verification required |

---

## Critical Requirements

### Database Target (CRITICAL)
- **Target:** lego_dev at port 5432
- **Prohibited:** knowledgebase DB at port 5433
- **Reason:** CDTS-3020 audit confirmed wint schema was dropped from port 5433. Querying the wrong database will return zero tables and produce a completely incorrect manifest that will mislead all Phase 1 stories.

### Phase 1 Gate Dependencies (CRITICAL)
1. **CDBN-1020 requires:** deduplication_strategy for artifact tables
   - MANIFEST must document how duplicate (story_id, artifact_type, phase) rows will be handled
   - Example strategies: keep_first, keep_latest, consolidate_rows

2. **CDBN-1030 requires:** live_usage=true flagging for context_packs and context_sessions
   - These tables are actively queried by running MCP tools
   - Migration cannot break these live connections

3. **Story risk requires:** fk_violations section documenting FK dependencies
   - Risk notes mention "potential FK violations that only surface under audit"
   - Must exhaustively list all FK relationships and any violations found

---

## Subtask Breakdown (ST-1 through ST-7)

### ST-1: Enumerate tables in wint schema
```sql
SELECT table_schema, table_name, table_type
FROM information_schema.tables
WHERE table_schema='wint'
ORDER BY table_name
```
**Output:** Complete table inventory
**Expected:** 38-40+ tables

### ST-2: Produce FK edge map
```sql
SELECT tc.table_name, kcu.column_name, ccu.table_name AS fk_table, tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name=ccu.constraint_name
WHERE tc.constraint_type='FOREIGN KEY'
AND tc.table_schema='wint'
ORDER BY tc.table_name
```
**Output:** Complete FK dependency graph
**Key insight:** Will reveal all relationships, including any undocumented constraints

### ST-3: Document column definitions
```sql
SELECT table_name, column_name, data_type, is_nullable, column_default, ordinal_position
FROM information_schema.columns
WHERE table_schema='wint'
ORDER BY table_name, ordinal_position
```
**Output:** Column inventory per table
**Purpose:** Reference for migration planning (CDBN-2010+)

### ST-4: Identify deduplication conflicts
```sql
SELECT story_id, artifact_type, phase, COUNT(*) as duplicate_count
FROM wint.artifacts
GROUP BY story_id, artifact_type, phase
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
```
**Output:** List of duplicate combinations
**Decision:** Choose deduplication strategy (keep_first, keep_latest, or consolidate)

### ST-5: Flag live-usage tables
**Manual:** Based on ARCH-001 KB lesson and CDBN-1030 risk
- context_packs = true (MCP context cache tool queries)
- context_sessions = true (MCP session tracking)
- Other tables = false (or true if additional live usage detected)

### ST-6: Write MANIFEST.yaml
**Input:** Results from ST-1 through ST-5
**Format:** Structured YAML with columns:
- schema_name
- table_name
- row_count
- column_count
- has_pk (boolean)
- has_fk (boolean)
- fk_violations (list)
- live_usage (boolean)
- migration_action (e.g., "migrate", "drop", "archive")
- dedup_strategy (required for wint.artifacts)
- notes

**Must include sections:**
- header (source_db, source_port, schema, generated_at, generated_by)
- summary (total_tables, total_rows, dedup_conflicts)
- tables array (one row per wint table)
- deduplication_strategy (how duplicates will be handled)
- fk_violations array (all FK constraints and any violations)
- live_usage_tables array (context_packs, context_sessions with reasoning)
- verification_queries (re-runnable SQL for reviewer confirmation)

### ST-7: Write verification SQL
**Purpose:** Provide re-runnable queries for independent verification
**Examples:**
```sql
-- Anchor table count
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='wint'

-- Verify row counts
SELECT SUM(n_live_tup) FROM pg_stat_user_tables WHERE schemaname='wint'

-- Check FK constraints
SELECT COUNT(*) FROM information_schema.table_constraints
WHERE constraint_type='FOREIGN KEY' AND table_schema='wint'
```

**Include in MANIFEST:** verification_queries section with each query's expected result

---

## MANIFEST YAML Structure Example

```yaml
header:
  source_db: lego_dev
  source_port: 5432
  schema: wint
  generated_at: "2026-03-11T21:30:00Z"
  generated_by: "CDBN-0020 audit story"
  note: "DO NOT QUERY port 5433 - wint schema was dropped there in CDTS-3020"

summary:
  total_tables: 40
  total_rows: 1250000
  dedup_conflicts: 3

tables:
  - schema_name: wint
    table_name: artifacts
    row_count: 50000
    column_count: 12
    has_pk: true
    has_fk: true
    fk_violations: []
    live_usage: false
    migration_action: "migrate"
    dedup_strategy: "consolidate_rows: merge duplicates by story_id+artifact_type+phase, keeping latest created_at"
    notes: "3 duplicate combinations found (see deduplication_strategy)"

deduplication_strategy:
  description: "Artifact table deduplication approach"
  chosen_strategy: "consolidate_rows"
  rationale: "Merging duplicate rows preserves all state history while resolving conflicts"
  implementation: "During migration, use DISTINCT ON (story_id, artifact_type, phase) ORDER BY created_at DESC"

fk_violations:
  - constraint_name: "fk_artifacts_story"
    severity: "info"
    description: "FK artifacts.story_id -> stories.id"
    status: "OK"
  - constraint_name: "fk_context_packs_story"
    severity: "warning"
    description: "FK context_packs.story_id -> stories.id (orphaned rows detected)"
    count_orphaned: 5
    remediation: "Clean up orphaned rows before migration"

live_usage_tables:
  - table_name: context_packs
    live_usage: true
    reason: "MCP context cache tool queries"
    mcp_tools: ["context_pack_get", "context_pack_cache", "kb_write_artifact"]
    criticality: "CRITICAL - active use during migration"
  - table_name: context_sessions
    live_usage: true
    reason: "MCP session tracking"
    mcp_tools: ["workflow_log_invocation", "workflow_get_story_telemetry"]
    criticality: "CRITICAL - active use during migration"

verification_queries:
  - query: "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='wint'"
    expected_result: "40"
    purpose: "Anchor total table count"
  - query: "SELECT COUNT(*) FROM wint.artifacts"
    expected_result: "50000"
    purpose: "Verify artifact table row count against manifest"
```

---

## Implementation Readiness

| Item | Status | Notes |
|:---|:---|:---|
| Story body complete | FALSE | AC-1 requires adding Subtasks to story.yaml before implementation |
| Acceptance criteria defined | TRUE | AC-1 through AC-4 in KB story record |
| Database target explicit | TRUE | lego_dev:5432 enforced; port 5433 prohibited |
| Manifest spec defined | TRUE | YAML structure with all required columns |
| Phase 1 dependencies documented | TRUE | CDBN-1020, CDBN-1030 gate outputs defined |
| Critical requirements documented | TRUE | 5 critical notes in analysis artifact |
| Verification plan defined | TRUE | ST-7 includes re-runnable SQL |
| Ready to implement | TRUE | All prerequisites in place |

---

## Next Steps (Implementation)

1. **Open story.yaml** and read AC-1 through AC-4 requirements
2. **Add story body** with Acceptance Criteria, Non-Goals, Subtasks, Local Testing Plan sections (AC-1 obligation)
3. **Execute ST-1 through ST-7** in sequence:
   - Connect to lego_dev:5432 (verify NOT 5433)
   - Run each SQL query and document results
   - Document exact SQL commands used
4. **Synthesize findings** into MANIFEST.yaml:
   - Include all columns from MANIFEST spec
   - All three Phase 1 gate outputs: dedup_strategy, live_usage, fk_violations
   - Verification SQL queries
5. **Create MANIFEST artifact** in KB (type: 'evidence' or 'manifest')
6. **Submit for code review** with MANIFEST artifact attached

---

## Artifacts Created During Setup

1. **CHECKPOINT.yaml** - Setup phase completion checkpoint with full context
2. **ANALYSIS.yaml** - Implementation analysis with subtask breakdown and MANIFEST specification
3. **SETUP-COMPLETE.md** - This document

All artifacts available in KB via:
- Story ID: CDBN-0020
- Artifact types: checkpoint, analysis
- Phase: setup

---

## Dependencies & Constraints

### Hard Constraints
- Target database MUST be lego_dev:5432
- MANIFEST MUST include dedup_strategy (CDBN-1020 gate)
- MANIFEST MUST include live_usage=true for context_packs and context_sessions (CDBN-1030 gate)
- MANIFEST MUST include fk_violations section (story risk)
- MANIFEST format MUST be valid YAML (machine-readable for CDBN-2010)

### Phase 1 Gate Dependencies
- CDBN-1020: "Migrate Artifact Table Schema" depends on dedup_strategy from this story
- CDBN-1030: "Preserve Live Context Cache Tables" depends on live_usage classification from this story

---

## Key References

- **KB Elaboration Audit:** ELAB.yaml in _implementation/ (CONDITIONAL_PASS verdict)
- **KB Story Record:** CDBN-0020 (includes AC-1 through AC-4)
- **KB Lessons:** ARCH-001 (database architecture, lego_dev location)
- **Related Stories:** CDBN-1020 (artifact dedup), CDBN-1030 (context cache), CDBN-2010 (migration)
- **Related Audit:** CDTS-3020 (wint schema drop from port 5433)

---

**Ready to implement. Execute subtasks ST-1 through ST-7 to produce MANIFEST artifact meeting AC-1 through AC-4.**
