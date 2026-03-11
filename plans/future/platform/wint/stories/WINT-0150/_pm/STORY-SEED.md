---
generated: "2026-02-16"
baseline_used: "/Users/michaelmenard/Development/monorepo/plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: false
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: WINT-0150

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No ADR-LOG.md found, no KB lessons retrieved (Phase 0 infrastructure not yet deployed)

### Relevant Existing Features

| Feature | Status | Relevance |
|---------|--------|-----------|
| doc-sync skill | Exists | Direct reference - shows established pattern for documentation sync |
| doc-sync agent | Exists | Worker agent that implements the skill logic |
| AGENTS.md | Exists | Target documentation file to be updated |
| COMMANDS.md | Exists | Target documentation file to be updated |
| SKILLS.md | Exists | Target documentation file to be updated |
| docs/workflow/ | Exists | Directory with workflow documentation (phases.md, agent-system.md, etc.) |
| Agent frontmatter format | Established | YAML frontmatter with created, updated, version, type, model, spawns fields |
| WINT database schemas | In-progress | Phase 0 bootstrap - core, context_cache, telemetry, ml, graph, workflow schemas |

### Active In-Progress Work

| Story | Status | Potential Overlap |
|-------|--------|-------------------|
| None | - | No conflicts - WINT-0150 has no dependencies and is first in Phase 0 doc-sync epic |

### Constraints to Respect

**Code Conventions:**
- Zod-first types (REQUIRED) - no TypeScript interfaces
- Functional components only, named exports
- No barrel files - import directly from source
- `@repo/logger` for logging, `@repo/ui` for UI components
- Prettier: no semicolons, single quotes, trailing commas, 100 char width

**Database Layer:**
- Drizzle ORM v0.44.3 for schema definitions
- `@repo/db` client package with connection pooling
- No direct database access - use unified schema layer

**WINT Phase 0 Context:**
- Bootstrap phase - manual setup of database schemas, MCP tools, and doc-sync infrastructure
- Goal: Establish foundation for database-driven workflow
- All Phase 0 stories are untracked prerequisites for subsequent phases

---

## Retrieved Context

### Related Endpoints
None - this is a documentation skill, not an API/backend feature.

### Related Components

**Existing doc-sync Implementation:**
- `.claude/skills/doc-sync/skill.md` - Complete skill documentation with 7-phase workflow
- `.claude/agents/doc-sync.agent.md` - Worker agent implementation (haiku model)
- Established patterns:
  - Git diff-based change detection (with timestamp fallback)
  - YAML frontmatter parsing from agent/command files
  - Section mapping (pm-*, elab-*, dev-*, etc. → phases.md sections)
  - Mermaid diagram regeneration from spawns fields
  - Changelog entry drafting with version bumping
  - SYNC-REPORT.md generation

**Target Documentation Files:**
- `docs/AGENTS.md` - 61 active agents (2 orchestrators, 30 leaders, 25 workers, 2 reference docs, 2 archived)
- `docs/COMMANDS.md` - Full command reference with workflow diagrams
- `docs/SKILLS.md` - 11 skills (8 worktree management, 3 code review/quality)
- `docs/workflow/phases.md` - Phase-by-phase workflow documentation
- `docs/workflow/agent-system.md` - Agent architecture and expert intelligence framework

### Reuse Candidates

**High-Priority Reuse:**
1. **doc-sync skill/agent pattern** - Proven 7-phase workflow for documentation synchronization
   - Phase 1: File Discovery (git diff + timestamp fallback)
   - Phase 2: Frontmatter Parsing (YAML extraction and validation)
   - Phase 3: Section Mapping (pattern-based routing)
   - Phase 4: Documentation Updates (Edit tool for surgical updates)
   - Phase 5: Mermaid Diagram Regeneration (from spawns field)
   - Phase 6: Changelog Entry Drafting (version bump logic)
   - Phase 7: Report Generation (SYNC-REPORT.md)

