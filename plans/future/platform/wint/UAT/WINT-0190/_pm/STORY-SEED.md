---
generated: "2026-02-18"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: false
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: WINT-0190

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No baseline reality file available. Context derived entirely from codebase scanning, index files, and sibling story artifacts.

### Relevant Existing Features

| Feature | Status | Relevance |
|---------|--------|-----------|
| WINT-0180 Examples Framework | ready-to-work | Direct dependency — defines where examples live, format constraints (max 2 positive + 1 negative, 10-25 line skeletons). `examples-framework.md` v1.0.0 already exists in `.claude/agents/_shared/` |
| WINT-0200 User Flows Schema | pending | Sibling story. `user-flows.schema.json` already exists at `packages/backend/orchestrator/src/schemas/`. Provides the canonical pattern for JSON Schema authoring in this project |
| WINT-0210 Populate Role Pack Templates | ready-to-work | Downstream consumer — explicitly depends on WINT-0190. AC-1 of WINT-0210 requires a patch-plan.json pattern skeleton, and AC-7 requires an example patch-plan.json that validates against this story's schema |
| `.claude/prompts/role-packs/` directory | does not exist | WINT-0180 recommended this as the canonical storage location. No files have been created there yet |
| `packages/backend/orchestrator/src/schemas/` | exists with 1 file | `user-flows.schema.json` is the only schema present — the canonical reference for how project schemas should be structured |
| `.claude/agents/_shared/expert-personas.md` | exists | Contains Engineering Expert Persona with "Patch Queue" and repair concepts embedded in the feasibility assessment mental model — source material for role pack content |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| WINT-0180 | ready-to-work | Blocking dependency — storage strategy must be confirmed before WINT-0190 can place its schema. `examples-framework.md` is already on disk (v1.0.0), indicating WINT-0180 may be partially complete |
| WINT-0210 | ready-to-work | Downstream consumer — explicitly lists WINT-0190 as a dependency in frontmatter. WINT-0210 AC-1 requires patch-plan.json skeleton and AC-7 requires valid example output from this story |
| WINT-0200 | pending | Sibling story — provides the user-flows.schema.json that WINT-0210 PO role pack depends on. No overlap with WINT-0190 scope |

### Constraints to Respect

1. **Schema placement** — WINT-0210 references `schemas/patch-plan.schema.json` (relative to repo or package root). The sibling `user-flows.schema.json` lives at `packages/backend/orchestrator/src/schemas/` — this is the most likely canonical location
2. **Dev role pack update** — story scope includes updating a Dev role pack, but `.claude/prompts/role-packs/dev.md` does not yet exist (depends on WINT-0210). The "Dev role pack update" in the infrastructure list is a specification contribution, not a file modification
3. **Patch size limits require tuning** — the index explicitly notes this as a risk. Schema must use reasonable defaults while acknowledging they are starting estimates
4. **WINT-0210 gate** — WINT-0210 cannot start implementation of AC-1 (Dev role pack) until WINT-0190 is complete, since it requires patch-plan.schema.json and an example patch-plan.json. This creates a real scheduling dependency
5. **No code changes** — this story produces documentation/schema artifacts only (JSON Schema file, Dev role pack specification). No TypeScript, no tests required

---

## Retrieved Context

### Related Endpoints

None — this is schema/documentation work with no API endpoints.

### Related Components

| Component | Location | Relevance |
|-----------|----------|-----------|
| `user-flows.schema.json` | `packages/backend/orchestrator/src/schemas/user-flows.schema.json` | **Canonical reference** for JSON Schema authoring style in this project — structure, `$defs`, `$id`, enum patterns, and `maxItems` constraints all follow this pattern |
| `examples-framework.md` | `.claude/agents/_shared/examples-framework.md` | WINT-0180 output — defines example format (max 2 positive + 1 negative), pattern skeleton requirements (10-25 lines), and hybrid storage strategy |
| `expert-personas.md` | `.claude/agents/_shared/expert-personas.md` | Engineering Expert Persona contains adjacent concepts (feasibility mindset, risk calibration). QA Expert Persona contains "Mock Detection" and "Repair Loop" related heuristics |
| `WINT-0210.md` | `plans/future/platform/wint/ready-to-work/WINT-0210/WINT-0210.md` | Documents exactly what WINT-0190 must produce for downstream consumption: patch-plan.json skeleton (10-25 lines), 2 positive + 1 negative examples for Dev role pack |

### Reuse Candidates

