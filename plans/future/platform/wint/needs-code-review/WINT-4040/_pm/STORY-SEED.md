---
generated: "2026-03-08"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: WINT-4040

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates WINT-4010 (cohesion sidecar) and WINT-4030 (populate-graph-features) implementation; their current status (failed-code-review and needs-code-review respectively) is inferred from the stories index, not the baseline.

### Relevant Existing Features

| Feature | Status | Relevance |
|---------|--------|-----------|
| `graph.capabilities` table | deployed (WINT-0060, WINT-0131) | Primary write target for inferred capabilities |
| `graph.features` table | deployed (WINT-0060) | Source of feature IDs to link capabilities to |
| `graph.feature_capabilities` linkage | deployed via FK `capabilities.feature_id` (WINT-0131) | The join mechanism WINT-4040 must populate |
| `graph_get_capability_coverage` MCP tool | deployed (WINT-0131) | Reads the exact data WINT-4040 must write |
| `graph_get_franken_features` MCP tool | deployed (WINT-0131) | Consumer of capability data; reports missing CRUD stages |
| `computeAudit()` in cohesion sidecar | deployed (WINT-4010, failed-code-review) | Uses `leftJoin(capabilities, ...)` to detect franken-features — directly depends on data WINT-4040 produces |
| Populate scripts pattern | established (WINT-2030, WINT-2050, WINT-2060, WINT-4030) | Script-based one-shot population is the established pattern for seeding graph data |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| WINT-4010 | failed-code-review | Low. WINT-4040 depends on WINT-4010 per index, but the cohesion sidecar reads the data WINT-4040 produces — it does not produce it. No shared write targets. |
| WINT-4030 | needs-code-review | Medium. WINT-4030 populates `graph.features` and `graph.epics` (the feature rows WINT-4040 will link capabilities to). WINT-4040 must wait until WINT-4030 is merged so feature rows exist to link against. |

### Constraints to Respect

- `graph.capabilities` table schema: `capability_name` is UNIQUE and NOT NULL. Any insert must deduplicate by name.
- `capabilities.feature_id` is a nullable FK to `graph.features.id`. Inference script must resolve feature UUID from feature name before inserting.
- `capabilities.lifecycle_stage` is the CRUD discriminator used by `graph_get_franken_features` and `computeAudit()`. Values must be one of: `create`, `read`, `update`, `delete` — app-enforced, not a DB enum.
- The `graph.features` table is populated by WINT-4030. WINT-4040 inference script must not create new feature rows — only link capabilities to existing ones.
- Protected: All production DB schemas in `packages/backend/database-schema/` — no schema changes permitted by this story.

---

## Retrieved Context

### Related Endpoints

This story is a backend script only — no HTTP endpoints involved. The story produces database rows consumed by:
- `POST /cohesion/audit` (cohesion sidecar, WINT-4010)
- `POST /cohesion/check` (cohesion sidecar, WINT-4010)
- `graph_get_capability_coverage` MCP tool
- `graph_get_franken_features` MCP tool

### Related Components

| Component | Path | Role |
|-----------|------|------|
| `computeAudit()` | `packages/backend/sidecars/cohesion/src/compute-audit.ts` | Primary consumer of the data this story writes |
| `graph_get_franken_features` | `packages/backend/mcp-tools/src/graph-query/graph-get-franken-features.ts` | Secondary consumer — uses `lifecycleStage` field |
| `graph_get_capability_coverage` | `packages/backend/mcp-tools/src/graph-query/graph-get-capability-coverage.ts` | Secondary consumer |
| `capabilities` schema export | `packages/backend/database-schema/src/schema/wint.ts` | Drizzle table definition for write target |
| `features` schema export | `packages/backend/database-schema/src/schema/wint.ts` | Drizzle table for feature UUID lookups |

### Reuse Candidates

