# Dev Feasibility Review: WINT-0080 - Seed Initial Workflow Data

## Executive Summary

**Verdict:** ✅ FEASIBLE with MEDIUM complexity

**Estimated Effort:** 10-14 hours (within seed estimate of 8-12 hours + buffer)

**Key Strengths:**
- Clear dependencies (WINT-0070, WINT-0060 tables exist)
- Well-defined data sources (stories index, .agent.md files)
- Existing Drizzle ORM patterns in codebase
- Strong reuse opportunities

**Key Risks:**
- Agent frontmatter parsing variability (143 files)
- Idempotency implementation complexity
- No prior seed script patterns in this repo

---

## Technical Approach

### Architecture

```
packages/backend/database-schema/
└── src/
    └── seed/
        ├── index.ts                    # Main entry point, orchestrates all seeders
        ├── phase-seeder.ts             # Seeds workflow.phases
        ├── capability-seeder.ts        # Seeds graph.capabilities
        ├── agent-seeder.ts             # Seeds agent reference table
        ├── command-seeder.ts           # Seeds command reference table
        ├── skill-seeder.ts             # Seeds skill reference table
        ├── parsers/
        │   ├── frontmatter-parser.ts   # Generic YAML frontmatter parser
        │   ├── index-parser.ts         # Parses stories.index.md
        │   └── metadata-extractor.ts   # Extracts metadata from files
        ├── __tests__/
        │   ├── phase-seeder.test.ts
        │   ├── capability-seeder.test.ts
        │   ├── agent-seeder.test.ts
        │   ├── command-seeder.test.ts
        │   ├── skill-seeder.test.ts
        │   ├── frontmatter-parser.test.ts
        │   └── integration.test.ts
        └── __fixtures__/
            ├── test-agent.md
            ├── malformed-agent.md
            └── minimal-agent.md
```

### Package Script

Add to `packages/backend/database-schema/package.json`:
```json
{
  "scripts": {
    "seed:wint": "tsx src/seed/index.ts",
    "seed:wint:phases": "tsx src/seed/index.ts --target=phases",
    "seed:wint:capabilities": "tsx src/seed/index.ts --target=capabilities",
    "seed:wint:agents": "tsx src/seed/index.ts --target=agents",
    "seed:wint:commands": "tsx src/seed/index.ts --target=commands",
    "seed:wint:skills": "tsx src/seed/index.ts --target=skills"
  }
}
```

---

## Reuse Opportunities

### ✅ Existing Packages

1. **@repo/db** (Drizzle client)
   - Location: `packages/backend/db/src/index.ts`
   - Usage: Import `db` instance for all database operations
   - Example pattern from WINT-0090 MCP tools:
     ```typescript
     import { db } from '@repo/db'
     import { phases } from '@repo/db/schema'

     await db.insert(phases).values(phaseData)
     ```

2. **Zod schemas** (from unified-wint.ts)
   - Location: `packages/backend/database-schema/src/schema/unified-wint.ts`
   - Tables defined: `workflow.phases`, `graph.capabilities`, agent/command/skill tables
   - Usage: Import table schemas for type-safe inserts

3. **gray-matter** (frontmatter parsing)
   - Check if already in dependencies via:
     ```bash
     grep -r "gray-matter" pnpm-lock.yaml
     ```
   - If not present, add as dev dependency
   - Alternative: Use existing YAML parser from orchestrator

4. **js-yaml** (YAML parsing)
   - Likely already used in `packages/backend/orchestrator/src/artifacts/`
   - Reuse for parsing frontmatter if gray-matter not available

### ✅ Existing Patterns

1. **Drizzle Insert Pattern** (from WINT-0090)
   ```typescript
   import { db } from '@repo/db'
   import { stories } from '@repo/db/schema'

   const result = await db.insert(stories).values({
     story_id: 'WINT-0080',
     // ... fields
   }).returning()
   ```

2. **Idempotent Insert Pattern** (SQL standard)
   ```typescript
   await db.insert(phases).values(data).onConflictDoNothing()
   ```

3. **File System Operations**
   - Use `fs.promises` for async file reading
   - Use `glob` package for finding .agent.md files:
     ```typescript
     import { glob } from 'glob'

     const agentFiles = await glob('.claude/agents/**/*.agent.md')
     ```

4. **Transaction Pattern** (Drizzle)
   ```typescript
   await db.transaction(async (tx) => {
     await tx.insert(phases).values(phaseData)
     await tx.insert(capabilities).values(capabilityData)
     // ... more inserts
   })
   ```

---

## Implementation Breakdown

### Phase 1: Setup (2 hours)
- [ ] Create `packages/backend/database-schema/src/seed/` directory
- [ ] Add dependencies: `tsx`, `glob`, `gray-matter` or reuse existing YAML parser
- [ ] Set up test infrastructure with Vitest
- [ ] Create fixture files for testing

### Phase 2: Core Parsers (3 hours)
- [ ] **frontmatter-parser.ts** (1 hour)
  - Generic YAML frontmatter extraction
  - Handle malformed YAML gracefully
  - Return parsed object or null
  - Unit tests with fixtures

