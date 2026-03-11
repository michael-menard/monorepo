---
generated: "2026-03-02"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: false
conflicts_found: 3
blocking_conflicts: 0
---

# Story Seed: WINT-2040

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No ADR-LOG.md found (ADRs not loaded); no KB lessons available in current context

### Relevant Existing Features

| Feature | Location | Status |
|---------|----------|--------|
| `wint.contextPacks` table | `packages/backend/database-schema/src/schema/wint.ts` | Deployed (WINT-0010, protected) |
| `contextPackTypeEnum` | `wint.ts` — values: codebase, story, feature, epic, architecture, lessons_learned, test_patterns | Active — agent_missions not yet a valid pack type |
| `context_cache_get` MCP tool | `packages/backend/mcp-tools/src/context-cache/context-cache-get.ts` | Implemented and in UAT (WINT-0100) |
| `context_cache_put` MCP tool | `packages/backend/mcp-tools/src/context-cache/context-cache-put.ts` | Implemented and in UAT (WINT-0100) |
| `context_cache_invalidate` MCP tool | `packages/backend/mcp-tools/src/context-cache/context-cache-invalidate.ts` | Implemented and in UAT (WINT-0100) |
| `context_cache_stats` MCP tool | `packages/backend/mcp-tools/src/context-cache/context-cache-stats.ts` | Implemented and in UAT (WINT-0100) |
| Agent frontmatter parser | `packages/backend/database-schema/src/seed/parsers/frontmatter-parser.ts` | Deployed (WINT-0080) — uses `gray-matter` |
| Agent metadata extractor | `packages/backend/database-schema/src/seed/parsers/metadata-extractor.ts` | Deployed (WINT-0080) — Zod-validated |
| Agent seeder | `packages/backend/database-schema/src/seed/agent-seeder.ts` | Deployed (WINT-0080) — seeds `wint.agents` table |
| `wint.agents` table | `packages/backend/database-schema/src/schema/wint.ts` | Deployed (WINT-0080); contains agent name, type, permissionLevel, model, spawnedBy, triggers, skillsUsed, metadata |
| .agent.md files | `.claude/agents/` | 142 non-archived agent files present |
| Context Pack types schema | `packages/backend/mcp-tools/src/context-cache/__types__/index.ts` | Active — `ContextCachePutInputSchema` with Zod validation |

### Active In-Progress Work

| Story | Status | Potential Overlap |
|-------|--------|-------------------|
| WINT-0100 (Context Cache MCP Tools) | UAT | Provides the `context_cache_put` tool this story consumes — dependency, not conflict |
| WINT-0030 (Context Cache Tables) | pending | Provides `wint.context_packs` schema — dependency, not conflict |
| WINT-2020 (Context Pack Sidecar) | pending (backlog) | Provides sidecar endpoint — dependency, not conflict |
| WINT-2030 (Populate Project Context Cache) | pending (backlog) | Sibling story, same infrastructure pattern, parallel execution possible |
| WINT-2070 (Cache Warming Strategy) | pending | Blocked on this story completing |

### Constraints to Respect

| Constraint | Source | Impact |
|------------|--------|--------|
| `wint.contextPacks` table schema is a protected feature | WINT-0010 baseline | DO NOT modify table structure |
| `contextPackTypeEnum` currently has no `agent_missions` value | `wint.ts` | Implementor must determine whether to use an existing pack type (e.g., `codebase`) with a key convention, or add a new enum value via migration |
| Zod-first types — no TypeScript interfaces | CLAUDE.md | All types via `z.infer<>` |
| No barrel files | CLAUDE.md | Import directly from source |
| `@repo/logger` for logging (no `console.log`) | CLAUDE.md | Must be followed in all new code |
| `gray-matter` library already available | `packages/backend/database-schema` | Reuse existing parser |
| Dependencies WINT-2020 and WINT-0030 are pending | stories.index.md | Story cannot fully integrate with sidecar yet; populate cache directly via MCP tools or DB insert |

