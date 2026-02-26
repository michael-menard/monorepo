---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: APIP-5007

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Knowledge base unavailable (OpenAI embedding service error); lessons loaded from codebase analysis instead. No autonomous pipeline-specific migration framework exists yet — this story defines it. No `pipeline` package or schema directory has been bootstrapped. APIP-0010 (BullMQ setup) is listed as the dependency, but BullMQ uses Redis — the only PostgreSQL schema concern is the LangGraph checkpoint store used by worker graphs.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| Drizzle ORM migration system | `packages/backend/database-schema/` | The existing migration infrastructure for the production LEGO app schema. Uses `drizzle-kit generate` + `drizzle-kit migrate` + `meta/_journal.json` tracking. 28 migrations applied as of baseline. |
| `schema_versions` metadata pattern | `packages/backend/database-schema/docs/SCHEMA-VERSIONING.md` | Established pattern: semantic versioning (MAJOR.MINOR.PATCH) on top of Drizzle's journal, `schema_versions` table for human-readable metadata, rollback SQL capture, story ID tagging. APIP-5007 must define whether to adopt this exact pattern or a variant for the pipeline schema. |
| CI schema validation script | `packages/backend/database-schema/scripts/validate-schema-changes.ts` | Validates migration naming (`XXXX_description.sql`), journal consistency, breaking changes (DROP/ALTER), and best practices (INDEX CONCURRENTLY, NOT NULL defaults). Triggered by GitHub Actions on PR. APIP-5007 must ensure the pipeline schema is similarly gated. |
| Knowledge Base SQL migrations | `apps/api/knowledge-base/src/db/migrations/` | Sequential numbered `.sql` migration files applied by a custom runner script. Currently 15 files (`0000_full_schema_baseline.sql` through `007_create_work_state_tables.sql`). This pattern is the closest existing prior art for pipeline-specific migrations — outside of the Drizzle-managed app schema. |
| WINT schema unit tests | `packages/backend/database-schema/src/schema/__tests__/wint-schema.test.ts` | Schema structure validation without a live DB connection. Validates exports, Zod inference, enum values. APIP-5007 pipeline schemas should have equivalent unit tests. |
| `apply-admin-audit-log.mjs` | `packages/backend/database-schema/scripts/apply-admin-audit-log.mjs` | One-off migration runner script pattern — applies a specific SQL file against a target DB. Shows the "plain Node.js script applying SQL" pattern without drizzle-kit. |
| APIP-5001 test DB (ready-for-qa) | `plans/future/platform/autonomous-pipeline/ready-for-qa/APIP-5001/` | APIP-5001 established a provisional numbered-SQL migration approach for the LangGraph checkpoint schema. APIP-5007 must formalize or supersede that provisional approach. The two stories are explicitly coordinated: APIP-5001's STORY-SEED.md flags that APIP-5007 "owns the migration framework decision." |

### Active In-Progress Work

| Story | Area | Potential Impact |
|-------|------|-----------------|
| APIP-5001 (ready-for-qa) | Test DB + LangGraph checkpoint migrations | APIP-5001 established a provisional SQL migration runner for the pipeline checkpoint schema. APIP-5007 must align with or formalize what APIP-5001 built. Verify: has APIP-5001 already applied migrations to a pipeline schema location? If so, APIP-5007 migrates forward from that foundation. |
| APIP-0010 (ready-to-work) | BullMQ Work Queue Setup | APIP-0010 uses BullMQ + Redis — no PostgreSQL schema needed for the queue itself (per ADR-001 Decision 1). APIP-5007 has no BullMQ schema scope. The dependency on APIP-0010 means APIP-5007 should be implemented after BullMQ is configured and the pipeline package structure is established. |
| APIP-0040 (needs-code-review) | Model Router | No DB schema impact. APIP-0040 deals with model routing logic, not database. |
| WINT-0080 (in-progress in database-schema) | Unknown | An in-progress story in `packages/backend/database-schema/plans/future/platform/wint/in-progress/WINT-0080/` — APIP-5007 must not conflict with WINT-0080 schema changes. Verify WINT-0080 scope before adding pipeline schemas to the `database-schema` package. |

### Constraints to Respect

