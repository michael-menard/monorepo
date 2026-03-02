---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: APIP-4030

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No prior Dependency Auditor work exists in the codebase or pipeline; this is a greenfield cron worker story.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| `wint` PostgreSQL schema namespace | `packages/backend/database-schema/src/schema/wint.ts` | All pipeline tables live in `wintSchema`; any new `dep_audit_*` tables must follow this pattern |
| Drizzle ORM v0.44.3 + drizzle-zod | `packages/backend/database-schema/src/schema/` | Table definitions must use `wintSchema.table(...)` with `createInsertSchema`/`createSelectSchema` |
| `wint.change_telemetry` table (APIP-3010) | `plans/future/platform/autonomous-pipeline/ready-to-work/APIP-3010/APIP-3010.md` | Closest fire-and-forget DB insert precedent; pattern to follow for any audit run persistence |
| LangGraph cron infrastructure (APIP-3090) | `plans/future/platform/autonomous-pipeline/backlog/APIP-3090/story.yaml` | Dependency Auditor is a post-merge cron; APIP-3090 provides the cron scheduling mechanism |
| Blocked Queue and Notification System (APIP-2010) | `plans/future/platform/autonomous-pipeline/backlog/APIP-2010/APIP-2010.md` | APIP-4030 depends directly on APIP-2010; high-risk findings must be routed to the blocked queue for human review using the mechanism APIP-2010 establishes |
| Orchestrator YAML artifact schemas | `packages/backend/orchestrator/src/artifacts/` | `StoryArtifactSchema` / `story-v2-compatible.ts` used if the auditor auto-generates blocked-queue items or follow-up stories |
| Knowledge Base (`kb_add_*` tools) | `apps/api/knowledge-base/` | Audit findings can be persisted to KB for trend tracking (overlap with APIP-4070 Weekly Report) |
| Codebase Health Gate (APIP-4010) | `plans/future/platform/autonomous-pipeline/backlog/APIP-4010/story.yaml` | Sibling Phase 4 story — APIP-4010 captures codebase-level metrics; APIP-4030 focuses specifically on `package.json` dependency changes; coordination on cron scheduling and report format is beneficial |
| Cohesion Scanner (APIP-4020) | `plans/future/platform/autonomous-pipeline/backlog/APIP-4020/story.yaml` | Sibling Phase 4 story — pattern drift detection; APIP-4030 focuses on security/bloat, not pattern consistency |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| APIP-1040 — Documentation Graph (Post-Merge) | In Progress | Low — both run post-merge; no schema or file overlap expected, but both may touch post-merge hook/trigger coordination |
| APIP-1050 — Review Graph with Parallel Fan-Out Workers | In Progress | Low — review graph includes a security worker but it performs SAST/secret detection, not dependency auditing |
| APIP-2010 — Blocked Queue and Notification System | backlog (direct dependency) | High — APIP-4030 blocks queue items for human review; the blocked queue API that APIP-2010 defines is a hard runtime dependency; APIP-4030 cannot ship its human-blocking flow until APIP-2010 is stable |
| APIP-3090 — Cron Job Infrastructure | backlog (upstream of APIP-4030) | Medium — APIP-4030's post-merge cron trigger requires APIP-3090's scheduling mechanism |

### Constraints to Respect

- All new database tables MUST live in the `wint` pgSchema namespace.
- Drizzle ORM is the ORM for all wint-schema tables; no raw pg queries for schema definition.
- Migration SQL must follow the APIP-5007 migration runner naming convention (sequential numbering).
- `@repo/logger` for all logging; no `console.log`.
- Zod-first types — no TypeScript interfaces; all schemas via `z.object()` or `drizzle-zod`.
- The dependency equivalence knowledge base (e.g., `date-fns` vs `dayjs`) must be configurable and maintained separately from code — not hardcoded logic.
- The blocked queue API used for high-risk findings must conform exactly to what APIP-2010 defines; do not pre-invent a parallel notification channel.
- Protected: do NOT modify existing wint tables or any production DB schemas.
- The dependency auditor MUST NOT block or slow the merge pipeline; all audit work is async/post-merge.
- `pnpm audit` output parsing must gracefully degrade if pnpm version changes the output format.

---

## Retrieved Context

### Related Endpoints
- None — this is a backend-only, no-Lambda, no-API-Gateway story. All audit logic runs in the LangGraph/orchestrator process on the dedicated server.