- [ ] **index-parser.ts** (1 hour)
  - Parse `stories.index.md` for phase headers
  - Extract phase ID, name, description
  - Return array of phase objects
  - Unit tests

- [ ] **metadata-extractor.ts** (1 hour)
  - Extract agent/command/skill metadata from files
  - Handle missing optional fields
  - Return typed objects
  - Unit tests

### Phase 3: Seeders (4 hours)
- [ ] **phase-seeder.ts** (1 hour)
  - Read stories index
  - Parse 8 phases
  - Validate with Zod
  - Insert with idempotency
  - Unit tests

- [ ] **capability-seeder.ts** (30 min)
  - Hardcoded list of 7 capabilities (from user-flows.schema.json)
  - Insert with idempotency
  - Unit tests

- [ ] **agent-seeder.ts** (1.5 hours)
  - Glob for .agent.md files
  - Parse frontmatter for each
  - Extract: name, type, permission_level, model, triggers, skills_used
  - Handle parsing failures gracefully
  - Insert batch with idempotency
  - Unit tests with various frontmatter formats

- [ ] **command-seeder.ts** (30 min)
  - Glob for command files in `.claude/commands/`
  - Extract metadata
  - Insert with idempotency
  - Unit tests

- [ ] **skill-seeder.ts** (30 min)
  - Glob for skill directories in `.claude/skills/`
  - Extract metadata from skill.md or index.md
  - Insert with idempotency
  - Unit tests

### Phase 4: Integration (2 hours)
- [ ] **index.ts** (1 hour)
  - CLI argument parsing (--target flag)
  - Orchestrate all seeders
  - Transaction management
  - Error handling and logging
  - Pre-flight checks (tables exist)

- [ ] **Integration tests** (1 hour)
  - Full seed run against test DB
  - Idempotency test (run twice)
  - Partial failure / rollback test
  - Verify row counts

### Phase 5: Documentation & Polish (1 hour)
- [ ] Add JSDoc comments to all functions
- [ ] Create README in seed/ directory
- [ ] Document idempotency guarantees
- [ ] Add package.json scripts

### Buffer: Edge Cases & Debugging (2 hours)
- Handle discovered frontmatter variations
- Performance tuning for 143 agent inserts
- Fix test failures
- Manual verification of seed data

---

## Dependencies & Prerequisites

### Story Dependencies
✅ **WINT-0070** (Workflow Tracking Tables) - MUST be complete
  - Status: `pending` in index
  - Blocks: Cannot seed phases without `workflow.phases` table

✅ **WINT-0060** (Graph Relational Tables) - MUST be complete
  - Status: `pending` in index
  - Blocks: Cannot seed capabilities without `graph.capabilities` table

### Package Dependencies
Current:
- `@repo/db` (Drizzle client) - ✅ exists
- `drizzle-orm` - ✅ exists
- `zod` - ✅ exists

To Add:
- `tsx` - for running TS scripts (likely already in root)
- `glob` - for file discovery (check if exists)
- `gray-matter` OR reuse `js-yaml` from orchestrator

Check commands:
```bash
cd packages/backend/database-schema
grep -E "(tsx|glob|gray-matter|js-yaml)" package.json
```

### Environment
- `DATABASE_URL` must be set and valid
- Database must have `workflow` and `graph` schemas (from WINT-0070, WINT-0060)
- Agent/command/skill reference tables must exist (check schema files)

---

## Risks & Mitigations

### Risk 1: Frontmatter Format Variations (HIGH)
**Issue:** 143 .agent.md files may have inconsistent formats
- Some may use `created:`, others `created_at:`
- Some may have malformed YAML
- Some may be missing frontmatter entirely

**Mitigation:**
1. Build robust parser with try/catch per file
2. Log warnings for unparseable files
3. Use fallback values (filename → name)
4. Continue processing on individual file failures
5. Create unit tests with diverse fixture files
6. Manual review of warnings after first run

**Effort Impact:** +1 hour for parser hardening

### Risk 2: Missing Agent/Command/Skill Tables (MEDIUM)
**Issue:** Schema files may not define agent/command/skill tables yet

**Validation:** Check `packages/backend/database-schema/src/schema/unified-wint.ts` for:
- `agents` table definition
- `commands` table definition
- `skills` table definition

**Mitigation:**
- If tables missing, add to schema first (not in WINT-0080 scope, may need WINT-0070/0060 update)
- Pre-flight check in seed script: query `information_schema` to verify tables exist
- Fail fast with clear error message

**Effort Impact:** None if tables exist; blocks story if tables missing

### Risk 3: Idempotency Implementation (MEDIUM)
**Issue:** Ensuring safe reruns without duplicates

**Approaches:**
1. `INSERT ... ON CONFLICT DO NOTHING` (requires unique constraint)
2. Check existence before insert (slower but safer)
3. `UPSERT` pattern (requires identifying key fields)

**Recommendation:** Use ON CONFLICT with unique constraints on:
- `workflow.phases`: `id` (primary key)
- `graph.capabilities`: `name` (unique)
- `agents`: `name` (unique)
- `commands`: `name` (unique)
- `skills`: `name` (unique)

