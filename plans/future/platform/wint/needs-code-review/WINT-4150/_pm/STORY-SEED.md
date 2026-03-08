---
generated: "2026-03-08"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: WINT-4150

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates WINT-4070 (cohesion-prosecutor, ready-for-qa), WINT-4080 (scope-defender, UAT), WINT-4140 (round-table, needs-code-review) — all relevant upstream agents have progressed since baseline

### Relevant Existing Features

| Feature | Location | Status | Relevance |
|---------|----------|--------|-----------|
| Orchestrator artifact schemas | `packages/backend/orchestrator/src/artifacts/` | Active | Home for new elab artifact Zod schemas — established pattern |
| ELAB.yaml schema | `.claude/schemas/elab-schema.md` | Active (v1.0.0) | The existing golden reference pattern this story extends |
| UserFlows schema | `packages/backend/orchestrator/src/artifacts/__types__/user-flows.ts` | Active | Existing `user-flows.json` Zod schema — directly consumed by this story (defines the user-flows.json schema already) |
| scope-defender agent | `.claude/agents/scope-defender.agent.md` | UAT (WINT-4080) | Produces `scope-challenges.json` (max 5) — one of the target artifacts to standardize |
| cohesion-prosecutor agent | `.claude/agents/cohesion-prosecutor.agent.md` | ready-for-qa (WINT-4070) | Produces `cohesion-findings.json` (max 5/2 blocking) — target artifact |
| round-table agent | `.claude/agents/round-table.agent.md` | needs-code-review (WINT-4140) | Produces `final-scope.json` (schema_version: '1.0-draft') — target artifact to formalize |
| elab-completion-leader | `.claude/agents/elab-completion-leader.agent.md` | Active | The elab-complete gate — target for validation injection |
| elab-analyst | `.claude/agents/elab-analyst.agent.md` | Active | Produces ELAB.yaml; upstream of the new artifact pipeline |
| Knowledge Base (pgvector) | `apps/api/knowledge-base/` | Active | Separate PostgreSQL instance used by KB tools |

### Active In-Progress Work

| Story | Status | Relationship |
|-------|--------|--------------|
| WINT-4140 (Create Round Table Agent) | needs-code-review | Direct blocker/dependency — WINT-4150 formalizes the `final-scope.json` schema that WINT-4140 uses as provisional draft |
| WINT-4070 (cohesion-prosecutor) | ready-for-qa | Produces `cohesion-findings.json` — schema is provisional, WINT-4150 finalizes it |
| WINT-4080 (scope-defender) | UAT | Produces `scope-challenges.json` — schema exists but not yet validated against a golden reference |

### Constraints to Respect

- Protected: all production DB schemas in `packages/backend/database-schema/`
- Protected: `@repo/db` client package API surface
- Protected: Orchestrator artifact schemas at `packages/backend/orchestrator/src/artifacts/` (additive changes only — no breaking changes)
- Protected: Existing ELAB.yaml schema in `.claude/schemas/elab-schema.md`
- No barrel files
- Zod-first types — no TypeScript interfaces
- Additive approach: existing `user-flows.json` schema (`UserFlowsSchema`) already exists at `packages/backend/orchestrator/src/artifacts/__types__/user-flows.ts` — this story must use/reference it, not replace it

---

## Retrieved Context

### Related Endpoints

Not applicable — this story produces schemas and gate validation logic, not API endpoints.

### Related Components

| Component | Path | Relevance |
|-----------|------|-----------|
| UserFlowsSchema | `packages/backend/orchestrator/src/artifacts/__types__/user-flows.ts` | Existing user-flows.json schema; must be the canonical source for user-flows.json |
| Orchestrator artifacts index | `packages/backend/orchestrator/src/artifacts/index.ts` | All new schemas must be exported here (no barrel files — direct export from index.ts) |
| ScopeSchema | `packages/backend/orchestrator/src/artifacts/scope.ts` | Exemplar pattern for a single-file Zod schema with factory function |
| AuditFindingsSchema | `packages/backend/orchestrator/src/artifacts/audit-findings.ts` | Complex multi-enum Zod schema with bounded arrays — reference for cohesion-findings + scope-challenges patterns |
| elab-completion-leader | `.claude/agents/elab-completion-leader.agent.md` | Target file for adding elab-complete gate validation |
| elab-schema.md | `.claude/schemas/elab-schema.md` | Golden reference schema doc pattern |

### Reuse Candidates

