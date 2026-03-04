---
generated: "2026-03-02"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: WINT-0200

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: KB search unavailable (OpenAI API error at seed generation time); lessons loaded from codebase evidence instead

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| `user-flows.schema.json` | `packages/backend/orchestrator/src/schemas/user-flows.schema.json` | **Primary deliverable already exists** — file is fully implemented with all required enums and constraints |
| `patch-plan.schema.json` | `packages/backend/orchestrator/src/schemas/patch-plan.schema.json` | Sibling schema following identical structural pattern; second canonical reference |
| Orchestrator artifact schemas | `packages/backend/orchestrator/src/artifacts/` | Broader schema ecosystem; Zod-validated YAML artifacts |
| Schema examples directory | `packages/backend/orchestrator/src/schemas/examples/` | Established location for example files (populated by WINT-0190) |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|-------------|
| WINT-0210 (Populate Role Pack Templates) | ready-to-work | **Direct consumer** — PO role pack references `user-flows.schema.json`; blocked on WINT-0200 formal completion |
| WINT-0220 (Define Model-per-Task Strategy) | ready-for-qa | No overlap with schema files |
| WINT-0040 (Create Telemetry Tables) | ready-for-qa | No overlap |

### Constraints to Respect

- `packages/backend/orchestrator/src/artifacts/` schemas are protected (orchestrator artifact Zod schemas — do not modify)
- The existing `user-flows.schema.json` is already referenced by WINT-0190 and WINT-0210 as the canonical JSON Schema pattern — its structure must not be changed without downstream impact assessment
- JSON Schema draft 2020-12 is the established standard for this project (`$schema: https://json-schema.org/draft/2020-12/schema`)
- AJV v8 is the assumed validator (per WINT-0190 ACs)

---

## Retrieved Context

### Related Endpoints

None. WINT-0200 is a schema/documentation story — no API endpoints are involved.

### Related Components

None. No frontend UI components are involved.

### Reuse Candidates

| Asset | Location | How to Reuse |
|-------|----------|-------------|
| `user-flows.schema.json` | `packages/backend/orchestrator/src/schemas/user-flows.schema.json` | **Primary artifact — already complete.** Story must verify it matches spec and provide a canonical example. |
| `patch-plan.schema.json` structure | `packages/backend/orchestrator/src/schemas/patch-plan.schema.json` | Demonstrates `$defs` reuse, `maxItems`, enum patterns — reference for any schema extension work |
| `patch-plan.example.json` | `packages/backend/orchestrator/src/schemas/examples/patch-plan.example.json` | Reference format for creating a `user-flows.example.json` |
| ADR-005 (UAT testing) | `plans/stories/ADR-LOG.md` | UAT must use real services — any test plan must comply |

### Similar Stories

| Story | Similarity | Lesson |
|-------|-----------|--------|
| WINT-0190 (Patch Queue Pattern and Schema) | Near-identical structure — also a JSON Schema story with pattern docs | Follow same delivery: schema file + example file + AJV validation; keep example 10-25 lines |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| JSON Schema authoring | `packages/backend/orchestrator/src/schemas/user-flows.schema.json` | **This IS the primary deliverable** — shows complete `$schema`, `$id`, `title`, `$defs`, enums, `maxItems`, `required` array structure; already matches spec exactly |
| Schema example format | `packages/backend/orchestrator/src/schemas/examples/patch-plan.example.json` | Shows the expected format for a companion `user-flows.example.json` — 10-25 line constraint, validates against sibling schema |
| Schema companion story | `plans/future/platform/wint/UAT/WINT-0190/WINT-0190.md` | AC structure and subtask decomposition for a nearly identical JSON Schema story; reuse AC pattern |

---

## Knowledge Context

### Lessons Learned

KB search was unavailable at generation time. The following lessons are derived from codebase evidence in completed story files:

- **[WINT-0190]** JSON Schema hard caps (`maxItems`, `enum`) are the preferred enforcement mechanism for agent behavior. Verbal limits in documentation are insufficient — they must be in the schema itself. *(category: pattern)*
  - *Applies because*: WINT-0200's core value proposition is enforcing `max 5 flows` and `max 7 steps` via schema constraints, not documentation.

- **[WINT-0190]** JSON Schema draft 2020-12 cannot enforce sequential ordering of enum values within an array. Ordering is a documented convention; runtime enforcement is separate scope. *(category: constraint)*
  - *Applies because*: The `UserFlowState` and `UserFlowCapability` enums have a conventional order — the schema enforces membership but not sequence.

