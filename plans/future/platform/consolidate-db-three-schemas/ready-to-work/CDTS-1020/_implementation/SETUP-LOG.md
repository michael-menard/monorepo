# CDTS-1020 Phase 0 Setup Complete

## Timestamp
2026-03-08T00:00:00Z

## Story Summary
**CDTS-1020: Write Structural DDL Migrations**

Database consolidation story that requires writing a comprehensive DDL migration (0035) to:
- Split `plans` table into `plans` (header/hot) + `plan_details` (detail/cold)
- Split `stories` table into `stories` (header/hot) + `story_details` (detail/cold)
- Add soft-delete columns (`deleted_at`, `deleted_by`) to 4 entity tables
- Create 2 new tables: `plan_dependencies`, `story_knowledge_links`
- Establish comprehensive FK constraints (all RESTRICT) across dependent tables
- Create rollback script (0035_rollback.sql)

**Depends on:** CDTS-1010 (analytics schema created in 0034)
**Migration number:** 0035

## Artifacts Created

### CHECKPOINT.yaml
- Location: `plans/future/platform/consolidate-db-three-schemas/in-progress/CDTS-1020/_implementation/CHECKPOINT.yaml`
- Phase: setup (iteration 0)
- Status: Ready for implementation phase

### SCOPE.yaml
- Location: `plans/future/platform/consolidate-db-three-schemas/in-progress/CDTS-1020/_implementation/SCOPE.yaml`
- Touches: backend, database (migrations)
- Risk flags: migrations=true, security=true (cross-schema FK)

## Key Constraints (from story acceptance criteria)

1. **Single-transaction migration** — critical to avoid partial application leaving schema inconsistent
2. **All FK constraints RESTRICT** — protect data integrity, not CASCADE or SET NULL
3. **Cross-schema FK** — analytics.story_token_usage.story_id -> public.stories.story_id
4. **Data preservation** — INSERT INTO ... SELECT must migrate all existing data
5. **Comprehensive FK coverage** — plan_story_links, story_dependencies, story_artifacts, work_state, work_state_history

## Next Phase (Implementation)

Developer will:
1. Read current schema structure from Drizzle definitions
2. Design and write 0035_cdts_1020_structural_ddl.sql
3. Implement data migrations (plans -> plan_details, stories -> story_details)
4. Add FK constraints to dependent tables
5. Create plan_dependencies and story_knowledge_links tables
6. Write rollback script
7. Test migration apply and rollback

## Acceptance Criteria Checklist

- [ ] plan_details table created with all 10 columns
- [ ] story_details table created with all 10 columns
- [ ] Data migration preserves 100% of existing data
- [ ] Soft-delete columns added to plans, stories, tasks, knowledge_entries
- [ ] All 7 FK constraints created with RESTRICT cascade
- [ ] plan_dependencies table created with unique slug pair + satisfied flag
- [ ] story_knowledge_links table created with CHECK constraint on link_type
- [ ] Rollback script reverses all changes
- [ ] FK count delta verified (information_schema.constraint counts before/after)

## Branch & Location

- **Branch:** story/CDTS-1020
- **Worktree:** tree/story/CDTS-1020
- **Story location:** plans/future/platform/consolidate-db-three-schemas/in-progress/CDTS-1020/