### Related Components
- None — no UI components. This is a headless post-merge cron worker.

### Reuse Candidates

| Candidate | Location | How to Reuse |
|-----------|----------|--------------|
| `wintSchema.table(...)` pattern | `packages/backend/database-schema/src/schema/wint.ts` | Template for any `wint.dep_audit_runs` / `wint.dep_audit_findings` table definitions |
| `createInsertSchema` / `createSelectSchema` from `drizzle-zod` | `packages/backend/database-schema/src/schema/wint.ts` | Auto-generate Zod insert/select schemas from Drizzle table definitions |
| Fire-and-forget insert helper pattern (APIP-3010) | `plans/future/platform/autonomous-pipeline/ready-to-work/APIP-3010/APIP-3010.md` | Audit run recording should follow `writeTelemetry()` pattern: injectable `db`, try/catch, `logger.warn` on failure, never throws |
| `transitionToBlocked()` API (APIP-2010) | `plans/future/platform/autonomous-pipeline/backlog/APIP-2010/APIP-2010.md` | Route high-risk findings to the blocked queue using APIP-2010's `transitionToBlocked`-equivalent API; do not implement a parallel mechanism |
| LangGraph cron task registration (APIP-3090) | `plans/future/platform/autonomous-pipeline/backlog/APIP-3090/story.yaml` | Dependency Auditor is a new cron task to register via APIP-3090's infrastructure |
| `StoryArtifactSchema` | `packages/backend/orchestrator/src/artifacts/story-v2-compatible.ts` | If auto-generating remediation stories for blocked items, validate YAML output against this schema |
| `persist-learnings` node | `packages/backend/orchestrator/src/nodes/completion/persist-learnings.ts` | Reuse KB write-back pattern for persisting audit findings to the knowledge base |
| APIP-4010 `captureHealthSnapshot()` pattern | `plans/future/platform/autonomous-pipeline/backlog/APIP-4010/_pm/STORY-SEED.md` | Canonical example of a cron-triggered metric capture function with fire-and-forget semantics and injectable toolRunner |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| wint table definition | `packages/backend/database-schema/src/schema/wint.ts` | Shows `wintSchema.table(...)`, `createInsertSchema`, `createSelectSchema`, column types, index patterns — exact template for any new `wint.dep_audit_*` table |
| Fire-and-forget insert with injectable db | `packages/backend/orchestrator/src/nodes/completion/persist-learnings.ts` | Shows try/catch with `logger.warn`, non-blocking semantics, injectable db parameter — the pattern for audit run persistence |
| LangGraph graph routing test | `packages/backend/orchestrator/src/graphs/__tests__/elaboration.test.ts` | How to test compiled LangGraph node routing without real AI calls; use for cron task dispatch logic tests |
| Story artifact schema (YAML validation) | `packages/backend/orchestrator/src/artifacts/story-v2-compatible.ts` | Required schema for any auto-generated follow-up stories from high-risk audit findings |

---

## Knowledge Context

### Lessons Learned

- **[APIP-3020]** Pattern Miner Cron has no concurrency guard documented — APIP-3090 scheduling should ensure single-instance execution, but advisory locks (`pg_try_advisory_lock`) are recommended as defense-in-depth. (category: architecture)
  - *Applies because*: The Dependency Auditor is also a cron job; concurrent audit runs could produce duplicate findings or race conditions on DB insert. Include a `pg_try_advisory_lock` guard.

- **[APIP-5007/APIP-0010]** Stale dependency entries in story.yaml are a maintenance issue — always verify that depends_on entries are truly required at runtime, not just architectural courtesy. (category: workflow)
  - *Applies because*: APIP-4030 depends on APIP-2010 (blocked queue) which is itself in backlog; the dependency is real at runtime (blocking flow requires APIP-2010 API), so it should remain.

- **[Codebase Health Gate (APIP-4010)]** Threshold calibration is empirical — thresholds must be in a configurable Zod config object, not hardcoded magic numbers; and they should have documented defaults. (category: architecture)
  - *Applies because*: Overlap detection heuristics and vulnerability severity thresholds for `pnpm audit` risk classification face the same calibration problem.