2. **Frontmatter parsing logic** - sed-based extraction between --- delimiters
3. **Error handling patterns** - Invalid YAML → skip file, add to manual_review_needed
4. **Version bump logic** - Major/Minor/Patch based on change type
5. **Pre-commit hook integration** - `--check-only` flag with exit codes

**New Requirements for WINT-0150:**
- Extend to read from **database** (workflow.phases, workflow.components tables) in addition to files
- Query current state from postgres-knowledgebase MCP server (when available)
- Support both file-based and database-driven workflows during migration
- Maintain backward compatibility with existing doc-sync skill

---

## Knowledge Context

### Lessons Learned
*No KB lessons available - Phase 0 bootstrap in progress. KB infrastructure (WINT-0010) and telemetry tools (WINT-0120) are prerequisites for lessons capture.*

### Blockers to Avoid (from past stories)
*No historical blockers available - this is a Phase 0 bootstrap story.*

### Architecture Decisions (ADRs)
*No ADR-LOG.md found at expected location `plans/stories/ADR-LOG.md`. ADR infrastructure not yet established for WINT epic.*

**Inferred Constraints from Baseline:**
- Drizzle ORM required for all database schemas
- Zod-first types mandatory across all packages
- MCP tools must align with postgres-knowledgebase MCP server API

### Patterns to Follow

**From existing doc-sync implementation:**
1. **7-phase workflow pattern** - Sequential phases with clear inputs/outputs
2. **Dual-mode operation** - Full sync vs check-only mode
3. **Graceful degradation** - Git unavailable → timestamp fallback
4. **Conservative updates** - Use Edit tool for surgical changes, preserve existing content on validation failure
5. **Comprehensive reporting** - SYNC-REPORT.md with manual_review_needed section

**From WINT stories index:**
1. **Phase 0 bootstrap pattern** - Untracked, prerequisite infrastructure work
2. **Story ID format** - WINT-{phase}{story}{variant} (e.g., WINT-0150 = Phase 0, Story 15, original)
3. **Dependency tracking** - Explicit "Depends On" field in index
4. **Status lifecycle** - pending → created → ready-to-work → in-progress → ready-for-qa → UAT → completed

### Patterns to Avoid
*No anti-patterns documented yet - Phase 0 bootstrap.*

---

## Conflict Analysis

**No conflicts detected.**

WINT-0150 has no dependencies (`Depends On: none`) and does not overlap with any active in-progress work. The existing doc-sync skill provides a proven implementation pattern to build upon.

---

## Story Seed

### Title
Create doc-sync Skill for Database-Driven Documentation Sync

### Description

**Context:**

The existing doc-sync skill (`.claude/skills/doc-sync/skill.md`) successfully synchronizes workflow documentation by reading `.agent.md` and `.command.md` files and updating `docs/workflow/` and top-level docs (AGENTS.md, COMMANDS.md, SKILLS.md). However, the WINT epic introduces database-driven workflow tracking, storing agent metadata, phase status, and component state in `postgres-knowledgebase` tables (workflow.phases, workflow.components, etc.).

**Problem:**

During the WINT migration (Phases 1-9), the workflow will operate in a **hybrid mode**: some metadata will exist in files, some in the database, and eventually all in the database. The current doc-sync skill cannot query the database, so it cannot maintain documentation accuracy during and after the migration.

**Solution Direction:**

Extend the doc-sync skill to support **dual-source synchronization**:
1. **Continue reading from files** - `.agent.md`, `.command.md`, `.skill.md` frontmatter
2. **Add database queries** - Query `workflow.phases`, `workflow.components`, and other WINT tables via postgres-knowledgebase MCP tools
3. **Merge sources** - Combine file-based and database metadata to build a complete view
4. **Update all targets** - AGENTS.md, COMMANDS.md, SKILLS.md, and docs/workflow/ files