- **ADR-001 Decision 1 (BullMQ)**: No `wint.work_queue` PostgreSQL table. Queue state is Redis. APIP-5007 has no work queue schema scope.
- **ADR-001 Decision 4 (Local Dedicated Server)**: All pipeline components run locally — no Aurora Lambda constraints apply. Migration tooling should work against a local Docker Compose PostgreSQL instance.
- **ADR-002 (Infrastructure-as-Code)**: Standalone, framework-agnostic config. Migration scripts should be expressible without SST/CDK. A `pnpm` command pattern is preferred.
- **Baseline — Protected features**: `packages/backend/database-schema/` production schemas are protected. Pipeline schemas either (a) live in a new pgSchema namespace within the same database, or (b) live in a completely separate pipeline-specific package (`apps/api/pipeline/src/db/` or `packages/backend/pipeline-schema/`). Do NOT add pipeline tables to the existing main schema without explicit pgSchema isolation.
- **Baseline — `@repo/db` protected**: Any pipeline DB connection must use an isolated pool separate from `@repo/db`.
- **APIP-5001 provisional approach**: APIP-5001's STORY-SEED.md explicitly states it uses a "minimal provisional migration runner (numbered SQL files, simple Node script)" that APIP-5007 will formalize or replace. APIP-5007 must respect and build on that foundation rather than re-architecting from scratch.
- **Drizzle ORM v0.44.3**: The existing schema tooling uses Drizzle. If the pipeline schema also uses Drizzle, it should be the same version. If the pipeline uses a separate toolchain (e.g., plain SQL), document the divergence explicitly.

---

## Retrieved Context

### Related Endpoints

None — this is a pure infrastructure story. No API endpoints are introduced or modified.

### Related Components

None — no UI components. This story produces migration framework, tooling, and pipeline-specific Drizzle (or SQL) schema definitions.

### Reuse Candidates

| Candidate | Location | How to Reuse |
|-----------|----------|--------------|
| `drizzle.config.ts` pattern | `packages/backend/database-schema/drizzle.config.ts` | Template for a pipeline-specific drizzle config pointing to `apps/api/pipeline/src/db/` or `packages/backend/pipeline-schema/src/`. Copy and adapt with pipeline-specific DB credentials env vars. |
| `validate-schema-changes.ts` | `packages/backend/database-schema/scripts/validate-schema-changes.ts` | CI validation script. Either extend to cover pipeline migrations or create a variant for the pipeline schema package. Breaking change detection, naming convention, and journal checks are directly reusable. |
| `SCHEMA-VERSIONING.md` strategy | `packages/backend/database-schema/docs/SCHEMA-VERSIONING.md` | Complete strategy: SemVer for schemas, `schema_versions` table design, dual-tracking (Drizzle journal + metadata table), rollback classification. Adopt this verbatim or define a documented variant for the pipeline. |
| KB migration file convention | `apps/api/knowledge-base/src/db/migrations/` | Numbered sequential `.sql` files as fallback if Drizzle-kit is not the right tool for the pipeline checkpoint schema (e.g., if `@langchain/langgraph-checkpoint-postgres` ships its own SQL). |
| APIP-5001 provisional runner | `apps/api/pipeline/src/db/` (expected from APIP-5001) | The provisional migration runner established by APIP-5001. APIP-5007 formalizes this as the definitive migration strategy or documents the upgrade path. |
| WINT schema unit test pattern | `packages/backend/database-schema/src/schema/__tests__/wint-schema.test.ts` | Schema unit test structure: import tables, validate exports, validate Zod inference, validate enums — all without a live DB connection. |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Drizzle migration config | `/Users/michaelmenard/Development/monorepo/packages/backend/database-schema/drizzle.config.ts` | Canonical Drizzle Kit configuration: schema path, migration output directory, PostgreSQL credentials via env vars, `verbose: true`, `strict: true`. Direct template for a pipeline-specific drizzle config. |
| Schema validation CI script | `/Users/michaelmenard/Development/monorepo/packages/backend/database-schema/scripts/validate-schema-changes.ts` | Full migration validation implementation: naming convention enforcement (`XXXX_description.sql`), journal consistency checks, breaking change detection (DROP/ALTER), best practice warnings. APIP-5007 must either reuse or produce an equivalent for pipeline migrations. |
| Schema versioning strategy doc | `/Users/michaelmenard/Development/monorepo/packages/backend/database-schema/docs/SCHEMA-VERSIONING.md` | Complete versioning strategy already established for this codebase: SemVer schema versions, `schema_versions` table design, rollback compatibility matrix, environment drift detection. APIP-5007 should follow or explicitly diverge from this. |
| Schema unit tests (no live DB) | `/Users/michaelmenard/Development/monorepo/packages/backend/database-schema/src/schema/__tests__/wint-schema.test.ts` | Unit test pattern for Drizzle schema structure, Zod inference, and enum validation — no database connection required. Pipeline schema tests should follow this pattern. |