---

## Retrieved Context

### Related Endpoints

None — this story is a data-population script/utility, not an API endpoint. The output feeds `wint.context_packs` which is then served by the Context Pack Sidecar (WINT-2020) once that story completes.

### Related Components

| Component | Location | Relevance |
|-----------|----------|-----------|
| `contextCachePut` | `packages/backend/mcp-tools/src/context-cache/context-cache-put.ts` | Primary write mechanism for agent mission cache entries |
| `contextCacheGet` | `packages/backend/mcp-tools/src/context-cache/context-cache-get.ts` | Used to check for existing cache entries before re-populating |
| `parseFrontmatter` | `packages/backend/database-schema/src/seed/parsers/frontmatter-parser.ts` | Parse YAML frontmatter from .agent.md files |
| `extractAgentMetadata` | `packages/backend/database-schema/src/seed/parsers/metadata-extractor.ts` | Extract structured fields (name, type, permissionLevel, model, spawnedBy, triggers, skillsUsed) |
| `AgentMetadataSchema` | `packages/backend/database-schema/src/seed/parsers/metadata-extractor.ts` | Zod schema for validated agent frontmatter |
| `wint.agents` table | `packages/backend/database-schema/src/schema/wint.ts` | Already seeded with agent identity data — can be used as source instead of re-parsing |
| `contextPacks` | `packages/backend/database-schema/src/schema/wint.ts` | Target table for mission cache entries |
| `ContextCachePutInputSchema` | `packages/backend/mcp-tools/src/context-cache/__types__/index.ts` | Zod validation schema for cache put operations |

### Reuse Candidates

- **`parseFrontmatter` + `extractAgentMetadata`**: Parsing is already done and tested from WINT-0080; reuse as-is
- **`glob` pattern for `.agent.md` discovery**: Already established in `agent-seeder.ts` — use same pattern `**/*.agent.md` with `_archive` exclusion
- **`contextCachePut` upsert pattern**: Ready-made upsert with `onConflictDoUpdate` via `(packType, packKey)` composite unique key
- **Drizzle ORM transaction pattern**: Use same `tx.insert().onConflictDoUpdate()` idiom from `agent-seeder.ts`
- **Seed script pattern**: Model after `packages/backend/database-schema/src/seed/agent-seeder.ts` for population scripts
- **`gray-matter` library**: Already a project dependency (used in WINT-0080 parsers)

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| .agent.md frontmatter parsing | `packages/backend/database-schema/src/seed/parsers/metadata-extractor.ts` | Established Zod-validated extraction of all relevant agent fields; handles diverse frontmatter formats |
| Context cache upsert | `packages/backend/mcp-tools/src/context-cache/context-cache-put.ts` | Clean upsert with Zod validation, TTL, hitCount reset, `onConflictDoUpdate` on `(packType, packKey)` |
| Seed script structure | `packages/backend/database-schema/src/seed/agent-seeder.ts` | glob discovery, Zod validation loop with warnings, idempotent upsert, SeedResult return type |
| Zod input types | `packages/backend/mcp-tools/src/context-cache/__types__/index.ts` | `ContextCachePutInputSchema` with `packType` enum and content validation |

---

## Knowledge Context

### Lessons Learned

KB search was not available in this context. The following are inferred from WINT-0080 evidence and the story's risk notes:

- **[WINT-0080]** Agent frontmatter formats vary significantly across agents — some have `model`, `spawned_by`, `triggers`, `skills_used`, `mcp_tools`, `tools`, etc.; others have minimal frontmatter. The extractor must use `.optional()` chains and never assume field presence. (*category: blocker*)
  - *Applies because*: WINT-2040 extends parsing to extract mission/scope/signals from agent body content (beyond frontmatter), which is even more varied.

- **[WINT-0080]** Idempotency is critical for seed/population scripts — running twice must be safe. The upsert pattern via `onConflictDoUpdate` is the established solution. (*category: pattern*)
  - *Applies because*: WINT-2040 populates a cache that may be re-run as agents are added or updated.