| Pattern | Source | Application |
|---------|--------|-------------|
| JSON Schema structure (`$schema`, `$id`, `$defs`, `required`, `maxItems`) | `user-flows.schema.json` | Direct template for `patch-plan.schema.json` structure |
| Enum-based ordering constraint | `user-flows.schema.json` `UserFlowCapability` enum | Model for `patch_type` enum (types_schema, api, ui, tests, cleanup) |
| `maxItems` constraints on arrays | `user-flows.schema.json` `flows` and `steps` arrays | Model for `max_files` and `max_diff_lines` enforcement in patch steps |
| YAML frontmatter metadata | All `.agent.md` files, `WINT-0210.md` | Metadata format for schema/role-pack versioning |
| Hybrid storage strategy | `examples-framework.md` | Role pack specification contributions live in `.claude/prompts/role-packs/` (filesystem), schema in `packages/backend/orchestrator/src/schemas/` |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| JSON Schema authoring | `packages/backend/orchestrator/src/schemas/user-flows.schema.json` | Only project-authored schema; shows `$schema`, `$id`, `title`, `description`, enum arrays, `maxItems` integer constraints, and `$defs` reuse — all patterns WINT-0190 must replicate |
| Examples framework format | `.claude/agents/_shared/examples-framework.md` | Defines max 2 positive + 1 negative example format, 10-25 line skeleton requirement, and lifecycle management that Dev role pack examples must follow |
| Story dependencies and downstream expectations | `plans/future/platform/wint/ready-to-work/WINT-0210/WINT-0210.md` | Authoritative specification of what WINT-0190 must produce: schema path, example format, and how the Dev role pack will reference it |

---

## Knowledge Context

### Lessons Learned

KB unavailable — no lessons retrieved. Inferred from sibling story artifacts:

- **From WINT-0210 risk register:** "WINT-0190 pending — Patch Queue schema undefined. Mitigation: Create inline Patch Queue example based on WINT-0190 specification, update when schema available." This confirms WINT-0210 is waiting for a concrete schema artifact, not just a description.
- **From WINT-0200/WINT-0210 experience:** JSON Schema hard caps (`maxItems`, `enum`) are the preferred enforcement mechanism. Verbal "limits" in documentation are insufficient — they must be in the schema itself.
- **From WINT-0180 output:** The examples-framework.md confirms filesystem-first for role pack artifacts. This story should not introduce database storage for the schema.

### Blockers to Avoid (from past stories)

- Placing the schema somewhere that WINT-0210 cannot find it — `packages/backend/orchestrator/src/schemas/` is the established location
- Using open-ended numeric fields without `maximum` constraints — the index story goal explicitly says "stop mega-patches." The schema must enforce this, not just document it
- Creating a "pure documentation" story that produces no machine-readable artifact — the schema JSON file is the primary deliverable, not the description of the pattern
- Defining patch size limits too aggressively — the index notes "patch size limits need tuning per codebase." Use conservative defaults (e.g., max_files: 10, max_diff_lines: 300) with clear override documentation

### Architecture Decisions (ADRs)

ADR-LOG.md not found in WINT plan directory. Applying project-level conventions from CLAUDE.md:

| Constraint | Source | Impact |
|-----------|--------|--------|
| Zod-first types for code | CLAUDE.md | Not directly applicable here (no TypeScript). However, if a Zod schema for patch-plan validation is created in the future, it should be derived from the JSON Schema |
| No TypeScript interfaces | CLAUDE.md | No code deliverables in this story |
| Semantic versioning | `examples-framework.md` | Schema file should use `schema_version` field |

### Patterns to Follow

1. **JSON Schema structure** — Follow `user-flows.schema.json` pattern exactly: `$schema` draft 2020-12, `$id` with project domain, `title`, `description`, `type: object`, `$defs` for reusable types, `required` array
2. **Enum for ordering** — Use string enum to enforce patch ordering sequence rather than freeform strings
3. **maxItems + maximum constraints** — Use JSON Schema numeric constraints (`maximum` for `max_files` and `max_diff_lines`) not just documentation
4. **Examples in role pack** — Follow `examples-framework.md`: max 2 positive, max 1 negative, pattern skeleton 10-25 lines
5. **Schema placement** — `packages/backend/orchestrator/src/schemas/patch-plan.schema.json` (same directory as `user-flows.schema.json`)

### Patterns to Avoid

1. **Patch limits as documentation only** — Must be enforced in schema via `maximum` constraints, not just described in comments
2. **Monolithic patch steps** — The Repair Loop pattern (fix only referenced errors) must be explicitly represented as a separate `repair_loop` section or type in the schema, not just mentioned in description
3. **Unbounded arrays** — All arrays (patches, files per patch) must have `maxItems` set
4. **Schema without examples** — WINT-0210 explicitly requires a valid example `patch-plan.json` for AC-7. The schema alone is insufficient

---

## Conflict Analysis