- **[WINT-0210 seed]** WINT-0200 status was auto-corrected in 4 locations because downstream stories referenced it as "UAT complete" while the index showed "pending." *(category: pattern)*
  - *Applies because*: The schema file exists on disk (`user-flows.schema.json` is fully implemented) but the formal story/example/verification artifacts have not been generated. The story must produce the PM artifacts even though the code artifact predates the story process.

- **[WINT-0190]** The example file must be 10-25 lines — required for WINT-0210 AC pattern skeleton compatibility. *(category: constraint)*
  - *Applies because*: A `user-flows.example.json` must be created and must respect this line budget.

### Blockers to Avoid (from past stories)

- Do not assume `user-flows.schema.json` needs to be created from scratch — it already exists at the canonical path. The story scope is to produce PM artifacts (example file, AJV validation evidence, story doc) and verify the existing schema matches spec.
- Do not modify the schema structure in ways that break WINT-0190's documentation (which references `user-flows.schema.json` as the canonical pattern reference).
- Do not expand the states or capabilities enums without explicit scope — the index entry defines the exact values. Any expansion is future scope.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 | API Endpoint Path Schema | Not applicable — no API endpoints |
| ADR-002 | Infrastructure-as-Code Strategy | Not applicable — no infrastructure |
| ADR-003 | Image Storage and CDN | Not applicable |
| ADR-004 | Authentication Architecture | Not applicable |
| ADR-005 | Testing Strategy — UAT Must Use Real Services | Applies: if any UAT verification is included, it must use real AJV validation, not mocked schema output |
| ADR-006 | E2E Tests Required in Dev Phase | Applies with skip condition: `frontend_impacted: false` — this story has no UI, so E2E skip is valid |

### Patterns to Follow

- JSON Schema draft 2020-12 for all schemas (`$schema: https://json-schema.org/draft/2020-12/schema`)
- `$id` using canonical URL pattern (`https://lego-moc-platform.com/schemas/...`)
- `$defs` for all reusable sub-types
- `maxItems` enforced at schema level (not documentation)
- Example files in `packages/backend/orchestrator/src/schemas/examples/` at 10-25 lines

### Patterns to Avoid

- Do not use TypeScript interfaces — but note this story produces JSON Schema + JSON examples, not TypeScript. No Zod schemas required for the primary deliverable.
- Do not create a new schema file when the existing one already satisfies all spec requirements.
- Do not exceed 25 lines in the example file.

---

## Conflict Analysis

### Conflict: Status Discrepancy (warning)
- **Severity**: warning (non-blocking)
- **Description**: The per-epic stories.index.md marks WINT-0200 as `done` (Phase 0 bootstrap task completed), while the platform index marks it `ready-to-work` (formal story not generated). The schema file (`user-flows.schema.json`) exists and is fully implemented — the discrepancy is between the implementation artifact being complete and the formal story PM artifacts (this STORY-SEED, TEST-PLAN, DEV-FEASIBILITY, story.md) not yet existing.
- **Resolution Hint**: This seed resolves the discrepancy by generating the PM artifacts. The implementation scope is verification + example creation, not schema re-implementation. The story can be marked `ready-to-work` or promoted directly to `ready-for-qa` after PM artifact generation given the implementation already exists.

---

## Story Seed

### Title

Create User Flows Schema with State/Capability Enums — PM Artifacts and Example

### Description

**Context**: The `user-flows.schema.json` was created as part of the WINT Phase 0 bootstrap process. The file exists at `packages/backend/orchestrator/src/schemas/user-flows.schema.json` and contains the full schema: states enum (`loading`, `empty`, `validation_error`, `server_error`, `permission_denied`), capabilities enum (`create`, `view`, `edit`, `delete`, `upload`, `replace`, `download`), `maxItems: 5` on flows, and `maxItems: 7` on steps. The schema is referenced by both WINT-0190 and WINT-0210 as a canonical pattern.

**Problem**: The formal story PM artifacts have not been generated (no STORY-SEED, no TEST-PLAN, no DEV-FEASIBILITY, no story.md, no canonical example file). WINT-0210 gates on WINT-0200 being formally complete. The missing example file (`user-flows.example.json`) means no AJV validation evidence exists, and WINT-0210's PO role pack cannot reference a concrete usage example.

**Proposed Solution**: Generate the missing PM artifacts for this story. Verify the existing schema against the index spec. Create `user-flows.example.json` at the canonical examples path. Produce AJV validation evidence. The schema file itself requires no changes unless the audit reveals a gap against the spec.

### Initial Acceptance Criteria