| Candidate | Path | How to Reuse |
|-----------|------|--------------|
| Populate script structure (dependency injection pattern) | `packages/backend/mcp-tools/src/scripts/populate-domain-kb.ts` | Follow the `contextCachePutFn` injectable parameter pattern for testability; use `PopulateResultSchema` for structured output |
| Populate script structure (library cache variant) | `packages/backend/mcp-tools/src/scripts/populate-library-cache.ts` | Secondary reference for pattern consistency |
| `@repo/db` client | `packages/backend/db/` | Provides `db`, `getPool()`, `closePool()`, `testConnection()` |
| `@repo/database-schema` exports | `packages/backend/database-schema/src/schema/wint.ts` | Provides `capabilities`, `features` Drizzle table objects and `InsertCapability` type |
| `@repo/logger` | `packages/core/logger/` | Required for all logging — no console.log |
| WINT-4030 populate-graph-features.ts | `packages/backend/mcp-tools/src/scripts/` (pending merge) | Immediate precedent for graph population scripts; follow its structure for the capability inference equivalent |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Populate script with dependency injection | `packages/backend/mcp-tools/src/scripts/populate-domain-kb.ts` | Clean Zod result schema, injectable write fn, MONOREPO_ROOT resolve, TTL constants — canonical populate script structure |
| Drizzle insert into graph table with feature FK | `packages/backend/sidecars/cohesion/src/compute-audit.ts` | Demonstrates leftJoin(capabilities, featureId FK) query pattern; inverse of the insert WINT-4040 must perform |
| Capability coverage read pattern (to validate writes) | `packages/backend/mcp-tools/src/graph-query/graph-get-capability-coverage.ts` | Shows the exact query that will verify WINT-4040's output; use as acceptance test oracle |

---

## Knowledge Context

### Lessons Learned

- **[WINT-2030/2050/2060]** Dependency injection for testable scripts: Accept an optional injectable `dbFn` parameter in the main populate function. Unit tests pass `vi.fn()` mocks; production code uses real Drizzle client. Avoids the need for a live PostgreSQL instance in unit tests.
  - *Applies because*: WINT-4040 requires a populate script that writes to the database. Same injection pattern is mandatory here.

- **[WINT-2060]** Extract shared populate-utils module when 3+ populate scripts exist: Three utilities are being copied — `PopulateResultSchema`, `readDoc()`, `extractSections()`. If WINT-4040 copies them again, this becomes technical debt. A shared `populate-utils.ts` should be considered.
  - *Applies because*: WINT-4040 is the 4th populate script. Check whether `populate-utils.ts` was created by WINT-4030 first; if so, import from it.

- **[WINT-4010, WINT-4030]** Graph population scripts must not create feature rows: Features are the source of truth managed by WINT-4030. Capability inference inserts into `graph.capabilities` and links via `feature_id` FK — it never inserts new `graph.features` rows.
  - *Applies because*: The inference script must look up existing feature UUIDs before inserting capabilities.

- **[OPP-01, WINT-4010]** Import types from `@repo/mcp-tools` rather than redeclaring: `FrankenFeatureItemSchema`, `CapabilityCoverageOutputSchema` are already exported from the graph-query module. Reuse them rather than defining parallel types.
  - *Applies because*: WINT-4040 may need these types for validation output reporting.

### Blockers to Avoid (from past stories)

- Attempting to populate capabilities before `graph.features` rows exist (WINT-4030 must be merged first)
- Inserting rows without deduplication — `capability_name` has a UNIQUE constraint and will throw on duplicate
- Using `innerJoin` instead of `leftJoin` when querying features+capabilities — misses features with zero capabilities (learned from WINT-4010 CR-1 fix)
- Hardcoding lifecycle stage values outside the `['create', 'read', 'update', 'delete']` set — these are the only values the consumers (`graph_get_franken_features`, `computeAudit`) recognize
- Writing raw SQL instead of Drizzle ORM (security requirement from WINT-0130 AC-7: parameterized queries mandatory)

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | UAT must use real services, not mocks; unit tests use injected mocks |

ADR-001 (API paths), ADR-002 (infra), ADR-003 (images), ADR-004 (auth), ADR-006 (E2E) — not applicable to this backend script story.

### Patterns to Follow

- Zod-first types: all schemas defined with `z.object(...)`, types inferred with `z.infer<>`
- Dependency injection for testability: `dbInsertFn?: (rows: InsertCapability[]) => Promise<void>` parameter
- `@repo/logger` for all logging — `logger.info`, `logger.warn`, `logger.error`
- `MONOREPO_ROOT` resolved via `resolve(import.meta.dirname ?? __dirname, '../../../../../')` (see populate-domain-kb.ts)
- `Promise.allSettled()` for parallel feature lookups (from WINT-2040 opp-3: parallelization for one-time scripts)
- Dry-run mode via `--dry-run` flag: log inferred capabilities without writing to DB (validation safety net)
- Structured result output: `{ attempted, succeeded, failed, skipped }` Zod schema matching existing populate script output

### Patterns to Avoid

- `console.log` — use `@repo/logger`
- TypeScript `interface` — use Zod schemas with `z.infer<>`
- Barrel files (index.ts re-exports from this script)
- Hardcoded DB connection strings — use `DATABASE_URL` env var
- Inferring capabilities from story titles alone — titles are inconsistent; prefer scanning story `feature` descriptions and acceptance criteria text
- Blocking on WINT-4010 (cohesion sidecar) being fixed before implementing: the inference script is a standalone populate script that can be built and validated independently