---

## Knowledge Context

### Lessons Learned

*Knowledge base was unavailable at seed generation time. The following lessons are derived from direct codebase analysis.*

- **[WISH-20180 / CI validation pattern]** A validation script that detects breaking changes and naming violations in CI is already established for the main app schema. Failing to apply this gate to the pipeline schema creates a parallel ungated migration path. (*category: pattern*)
  - *Applies because*: APIP-5007 must gate pipeline migrations with the same discipline. Either extend the existing CI job to cover the pipeline schema directory, or create a parallel job.

- **[APIP-5001 ordering risk]** APIP-5001's STORY-SEED.md explicitly warns: "If APIP-5007 will adopt Alembic (Python) as the migration framework, the Node.js migration runner built in APIP-5001 will be replaced. Design it to be throwaway." (*category: pattern*)
  - *Applies because*: APIP-5007 must decide on the migration framework and document the authoritative approach so APIP-5001's provisional runner is either confirmed or formally replaced.

- **[SCHEMA-VERSIONING.md — dual tracking]** The established pattern uses BOTH Drizzle's internal journal AND a `schema_versions` table. The journal answers "which files were applied"; the metadata table answers "what version is this, is it rollback-safe, what story introduced it." Using only the journal loses the human-readable audit trail. (*category: pattern*)
  - *Applies because*: APIP-5007 should adopt dual tracking for the pipeline schema, or document why single-journal tracking is sufficient for the pipeline context (simpler, fewer environments, no rollback needed).

- **[Naming conflict risk — WINT-0080]** An in-progress story exists inside `packages/backend/database-schema/`. If APIP-5007 adds pipeline tables to the same package, it risks merge conflicts or schema collision with WINT-0080. (*category: blocker*)
  - *Applies because*: APIP-5007 must determine the correct location for pipeline schemas before implementation. The safest choice is a dedicated location outside `packages/backend/database-schema/` (e.g., `apps/api/pipeline/src/db/` or a new `packages/backend/pipeline-schema/` package).

### Blockers to Avoid (from past stories)

- Adding pipeline tables directly to `packages/backend/database-schema/src/schema/index.ts` — production schemas are protected and WINT-0080 is in-progress in that package.
- Adopting Alembic (Python) without documenting the APIP-5001 handoff — the codebase is TypeScript-first; mixing Python migration tooling requires explicit justification and a clear upgrade path from APIP-5001's runner.
- Not extending CI validation to cover pipeline migrations — creates a parallel unvalidated path that will accumulate technical debt.
- Designing the pipeline `schema_versions` table with a different structure than the existing one — creates two incompatible metadata systems in the same database.
- Assuming the LangGraph checkpoint schema needs custom Drizzle models — `@langchain/langgraph-checkpoint-postgres` ships its own SQL schema and may handle its own migrations via a `setup()` method. Verify before duplicating work.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| APIP ADR-001 Decision 1 | BullMQ replaces PostgreSQL queue | No `wint.work_queue` table. APIP-5007 scope is LangGraph checkpoint schema versioning and any pipeline-specific operational tables (telemetry will come in Phase 3). |
| APIP ADR-001 Decision 4 | Local Dedicated Server | No Lambda. Migration tooling must work against Docker Compose PostgreSQL instances, not Aurora Serverless. `ssl: false` for local, parameterize for remote. |
| Repo ADR-002 | Infrastructure-as-Code Strategy | Framework-agnostic. Migration scripts should be plain TypeScript (`tsx`) or SQL, invocable via `pnpm` without SST/CDK dependencies. |
| Repo ADR-005 | Testing Strategy — UAT | Integration tests for the migration runner must run against a real (containerized) PostgreSQL instance, not mocks. |
| Repo ADR-006 | E2E Tests Required in Dev Phase | If any UI or API surface exposes migration status (e.g., operator CLI), at least one happy-path test must run against the live migration runner. |

### Patterns to Follow