- **[WINT-0080]** Exclude `_archive/` directory when globbing for active agents. Archived agents should not be populated into the mission cache. (*category: blocker*)
  - *Applies because*: The glob `**/*.agent.md` from `.claude/agents/` will match `_archive/` files unless explicitly excluded.

### Blockers to Avoid (from past stories)

- Assuming all agent files have the same frontmatter structure — use `z.optional()` liberally
- Forgetting to exclude `_archive/` agents from the glob pattern
- Writing to the cache without a clear `packKey` convention — establish a deterministic key (e.g., agent name without `.agent.md` extension)
- Using `console.log` instead of `@repo/logger`
- Creating TypeScript interfaces instead of Zod schemas for new types
- Using barrel file re-exports

### Architecture Decisions (ADRs)

No ADR-LOG.md found. Operating without formal ADR constraints.

| ADR | Title | Constraint |
|-----|-------|------------|
| N/A | Zod-first types | Per CLAUDE.md: all types via `z.infer<>`, no interfaces |
| N/A | No barrel files | Per CLAUDE.md: import directly from source |

### Patterns to Follow

- Parse mission/scope from agent body content using regex or section extraction (not YAML-only)
- Validate extracted mission data with a Zod schema before writing to cache
- Use `contextCachePut` with a deterministic `packKey` (agent name derived from filename) and a defined `packType`
- Run population script as a standalone Node.js script (not a Lambda handler) to avoid timeout concerns
- Return a result object with counts: parsed, written, skipped, failed

### Patterns to Avoid

- Do NOT read the `wint.agents` table as a substitute for re-parsing `.agent.md` files — the DB table lacks the mission/scope body content that is the primary value of this cache
- Do NOT hard-code agent file paths — use glob discovery
- Do NOT fail the entire run on a single agent parse error — collect warnings and continue

---

## Conflict Analysis

### Conflict: dependency_not_satisfied (WINT-2020)
- **Severity**: warning
- **Description**: WINT-2020 (Context Pack Sidecar) is pending and not yet implemented. The index entry states this story depends on WINT-2020, but the actual cache population can proceed independently using `contextCachePut` directly. The sidecar is needed for agents to *retrieve* mission context via HTTP, not to write it.
- **Resolution Hint**: Proceed with direct `contextCachePut` writes. The implementation is self-contained. When WINT-2020 delivers the sidecar, agents can read via the sidecar endpoint; no change needed to the cache data populated here.

### Conflict: dependency_not_satisfied (WINT-0030)
- **Severity**: warning
- **Description**: WINT-0030 (Context Cache Tables) is still pending. However, `wint.context_packs` was created by WINT-0010 (completed) and is deployed. WINT-0030 creates *additional* tables (`context_sessions`, etc.) but `context_packs` itself already exists and the MCP tools in WINT-0100 target it directly.
- **Resolution Hint**: The `wint.context_packs` table and `contextCachePut` are available today. Verify table exists before implementation begins. The dependency on WINT-0030 in the index may be overly conservative.

### Conflict: schema_gap (agent_missions pack type)
- **Severity**: warning
- **Description**: The `contextPackTypeEnum` in `wint.ts` does not include an `agent_missions` value. The story goal references `context_cache.agent_missions`, but the current enum values are: `codebase`, `story`, `feature`, `epic`, `architecture`, `lessons_learned`, `test_patterns`. Writing with a non-enum pack type will cause a Drizzle/PostgreSQL type error.
- **Resolution Hint**: Two options — (a) add `agent_missions` to the enum via a new database migration and update `wint.ts`, or (b) use an existing pack type (e.g., `architecture`) with a `packKey` convention like `agent_mission:{agent_name}`. Option (a) is cleaner and more semantically correct but requires a migration. Dev feasibility should decide. This is a non-blocking warning for seed generation but becomes blocking at implementation time.

---

## Story Seed

### Title