---

## Conflict Analysis

### Conflict: Dependency on WINT-4030 (not yet merged)
- **Severity**: warning (non-blocking for story generation; blocking for execution)
- **Description**: WINT-4040's inference script must look up feature UUIDs from `graph.features`. WINT-4030 (which populates `graph.features`) is currently at `needs-code-review` — the feature rows may not yet exist in the database. The script will produce zero results until WINT-4030 merges.
- **Resolution Hint**: Story scope is independent — script can be developed and unit-tested against mock feature data. A guard check at script startup (`SELECT count(*) FROM graph.features`) should warn if zero features exist and exit early with a clear message. Execution gate: run after WINT-4030 is merged and its data is verified.

---

## Story Seed

### Title
Infer Existing Capabilities from Story History and Populate graph.feature_capabilities

### Description

**Context**: The WINT graph schema (WINT-0060/WINT-0131) provides `graph.capabilities` as the table where feature-level CRUD capabilities are recorded. The `capabilities.lifecycle_stage` field (`create | read | update | delete`) is what drives Franken-feature detection in both the cohesion sidecar (`computeAudit`) and the `graph_get_franken_features` MCP tool. Currently this table is empty — there are no capability rows in it. Until it is populated, every feature will appear as a Franken-feature with all CRUD stages missing.

**Problem**: WINT-4030 (in review) is populating `graph.features` with the codebase's features, but it does not populate `graph.capabilities` or link them. The cohesion sidecar and graph-checker agent need real capability data to perform meaningful analysis. Without it, all graph queries return empty or trivially-incomplete results.

**Proposed Solution**: Create a capability inference script at `packages/backend/mcp-tools/src/scripts/infer-capabilities.ts` that:
1. Reads existing story files (`.yaml` story files from `plans/future/platform/*/`) and the stories index files
2. Analyzes story titles, feature descriptions, and acceptance criteria text to infer which CRUD capabilities (create/view→read/edit→update/delete/upload/replace/download) are implied
3. Maps the 7 user-facing capabilities from WINT-0200 schema (`create, view, edit, delete, upload, replace, download`) to the 4 graph lifecycle stages (`create, read, update, delete`) per a defined mapping table
4. Looks up the corresponding feature UUID in `graph.features` (by feature name/epic prefix)
5. Inserts inferred capabilities into `graph.capabilities` with `feature_id` FK set, `lifecycle_stage` set to the inferred CRUD stage, `capability_type` set to `'business'`, and `maturity_level` set to `'beta'` (inferred, not validated)
6. Supports `--dry-run` flag to preview inferences without DB writes
7. Supports `--validate` flag that calls `graph_get_capability_coverage` after population to confirm data landed correctly

The inference is heuristic, not authoritative. The risk note in the index ("Inference may miss capabilities, need validation") is addressed by:
- The `--dry-run` mode showing what would be inserted
- The `maturity_level: 'beta'` marking all inferred capabilities as unvalidated
- A validation report showing coverage gaps post-population for human review

### Initial Acceptance Criteria

- [ ] AC-1: Script file exists at `packages/backend/mcp-tools/src/scripts/infer-capabilities.ts` and is executable via `pnpm tsx packages/backend/mcp-tools/src/scripts/infer-capabilities.ts`
- [ ] AC-2: Script reads story YAML files from `plans/future/platform/*/` directories and parses `feature`, `title`, and ACs text
- [ ] AC-3: Script maps capability keywords to lifecycle stages using a defined mapping: `create/add` → `create`; `view/read/get/list/query` → `read`; `edit/update/modify/replace` → `update`; `delete/remove/archive` → `delete`; `upload` → `create`; `download` → `read`
- [ ] AC-4: Script looks up each story's epic prefix (e.g., `WINT`, `WISH`) in `graph.features` to find the feature UUID — does not create new feature rows
- [ ] AC-5: Script inserts inferred capabilities into `graph.capabilities` with `feature_id`, `lifecycle_stage`, `capability_type='business'`, `maturity_level='beta'`, `capability_name` set to a unique composite (e.g., `'{featureName}-{stage}-inferred'`)
- [ ] AC-6: Script deduplicates by `capability_name` — skips insert if a row with that name already exists (ON CONFLICT DO NOTHING semantics)
- [ ] AC-7: `--dry-run` flag causes script to log what would be inserted without performing any DB writes
- [ ] AC-8: Script emits structured summary `{ attempted, succeeded, failed, skipped }` matching `PopulateResultSchema`
- [ ] AC-9: If `graph.features` contains zero rows at startup, script exits early with a clear warning: "No features found — run WINT-4030 script first"
- [ ] AC-10: Unit test suite achieves minimum 80% coverage; DB write function is injectable for testability
- [ ] AC-11: `--validate` flag triggers a call to `graph_get_capability_coverage` for each feature after population and prints a coverage report showing which features have all 4 CRUD stages vs. which remain incomplete