### Conflict: Dependency status ambiguity

- **Severity**: warning (non-blocking)
- **Description**: WINT-0180 has `status: ready-to-work` in the index, meaning it has not been implemented yet. However, `examples-framework.md` v1.0.0 already exists on disk at `.claude/agents/_shared/examples-framework.md`, created on 2026-02-14. This suggests WINT-0180 is partially or fully complete despite the index status. WINT-0190 depends on WINT-0180's storage strategy decisions — specifically where role pack specifications live. The `examples-framework.md` document confirms filesystem storage in `.claude/prompts/role-packs/` and database for shared examples.
- **Resolution Hint**: Treat WINT-0180 as complete for storage strategy purposes (the filesystem decision is documented in `examples-framework.md`). Verify WINT-0180 status before implementation begins. If status remains `ready-to-work`, the implementation decision in `examples-framework.md` is still valid and can be relied upon.

---

## Story Seed

### Title

Create Patch Queue Pattern and Schema

### Description

**Context:**
The WINT development workflow currently suffers from mega-patches — single commits that touch UI, API, database schema, tests, and refactors simultaneously. This creates verification failures (hard to confirm each layer is correct), review fatigue, and repair loops that cascade across all touched areas. WINT-0210 (Populate Role Pack Templates) is gated on this story, as it needs the Patch Queue schema to populate the Dev role pack.

**Problem:**
- No machine-readable specification for what constitutes an acceptable patch
- Agents have no enforced ordering constraint (types/schema → API → UI → tests → cleanup)
- Repair loops are unbounded — agents fix more than the referenced errors
- No per-patch limits on files changed or diff lines
- WINT-0210 Dev role pack cannot be completed without a concrete schema and example to reference

**Proposed Solution:**

1. **`patch-plan.schema.json`** — A JSON Schema at `packages/backend/orchestrator/src/schemas/patch-plan.schema.json` that defines:
   - `patches` array (maxItems enforced, e.g., 10) with ordered `patch_type` enum: `types_schema` → `api` → `ui` → `tests` → `cleanup`
   - Per-patch constraints: `max_files` (e.g., maximum: 10), `max_diff_lines` (e.g., maximum: 300)
   - `repair_loop` object: `fix_only_referenced_errors: boolean`, `max_iterations` (e.g., maximum: 5)
   - `description` and `verification_command` fields per patch for proof-of-completion

2. **Dev role pack specification contribution** — A compact specification section (not the full role pack file, which belongs to WINT-0210) that describes the Patch Queue pattern in the WINT-0180 examples format:
   - 2 positive examples: (a) correct ordered patch-plan.json, (b) repair loop correctly scoped
   - 1 negative example: mega-patch that violates ordering and exceeds limits
   - Pattern skeleton: 10-25 line `patch-plan.json` example

**Integration:**
- `patch-plan.schema.json` will be referenced in `WINT-0210` Dev role pack (AC-1) and example validation (AC-7)
- The Repair Loop definition feeds into the WINT-3xxx scoreboard metrics (Dev↔Repair loop count tracking)
- The Gatekeeper Sidecar (WINT-3010) may use `patch_type` ordering as a verification signal

### Initial Acceptance Criteria

- [ ] **AC-1: Create `patch-plan.schema.json`**
  - File created at `packages/backend/orchestrator/src/schemas/patch-plan.schema.json`
  - Follows JSON Schema draft 2020-12 (same as `user-flows.schema.json`)
  - Defines `patches` array with `maxItems` (e.g., 10) and `patch_type` enum enforcing ordering: `types_schema`, `api`, `ui`, `tests`, `cleanup`
  - Each patch includes: `patch_type`, `description`, `max_files` (with `maximum` constraint), `max_diff_lines` (with `maximum` constraint), `verification_command` (optional string)
  - `$id` set to `https://lego-moc-platform.com/schemas/patch-plan.schema.json`
  - `schema_version` field required with semver pattern constraint

- [ ] **AC-2: Define Repair Loop Sub-Schema**
  - `repair_loop` object defined in schema `$defs`
  - `fix_only_referenced_errors: boolean` — when true, agent may only fix errors cited in the tool output
  - `max_iterations: integer` with `maximum` constraint (e.g., 5)
  - `rerun_command: string` — the command to run after each fix (e.g., `pnpm lint`, `pnpm check-types`)
  - `repair_loop` field is optional in each patch step (not all patches require a repair loop spec)

- [ ] **AC-3: Create Canonical Example `patch-plan.json`**
  - Example file created at `packages/backend/orchestrator/src/schemas/examples/patch-plan.example.json` (or inline in schema as an example comment)
  - Demonstrates correct ordering: types_schema → api → tests sequence with repair_loop on lint step
  - Example validates against the schema (can be verified with AJV or similar)
  - Content length: 10-25 lines (suitable as a pattern skeleton for WINT-0210 AC-1)