| Asset | Location | Usage |
|-------|----------|-------|
| UserFlowsSchema | `packages/backend/orchestrator/src/artifacts/__types__/user-flows.ts` | Directly consume — already defines `user-flows.json` with max-5-flows constraint |
| ScopeSchema factory pattern | `packages/backend/orchestrator/src/artifacts/scope.ts` | File structure pattern: Zod schema + factory function + type export |
| AuditFindingsSchema enum pattern | `packages/backend/orchestrator/src/artifacts/audit-findings.ts` | Bounded array + severity enum pattern for cohesion-findings and scope-challenges |
| `elab-schema.md` doc pattern | `.claude/schemas/elab-schema.md` | Golden reference schema markdown format for new schema docs |
| WINT-4140 `final-scope.json` provisional schema | WINT-4140.md AC-5 | Starting spec for `final-scope.json` — `story_id`, `generated_at`, `schema_version`, `final_acs`, `followups`, `po_warnings`, `da_warnings`, `synthesis_warnings`, `total_warning_count` |
| WINT-4080 scope-challenges contract | `scope-defender.agent.md` | Documents `scope-challenges.json` schema (max 5) |
| WINT-4070 cohesion-findings contract | `cohesion-prosecutor.agent.md` | Documents `cohesion-findings.json` schema (max 5/2 blocking) |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Zod artifact schema (single-file, factory function, type export) | `packages/backend/orchestrator/src/artifacts/scope.ts` | Cleanest exemplar: one file, one schema, one factory, type exported, no barrel re-exports; follows project conventions exactly |
| Bounded arrays with enum-rich Zod schema | `packages/backend/orchestrator/src/artifacts/audit-findings.ts` | Best reference for schemas with multiple enums, bounded array constraints, and discriminated structures — matches cohesion-findings and scope-challenges shape |
| Existing user-flows Zod schema (must not be duplicated) | `packages/backend/orchestrator/src/artifacts/__types__/user-flows.ts` | Already defines `UserFlowsSchema` with `max(5)` flows constraint — this is the canonical `user-flows.json` schema; new story must reference it, not redefine it |
| Schema artifacts index (export pattern) | `packages/backend/orchestrator/src/artifacts/index.ts` | Shows how to register a new schema — additive export added to this file |

---

## Knowledge Context

### Lessons Learned

- **[consumer-validation spike pattern]** Schema design spikes should simulate each downstream consumer reading the schema before integration code is written. Gaps found post-integration are extremely costly.
  - *Applies because*: WINT-4150 defines schemas consumed by round-table.agent.md, elab-completion-leader, cohesion-prosecutor, scope-defender, and potentially LangGraph nodes (WINT-4120) — early consumer validation prevents costly rework across 4+ downstream stories.

- **[Zod schema as primary validation mechanism]** Docs/config stories producing JSON/YAML artifacts use Zod schema validation scripts as the primary test mechanism. Coverage threshold exemption is appropriate when no runnable unit test code exists.
  - *Applies because*: This story produces Zod schemas + validation logic. QA verification should use schema parse tests, not coverage metrics.

- **[Infrastructure stories coverage exemption]** Stories adding only agent markdown files and Zod schemas do not produce meaningful coverage numbers. Appropriate QA check: build success + type-check success + unit tests on schema pass.
  - *Applies because*: WINT-4150 adds Zod schemas + agent gate logic + schema doc files — pure infra/config story.

- **[schema_version as first field]** `schema_version` must be the first field in all ELAB.yaml-pattern artifacts (per `.claude/schemas/elab-schema.md` Validation Rules). Apply same constraint to all new schemas.
  - *Applies because*: New artifact schemas (gaps.json, cohesion-findings.json, etc.) should follow the same convention for migration support.

- **[Consumer-perspective validation for phase gate logic]** Phase gate validation that blocks story advancement must be confirmed to handle both pass and fail cases — a gate that never fires is worse than no gate.
  - *Applies because*: elab-complete gate validation is the enforcement mechanism for this story. Test plan must cover the gate-fires-and-blocks scenario, not just happy path.

### Blockers to Avoid (from past stories)

- Do not define schemas without specifying consumers upfront — enumerate all 4+ consumers before finalizing field list
- Do not duplicate UserFlowsSchema — it already exists; referencing it vs redefining it is a critical correctness check
- Do not make breaking changes to existing artifact schemas — all additions must be backward-compatible (use `z.optional()` or `z.nullable().default(null)`)
- Do not add gate logic that fires when schema files are absent — gate must degrade gracefully when new artifacts don't exist (existing elab runs that predate WINT-4150 must not be blocked retroactively)

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | UAT must use real services, not mocks |
| ADR-006 | E2E Tests Required in Dev Phase | Frontend stories require one happy-path E2E test — NOT applicable here (no UI surface) |