### Non-Goals

- Do not create new rows in `graph.features` — only read from it
- Do not change the `capabilities.lifecycle_stage` enum values — must remain `create | read | update | delete`
- Do not implement automated re-inference (one-time script, not a daemon or scheduled job)
- Do not infer capabilities from UI components or API route files — story text is the source
- Do not modify the cohesion sidecar (WINT-4010) — it is a consumer, not the producer
- Do not add database schema migrations — this story uses existing schema only
- Do not attempt to infer upload/replace/download as separate lifecycle stages beyond the 4 CRUD stages already supported by the graph schema

### Reuse Plan

- **Components**: `capabilities` and `features` Drizzle table objects from `@repo/database-schema`; `InsertCapabilitySchema` from `@repo/database-schema`; `@repo/db` for DB client
- **Patterns**: Dependency-injected populate script (see `populate-domain-kb.ts`); `PopulateResultSchema` for output; `MONOREPO_ROOT` file resolution pattern; `Promise.allSettled()` for parallel feature lookups
- **Packages**: `@repo/logger`, `@repo/db`, `@repo/database-schema`, `zod`, `node:fs`, `node:path`

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- The primary unit tests must cover: keyword-to-stage mapping function (AC-3), deduplication logic (AC-6), zero-features early exit (AC-9), dry-run mode (AC-7), and the injectable DB write function (AC-10).
- Integration test: run against live DB (port 5432, `lego_dev`) with WINT-4030 data present. Verify rows land in `graph.capabilities` with correct `feature_id` FKs. Use `graph_get_capability_coverage` as verification oracle.
- Edge cases: story text with no capability keywords (should produce no inserts); feature prefix not found in `graph.features` (should skip with warning, not throw); duplicate capability name collision (should skip, not fail).
- The `--dry-run` mode test must verify no DB writes occur even when the DB is accessible.

### For UI/UX Advisor

- This is a backend CLI script with no UI surface. The only human-facing output is terminal logging and the structured summary object. Ensure the dry-run output is readable: table format or JSON showing `{ featureName, inferredStage, keyword, wouldInsert: true }` per entry.
- The `--validate` flag output should clearly distinguish: complete features (4/4 CRUD stages) vs. incomplete (< 4 stages) and list which stages are missing. This is the human validation surface for the risk note ("inference may miss capabilities").

### For Dev Feasibility

- **Critical prerequisite**: WINT-4030 must be merged before this script can be integration-tested. Unit tests can run with mocked feature data.
- **Capability keyword mapping**: The mapping (AC-3) is the highest-risk component — it is heuristic and will miss capabilities. Recommend implementing as a Zod-validated lookup table (not a switch statement) so it is easy to extend in WINT-4050.
- **Story text parsing**: Story YAML files have a `feature` field (text description) and optionally a `_pm/` directory with story markdown. Scanning the `feature` text field plus the `title` field from the YAML frontmatter is sufficient for MVP. Do not scan markdown bodies — too noisy.
- **Canonical references for subtask decomposition**:
  - ST-1: Zod schemas (InferCapabilitiesInputSchema, InferredCapabilitySchema, CapabilityInferenceResultSchema) in `__types__/index.ts`
  - ST-2: Keyword-to-stage mapping function (`mapKeywordsToStages()`) — pure function, fully unit-testable
  - ST-3: Story scanner (`scanStories(rootDir)`) — reads YAML files, extracts feature text + title
  - ST-4: Feature resolver (`resolveFeatureId(epicPrefix, db)`) — looks up UUID from `graph.features`
  - ST-5: Main `inferCapabilities()` function with injectable `insertFn` — orchestrates ST-2/3/4, handles dedup, emits result
  - ST-6: CLI entrypoint with `--dry-run` and `--validate` flag handling
  - ST-7: Unit tests (80% coverage requirement per AC-10)
- **Port registry note**: No HTTP port needed — this is a standalone script, not a sidecar.
- **Sidecar dependency risk**: WINT-4010 (cohesion sidecar) is at `failed-code-review`. WINT-4040's script does NOT depend on the sidecar being operational — it writes to the DB directly. The sidecar dependency in the index refers to the fact that WINT-4040 populates data the sidecar needs, not that the sidecar must be running during script execution. Verify this dependency interpretation with PM before implementation.