- Place pipeline schemas in an isolated location: `apps/api/pipeline/src/db/` (co-located with pipeline logic) or `packages/backend/pipeline-schema/` (shared package). Do NOT add to `packages/backend/database-schema/`.
- Use a dedicated Drizzle config (or plain SQL runner) for the pipeline schema, separate from `drizzle.config.ts`.
- Adopt the `schema_versions` table pattern from `SCHEMA-VERSIONING.md` for the pipeline schema — same table structure, same SemVer conventions.
- Migration files named `XXXX_description.sql` (four digits, underscore, lowercase description), consistent with existing convention in `scripts/validate-schema-changes.ts`.
- CI gate for pipeline migrations: either extend `validate-schema-changes.ts` or create `validate-pipeline-schema-changes.ts` with the same rules.
- Schema unit tests (no live DB): validate that pipeline table definitions export correctly and Zod schemas can be constructed.

### Patterns to Avoid

- Mixing pipeline tables into the `wint` pgSchema or the main `public` schema without explicit namespace isolation.
- Using `drizzle-kit push` in production or CI — `push` is dev-only and bypasses journal tracking.
- Implementing a heavyweight migration framework when APIP-5001 already established a provisional numbered-SQL approach — formalize or confirm, don't rebuild from scratch.
- Adopting Python tooling (Alembic) without a clear handoff plan from APIP-5001's TypeScript runner.
- Skipping rollback classification — each migration must be marked `rollback_safe: true/false` with rollback SQL stored where feasible.

---

## Conflict Analysis

### Conflict: Pipeline schema location collides with WINT-0080
- **Severity**: warning
- **Description**: WINT-0080 is an in-progress story inside `packages/backend/database-schema/`. If APIP-5007 targets the same package for pipeline schema additions, it risks merge conflicts with WINT-0080 changes. The production schema package is also listed as a protected feature in the baseline.
- **Resolution Hint**: Place pipeline schemas in `apps/api/pipeline/src/db/` (preferred, co-located with pipeline logic) or create a new `packages/backend/pipeline-schema/` package. This keeps the pipeline migration footprint completely separate from the protected production schema package. Document this location decision as a sub-ADR in APIP-5007.
- **Source**: baseline + codebase analysis