### Patterns to Follow

- Zod-first types: every artifact schema must be `z.object({...})` with `z.infer<typeof Schema>` exported type — no TypeScript interfaces
- Single-file schema pattern: one schema per file, matching existing `scope.ts`, `plan.ts` structure
- Additive exports: add new schemas to `packages/backend/orchestrator/src/artifacts/index.ts`
- Schema doc golden reference: follow `.claude/schemas/elab-schema.md` format for any new schema documentation files
- Bounded array constraints: `z.array(...).max(N)` enforced at schema level, not just in documentation
- `schema_version` as first field in all new JSON artifact schemas

### Patterns to Avoid

- Barrel files — do not create `schemas/index.ts`; export directly from each file and register in the main `index.ts`
- TypeScript interfaces — use only Zod schemas with inferred types
- Breaking changes to existing schemas (QaVerifySchema, EvidenceSchema, etc.) — WINT-4150 must be purely additive
- Redefining UserFlowsSchema — it exists, consume it

---

## Conflict Analysis

### Conflict: WINT-4140 dependency is pending code review
- **Severity**: warning
- **Description**: WINT-4140 (round-table.agent.md) is in needs-code-review. Its `final-scope.json` uses `schema_version: '1.0-draft'` explicitly to signal that WINT-4150 will formalize it. WINT-4150 cannot proceed to implementation until WINT-4140 clears code review and its provisional schema is stable enough to formalize.
- **Resolution Hint**: Story correctly lists `WINT-4140` as a dependency. Implementation should begin only after WINT-4140 reaches ready-to-work or later. The story can be elaborated now but implementation is gated.

### Conflict: user-flows.json schema already exists — duplication risk
- **Severity**: warning
- **Description**: `UserFlowsSchema` is already defined at `packages/backend/orchestrator/src/artifacts/__types__/user-flows.ts` and includes the `max(5)` flows constraint. The story index entry lists `user-flows.json (per schema)` as a target artifact. If implementation naively creates a new schema file for user-flows.json, it would duplicate existing work and create a split source of truth.
- **Resolution Hint**: Story ACs must explicitly require the implementation to reference/re-export the existing `UserFlowsSchema` rather than defining a new one. The "per schema" in the index entry refers to the existing schema — not a new one.

---

## Story Seed

### Title

Standardize Elab Output Artifacts — Define Schemas and Enforce at Elab-Complete Gate

### Description

The WINT Phase 4 elaboration workflow currently produces several machine-readable JSON artifacts from its adversarial agents (cohesion-prosecutor → `cohesion-findings.json`, scope-defender → `scope-challenges.json`, round-table → `final-scope.json`), plus a set of existing artifacts from earlier phases (`user-flows.json`, `mvp-slice.json`, `evidence-expectations.json`). None of these artifacts have formal Zod schemas in the orchestrator artifact package — they exist as informal contracts documented inside agent `.md` files.

Without formal schemas:
- Downstream consumers (round-table, LangGraph nodes in WINT-4120) cannot do schema-validated reads
- The elab-complete gate has no machine-enforceable definition of "done"
- Artifact shape drift is undetectable until runtime failures
- `final-scope.json` is explicitly marked `schema_version: '1.0-draft'` (WINT-4140) precisely because WINT-4150 is expected to provide the formal schema

This story formalizes all elab output artifact schemas as Zod schemas in `packages/backend/orchestrator/src/artifacts/` and adds validation to the elab-complete gate in `elab-completion-leader.agent.md`.

### Initial Acceptance Criteria