- [ ] **AC-4: Document Patch Queue Pattern**
  - Pattern documentation written as a specification contribution for the Dev role pack
  - Stored at `.claude/prompts/role-packs/_specs/patch-queue-pattern.md` (or inline in a Dev role pack draft)
  - Includes: decision rule (when to use Patch Queue), 2 positive examples (ordered patch plan, scoped repair loop), 1 negative example (mega-patch violating ordering)
  - Explicitly documents the default limits and their rationale (why max_files=10, why max_diff_lines=300)

- [ ] **AC-5: Document Repair Loop Pattern**
  - Repair Loop pattern documented separately from Patch Queue (distinct pattern)
  - Defines the "fix only referenced errors" constraint: agent reads tool output, identifies specific error codes/line numbers, fixes only those locations
  - Documents "minimal changes" requirement: do not refactor surrounding code while in repair mode
  - Documents "rerun until green" sequence with max_iterations guardrail
  - Both patterns reference each other (Repair Loop activates when a patch step fails verification)

- [ ] **AC-6: Validate Schema Completeness for WINT-0210**
  - Confirm that `patch-plan.schema.json` and `patch-plan.example.json` satisfy WINT-0210 AC-1 requirements:
    - Schema path matches what WINT-0210 Dev role pack will reference
    - Example is 10-25 lines (pattern skeleton requirement)
    - Example demonstrates `types_schema → api → ui → tests → cleanup` ordering
  - Document any WINT-0210 AC-7 validation steps (how to run AJV against the example)

### Non-Goals

- Implementing the Gatekeeper Sidecar that enforces patch plan compliance at runtime (WINT-3010)
- Creating the Dev role pack file itself — that is WINT-0210 AC-1
- Creating the `.claude/prompts/role-packs/` directory — that is WINT-0180/WINT-0210 scope
- Implementing any TypeScript code (no Zod schemas, no validators, no tests required)
- Tuning the default limits per-codebase — this story establishes the schema with defaults; per-codebase tuning is a future configuration concern
- Integrating patch plan enforcement into agent workflows (WINT-3xxx phase)
- Creating other role pack specifications (PO, DA, QA) — those are WINT-0200 and WINT-0210 scope

### Reuse Plan

- **Components**: `user-flows.schema.json` as direct structural template for `patch-plan.schema.json`
- **Patterns**: `examples-framework.md` max-2-positive-1-negative format for all examples in AC-4 and AC-5
- **Packages**: None — documentation/schema artifacts only

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

This story produces only documentation and JSON Schema artifacts. No TypeScript code is written.

**Validation approach:**
- AC-1/AC-2: Schema structural validation — confirm JSON Schema is valid (no self-referential errors, enum values correct, required fields set)
- AC-3: Example validation — run `ajv validate -s patch-plan.schema.json -d patch-plan.example.json` (AJV CLI or equivalent)
- AC-4/AC-5: Pattern review — manual review by PM/Dev to confirm examples are clear, actionable, and within 25 lines
- AC-6: Cross-story compatibility check — confirm schema file path and example structure meet WINT-0210 AC-1 and AC-7 requirements

**No unit tests required.** The test plan should focus on: (1) schema validity, (2) example-against-schema validation, (3) manual review of pattern clarity.

### For UI/UX Advisor

Not applicable — no UI components in this story.

### For Dev Feasibility

**Key constraints:**
1. **Schema file location** — must be `packages/backend/orchestrator/src/schemas/patch-plan.schema.json` to match sibling `user-flows.schema.json`. Do not place it in a different directory.
2. **Patch type enum ordering** — The enum defines the ordering but JSON Schema cannot enforce sequential ordering of enum values in an array. The schema must use `contains` constraints or document that ordering is a convention enforced by agents/tools, not the schema itself. This is a known limitation of JSON Schema for ordered sequences.
3. **`max_files` and `max_diff_lines` as schema constraints vs. instance fields** — Consider whether these are schema-level defaults (apply to all patches unless overridden) or per-instance fields. Per-instance is more flexible but requires explicit values. Recommendation: required per-patch fields with `maximum` enforcement in the schema.
4. **WINT-0210 dependency is real** — WINT-0210 cannot produce AC-1 (Dev role pack) or AC-7 (example validation) without this story's output. Prioritize completing AC-3 (example file) early, as it unblocks WINT-0210 fastest.
5. **Canonical references for implementation**: `packages/backend/orchestrator/src/schemas/user-flows.schema.json` for all structural decisions. Do not deviate from the established schema authoring style.