- **[Infra story coverage]** For stories delivering only schemas, migrations, and cron configuration (no Lambda handlers), the 45% coverage threshold applies to helper functions and schema parse tests only — coverage waiver may apply for pure infra portions. (category: testing)
  - *Applies because*: APIP-4030 adds DB migration + Zod schemas + cron task; coverage must focus on the audit helper functions (new-package detector, overlap checker, bundle estimator, `pnpm audit` parser).

- **[APIP-0020 dead letter queue]** APIP-2010 must either poll the main queue's failed jobs bucket or implement a dead letter queue via BullMQ Worker on failed events. APIP-4030 routes findings to the blocked queue — it should use the same routing API once APIP-2010 stabilizes it, not build a separate channel. (category: integration)
  - *Applies because*: APIP-4030's human-in-the-loop blocking flow is the downstream consumer of APIP-2010; tight integration required.

### Blockers to Avoid

- Implementing a parallel notification channel that bypasses APIP-2010 — all human-in-loop blocking must go through the blocked queue API APIP-2010 defines.
- Hardcoding package equivalence rules (e.g., `date-fns` vs `dayjs`) as code constants — these must be in a maintainable config file or KB entries, not source code.
- Parsing `pnpm audit` output with brittle string matching — use the `--json` flag and parse via a typed Zod schema for resilience to pnpm version changes.
- Running the auditor synchronously in the merge path — it MUST be a post-merge async trigger, never blocking merge completion.
- Targeting port 5433 (KB database) for `wint.dep_audit_*` tables — use port 5432 (`lego_dev`).
- Generating blocked queue entries without idempotency — ensure that a second audit run on the same merged commit does not re-create duplicate blocked items.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 (inferred from pipeline ADRs) | Pipeline runs on single dedicated server (Phase 0-4) | No Lambda; cron tasks and audit workers run in the LangGraph server process; no distributed execution |
| APIP-5007 migration convention | Sequential SQL migration naming | Any new table migration file must follow the `0NN_dep_audit.sql` naming convention |
| ADR-005 | Testing Strategy — UAT must use real services | Integration tests for `pnpm audit` parsing must run against real `pnpm audit` output, not mocked strings, in at least one integration test |

### Patterns to Follow

- `wintSchema.table(...)` with drizzle-zod for all new wint tables.
- `createInsertSchema` / `createSelectSchema` for Zod type generation; do not hand-write schemas duplicating Drizzle column definitions.
- Fire-and-forget insert helper (injectable `db`, try/catch, `logger.warn` on failure, never throws).
- `pnpm audit --json` for structured, parseable vulnerability output rather than human-readable text.
- Configurable thresholds and equivalence rules in typed Zod config objects (not magic numbers or hardcoded arrays).
- Idempotency on blocked queue inserts — use a deduplication key (e.g., `storyId:commitSha:packageName`) to prevent duplicate items.
- Advisory lock (`pg_try_advisory_lock`) for cron concurrency guard.

### Patterns to Avoid

- Hand-writing TypeScript interfaces for DB row types — use `z.infer<typeof InsertDepAuditRunSchema>`.
- Inline `console.log` — always `@repo/logger`.
- Blocking the post-merge pipeline on audit results — auditor is advisory and async.
- Building a custom notification channel independent of APIP-2010.
- Hardcoding the `date-fns` / `dayjs` equivalence list in source — it must be maintainable without code changes.

---

## Conflict Analysis

### Conflict: Hard Runtime Dependency on APIP-2010 (Blocked Queue)
- **Severity**: warning
- **Description**: APIP-4030's core value — routing high-risk findings to a blocked queue for human review — requires the blocked queue API that APIP-2010 defines. APIP-2010 is currently in `backlog` status with its own dependency on APIP-0020 (Supervisor Loop). If APIP-2010 is not complete when APIP-4030 reaches implementation, the human-blocking flow cannot be implemented. The auditor's detection logic (new packages, overlap, `pnpm audit`, unmaintained packages) can be built independently, but the routing mechanism is blocked.
- **Resolution Hint**: Decompose APIP-4030 into two phases: (a) audit detection logic + DB persistence (independent of APIP-2010), and (b) blocked queue routing (requires APIP-2010). This allows partial implementation to proceed. Alternatively, stub the blocking notification as a `logger.warn` during development and wire up APIP-2010 later.