- [ ] **AC-1**: `gaps.json` Zod schema defined in `packages/backend/orchestrator/src/artifacts/gaps.ts` with blocking/non-blocking split: `gaps: z.array(GapItemSchema)` where each item has `id`, `description`, `blocking: z.boolean()`, `severity: z.enum(['critical', 'high', 'medium', 'low'])`, `source` (which audit check), `resolution: z.string().nullable()` — array unbounded (no max; ELAB.yaml already caps to 5 blocking via audit logic)
- [ ] **AC-2**: `cohesion-findings.json` Zod schema defined in `packages/backend/orchestrator/src/artifacts/cohesion-findings.ts` with hard constraint: `findings: z.array(CohesionFindingSchema).max(5)`, `blocking_findings: z.array(CohesionFindingSchema).max(2)`, `schema_version` as first field — aligned with cohesion-prosecutor output contract
- [ ] **AC-3**: `user-flows.json` schema is confirmed as the existing `UserFlowsSchema` from `packages/backend/orchestrator/src/artifacts/__types__/user-flows.ts` — no new schema created; a re-export or reference from the main artifacts index is added to surface it under the elab artifact namespace
- [ ] **AC-4**: `scope-challenges.json` Zod schema defined in `packages/backend/orchestrator/src/artifacts/scope-challenges.ts` with hard constraint: `challenges: z.array(ScopeChallengeSchema).max(5)` — aligned with scope-defender output contract; each item has `id`, `feature`, `recommendation: z.enum(['defer-to-backlog', 'reduce-scope', 'accept-as-mvp'])`, `deferral_note: z.string().nullable()`, `severity`
- [ ] **AC-5**: `mvp-slice.json` Zod schema defined in `packages/backend/orchestrator/src/artifacts/mvp-slice.ts` with fields: `schema_version`, `story_id`, `generated_at`, `included_acs: z.array(z.string())`, `excluded_acs: z.array(z.string())`, `rationale: z.string()`
- [ ] **AC-6**: `final-scope.json` Zod schema defined in `packages/backend/orchestrator/src/artifacts/final-scope.ts`, formalizing the `schema_version: '1.0-draft'` provisional schema from WINT-4140 into `schema_version: '1.0'`. Required fields: `story_id`, `generated_at`, `schema_version: z.literal('1.0')`, `final_acs`, `followups` (each with `id`, `text`, `source`, `reason`, `conflict: z.boolean()`), `po_warnings`, `da_warnings`, `synthesis_warnings`, `total_warning_count`
- [ ] **AC-7**: `evidence-expectations.json` Zod schema defined in `packages/backend/orchestrator/src/artifacts/evidence-expectations.ts` with fields: `schema_version`, `story_id`, `generated_at`, `expectations: z.array(EvidenceExpectationSchema)` where each item has `id`, `ac_id`, `description`, `verification_command: z.string().optional()`, `required: z.boolean()`
- [ ] **AC-8**: `story-brief.md` is defined as a prose artifact (not a JSON schema); its required sections are documented in a schema doc file `.claude/schemas/story-brief-schema.md` following the format of `.claude/schemas/elab-schema.md`
- [ ] **AC-9**: All 7 new Zod schemas are exported from `packages/backend/orchestrator/src/artifacts/index.ts` (additive additions only — no existing exports removed or modified)
- [ ] **AC-10**: `elab-completion-leader.agent.md` is updated to include an elab-complete gate validation step: after finalizing ELAB.yaml verdict, before moving story directory, validate that required artifacts exist at `{story_dir}/_implementation/`. Required artifacts for PASS verdict: `ELAB.yaml`. New artifact validation is soft (warn if missing, do not block) until all upstream agents produce them — gate must degrade gracefully for stories elaborated before WINT-4150 ships
- [ ] **AC-11**: Each new Zod schema file includes a `create{ArtifactName}()` factory function and associated unit tests in `packages/backend/orchestrator/src/artifacts/__tests__/{artifact-name}.test.ts` validating: (a) valid input passes parsing, (b) input violating hard constraints (e.g., >5 challenges) fails parsing with correct error, (c) factory function produces a schema-valid object

### Non-Goals

- Do NOT create an API endpoint for elab artifacts — these are filesystem-only artifacts
- Do NOT modify the existing ELAB.yaml schema (`.claude/schemas/elab-schema.md`) — it is a protected golden reference
- Do NOT redefine `UserFlowsSchema` — reference the existing one at `packages/backend/orchestrator/src/artifacts/__types__/user-flows.ts`
- Do NOT make the elab-complete gate blocking for stories that lack the new artifacts — soft validation (warn, do not block) until upstream agents catch up
- Do NOT add a schema for `scope-challenges.json` that conflicts with scope-defender's existing output contract — schemas must match what the existing agents already produce
- Do NOT make breaking changes to existing orchestrator artifacts (EvidenceSchema, ReviewSchema, QaVerifySchema, etc.)
- Do NOT create a LangGraph node (deferred to WINT-4120)
- Do NOT add agent assignment to `model-assignments.yaml` (handled separately)
- Protected: all production DB schemas, `@repo/db` client, Umami analytics schema

### Reuse Plan

