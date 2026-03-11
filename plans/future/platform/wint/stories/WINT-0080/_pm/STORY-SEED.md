---
generated: "2026-02-16"
baseline_used: "/Users/michaelmenard/Development/monorepo/plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: false
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: WINT-0080

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No ADR-LOG.md found, no KB lessons loaded

### Relevant Existing Features
| Feature | Location | Status |
|---------|----------|--------|
| Database Schema - unified-wint.ts | packages/backend/database-schema/src/schema/unified-wint.ts | Active - Reconciled WINT + LangGraph schemas |
| Capabilities Table | unified-wint.ts lines 482-506 | Active - Schema defined, needs seed data |
| Stories Index (WINT) | plans/future/platform/wint/stories.index.md | Active - 140 stories, phase-based organization |
| Agent Files | .claude/agents/ | Active - 143 agent files present |
| Command Files | .claude/commands/ | Active - 33 command files present |
| Skill Files | .claude/skills/ | Active - 14 skill directories present |

### Active In-Progress Work
| Story | Status | Overlap Risk |
|-------|--------|--------------|
| WINT-0090 | ready-for-qa | None - Story management MCP tools, orthogonal |
| WINT-0200 | uat | None - User flows schema, orthogonal |
| WINT-0230 | elaboration | None - Unified model interface, orthogonal |
| WINT-1100 | completed | None - Shared TypeScript types, completed |

### Constraints to Respect
- Database schema namespace: All tables in 'wint' PostgreSQL schema
- CRUD capabilities must align with user-flows.schema.json standard states
- Agent metadata parser must handle diverse frontmatter formats (created, updated, version, type, permission_level, model, spawned_by, triggers, skills_used)
- Seed data must be idempotent (safe to rerun)

---

## Retrieved Context

### Related Endpoints
None - this story focuses on database seed data, not API endpoints.

### Related Components
| Component | Location | Relevance |
|-----------|----------|-----------|
| Capabilities Table | packages/backend/database-schema/src/schema/unified-wint.ts:482-506 | Target table for CRUD capabilities seed |
| Stories Index Parser | To be created | Will extract story metadata for phases seed |
| Agent Metadata Parser | To be created | Will extract agent metadata from .agent.md frontmatter |

### Reuse Candidates
- **Drizzle ORM Insert**: Use `db.insert()` pattern from WINT-0090 MCP tools
- **YAML Parsing**: Similar to orchestrator artifact parsing in `packages/backend/orchestrator/src/artifacts/`
- **Frontmatter Parsing**: Use gray-matter or similar library (check existing usage in codebase)
- **Seed Script Pattern**: May exist in `packages/backend/database-schema/src/migrations/` for reference

---

## Knowledge Context

### Lessons Learned
No lessons loaded from KB (KB search not available in current context).

### Blockers to Avoid (from past stories)
- **Parser Robustness**: Agent metadata parser must handle various frontmatter formats (noted in story risk notes)
- **Idempotency**: Seed scripts should check for existing data before inserting to avoid duplicates

### Architecture Decisions (ADRs)
No ADR-LOG.md found in repository. Operating without ADR constraints.

### Patterns to Follow
- **Zod-first types**: All seed data should be validated with Zod schemas before insertion
- **Database transactions**: Seed operations should run in transactions for atomicity
- **Drizzle ORM**: Use existing `@repo/db` client package for database access

### Patterns to Avoid
- **Hardcoded data**: Seed data should be derived from codebase analysis, not hardcoded lists
- **Schema assumptions**: Do not assume schema structure; read from actual schema files

---

## Conflict Analysis

No conflicts detected.

---

## Story Seed

### Title
Seed Initial Workflow Data

### Description

**Context**: WINT-0070 (Workflow Tracking Tables) and WINT-0060 (Graph Relational Tables) have created the schema structure for workflow tracking and graph capabilities. These tables are currently empty and need foundational reference data to support workflow operations.

**Problem**: Workflow operations require reference data for:
1. **Phases (0-7)**: The 8 workflow phases defined in the WINT epic (Phase 0: Bootstrap, Phase 1: Foundation, Phase 2: Context Cache, Phase 3: Telemetry, Phase 4: Graph & Cohesion, Phase 5: ML Pipeline, Phase 6: Batch Mode, Phase 7: Migration)
2. **CRUD Capabilities**: Standard capabilities (create, view, edit, delete, upload, replace, download) referenced in user-flows.schema.json (WINT-0200)
3. **Agent Metadata**: Current agent inventory (143 agents based on file count) with metadata extracted from .agent.md frontmatter
4. **Command Metadata**: Current command inventory (33 commands based on file count)
5. **Skill Metadata**: Current skill inventory (14 skills based on directory count)

