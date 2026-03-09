# Test Plan: WINT-0080 - Seed Initial Workflow Data

## Scope Summary

**Endpoints touched:** None - this is a database seeding story, no API endpoints
**UI touched:** No
**Data/storage touched:** Yes - populates 5 tables in wint schema

### Tables Populated
- `workflow.phases` - 8 workflow phases (0-7)
- `graph.capabilities` - 7 standard CRUD operations
- Agent reference table (from .agent.md files)
- Command reference table (from command files)
- Skill reference table (from skill directories)

---

## Happy Path Tests

### Test 1: Seed Workflow Phases
**Setup:**
- Empty `workflow.phases` table
- Access to WINT stories index at `plans/future/platform/wint/stories.index.md`

**Action:**
```bash
pnpm seed:wint --target=phases
```

**Expected outcome:**
- 8 rows inserted into `workflow.phases` table
- Phase IDs: 0-7
- Phase names match index headings (Bootstrap, Foundation, Context Cache, Telemetry, Graph & Cohesion, ML Pipeline, Batch Mode, Migration)
- All rows have non-null `created_at` timestamps

**Evidence:**
```sql
SELECT id, name, description FROM workflow.phases ORDER BY id;
-- Expect 8 rows, ids 0-7
```

### Test 2: Seed CRUD Capabilities
**Setup:**
- Empty `graph.capabilities` table
- Reference to user-flows.schema.json capabilities enum

**Action:**
```bash
pnpm seed:wint --target=capabilities
```

**Expected outcome:**
- 7 rows inserted: create, view, edit, delete, upload, replace, download
- Each row has unique capability name
- All rows have non-null `created_at`

**Evidence:**
```sql
SELECT name FROM graph.capabilities ORDER BY name;
-- Expect 7 rows with exact capability names from schema
```

### Test 3: Seed Agent Metadata
**Setup:**
- Empty agent reference table
- 143 `.agent.md` files in `.claude/agents/`

**Action:**
```bash
pnpm seed:wint --target=agents
```

**Expected outcome:**
- 143 rows inserted (one per .agent.md file)
- Agent metadata extracted: name, type, permission_level, model, triggers, skills_used
- Handles frontmatter variations gracefully (missing fields = null)

**Evidence:**
```sql
SELECT COUNT(*) FROM wint.agents;
-- Expect 143

SELECT name, type, model FROM wint.agents WHERE type = 'leader';
-- Verify leader agents parsed correctly
```

### Test 4: Seed Command Metadata
**Setup:**
- Empty command reference table
- 33 command files in `.claude/commands/`

**Action:**
```bash
pnpm seed:wint --target=commands
```

**Expected outcome:**
- 33 rows inserted
- Command names extracted from filenames or frontmatter
- Description, triggers populated where available

**Evidence:**
```sql
SELECT COUNT(*) FROM wint.commands;
-- Expect 33

SELECT name, description FROM wint.commands LIMIT 5;
-- Verify metadata extraction
```

### Test 5: Seed Skill Metadata
**Setup:**
- Empty skill reference table
- 14 skill directories in `.claude/skills/`

**Action:**
```bash
pnpm seed:wint --target=skills
```

**Expected outcome:**
- 14 rows inserted
- Skill names from directory names
- Metadata from skill.md or index.md files

**Evidence:**
```sql
SELECT COUNT(*) FROM wint.skills;
-- Expect 14

SELECT name FROM wint.skills ORDER BY name;
```

### Test 6: Full Seed Run
**Setup:**
- All tables empty
- Fresh database state

**Action:**
```bash
pnpm seed:wint
```

**Expected outcome:**
- All 5 targets seeded in single run
- Transaction succeeds atomically
- Total rows: 8 + 7 + 143 + 33 + 14 = 205 rows

