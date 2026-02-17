# Future Opportunities - WINT-0080

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Seed script does not handle agent version history | Low | Medium | Future story: Track agent version changes over time for telemetry/ML training |
| 2 | No validation of agent frontmatter against expected schema | Low | Low | Add Zod schema for agent frontmatter and validate during parsing |
| 3 | No deduplication if same agent/command/skill appears in multiple locations | Low | Low | Add uniqueness check by name before insert |
| 4 | Command metadata extraction strategy not specified | Medium | Medium | Define what metadata to extract from command files (triggers, description, permissions) |
| 5 | Skill metadata extraction strategy not specified | Medium | Medium | Define what metadata to extract from skill directories (capabilities, dependencies) |
| 6 | No performance benchmarking for 205+ inserts in single transaction | Low | Low | Add timing metrics to seed script, optimize if > 5 seconds |
| 7 | No rollback/undo mechanism for seed data | Low | Medium | Add `pnpm seed:wint:reset` command to truncate seeded tables |
| 8 | Seed data versioning not addressed | Low | Medium | Track seed data version in database (e.g., `wint.seed_metadata` table) |
| 9 | No incremental seed updates (delta mode) | Medium | High | Future story WINT-0087: Add delta update capability for new/changed files only |
| 10 | Hardcoded capabilities list may diverge from user-flows.schema.json | Medium | Low | Generate capabilities from schema file instead of hardcoding |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Seed script could generate TypeScript types from parsed data | Medium | Medium | Export seeded data as const arrays for type-safe references in code |
| 2 | Could add agent dependency graph (spawned_by relationships) | High | High | Future story: Build agent dependency graph from spawned_by metadata |
| 3 | Could add agent→skill→command relationship tracking | High | High | Future story: Build full relationship graph for workflow analysis |
| 4 | Could add agent permission level analytics | Medium | Low | Dashboard showing permission level distribution (docs-only vs admin) |
| 5 | Could add model usage analytics | Medium | Low | Dashboard showing which models are used by which agent types |
| 6 | Could validate agent triggers against actual command names | High | Medium | Cross-reference agent triggers with command inventory for broken references |
| 7 | Could add agent test coverage metrics | Medium | High | Track which agents have test files, report coverage gaps |
| 8 | Could add agent last-used timestamp | Medium | Medium | Future story: Track agent invocation timestamps for deprecation analysis |
| 9 | Could add seed data export to JSON for documentation | Low | Low | Generate agent/command/skill inventory docs from database |
| 10 | Could add seed data validation against reality baseline | High | Medium | Compare seeded counts against BASELINE-REALITY-*.md files for drift detection |

## Categories

- **Edge Cases**:
  - Empty agent directory (AC-3 handles gracefully)
  - Agent with minimal frontmatter (AC-3 handles with null values)
  - Malformed YAML frontmatter (AC-3 logs warning, continues)

- **UX Polish**:
  - Progress bars for seeding operations
  - Summary report with warnings/errors grouped by severity
  - Dry-run mode visualization showing what would be seeded

- **Performance**:
  - Batch inserts in chunks of 50 for large inventories
  - Parallel parsing of agent/command/skill files
  - Streaming parser for very large frontmatter files

- **Observability**:
  - Seed operation telemetry (duration, rows inserted, warnings)
  - Metrics on frontmatter format diversity (for standardization efforts)
  - Alerting if agent count changes significantly between seed runs

- **Integrations**:
  - Integration with doc-sync skill (WINT-0150) to auto-update docs after seed
  - Integration with weekly-analyst agent (WINT-6060) for inventory drift analysis
  - Integration with git hooks to re-seed on agent/command/skill changes

## Reality Baseline Reconciliation

**Current Discrepancies (from file system reality check):**
- Agents: Story says 143 (✅ correct), stories.index.md says 115 (⚠️ outdated)
- Commands: Story says 33 (✅ correct), stories.index.md says 28 (⚠️ outdated)
- Skills: Story says 14 (✅ correct), stories.index.md says 13 (⚠️ outdated)

**Recommendation**: Update stories.index.md reality baseline section (lines 47-56) with current counts OR update story description to match index.

## Schema Design Recommendations

**Agent Table (Proposed):**
```sql
CREATE TABLE wint.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  agent_type TEXT NOT NULL, -- 'worker', 'leader', 'orchestrator'
  permission_level TEXT NOT NULL, -- 'docs-only', 'read-only', 'read-write', 'admin'
  model TEXT, -- 'haiku', 'sonnet', 'opus'
  spawned_by TEXT[], -- array of parent agent names
  triggers TEXT[], -- array of command/event triggers
  skills_used TEXT[], -- array of skill names
  metadata JSONB, -- raw frontmatter
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Command Table (Proposed):**
```sql
CREATE TABLE wint.commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  triggers TEXT[], -- array of trigger patterns
  metadata JSONB, -- raw frontmatter/metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Skill Table (Proposed):**
```sql
CREATE TABLE wint.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  capabilities TEXT[], -- array of capability names
  metadata JSONB, -- raw metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Phases Table (WINT-0070, if not exists):**
```sql
CREATE TABLE wint.phases (
  id INTEGER PRIMARY KEY, -- 0-7
  phase_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

These schemas should be added to `packages/backend/database-schema/src/schema/unified-wint.ts` as a prerequisite for WINT-0080 implementation.
