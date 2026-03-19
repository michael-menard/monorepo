# KB Context for CDBE-2010 Setup

## Setup Phase Summary

**Agent**: dev-setup-leader  
**Mode**: implement  
**Gen Mode**: false  
**Timestamp**: 2026-03-19T00:00:00Z

## KB Queries (Intended)

The following KB queries should have been performed but were not possible in this environment:

### 1. Domain-Specific Setup Blockers

```javascript
kb_search({
  query: 'database migration setup constraints',
  role: 'dev',
  limit: 3,
})
```

**Expected Results**: Patterns from prior database migration stories (CDBE-1010, CDBE-1020, CDBE-1050, etc.)

**Applied Constraints** (defaults):

- Use idempotent migrations (CREATE OR REPLACE)
- Test isolation via pgtap BEGIN/ROLLBACK
- Reference existing patterns from 1001, 1005, 1010, 1050

### 2. Database-Specific Lessons

```javascript
kb_search({
  query: 'PostgreSQL stored procedure patterns pgtap testing',
  tags: ['database', 'plpgsql'],
  limit: 5,
})
```

**Expected Results**: Trigger structure, error handling, transaction patterns from CDBE-1010/1050

**Applied Patterns**:

- RAISE EXCEPTION USING ERRCODE for error codes
- SAVEPOINT guards for conditional DDL
- pgtap test isolation with ROLLBACK

### 3. Migration Numbering Convention

```javascript
kb_search({
  query: 'migration slot allocation CDBE-1010 1011 1012',
  tags: ['database', 'migration'],
  limit: 1,
})
```

**Expected Results**: Confirmation that slot 1013 is available

**Applied Knowledge**: Story references slots 1010–1012 taken; 1013 expected available

## Constraints Applied (from CLAUDE.md + Story Analysis)

### Hardcoded Constraints

1. **Idempotent migrations**: CREATE OR REPLACE FUNCTION, DROP TRIGGER IF EXISTS
2. **Caller validation**: All procedures start with PERFORM workflow.validate_caller()
3. **Error codes**: P0001 for unauthorized, 23514 for illegal transition
4. **Atomicity**: Wrapped in implicit transaction; any failure aborts all
5. **Delegation**: Procedures delegate cascade logic to 1010 BEFORE INSERT trigger
6. **No re-implementation**: exited_at/duration_seconds computed by trigger only

### Conditional Constraints

1. **public.agent_invocations**: May not exist — assignment linking must be graceful
2. **SAVEPOINT guards**: Wrap any DDL referencing functions that may not be deployed
3. **Cross-schema access**: agent_role must have SELECT on public.agent_invocations

## Risk Flags

| Risk                 | Flag     | Mitigation                                                                                          |
| -------------------- | -------- | --------------------------------------------------------------------------------------------------- |
| Migrations           | true     | Story IS a migration; reuse patterns from 1001/1010/1050                                            |
| Database integrity   | high     | Delegation to trigger prevents double-execution; NOT EXISTS validation prevents illegal transitions |
| Schema dependencies  | medium   | Verify public.agent_invocations exists; graceful handling if absent                                 |
| Atomicity            | critical | Implicit transaction ensures all-or-nothing; if any step raises, rollback                           |
| Authorization bypass | high     | validate_caller() as first guard prevents unauthorized access                                       |

## Architecture Decisions (Recorded)

### ADR-CDBE-2010-001: Delegation Model

**Context**: Multiple layers validate state transitions (NOT EXISTS in procedure, BEFORE INSERT trigger, BEFORE UPDATE trigger).

**Decision**: Procedure validates transition via NOT EXISTS, inserts history row (which fires 1010 trigger), then updates stories. The 1010 trigger owns exited_at/duration_seconds computation — procedure does not re-implement.

**Consequences**:

- Avoids double-execution of cascade logic
- Ensures trigger-computed fields are authoritative
- Procedure is simpler and focused on entry validation

### ADR-CDBE-2010-002: Invocation Linking (AC-10)

**Context**: assign_story should optionally link to public.agent_invocations, but this table may not exist.

**Decision**: TBD by dev. Options:

- (a) Add column to story_assignments (preferred — simplest)
- (b) Create separate link table
- (c) Log-only NO-OP

Dev should choose (a) unless constraints require otherwise, document decision in code comments.

**Consequences**: Will affect schema and query patterns in follow-up stories that read invocation linkage.

## Precedent Files (Reuse Plan)

### Migration Patterns

- **1001_canonical_story_states.sql**: RAISE EXCEPTION + ERRCODE structure
- **1005_allowed_agents.sql**: validate_caller() function signature
- **1010_story_state_history_trigger.sql**: BEFORE INSERT trigger structure, idempotent migration pattern
- **1050_cascade_trigger_prerequisites.sql**: story_assignments table structure

### Test Patterns

- **test_cdbe2005_allowed_agents.sql**: pgtap test isolation (BEGIN/plan/finish/ROLLBACK)
- **test_cdbe1030_artifact_superseded_at.sql**: SAVEPOINT+DO guard for conditional DDL

## Known Limitations

1. **KB tools not invoked**: MCP server connection not available in setup environment
2. **Precondition checks not performed**: `/precondition-check` skill not available; story status (`backlog`) should be verified before implementation
3. **No KB story state update**: Story status (`backlog` → `in_progress`) should be updated via `kb_update_story_status()` before implementation

## Recommended Next Steps (After Setup Complete)

1. Run precondition checks via proper KB/CLI tools
2. Verify story status is promoted to `ready-to-work` or `in_progress`
3. Update KB story status via `kb_update_story_status()`
4. Write checkpoint + scope artifacts to KB via `artifact_write()`
5. Proceed with ST-1 (verify migration slot)

## Setup Completion Status

- [x] Story frontmatter read
- [x] Full story requirements reviewed
- [x] Scope analyzed (database-only, pure SQL)
- [x] Risk flags identified (migrations=true)
- [x] Artifacts created (CHECKPOINT.yaml, SCOPE.yaml)
- [x] WORKING-SET.md created with subtasks and constraints
- [x] SETUP-LOG.md documented
- [ ] KB queries performed (not possible in environment)
- [ ] KB artifacts written (not possible in environment)
- [ ] Story status updated in KB (requires precondition-check skill)
- [ ] Precondition checks passed (requires precondition-check skill)