- **Components**: UserFlowsSchema (existing, must not be duplicated), ScopeSchema file structure (template for new schema files), AuditFindingsSchema enum pattern (template for bounded arrays and severity enums)
- **Patterns**: One-file-per-schema pattern; `create{Name}()` factory function per schema; `z.array().max(N)` for bounded arrays; `schema_version` as first field; additive export additions to `index.ts`
- **Packages**: `packages/backend/orchestrator` (existing, where all new schemas live); `zod` (already a dependency)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

This is a mixed story: primarily a TypeScript package story (new Zod schemas with unit tests), plus an agent-prompt update (elab-completion-leader gate logic).

**Test coverage approach:**
- New Zod schema files in `packages/backend/orchestrator/src/artifacts/` MUST have Vitest unit tests — one test file per schema
- Each test file needs: (a) valid parse test, (b) constraint violation test (e.g., >5 challenges should fail), (c) factory function test
- The elab-completion-leader gate update is agent-prompt-only — no automated tests; verification is structural (grep-based) per WKFL-010 pattern
- Coverage threshold exemption may be appropriate for the gate logic (agent markdown) but NOT for the TypeScript schema files — those are real code
- Key constraint to test: `cohesion-findings.max(2 blocking)` and `scope-challenges.max(5)` — these are the hard caps that matter most for downstream consumers
- Verify `UserFlowsSchema` re-export does not change the schema itself — equality check

**Happy path tests needed:**
1. All 7 schemas parse valid data from agent-output examples
2. cohesion-findings with 3 blocking items fails (max 2 blocking)
3. scope-challenges with 6 items fails (max 5)
4. final-scope.json with `schema_version: '1.0-draft'` fails (must be `'1.0'`)

### For UI/UX Advisor

Not applicable. This story has no UI surface, no React components, no frontend changes. All artifacts are backend TypeScript schemas and agent markdown. Skip.

### For Dev Feasibility

**Complexity assessment**: Low-to-medium. Pure TypeScript schema definitions following established patterns (no new infrastructure, no DB migrations, no API endpoints). The primary work is:

1. **7 new Zod schema files** — each follows the `scope.ts` pattern. Straightforward but requires careful reading of existing agent contracts to ensure schema alignment
2. **7 test files** — Vitest unit tests for each schema. Follow existing `__tests__/scope.test.ts` pattern
3. **1 `index.ts` update** — additive exports only; low risk
4. **1 agent `.md` update** — `elab-completion-leader.agent.md` gate step addition; agent-prompt-only change

**Key risk**: Schema misalignment — if the Zod schemas don't match what cohesion-prosecutor and scope-defender actually output, consumers will get parse errors at runtime. Mitigation: read agent output sections in detail before writing schemas.

**Canonical references for subtask decomposition:**
- `packages/backend/orchestrator/src/artifacts/scope.ts` — copy this file structure for each new schema
- `packages/backend/orchestrator/src/artifacts/__tests__/scope.test.ts` — copy this test structure for each new test file
- `packages/backend/orchestrator/src/artifacts/index.ts` — additive export additions follow existing format
- `.claude/agents/elab-completion-leader.agent.md` — gate step addition follows Step 1-6 pattern already in the file

**Subtask decomposition hint** (for dev feasibility reviewer to refine):
- ST-1: Define `gaps.ts` schema + test (AC-1)
- ST-2: Define `cohesion-findings.ts` schema + test (AC-2)
- ST-3: Confirm/re-export UserFlowsSchema, update index (AC-3)
- ST-4: Define `scope-challenges.ts` schema + test (AC-4)
- ST-5: Define `mvp-slice.ts` schema + test (AC-5)
- ST-6: Define `final-scope.ts` schema + test (AC-6)
- ST-7: Define `evidence-expectations.ts` schema + test (AC-7)
- ST-8: Write `story-brief-schema.md` doc (AC-8)
- ST-9: Update `index.ts` with all exports (AC-9)
- ST-10: Update `elab-completion-leader.agent.md` gate logic (AC-10)

Note: ST-1 through ST-7 are fully parallelizable. ST-9 and ST-10 depend on ST-1 through ST-7.

**Story sizing check**: 11 ACs, touches `packages/backend/orchestrator` only (1 package), no frontend, no backend API, no DB. Sizing indicators: 1 of 8 (>8 ACs — marginally over). Not a split candidate given the cohesion of purpose (all schemas are tightly related) and that ST-1 through ST-7 are near-identical tasks.