Populate Agent Mission Cache — Parse .agent.md Files and Populate context_packs

### Description

**Context**: The WINT workflow has 142 active agent files in `.claude/agents/`. Each agent has a defined mission, scope, and signals documented in its `.agent.md` body content and YAML frontmatter. Currently, when an agent needs to know what another agent does (e.g., to decide which sub-agent to spawn), it must either load the target agent's full file or operate without that knowledge.

The `wint.context_packs` table (WINT-0010) and `contextCachePut` MCP tool (WINT-0100) provide a database-backed cache for exactly this use case. WINT-0080 already established the infrastructure to parse agent frontmatter and the `wint.agents` table stores identity-level data. However, no story has yet extracted the richer mission/scope/signals content from agent files and stored it in the context cache for fast retrieval.

**Problem**: Agent mission context is not available for sub-5-token retrieval. Every invocation that needs another agent's context must either read the filesystem (slow, costs tokens for the full file) or operate blind. At scale with 80%+ token reduction targets (WINT-2120), this is a critical gap.

**Proposed Solution**: Create an `agent-mission-cache-populator` script (in `packages/backend/database-schema/src/seed/` or a new `packages/backend/wint-cache-populate/` package) that:
1. Discovers all non-archived `.agent.md` files via glob
2. Parses frontmatter (reusing `parseFrontmatter` + `extractAgentMetadata` from WINT-0080)
3. Extracts mission/scope/signals from the agent body content (the H2/H3 sections: "Mission", "Role", "Scope", "Signals/Triggers")
4. Constructs a compact (<300 token) agent mission summary per agent
5. Writes each summary to `wint.context_packs` via `contextCachePut` (or direct DB upsert) with a deterministic key convention
6. Reports: total files found, successfully cached, skipped (parse errors), warnings

The implementor must also resolve the `agent_missions` pack type gap (either add enum value via migration or adopt a `packKey` convention with an existing pack type).

### Initial Acceptance Criteria

- [ ] AC-1: A population script exists that discovers all non-archived `.agent.md` files from `.claude/agents/` using glob (excluding `_archive/` directory)
- [ ] AC-2: The script extracts the following fields per agent: name (from filename), type, permission_level, model, spawned_by, triggers, skills_used (from frontmatter via `extractAgentMetadata`), plus mission summary and scope extracted from the body Markdown content
- [ ] AC-3: Each agent mission is stored in `wint.context_packs` with: a deterministic `packKey` (agent name without extension), a defined `packType` (either a new `agent_missions` enum value or an agreed existing type), and a `content` JSONB object containing the mission summary, scope, signals/triggers, and model
- [ ] AC-4: The script is idempotent — running it twice does not create duplicate entries (upsert via `onConflictDoUpdate` on `packType + packKey`)
- [ ] AC-5: Agents that fail to parse (malformed frontmatter, missing required fields) are skipped with a warning logged via `@repo/logger`; the script continues to process remaining agents
- [ ] AC-6: The `_archive/` directory is explicitly excluded from processing
- [ ] AC-7: All input/output types are Zod-validated schemas (no TypeScript interfaces)
- [ ] AC-8: The script produces a summary result: total found, cached, skipped, warnings
- [ ] AC-9: At least 130 of 142 agent files are successfully cached when the script runs against the live `.claude/agents/` directory (>=90% success rate)
- [ ] AC-10: Unit tests cover: frontmatter extraction, body content mission parsing, upsert behavior (mock DB), error handling for malformed files, archive exclusion
- [ ] AC-11: If a new `agent_missions` enum value is added, a database migration is created and the `wint.ts` schema is updated — OR a documented decision exists explaining use of an existing pack type with key convention

### Non-Goals

- Do NOT build an HTTP endpoint — this is a population script, not a sidecar (that is WINT-2020)
- Do NOT modify the `.agent.md` files themselves
- Do NOT modify the `wint.agents` table schema or seeder (WINT-0080 is a protected story outcome)
- Do NOT build the cache-warming orchestration — that is WINT-2070
- Do NOT implement cache retrieval for agents — that is WINT-2110 (Update 5 High-Volume Agents to Use Cache)
- Do NOT deep-index the full agent body content — extract a compact summary only (<300 tokens per entry)
- Do NOT break existing context cache MCP tools or their tests