### Conflict: APIP-3090 Cron Infrastructure Not Yet Available
- **Severity**: warning
- **Description**: APIP-4030 is a post-merge cron worker; it requires APIP-3090's cron infrastructure for scheduling. APIP-3090 is itself in `backlog` with dependencies on APIP-0030 (LangGraph Docker) and APIP-3020 (Model Affinity Profiles), making it a long-chain dependency. The auditor logic can be built decoupled from cron scheduling, but the triggering mechanism cannot be wired until APIP-3090 is stable.
- **Resolution Hint**: Define a clear `DepAuditCronTask` interface that APIP-4030 implements, such that plugging into APIP-3090's registration mechanism is a one-line change. The audit worker function itself can be tested as a standalone callable (e.g., manually triggered via CLI) until the cron infrastructure is ready.

---

## Story Seed

### Title
Dependency Auditor — Post-Merge Package Analysis, Overlap Detection, and Human-Blocked Queue Routing

### Description

**Context**: As the autonomous pipeline continuously merges stories that add, remove, or update npm packages, there is no automated mechanism to audit the dependency health of the monorepo. New packages can introduce security vulnerabilities, duplicate functionality already provided by existing packages (e.g., adding `dayjs` when `date-fns` is already installed), bloat the bundle unnecessarily, or become unmaintained over time. Without a dependency auditor, the pipeline's output could silently degrade the supply-chain security and package hygiene of the codebase.

**Problem**: After each merge that modifies any `package.json`, the pipeline needs to:
1. Detect which packages were added, upgraded, or removed.
2. Check new packages for overlap with existing dependencies using a maintained equivalence knowledge base.
3. Estimate the bundle size impact of newly added packages (using `cost-of-modules` or equivalent).
4. Run `pnpm audit --json` to identify known vulnerabilities in new or updated packages.
5. Flag packages that are unmaintained (no npm updates in 12+ months, or explicitly deprecated on npm).
6. For any high-risk finding (critical/high severity vulnerability, or explicit overlap with an existing dep), route a blocked queue item to APIP-2010 for human review before any further auto-merge.

**Proposed Solution**: Build the Dependency Auditor as four integrated components:

1. **`wint.dep_audit_runs` table** — Records each post-merge audit run: which story/commit triggered it, which packages changed, the overall risk level produced, and a pointer to the findings.

2. **`wint.dep_audit_findings` table** — One row per finding per run: package name, finding type (vulnerability / overlap / bundle_bloat / unmaintained), severity (critical / high / medium / low / info), and a structured JSONB payload with details.

3. **`runDepAudit(config, db)` function** — Orchestrates the four analysis steps above against the packages that changed in the triggering merge. Returns a structured `DepAuditResultSchema` summary. Follows fire-and-forget semantics relative to the merge pipeline (non-blocking on failure).

4. **High-risk routing** — For findings at `critical` or `high` severity (configurable), calls the APIP-2010 blocked queue API to create a human-review item, including enough context for the operator to make a resolution decision (approve/reject the dependency). Items are deduplicated by `storyId:packageName:findingType`.

### Initial Acceptance Criteria