- [ ] **AC-1**: Schema exists and matches spec — `packages/backend/orchestrator/src/schemas/user-flows.schema.json` exists with all required fields: `schema_version` (string, semver pattern), `flows` (array, `maxItems: 5`), `UserFlowState` enum with all 5 required values, `UserFlowCapability` enum with all 7 required values, `UserFlowStep.capabilities` array (`maxItems: 7`), `UserFlow.steps` array (`maxItems: 7`). File must conform to JSON Schema draft 2020-12.
- [ ] **AC-2**: Schema validates against meta-schema — `npx ajv validate -s https://json-schema.org/draft/2020-12/schema -d packages/backend/orchestrator/src/schemas/user-flows.schema.json` exits 0
- [ ] **AC-3**: Canonical example created — `packages/backend/orchestrator/src/schemas/examples/user-flows.example.json` exists, is 10-25 lines, and demonstrates: at minimum 2 flows, each flow uses at least one state and one capability, `featureName` field included
- [ ] **AC-4**: Example validates against schema — `npx ajv validate -s packages/backend/orchestrator/src/schemas/user-flows.schema.json -d packages/backend/orchestrator/src/schemas/examples/user-flows.example.json` exits 0
- [ ] **AC-5**: Constraint enforcement verified — At least 2 negative validation tests documented: (a) `flows` array with 6 items fails `maxItems: 5`, (b) `steps` array with 8 items fails `maxItems: 7`
- [ ] **AC-6**: WINT-0210 compatibility confirmed — The schema path (`packages/backend/orchestrator/src/schemas/user-flows.schema.json`) matches the exact path referenced in `plans/future/platform/wint/ready-to-work/WINT-0210/WINT-0210.md` AC-7 and the PO role pack scope
- [ ] **AC-7**: Story document generated — `WINT-0200.md` created in the story output directory with complete story structure: context, goal, non-goals, scope, ACs, test plan, reality baseline, and canonical references

### Non-Goals

- Do NOT modify the existing `user-flows.schema.json` unless an audit gap is found against the index spec — the schema is presumed correct
- Do NOT expand the states or capabilities enums beyond the 5+7 values defined in the index entry
- Do NOT add TypeScript Zod schemas or runtime validators for this schema (that would be a separate story)
- Do NOT create a separate MCP tool or runtime enforcement for user flows (that is WINT-3xxx phase)
- Do NOT modify WINT-0210 or any downstream story artifacts
- Do NOT implement any UI or API components

### Reuse Plan

- **Schema**: `packages/backend/orchestrator/src/schemas/user-flows.schema.json` — verify, do not re-create
- **Example format**: Follow `packages/backend/orchestrator/src/schemas/examples/patch-plan.example.json` — same directory, same 10-25 line constraint
- **AC structure**: Modeled after WINT-0190 ACs (same story type: schema + example + AJV validation)
- **Packages**: No new packages — this is documentation + JSON artifact creation

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- The test plan must cover AJV validation as the primary verification method — no unit tests, no Vitest, no frontend testing
- Include both positive validation (example passes schema) and negative validation (over-limit arrays fail schema)
- ADR-006 skip condition applies: `frontend_impacted: false`, E2E tests are not applicable
- ADR-005 applies: if any live validation is run (e.g., AJV CLI), use real AJV, not mocked schema output
- The `wc -l` line count check on the example file should be included as a formal AC verification step

### For UI/UX Advisor

- This story has no UI impact — the `user-flows.schema.json` is consumed by agents and the PO role pack, not rendered in any frontend
- UIUX-NOTES.md may be a short "N/A" or omitted entirely; if created, focus on how the schema shapes the PO review workflow rather than any visual component
- The `UserFlowState` and `UserFlowCapability` enums are conceptually the UX vocabulary for PO cohesion checks — the advisor may note whether the enum values cover all realistic user states

### For Dev Feasibility

- Implementation is straightforward: verify existing schema (read + diff against spec), create example JSON file, run AJV CLI commands, document results
- No TypeScript compilation, no pnpm build steps, no package changes required
- Canonical references:
  - `packages/backend/orchestrator/src/schemas/user-flows.schema.json` — primary artifact (read and verify)
  - `packages/backend/orchestrator/src/schemas/examples/patch-plan.example.json` — example format template
  - `plans/future/platform/wint/UAT/WINT-0190/WINT-0190.md` — subtask decomposition model
- Suggested subtask decomposition (2-point story, 3 subtasks):
  - ST-1: Audit `user-flows.schema.json` against AC-1 spec (read-only)
  - ST-2: Create `user-flows.example.json` and run AJV validation (AC-2, AC-3, AC-4, AC-5)
  - ST-3: Verify WINT-0210 path compatibility and produce story document (AC-6, AC-7)
- Risk: AJV v8 may require `--strict=false` for draft 2020-12 depending on installed version — check the pattern established by WINT-0190 verification commands