**Evidence:**
```sql
SELECT
  (SELECT COUNT(*) FROM workflow.phases) as phases,
  (SELECT COUNT(*) FROM graph.capabilities) as capabilities,
  (SELECT COUNT(*) FROM wint.agents) as agents,
  (SELECT COUNT(*) FROM wint.commands) as commands,
  (SELECT COUNT(*) FROM wint.skills) as skills;
-- Expect: 8, 7, 143, 33, 14
```

---

## Error Cases

### Error 1: Invalid Frontmatter Format
**Setup:**
- Create test .agent.md with malformed YAML frontmatter

**Action:**
- Run agent metadata parser

**Expected:**
- Parser logs warning for malformed file
- Continues processing other files
- Inserts row with null for unparseable fields
- Exit code 0 (warning, not error)

**Evidence:**
- Log contains: `WARN: Failed to parse frontmatter for <filename>`
- Database contains row for agent with name extracted from filename

### Error 2: Missing Required Table
**Setup:**
- Drop `workflow.phases` table

**Action:**
```bash
pnpm seed:wint --target=phases
```

**Expected:**
- Script fails with clear error message
- No partial data inserted
- Exit code 1

**Evidence:**
- Error message contains: `Table workflow.phases does not exist`
- Other tables remain unchanged

### Error 3: Duplicate Seed Run (Idempotency)
**Setup:**
- Tables already populated with seed data

**Action:**
```bash
pnpm seed:wint
```

**Expected:**
- Script completes successfully
- No duplicate rows created
- Data remains unchanged
- Exit code 0

**Evidence:**
```sql
SELECT COUNT(*) FROM workflow.phases;
-- Still 8, not 16

SELECT COUNT(*) FROM graph.capabilities;
-- Still 7, not 14
```

### Error 4: Database Connection Failure
**Setup:**
- Invalid DATABASE_URL or database offline

**Action:**
```bash
pnpm seed:wint
```

**Expected:**
- Script fails immediately with connection error
- No partial data written
- Exit code 1

**Evidence:**
- Error message contains: `Failed to connect to database`
- Seed log shows connection attempt and failure

---

## Edge Cases (Reasonable)

### Edge 1: Empty Agent Directory
**Setup:**
- Temporarily rename `.claude/agents/` to test robustness

**Action:**
```bash
pnpm seed:wint --target=agents
```

**Expected:**
- Script logs warning: `No .agent.md files found`
- No rows inserted
- Exit code 0 (not a fatal error)

**Evidence:**
```sql
SELECT COUNT(*) FROM wint.agents;
-- Expect 0
```

### Edge 2: Agent with All Optional Fields Missing
**Setup:**
- Create .agent.md with minimal frontmatter (only name and type)

**Action:**
- Run agent parser

**Expected:**
- Row inserted with non-null name and type
- All other fields null
- No errors

**Evidence:**
```sql
SELECT * FROM wint.agents WHERE name = '<test-agent>';
-- Verify name, type populated; model, triggers, etc. are null
```

### Edge 3: Very Long Phase Description
**Setup:**
- Modify stories index with 1000+ character phase description

**Action:**
```bash
pnpm seed:wint --target=phases
```

**Expected:**
- Description truncated or stored in TEXT field without error
- Row inserted successfully

**Evidence:**
```sql
SELECT LENGTH(description) FROM workflow.phases WHERE id = 0;
-- Verify length handling
```

### Edge 4: Schema Validation Failure
**Setup:**
- Seed data that violates Zod schema (e.g., invalid capability name)

**Action:**
- Attempt to insert invalid data

**Expected:**
- Zod validation fails before database insert
- Clear validation error message
- No database changes
- Exit code 1

**Evidence:**
- Error log contains Zod validation details
- `SELECT COUNT(*)` shows no new rows

### Edge 5: Partial Transaction Failure
**Setup:**
- Full seed run where one target (e.g., agents) fails mid-insert

**Action:**
```bash
pnpm seed:wint
```

**Expected:**
- Entire transaction rolls back
- No partial data in any table
- Exit code 1