- [ ] AC-1: `wint.dep_audit_runs` table exists after running the APIP-5007-compatible SQL migration. Columns: `id` (UUID PK), `story_id` (varchar), `triggered_at` (timestamp), `packages_added` (jsonb, array of package names), `packages_updated` (jsonb), `packages_removed` (jsonb), `overall_risk` (varchar: none/low/medium/high/critical), `findings_count` (integer), `blocked_queue_items_created` (integer).
- [ ] AC-2: `wint.dep_audit_findings` table exists. Columns: `id` (UUID PK), `run_id` (UUID FK to dep_audit_runs), `package_name` (varchar), `finding_type` (varchar enum: vulnerability/overlap/bundle_bloat/unmaintained), `severity` (varchar: critical/high/medium/low/info), `details` (jsonb), `created_at` (timestamp). Index on `run_id` and `severity`.
- [ ] AC-3: `drizzle-kit check` passes with no schema drift after both migrations and Drizzle schema definitions are applied.
- [ ] AC-4: `DepAuditRunSchema` and `DepAuditFindingSchema` are exported from the orchestrator, auto-generated from Drizzle table definitions via `drizzle-zod`. Both schemas parse a valid row without error.
- [ ] AC-5: `detectNewPackages(prevLockfile, currentLockfile)` returns the diff of added, updated, and removed packages by comparing pnpm lockfile snapshots. Returns a typed `PackageChangeSummary` (Zod-validated).
- [ ] AC-6: `checkOverlap(newPackages, equivalenceConfig)` flags any new package that has a known functional equivalent already in the monorepo's `package.json` files. The equivalence map is loaded from a configurable YAML/JSON file (not hardcoded in source). Returns flagged packages with overlap details.
- [ ] AC-7: `estimateBundleImpact(newPackages)` returns an estimated minified+gzipped byte count for each new package using the `bundlephobia` API or `cost-of-modules` CLI. Gracefully returns `null` for packages that cannot be analyzed (network error, private package). Does not block if estimation fails.
- [ ] AC-8: `runPnpmAudit(workspaceRoot)` shells out to `pnpm audit --json` and parses the output via a typed Zod schema (`PnpmAuditOutputSchema`). Returns a list of vulnerability findings with package name, severity, CVE, and fix available flag. Handles parse failures gracefully (logs warning, returns empty findings).
- [ ] AC-9: `detectUnmaintained(newPackages)` queries the npm registry for each new package and flags packages with no new version in 12+ months, or with a `deprecated` field in their npm metadata. Returns flagged packages with last-publish date.
- [ ] AC-10: `runDepAudit(config, db)` orchestrates AC-5 through AC-9, persists a `dep_audit_runs` row and one `dep_audit_findings` row per finding, and returns a `DepAuditResultSchema` summary. On DB insert failure, logs a warning and resolves without throwing (fire-and-forget).
- [ ] AC-11: For any finding at or above the configured `blockingThreshold` severity (default: `high`), a blocked queue item is created via the APIP-2010 API with: `storyId`, `packageName`, `findingType`, `severity`, and `details`. Blocked queue items are deduplicated — a second audit of the same package+findingType combination does not create a duplicate item.
- [ ] AC-12: `DepAuditThresholdsSchema` defines configurable severity threshold for blocking (`blockingThreshold`), maximum acceptable bundle size delta in bytes (`maxBundleDeltaBytes`), and unmaintained package age in days (`unmaintainedAgeDays`). Thresholds are NOT hardcoded; loaded from a config object with documented defaults.
- [ ] AC-13: The dependency auditor cron task is registered with APIP-3090's cron infrastructure and fires after any post-merge job that includes a `package.json` or `pnpm-lock.yaml` change.
- [ ] AC-14: Unit tests cover: `detectNewPackages()` with add/update/remove cases, `checkOverlap()` with known equivalence match and no-match, `estimateBundleImpact()` with success and network-failure, `runPnpmAudit()` with valid JSON output and malformed output, `detectUnmaintained()` with recent and stale package, `runDepAudit()` happy path (all findings persist, blocked queue called for high-severity), `runDepAudit()` error path (DB failure → warn, no throw), deduplication of blocked queue items.
- [ ] AC-15: Integration test: migration applies cleanly to the APIP-5001 test database; insert + read-back of a run row and finding row confirms all columns round-trip correctly and schemas parse successfully.
- [ ] AC-16: `pnpm check-types` and `pnpm lint` pass with no errors or warnings introduced by this story's TypeScript files.

### Non-Goals

- Building a UI dashboard for audit findings (deferred to APIP-4070 Weekly Pipeline Health Report or APIP-2020 Monitor UI).
- Auto-remediating vulnerabilities (blocked queue items are for human review, not auto-fix).
- Auditing all packages in the monorepo on every run — only packages changed in the triggering merge are audited per run.
- Enforcing a license compliance policy (out of scope; no license scanning in this story).
- Performing SAST or secret detection (handled by APIP-1050 Review Graph security worker).
- Supporting audit across distributed/multi-process environments — single-server assumption per pipeline ADR.
- Modifying any existing wint tables or production DB schemas.
- Implementing the human-review resolution workflow once an item is in the blocked queue — APIP-2010 owns that.

### Reuse Plan