### Reuse Plan

- **Components**: `parseFrontmatter` from `packages/backend/database-schema/src/seed/parsers/frontmatter-parser.ts`; `extractAgentMetadata` + `AgentMetadataSchema` from `metadata-extractor.ts`; `contextCachePut` from `packages/backend/mcp-tools/src/context-cache/context-cache-put.ts`
- **Patterns**: `agent-seeder.ts` glob + Zod + upsert structure; `SeedResult` return type from `phase-seeder.ts`
- **Packages**: `gray-matter` (already installed in database-schema package); `@repo/logger`; `@repo/db`; `@repo/database-schema`; `glob` (already used in seed scripts)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- The primary test challenge is the body content parser — "Mission" and "Role" sections use varied formats across agents (some use `##`, some `###`, some have no headings). Tests should cover: standard format, minimal format (frontmatter-only), legacy format (no "Mission" heading), and archived agent exclusion.
- Integration test should run against the live `.claude/agents/` directory and assert >=90% success rate.
- The idempotency test is critical: run twice, assert no duplicate rows and `hitCount` behavior remains correct.
- Test the schema gap resolution decision: if a migration is added, test that the enum value is accepted; if key convention is used, test the key format is consistent.
- Use Vitest + mock DB (`vi.mock('@repo/db')`) for unit tests; use the live KB PostgreSQL (port 5433) for integration tests, consistent with WINT-0100 pattern.

### For UI/UX Advisor

- No UI/UX surface for this story — it is a backend data population script only.
- The only human-facing output is the script's console/log output. Recommend structured log output (JSON lines via `@repo/logger`) rather than plain text for integration with observability tools.

### For Dev Feasibility

- **Key decision required upfront**: How to handle the `agent_missions` pack type gap. Option A (add enum value via migration) is recommended — it's explicit, type-safe, and consistent with how other pack types work. The migration adds one value to a PostgreSQL enum, which is a low-risk `ALTER TYPE ... ADD VALUE` operation. Option B (use `architecture` or `codebase` with key convention) avoids a migration but creates semantic confusion.
- **Body content parsing approach**: A simple regex/string extraction for `## Mission`, `## Role`, `## Scope` sections from the agent Markdown body will cover >90% of cases. A more sophisticated parser is not needed. The `gray-matter` library already strips the frontmatter and returns the body; parse the body with `extractSection(body, 'Mission')` or similar.
- **Where to put the script**: Option A — extend `packages/backend/database-schema/src/seed/` with an `agent-mission-cache-populator.ts` file (mirrors `agent-seeder.ts` pattern). Option B — create a new `packages/backend/wint-cache-populate/` package. Option A is lower friction since all dependencies are already available in that package.
- **Source data**: Read directly from `.claude/agents/` filesystem (not from `wint.agents` DB table), because the body content (mission/scope) is not stored in the DB — only frontmatter metadata is.
- **Token budget per entry**: Target <300 tokens per cache entry. For context: a typical "Mission" section is 50–150 tokens. Include: mission (truncated at 200 chars), role, triggers array, model, permission_level, spawned_by. JSONB structure: `{ mission, role, scope, triggers, model, permissionLevel, spawnedBy }`.
- **Canonical references for subtask decomposition**:
  - Subtask 1 (Schema migration): `packages/backend/database-schema/src/schema/wint.ts` — add `agent_missions` to enum, write migration
  - Subtask 2 (Body parser): New file, pattern from `metadata-extractor.ts` + section regex
  - Subtask 3 (Populator script): Pattern from `agent-seeder.ts`
  - Subtask 4 (Tests): Pattern from `packages/backend/database-schema/src/seed/__tests__/agent-seeder.test.ts`