**Mitigation:**
- Verify unique constraints exist in schema
- Test idempotency explicitly
- Document behavior in seed script header

**Effort Impact:** Included in estimate

### Risk 4: Transaction Size (LOW)
**Issue:** 205 total inserts in one transaction may timeout

**Analysis:**
- Modern Postgres handles 200 rows easily
- Drizzle transactions are efficient
- Seed data is small (mostly text, no blobs)

**Mitigation:**
- Start with single transaction
- Add batching only if performance issues arise
- Monitor transaction duration

**Effort Impact:** None (unlikely to occur)

### Risk 5: Test Database Setup (LOW)
**Issue:** Integration tests need isolated test database

**Mitigation:**
- Reuse existing test DB setup from `@repo/db` package
- Use `beforeEach` to clear tables
- Use transactions with rollback for test isolation

**Effort Impact:** Included in test setup time

---

## Acceptance Criteria Feasibility

| AC | Feasibility | Notes |
|----|------------|-------|
| AC-1: Seed workflow.phases | ✅ EASY | Parse index, 8 static phases |
| AC-2: Seed graph.capabilities | ✅ EASY | 7 hardcoded values |
| AC-3: Parse agent frontmatter | ⚠️ MEDIUM | 143 files, format variability |
| AC-4: Extract agent metadata | ⚠️ MEDIUM | Diverse frontmatter fields |
| AC-5: Parse command metadata | ✅ EASY | 33 files, simpler than agents |
| AC-6: Parse skill metadata | ✅ EASY | 14 directories |
| AC-7: Idempotency | ⚠️ MEDIUM | ON CONFLICT implementation |
| AC-8: Transactions | ✅ EASY | Drizzle tx pattern |
| AC-9: Zod validation | ✅ EASY | Schemas already exist |
| AC-10: pnpm seed:wint command | ✅ EASY | Package script |

**Overall:** All ACs feasible. AC-3, AC-4, AC-7 require extra care.

---

## Alternative Approaches Considered

### Alternative 1: Manual Data Entry
**Pros:** Simple, no code required
**Cons:** Error-prone, not repeatable, no validation
**Verdict:** ❌ Rejected - seed script is better long-term

### Alternative 2: Migration Script Instead of Seed Script
**Pros:** Runs automatically with migrations
**Cons:** Harder to rerun, mixed concerns (schema vs data)
**Verdict:** ❌ Rejected - seed scripts are clearer for reference data

### Alternative 3: Hard-code All Data
**Pros:** No file parsing required
**Cons:** Out of sync immediately, 143 agents to maintain manually
**Verdict:** ❌ Rejected - parsing is worth the effort

### Alternative 4: Lazy Load from Files
**Pros:** No seeding required, always up-to-date
**Cons:** Slower runtime queries, no database benefits
**Verdict:** ❌ Rejected - defeats purpose of WINT epic (DB-first)

**Chosen Approach:** Seed scripts with file parsing (as proposed)

---

## Questions for PM

1. **Agent/Command/Skill Table Schema:** Are the agent/command/skill reference tables already defined in unified-wint.ts? If not, should WINT-0080 define them or is that a blocker?

2. **Unique Constraints:** What unique constraints should be enforced?
   - Agent name unique?
   - Command name unique?
   - Skill name unique?

3. **Agent Metadata Priority:** If an agent has conflicting metadata (e.g., two `model:` fields in frontmatter), which takes precedence?

4. **Scope Boundary:** Should this story include creating the agent/command/skill tables, or only seeding them? (Current assumption: only seeding)

5. **Error Handling:** If 5 out of 143 agents fail to parse, should the seed script:
   - Continue and log warnings? ✅ (Recommended)
   - Fail entirely? ❌

---

## Recommended Follow-Up Stories

1. **WINT-0085: Agent Metadata Reconciliation**
   - Review parsing warnings from first seed run
   - Standardize frontmatter format across all .agent.md files
   - Priority: LOW (post-WINT-0080)

2. **WINT-0086: Seed Data Verification Dashboard**
   - Create SQL views to validate seed data
   - Check for orphaned records, missing metadata
   - Priority: LOW

3. **WINT-0087: Incremental Seed Updates**
   - Add ability to seed only new/changed files (delta updates)
   - Useful as agent/command/skill inventory grows
   - Priority: LOW

---

## Final Recommendation

✅ **PROCEED** with story as scoped.

**Justification:**
- All dependencies can be satisfied
- Strong reuse opportunities in codebase
- Risks are manageable with proper testing
- Effort estimate is reasonable (10-14 hours)
- No blocking unknowns

**Conditions:**
1. Verify WINT-0070 and WINT-0060 tables exist before starting
2. Confirm agent/command/skill table schemas are defined
3. Add 2-hour buffer for frontmatter parsing edge cases

**Confidence:** MEDIUM-HIGH (75%)
- Confident in core seeding logic
- Moderate uncertainty around agent frontmatter parsing (diverse formats)
- High confidence in idempotency and transaction handling