Without this seed data, workflow tracking and graph cohesion features cannot function.

**Solution**: Create seed data scripts that:
1. Extract workflow phases from WINT stories index and populate `workflow.phases` table
2. Seed standard CRUD capabilities into `graph.capabilities` table
3. Parse all `.agent.md` files, extract frontmatter metadata, and populate agent reference table
4. Parse all command files and populate command reference table
5. Parse all skill directories and populate skill reference table

All seed scripts will be idempotent (safe to rerun) and will run in database transactions.

### Initial Acceptance Criteria
- [ ] AC-1: Seed script populates `workflow.phases` table with 8 phases (0-7) derived from WINT stories index
- [ ] AC-2: Seed script populates `graph.capabilities` table with 7 standard CRUD operations (create, view, edit, delete, upload, replace, download)
- [ ] AC-3: Agent metadata parser extracts frontmatter from all `.agent.md` files and populates agent reference table
- [ ] AC-4: Agent metadata includes: agent name, type (worker/leader/orchestrator), permission_level, model, spawned_by, triggers, skills_used
- [ ] AC-5: Command metadata parser extracts metadata from all command files and populates command reference table
- [ ] AC-6: Skill metadata parser extracts metadata from all skill directories and populates skill reference table
- [ ] AC-7: All seed scripts are idempotent (safe to rerun without creating duplicates)
- [ ] AC-8: All seed operations run in database transactions
- [ ] AC-9: Seed scripts validate data with Zod schemas before insertion
- [ ] AC-10: Seed scripts can be executed via `pnpm seed:wint` or similar command

### Non-Goals
- Migration of existing story data (covered by WINT-1030)
- Seeding context cache data (covered by Phase 2 stories: WINT-2030, WINT-2040, WINT-2050, WINT-2060)
- Seeding telemetry data (not applicable - telemetry is runtime data, not reference data)
- Seeding ML models (covered by Phase 5 stories)
- Creating workflow.phases or graph.capabilities tables (tables already exist from WINT-0070 and WINT-0060)

### Reuse Plan
- **Components**:
  - Drizzle ORM client from `@repo/db`
  - Zod schemas from `packages/backend/database-schema/src/schema/unified-wint.ts`
  - YAML parsing utilities from `packages/backend/orchestrator/src/artifacts/`
- **Patterns**:
  - Seed script pattern from existing migrations in `packages/backend/database-schema/src/migrations/`
  - Frontmatter parsing pattern (identify library used in codebase, or use `gray-matter`)
  - Idempotent insert pattern: `INSERT ... ON CONFLICT DO NOTHING` or check existence before insert
- **Packages**:
  - `@repo/db` for database access
  - `drizzle-orm` for query building
  - `zod` for validation
  - `gray-matter` or equivalent for frontmatter parsing (verify existing usage)
  - `js-yaml` for YAML parsing (likely already used in orchestrator)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
- **Unit Tests**: Test each parser (phases, capabilities, agents, commands, skills) in isolation with fixture data
- **Integration Tests**: Verify seed scripts populate database correctly from actual codebase files
- **Idempotency Tests**: Run seed scripts twice and verify no duplicates created
- **Schema Validation Tests**: Verify all seeded data passes Zod schema validation
- **Error Handling Tests**: Verify graceful handling of malformed frontmatter or missing files

### For UI/UX Advisor
Not applicable - this is a backend data seeding story with no UI components.

### For Dev Feasibility
- **Estimated Effort**: 8-12 hours
  - Phase parser (2 hours): Extract 8 phases from WINT stories index
  - Capability seeder (1 hour): Seed 7 CRUD capabilities
  - Agent parser (3-4 hours): Parse 143 .agent.md files, handle frontmatter variations
  - Command parser (1-2 hours): Parse 33 command files
  - Skill parser (1-2 hours): Parse 14 skill directories
  - Integration and testing (2-3 hours): Wire up seed command, test idempotency
- **Complexity**: Medium
  - Frontmatter parsing requires robust error handling for format variations
  - Idempotency logic requires careful handling of unique constraints
- **Dependencies**:
  - WINT-0070 must be complete (workflow.phases table exists)
  - WINT-0060 must be complete (graph.capabilities table exists)
- **Risk**:
  - Agent frontmatter format variations may require manual review or fallback logic
  - Initial count of 115 agents (from index) vs 143 files (from file count) needs reconciliation

---

**STORY-SEED COMPLETE**