The skill will use the existing 7-phase workflow pattern but enhance Phase 2 (Frontmatter Parsing) to include database queries and Phase 3 (Section Mapping) to handle database-sourced metadata.

### Initial Acceptance Criteria

- [ ] **AC-1: Database Query Integration**
  - Skill queries `workflow.phases` table for phase status and completion timestamps
  - Skill queries `workflow.components` table for agent/command/skill metadata
  - Queries are optional - skill degrades gracefully if database is unavailable
  - Database metadata merges with file frontmatter (database overrides if present)

- [ ] **AC-2: Extended Section Mapping**
  - Phase 3 mapping logic handles both file-sourced and database-sourced agents
  - Section mapping respects new WINT phase structure (Phase 0-9)
  - Unknown patterns flagged in manual_review_needed section of SYNC-REPORT.md

- [ ] **AC-3: AGENTS.md Updates**
  - Agent counts reflect current state (file + database agents)
  - Agent hierarchy table updated with WINT workflow agents
  - Model assignments reflect database overrides if present

- [ ] **AC-4: COMMANDS.md Updates**
  - Command reference includes new WINT workflow commands
  - Workflow diagram updated if new command relationships detected
  - Command-to-agent mappings reflect database state

- [ ] **AC-5: SKILLS.md Updates**
  - Skill registry includes doc-sync skill itself (self-documenting)
  - Skill descriptions reflect database-aware capabilities
  - WINT-related skills added to appropriate category

- [ ] **AC-6: docs/workflow/ Updates**
  - `phases.md` updated with WINT Phase 0-9 structure
  - `agent-system.md` updated with WINT agents if database-driven
  - Mermaid diagrams regenerated from spawns field OR database relationships

- [ ] **AC-7: Backward Compatibility**
  - Skill runs successfully with database unavailable (file-only mode)
  - Existing --check-only and --force flags work unchanged
  - SYNC-REPORT.md format unchanged, adds database query section if used

- [ ] **AC-8: Documentation**
  - Skill documentation (`.claude/skills/doc-sync/skill.md`) updated with database query examples
  - Phase 2 (Frontmatter Parsing) section documents database queries
  - New examples show database + file hybrid sync scenarios

### Non-Goals

**Explicitly Out of Scope:**
1. **Automatic database writes** - Skill is read-only for database; updates to database are handled by other WINT stories (e.g., WINT-0090 story management MCP tools)
2. **Real-time sync** - No watch mode or continuous sync; remains on-demand or pre-commit hook triggered
3. **Migration logic** - Does not migrate data from files to database; migration is handled by WINT-1030, WINT-1080, etc.
4. **Schema validation** - Does not validate database schema correctness; assumes schemas are already applied
5. **MCP tool creation** - Does not create new MCP tools; uses existing postgres-knowledgebase MCP tools created by WINT stories