### Conflict: APIP-5001 provisional migration runner may not align with APIP-5007 framework decision
- **Severity**: warning
- **Description**: APIP-5001 (ready-for-qa) established a provisional numbered-SQL migration runner for the LangGraph checkpoint schema. APIP-5007 may decide on a different approach (Drizzle-kit managed vs. plain SQL runner vs. LangGraph's built-in `setup()`). If the frameworks diverge, APIP-5001's work must be updated or replaced.
- **Resolution Hint**: APIP-5007 should begin by reviewing what APIP-5001 actually built and deciding: (a) confirm APIP-5001's approach as the standard (document it formally), (b) extend it with versioning metadata, or (c) replace it with a different tool and document the migration path. The ACs should explicitly reference APIP-5001's output as a starting point.
- **Source**: baseline (APIP-5001 STORY-SEED.md)

---

## Story Seed

### Title

Database Schema Versioning and Migration Strategy for the Autonomous Pipeline

### Description

The autonomous pipeline (Phase 0–4) will introduce multiple PostgreSQL schemas as it matures: LangGraph checkpoint store (Phase 0, established by APIP-5001), change telemetry tables (Phase 3, APIP-3010), model affinity profiles (Phase 3, APIP-3020), and cron job infrastructure (Phase 3, APIP-3090). Without a migration strategy defined early, each story invents its own approach, creating inconsistent versioning, ungated breaking changes, and no rollback safety classification.

This story defines the **authoritative migration strategy for the autonomous pipeline database** — selecting the toolchain (Drizzle-kit, plain SQL runner, or hybrid), establishing the `schema_versions` metadata table pattern for the pipeline's PostgreSQL instance, implementing CI validation gates for pipeline migration PRs, and formalizing the numbered-SQL naming convention already established by APIP-5001. The strategy must cover the LangGraph checkpoint schema (already provisionally migrated by APIP-5001) as its first concrete application.

**Context**: The existing production LEGO app schema (`packages/backend/database-schema/`) already has a mature migration strategy (Drizzle ORM, `XXXX_description.sql` naming, `schema_versions` table, CI breaking-change detection, SemVer version tracking). APIP-5007 either adopts this same strategy for the pipeline schema or explicitly documents where and why it diverges — and produces a pipeline-specific implementation of whichever approach is chosen.

**Dependency on APIP-0010**: The BullMQ work queue uses Redis — there is no PostgreSQL queue table. APIP-5007's database scope is strictly the LangGraph checkpoint store and any future pipeline operational tables.

### Initial Acceptance Criteria

- [ ] AC-1: A decision document (ADR or README section in the pipeline schema location) formally selects the migration toolchain for the pipeline schema: either Drizzle-kit (matching the production app pattern), plain numbered-SQL runner (matching the KB pattern), or LangGraph's built-in `setup()` for checkpoint tables. The decision must address: how migrations are generated, how they are applied in CI and production, and how they relate to APIP-5001's provisional runner.
- [ ] AC-2: Pipeline schema files live at a documented, isolated location (e.g., `apps/api/pipeline/src/db/` or `packages/backend/pipeline-schema/src/`) — explicitly NOT added to `packages/backend/database-schema/src/schema/`. The location is documented in the decision document from AC-1.
- [ ] AC-3: A `schema_versions` table (following the structure in `packages/backend/database-schema/docs/SCHEMA-VERSIONING.md`) is defined for the pipeline schema — either as a Drizzle table definition or as a SQL migration file. The table records: version (SemVer), migration file, description, change type (MAJOR/MINOR/PATCH), `is_breaking`, `rollback_safe`, `rollback_sql`, and `story_id`.
- [ ] AC-4: The LangGraph checkpoint schema migration(s) from APIP-5001 are incorporated as the initial migration(s) under the formalized framework. If APIP-5001 used a provisional runner, those migrations are converted to (or confirmed as) the canonical format. The pipeline schema can be migrated from scratch using only the framework defined in this story.
- [ ] AC-5: Migration files follow the `XXXX_description.sql` naming convention (four-digit sequential number, underscore separator, lowercase description), consistent with the existing CI validation script's `MIGRATION_NAME_PATTERN`.
- [ ] AC-6: A CI validation job (GitHub Actions workflow step or extension of the existing `validate-schema-changes.ts` script) runs on any PR that modifies the pipeline schema directory. It checks: migration naming convention, journal consistency (if Drizzle), breaking changes (DROP/ALTER), best practice warnings (INDEX CONCURRENTLY, NOT NULL defaults). CI fails on critical violations.
- [ ] AC-7: `pnpm` commands exist for the pipeline schema package: `db:generate` (or equivalent), `db:migrate`, `db:status` (shows which migrations are applied), and `db:validate` (runs the CI validation locally). Commands are documented in the package `README.md` or decision document.
- [ ] AC-8: Schema unit tests (no live DB required) exist that validate: pipeline table definitions export correctly, Zod schemas are constructable from Drizzle tables via `drizzle-zod`, and all enums have the expected values. Tests pass with `pnpm test`.
- [ ] AC-9: An integration test (against real containerized PostgreSQL from APIP-5001's compose service) demonstrates the full migration lifecycle: start from empty schema → apply all migrations in sequence → verify `schema_versions` records the correct version → confirm `testConnection()` returns healthy. Test passes with the APIP-5001 test DB running.
- [ ] AC-10: `pnpm check-types` passes with no errors across all files introduced by this story.

### Non-Goals

- Defining or modifying the BullMQ/Redis work queue — that is APIP-0010 (no PostgreSQL schema needed for the queue).
- Implementing change telemetry tables (APIP-3010), model affinity tables (APIP-3020), or cron infrastructure tables (APIP-3090) — this story establishes the framework those stories will use.
- Modifying the production app schema in `packages/backend/database-schema/` — protected.
- Modifying `@repo/db` client package — protected.
- Implementing data retention or archival policies for the checkpoint store — deferred to post-Phase-0 architecture review.
- Implementing a Playwright E2E test for schema migration — no UI surface. ADR-006 E2E requirement does not apply.
- Defining the Operator CLI schema status command — that is APIP-5005 (which may consume the `db:status` command from this story, but the CLI itself is out of scope here).
- Supporting multi-tenant or multi-database migration orchestration — single pipeline database in Phase 0.

### Reuse Plan

- **Components**: No UI components — pure backend/infrastructure.
- **Patterns**:
  - `packages/backend/database-schema/drizzle.config.ts` — template for pipeline-specific Drizzle config
  - `packages/backend/database-schema/scripts/validate-schema-changes.ts` — extend or clone for pipeline CI validation
  - `packages/backend/database-schema/docs/SCHEMA-VERSIONING.md` — adopt `schema_versions` table design and SemVer conventions
  - `packages/backend/database-schema/src/schema/__tests__/wint-schema.test.ts` — schema unit test structure without live DB
  - APIP-5001 provisional migration runner — review and formalize (or explicitly supersede)
- **Packages**:
  - `drizzle-orm` v0.44.3 (if using Drizzle-kit approach)
  - `drizzle-kit` v0.31.4 (for generate/migrate commands)
  - `drizzle-zod` 0.8.3 (for Zod schema generation)
  - `pg` (Pool for pipeline DB client)
  - `tsx` (for running TypeScript scripts)
  - `@langchain/langgraph-checkpoint-postgres` — check if `setup()` method handles checkpoint schema creation before writing custom SQL

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- This is a framework/infrastructure story — the primary test artifacts are schema unit tests (AC-8) and the migration lifecycle integration test (AC-9).
- Coverage threshold waiver consideration: migration SQL files, Drizzle config, and CI scripts have no measurable TypeScript coverage. QA gate = `pnpm test` passes (schema unit tests) + `pnpm check-types` passes + integration migration lifecycle test demonstrates start-to-finish migration application.
- ADR-005 applies to AC-9: the integration test must run against a real containerized PostgreSQL (the APIP-5001 compose test-db service), not mocks or in-memory databases.
- Key regression risk: ensure that adding a pipeline-specific Drizzle config does not interfere with the existing `packages/backend/database-schema/drizzle.config.ts` — Drizzle-kit uses the config file path explicitly, so there is no global conflict risk if the two configs are invoked separately.
- Test AC-6 (CI validation) by staging a migration PR with an intentional naming violation and verifying the job fails, then fixing it and verifying pass. This is the acceptance test for the CI gate itself.

### For UI/UX Advisor

- No UI impact. This story is invisible to end users.
- Operator ergonomics: the `pnpm` command names (`db:generate`, `db:migrate`, `db:status`, `db:validate`) must be consistent with the existing production schema commands in `packages/backend/database-schema/package.json`. Inconsistent naming creates confusion when operators work across both packages.
- The decision document (AC-1) is the primary human-readable artifact. It should be written as a developer reference, not an end-user document — include concrete examples of when to generate a migration, how to apply it locally, and what CI failure looks like.

### For Dev Feasibility

- **First action**: Read what APIP-5001 actually built in `apps/api/pipeline/src/db/` (or wherever the provisional runner landed). The APIP-5007 scope depends entirely on APIP-5001's output. If APIP-5001 used Drizzle-kit, the framework decision is effectively already made. If it used plain SQL, the story is about formalizing that.
- **LangGraph checkpoint tooling decision**: Before writing any migration SQL, check if `@langchain/langgraph-checkpoint-postgres` has a built-in `setup()` method that creates checkpoint tables. If it does, the migration for the checkpoint tables may be as simple as calling `checkpointer.setup()` in the migration runner — no hand-written SQL needed for the checkpoint schema itself. This would significantly narrow AC-4's scope.
- **Pipeline schema location**: Recommend `apps/api/pipeline/src/db/` as the primary location (co-located with pipeline runtime code) rather than a standalone package. A standalone package is appropriate only if multiple apps/services need to share the pipeline schema — which is not the case in Phase 0.
- **Drizzle-kit vs plain SQL runner decision matrix**:
  - Use Drizzle-kit if: the pipeline schema will be expressed as Drizzle table definitions (needed for Drizzle ORM queries). Drizzle-kit generates SQL from schema diffs, maintains the `_journal.json`, and supports `db:status`.
  - Use plain SQL runner (KB pattern) if: the pipeline schema is mostly managed by external libraries (`@langchain/langgraph-checkpoint-postgres`) and the Drizzle table definitions are not needed for runtime queries. Simpler setup, no code-gen step.
  - **Recommendation**: Use Drizzle-kit for any pipeline-specific tables that need ORM queries (e.g., telemetry in Phase 3). Use the LangGraph `setup()` method (or its SQL files) for checkpoint tables specifically. Document the boundary.
- **Canonical implementation references**:
  - `packages/backend/database-schema/drizzle.config.ts` — Drizzle config template
  - `packages/backend/database-schema/scripts/validate-schema-changes.ts` — CI validation to extend or clone
  - `packages/backend/database-schema/docs/SCHEMA-VERSIONING.md` — `schema_versions` table SQL and versioning rules
  - `packages/backend/database-schema/src/schema/__tests__/wint-schema.test.ts` — schema unit test pattern