**Evidence:**
```sql
SELECT COUNT(*) FROM workflow.phases;
-- Expect 0 (rollback)

SELECT COUNT(*) FROM graph.capabilities;
-- Expect 0 (rollback)
```

---

## Required Tooling Evidence

### Backend Testing

**Unit Tests:**
- `packages/backend/database-schema/src/seed/__tests__/phase-parser.test.ts`
  - Test phase extraction from index file
  - Test Zod validation
  - Test duplicate handling

- `packages/backend/database-schema/src/seed/__tests__/capability-seeder.test.ts`
  - Test capability list seeding
  - Test idempotency

- `packages/backend/database-schema/src/seed/__tests__/agent-parser.test.ts`
  - Test frontmatter parsing with fixtures
  - Test handling of malformed YAML
  - Test handling of missing optional fields

- `packages/backend/database-schema/src/seed/__tests__/command-parser.test.ts`
  - Test command metadata extraction

- `packages/backend/database-schema/src/seed/__tests__/skill-parser.test.ts`
  - Test skill metadata extraction

**Integration Tests:**
- `packages/backend/database-schema/src/seed/__tests__/integration.test.ts`
  - Full seed run against test database
  - Idempotency verification (run twice, same result)
  - Transaction rollback on error

**Required Assertions:**
- Row counts match expected values
- Zod schema validation passes for all inserted data
- Unique constraints enforced
- Timestamps populated
- Idempotent behavior verified

**Database Evidence:**
```sql
-- After full integration test
SELECT table_name, row_count FROM (
  SELECT 'workflow.phases' as table_name, COUNT(*) as row_count FROM workflow.phases
  UNION ALL
  SELECT 'graph.capabilities', COUNT(*) FROM graph.capabilities
  UNION ALL
  SELECT 'wint.agents', COUNT(*) FROM wint.agents
  UNION ALL
  SELECT 'wint.commands', COUNT(*) FROM wint.commands
  UNION ALL
  SELECT 'wint.skills', COUNT(*) FROM wint.skills
) as counts;
```

**Coverage Target:** 80% minimum for seed scripts

---

## Risks to Call Out

### Risk 1: Agent Frontmatter Format Diversity
**Description:** 143 .agent.md files may have inconsistent frontmatter formats (different field names, YAML vs JSON, missing delimiters)

**Mitigation:**
- Robust parser with fallback logic
- Log warnings for unparseable files
- Continue processing on individual file failures
- Manual review of warning logs after first run

**Test Coverage:** Include fixture files with various frontmatter formats in unit tests

### Risk 2: Stories Index Structure Changes
**Description:** WINT stories index has 140 stories across 8 phases. Index structure may evolve.

**Mitigation:**
- Parse phase headers using regex pattern, not hardcoded line numbers
- Validate phase count (expect 8, warn if different)
- Store parser version in migration metadata for future reconciliation

**Test Coverage:** Test parser against modified index structure

### Risk 3: Unique Constraint Conflicts
**Description:** Rerunning seed script should be idempotent, but unique constraints may cause errors if not handled.

**Mitigation:**
- Use `INSERT ... ON CONFLICT DO NOTHING` for idempotent inserts
- Alternatively, check for existence before insert
- Document idempotency guarantee in seed script header

**Test Coverage:** Idempotency test runs seed twice, asserts same result

### Risk 4: Missing Dependencies
**Description:** WINT-0070 (workflow.phases table) and WINT-0060 (graph.capabilities table) must be complete before this story.

**Mitigation:**
- Add pre-flight check: query information_schema to verify tables exist
- Fail fast with clear error if dependencies missing
- Document dependencies in seed script header

**Test Coverage:** Test with missing table (expect clear error)

### Risk 5: Large Transaction Size
**Description:** Seeding 143 agents + 33 commands + 14 skills in single transaction may timeout or exceed limits.

**Mitigation:**
- Batch inserts if needed (e.g., 50 agents per batch)
- Add transaction timeout configuration
- Monitor transaction duration in telemetry

**Test Coverage:** Performance test with full dataset