**Protected Features Not to Touch:**
- Existing doc-sync.agent.md implementation (extend, don't replace)
- Pre-commit hook integration pattern
- SYNC-REPORT.md format (extend, don't break)
- Existing 7-phase workflow structure (enhance Phase 2/3, keep rest)

**Deferred Work:**
- **Phase 2+ enhancements** - Context cache queries (WINT-2030-2060), telemetry queries (WINT-3020-3050), ML pipeline queries (WINT-5040-5100) are Phase 2+ features
- **Watch mode** - Future enhancement documented in existing doc-sync agent
- **Mermaid-cli integration** - Future enhancement already documented

### Reuse Plan

**Components to Reuse:**
1. **Existing doc-sync skill structure** - Keep all 7 phases, enhance Phase 2 and Phase 3
2. **doc-sync.agent.md** - Worker agent implementation pattern (haiku model, Read/Grep/Glob/Write/Edit/Bash tools)
3. **Frontmatter parsing logic** - sed-based YAML extraction (reuse as-is)
4. **Version bump logic** - Major/Minor/Patch determination (reuse as-is)
5. **Error handling patterns** - Invalid YAML → skip file, add to manual_review_needed (reuse as-is)

**Patterns to Follow:**
1. **Dual-source pattern** - Query database first, fall back to files if unavailable
2. **Graceful degradation** - Database queries optional, skill works without them
3. **Conservative updates** - Use Edit tool for surgical changes to preserve formatting
4. **Comprehensive reporting** - Extend SYNC-REPORT.md with database query status

**Packages to Leverage:**
- `@repo/logger` for logging database query attempts and failures
- postgres-knowledgebase MCP tools (when available) for database queries
- Existing Bash/Read/Grep/Glob tools for file operations

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Testing Context:**
- **Database availability scenarios** - Test with postgres-knowledgebase available and unavailable
- **Hybrid data scenarios** - Test with metadata in files only, database only, and both (merge logic)
- **Backward compatibility** - Verify existing pre-commit hook integration still works
- **Error scenarios** - Invalid database responses, MCP tool failures, connection timeouts

**Test Artifacts Required:**
- Fixture with sample database state (workflow.phases, workflow.components populated)
- Fixture with file-only scenario (no database)
- Fixture with conflicting metadata (file says v1.0.0, database says v1.1.0 - database wins)
- Pre-commit hook test scenario

**Acceptance Criteria Testing:**
- AC-1: Database query integration - Requires postgres-knowledgebase MCP server running
- AC-2-6: Documentation updates - File diff comparison before/after
- AC-7: Backward compatibility - Run with database down, verify no errors
- AC-8: Documentation - Manual review of skill.md updates

### For UI/UX Advisor

**Not applicable** - This is a backend/documentation skill with no user-facing UI. The skill is invoked via command line (`/doc-sync`) and outputs markdown files.

### For Dev Feasibility

**Implementation Context:**
- **Database schema dependency** - Story depends on WINT-0070 (workflow.phases, workflow.components tables) for full functionality, but should work without it
- **MCP tool availability** - Assumes postgres-knowledgebase MCP server provides workflow table query tools (created by WINT-0080 seed data or later stories)
- **Migration timeline** - Phase 0 story, should complete before Phase 1 (directory flattening) to support documentation during migration

**Technical Constraints:**
- **Haiku model** - Existing doc-sync agent uses haiku for fast text processing; maintain this for performance
- **Tool access** - Agent needs Read, Grep, Glob, Write, Edit, Bash tools (already granted)
- **MCP tool access** - Need to add postgres-knowledgebase MCP tools to allowed tools list

**Implementation Risks:**
- **Database schema changes** - If WINT workflow schema evolves during Phases 1-9, queries may need updates
- **Query performance** - If workflow tables grow large, queries may slow down; need indexing strategy
- **Merge conflicts** - File metadata vs database metadata conflict resolution logic must be clear and documented

**Estimated Complexity:**
- **Low-Medium** - Extends proven pattern (doc-sync) with database queries; no new workflow phases
- **Dependencies** - WINT-0070 (workflow tables) is logical dependency but not blocking (graceful degradation)
- **Integration points** - postgres-knowledgebase MCP server (read-only queries)

**Recommended Approach:**
1. **Phase 1: Extend Agent Metadata** - Add postgres-knowledgebase MCP tools to doc-sync.agent.md frontmatter
2. **Phase 2: Enhance Phase 2 Logic** - Add database query step after file parsing, merge results
3. **Phase 3: Update Documentation** - Extend skill.md with database query examples and error handling
4. **Phase 4: Test Scenarios** - Verify file-only, database-only, and hybrid modes
5. **Phase 5: Pre-commit Hook** - Ensure --check-only mode works with database queries

**Token Budget Estimate:**
- Input: ~10,000-15,000 tokens (existing doc-sync ~5,000-10,000, database queries add ~5,000)
- Output: ~3,000-6,000 tokens (SYNC-REPORT.md + updated docs)
- Total per run: ~13,000-21,000 tokens (haiku, acceptable)