- **Tables**: Follow `wintSchema.table(...)` pattern from `packages/backend/database-schema/src/schema/wint.ts`.
- **Zod schemas**: Use `createInsertSchema` / `createSelectSchema` from `drizzle-zod`; do not hand-write.
- **Insert helper pattern**: Follow fire-and-forget from APIP-3010 / APIP-4010 — injectable `db`, try/catch, `logger.warn` on failure, never throws.
- **Blocked queue routing**: Use the APIP-2010 blocked queue API exactly as defined; do not build a parallel channel.
- **Cron registration**: Plug into APIP-3090's cron task registration mechanism using a defined `DepAuditCronTask` interface.
- **Testing**: Follow `elaboration.test.ts` graph routing test pattern for any LangGraph dispatch logic.

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- Each of the five analysis functions (new-package detect, overlap check, bundle estimate, pnpm audit, unmaintained detect) shells out to an external CLI or network call. All must accept an injectable `toolRunner` / `fetchFn` parameter for unit test mocking — do not call external tools directly in unit tests.
- `runPnpmAudit()` Zod parsing must be tested with both well-formed JSON and with a malformed/empty response to ensure graceful degradation does not silently swallow real errors.
- Deduplication logic for blocked queue items is a pure function — test with: first call creates item (returns true), second call same key returns false (no-op), different key creates new item.
- Integration tests require the APIP-5001 test database with both new migrations applied, and a real `pnpm audit --json` call against the actual monorepo. Tag these tests to avoid running in unit-only mode.
- The equivalence config file (YAML/JSON) must be tested with both a match case and a no-match case; also test what happens if the config file is missing (graceful fallback, logged warning).
- Coverage must focus on: `detectNewPackages()`, `checkOverlap()`, `runPnpmAudit()` parse logic, `runDepAudit()` orchestration, deduplication logic, and threshold-based routing. The SQL migration file itself is not Vitest-testable; coverage waiver applies to the DDL file.

### For UI/UX Advisor

- No UI surfaces in this story. The only human-visible output is:
  1. Blocked queue items surfaced via APIP-2010's operator notification mechanism (Slack webhook or equivalent).
  2. Structured `logger.info` / `logger.warn` log lines emitted during each audit run.
- The blocked queue item payload must contain enough human-readable context for the operator to make a decision without needing to look up additional sources: package name, version, finding type, severity, CVE or overlap detail, and a direct npm link if applicable.
- If a summary log line is emitted after each audit run (e.g., "Dep audit: 3 packages added, 1 high-severity finding → 1 blocked queue item created"), ensure the format is operator-friendly and parseable by APIP-4070's weekly report.

### For Dev Feasibility

- **Five analysis functions are the core scope**: These are independently implementable and testable. Recommend decomposing into five subtasks (one per function) plus a sixth subtask for `runDepAudit()` orchestration + DB persistence, and a seventh for blocked queue routing wiring once APIP-2010 is available.
- **Equivalence knowledge base**: The overlap detection heuristic is the highest maintenance-risk part of the story. The equivalence map (e.g., `date-fns ↔ dayjs ↔ moment`, `lodash ↔ ramda`) should be stored in a versioned YAML file committed to the repo (e.g., `packages/backend/orchestrator/src/config/dep-equivalences.yaml`), not in the KB or database. This allows the pipeline itself to update the file via a future story without requiring code changes.
- **pnpm audit `--json` format**: The output schema of `pnpm audit --json` differs between pnpm v7, v8, and v9. Use `PnpmAuditOutputSchema` with `.passthrough()` on unknown fields to be resilient to minor version drift. Test against the actual pnpm version pinned in this repo.
- **Bundle size estimation**: The `bundlephobia` API is a public service with rate limits; prefer running `cost-of-modules` locally if possible, or fall back gracefully if neither is available. Bundle impact estimation should be marked `info` severity at most — never block on it.
- **Lockfile diffing**: Diffing the pnpm lockfile directly is brittle. Prefer reading the `package.json` files across all workspaces before and after merge (available via git diff) to determine which packages changed. This is simpler and more reliable than lockfile parsing.
- **Concurrency guard**: Include a `pg_try_advisory_lock` guard in `runDepAudit()` to prevent concurrent runs — consistent with the APIP-3020 pattern.
- **Canonical references for subtask decomposition**:
  - DB table definition: `packages/backend/database-schema/src/schema/wint.ts`
  - Fire-and-forget insert: `packages/backend/orchestrator/src/nodes/completion/persist-learnings.ts`
  - Blocked queue API: `plans/future/platform/autonomous-pipeline/backlog/APIP-2010/APIP-2010.md` (transitionToBlocked API surface)
  - Story YAML artifact schema: `packages/backend/orchestrator/src/artifacts/story-v2-compatible.ts`
  - LangGraph routing test pattern: `packages/backend/orchestrator/src/graphs/__tests__/elaboration.test.ts`
