# Dev Feasibility Review: WINT-0190 — Create Patch Queue Pattern and Schema

## Feasibility Summary

- **Feasible for MVP:** yes
- **Confidence:** high
- **Why:** This story produces only documentation and JSON Schema artifacts — no TypeScript code, no database migrations, no runtime changes. The canonical template (`user-flows.schema.json`) exists and demonstrates all required JSON Schema patterns. The primary constraint (schema file placement matching WINT-0210's reference path) is already resolved by the established schemas directory. A developer comfortable with JSON Schema draft 2020-12 can complete this in a single focused session.

---

## Likely Change Surface (Core Only)

**Areas/packages for core journey:**
- `packages/backend/orchestrator/src/schemas/` — new file: `patch-plan.schema.json`
- `packages/backend/orchestrator/src/schemas/examples/` — new directory + file: `patch-plan.example.json`
- `.claude/prompts/role-packs/_specs/` — new directory + file: `patch-queue-pattern.md`

**Endpoints for core journey:**
- None. This story has no API surface.

**Critical deploy touchpoints:**
- None. These are static artifact files. No deployment required.

---

## MVP-Critical Risks (Max 5)

### Risk 1: Schema placement mismatch breaks WINT-0210

**Why it blocks MVP:**
WINT-0210 explicitly references `schemas/patch-plan.schema.json` in AC-1 (Dev role pack) and AC-7 (AJV validation). If the schema lands at a different path, WINT-0210 cannot proceed without a revision. This is a hard blocker for the primary downstream consumer.

**Required mitigation:**
Schema MUST be placed at exactly `packages/backend/orchestrator/src/schemas/patch-plan.schema.json`. Do not place it in a subdirectory, a different package, or under `.claude/`.

---

### Risk 2: Numeric constraints missing from schema (ordering convention only)

**Why it blocks MVP:**
The core value of this story is machine-enforced limits, not verbal documentation. If `max_files` and `max_diff_lines` are added as fields without `maximum` constraints in the JSON Schema, the schema cannot fail validation on oversized patches. The Gatekeeper Sidecar (WINT-3010) and any future AJV-based enforcement would silently accept mega-patches.

**Required mitigation:**
Both `max_files` and `max_diff_lines` must be defined as `type: integer` with `maximum` constraints in the schema. Example:
```json
"max_files": {
  "type": "integer",
  "minimum": 1,
  "maximum": 10,
  "description": "Maximum files changed in this patch step"
}
```

---

### Risk 3: `repair_loop` missing from schema `$defs`

**Why it blocks MVP:**
AC-2 specifies the Repair Loop as a distinct sub-schema in `$defs`. If this is implemented as a top-level object property without `$defs` reuse, it cannot be referenced independently by WINT-3010 or future tooling. The WINT-0210 Dev role pack also needs to reference the repair loop separately from the patch queue.

**Required mitigation:**
Define `RepairLoop` in `$defs` and reference it from patch items via `$ref`. This follows the existing pattern in `user-flows.schema.json` (UserFlow, UserFlowStep, UserFlowState all defined in `$defs`).

---

### Risk 4: Example file too long for WINT-0210 pattern skeleton

**Why it blocks MVP:**
WINT-0210 AC-1 requires a `patch-plan.json` pattern skeleton of 10-25 lines. If `patch-plan.example.json` exceeds 25 lines, WINT-0210 cannot use it directly as the pattern skeleton without editing — creating rework.

**Required mitigation:**
Design `patch-plan.example.json` to be exactly 10-25 lines while still demonstrating ordering and repair_loop. Prefer showing 2-3 patches rather than all 5 patch types. Prioritize completeness of the repair_loop example over breadth of patch types.

---

### Risk 5: `.claude/prompts/role-packs/` directory may not exist

**Why it blocks MVP:**
WINT-0180 (which creates this directory structure) has status `ready-to-work` in the index but `examples-framework.md` is already on disk, suggesting partial completion. If the `_specs/` subdirectory does not exist, AC-4 and AC-5 cannot be completed at the documented path.

**Required mitigation:**
Implementer must verify existence of `.claude/prompts/role-packs/` before starting AC-4. If it does not exist, create it as part of this story (WINT-0180 storage strategy decisions are already documented in `examples-framework.md`). This is a setup step, not a blocker.

---

## Missing Requirements for MVP

None. The seed provides sufficient specification for all 6 ACs. The schema structure is fully defined by analogy to `user-flows.schema.json`. Default values (max_files: 10, max_diff_lines: 300, max_iterations: 5) are specified in the seed.

The one ambiguity to resolve: **where exactly in the pattern documentation does `patch-queue-pattern.md` live?** The seed specifies `.claude/prompts/role-packs/_specs/patch-queue-pattern.md`. Implementer should verify this path is consistent with `examples-framework.md` before creating.

---

## MVP Evidence Expectations

**For AC-1 + AC-2 (schema structural):**
- File exists: `packages/backend/orchestrator/src/schemas/patch-plan.schema.json`
- AJV meta-schema validation passes: `npx ajv validate -s https://json-schema.org/draft/2020-12/schema -d patch-plan.schema.json`
- Schema contains: `$id`, `schema_version` (with pattern), `patches` (with maxItems), `patch_type` enum, `max_files` (with maximum), `max_diff_lines` (with maximum), `$defs.RepairLoop`

**For AC-3 (example):**
- File exists: `packages/backend/orchestrator/src/schemas/examples/patch-plan.example.json`
- AJV validation passes: `npx ajv validate -s patch-plan.schema.json -d examples/patch-plan.example.json`
- Line count: `wc -l patch-plan.example.json` returns 10-25

**For AC-4 + AC-5 (pattern docs):**
- File exists: `.claude/prompts/role-packs/_specs/patch-queue-pattern.md`
- Contains: 2 positive examples, 1 negative example, decision rule, default limit rationale
- Each example block within 25-line limit

**For AC-6 (WINT-0210 compatibility):**
- Schema path matches WINT-0210 reference
- Example path and line count satisfies WINT-0210 AC-1 and AC-7

**Critical CI/deploy checkpoints:** None. These are static files with no CI pipeline impact.

---

## Proposed Subtask Breakdown

### ST-1: Author `patch-plan.schema.json`
- **Goal**: Create the complete JSON Schema file at the canonical location, following `user-flows.schema.json` structure exactly, with all constraints enforced via JSON Schema keywords.
- **Files to read**: `packages/backend/orchestrator/src/schemas/user-flows.schema.json` (template), `plans/future/platform/wint/backlog/WINT-0190/_pm/STORY-SEED.md` (AC-1, AC-2 spec)
- **Files to create/modify**: `packages/backend/orchestrator/src/schemas/patch-plan.schema.json`
- **ACs covered**: AC-1, AC-2
- **Depends on**: none
- **Verification**: `npx ajv validate -s https://json-schema.org/draft/2020-12/schema -d packages/backend/orchestrator/src/schemas/patch-plan.schema.json` (exit 0)

---

### ST-2: Create `patch-plan.example.json`
- **Goal**: Create a canonical example file that validates against the schema, demonstrates ordered patch sequence with repair_loop, and stays within the 10-25 line limit.
- **Files to read**: `packages/backend/orchestrator/src/schemas/patch-plan.schema.json` (from ST-1), `plans/future/platform/wint/ready-to-work/WINT-0210/WINT-0210.md` (AC-7 requirements)
- **Files to create/modify**: `packages/backend/orchestrator/src/schemas/examples/patch-plan.example.json`
- **ACs covered**: AC-3, AC-6
- **Depends on**: ST-1
- **Verification**: `npx ajv validate -s packages/backend/orchestrator/src/schemas/patch-plan.schema.json -d packages/backend/orchestrator/src/schemas/examples/patch-plan.example.json` (exit 0) + `wc -l patch-plan.example.json` (10-25)

---

### ST-3: Write Patch Queue and Repair Loop pattern documentation
- **Goal**: Create `.claude/prompts/role-packs/_specs/patch-queue-pattern.md` containing decision rule, 2 positive examples, 1 negative example, default limit rationale, and Repair Loop pattern cross-reference.
- **Files to read**: `.claude/agents/_shared/examples-framework.md` (example format rules), `packages/backend/orchestrator/src/schemas/examples/patch-plan.example.json` (from ST-2), `plans/future/platform/wint/backlog/WINT-0190/_pm/STORY-SEED.md` (AC-4, AC-5 spec)
- **Files to create/modify**: `.claude/prompts/role-packs/_specs/patch-queue-pattern.md` (may need to create `_specs/` directory)
- **ACs covered**: AC-4, AC-5
- **Depends on**: ST-2
- **Verification**: Manual review — confirm 2 positive + 1 negative examples present, each ≤25 lines, decision rule documented, default limits have rationale

---

### ST-4: WINT-0210 compatibility verification and documentation
- **Goal**: Cross-reference all artifacts against WINT-0210.md ACs 1 and 7, document AJV validation steps, confirm all paths match WINT-0210's references.
- **Files to read**: `plans/future/platform/wint/ready-to-work/WINT-0210/WINT-0210.md`, all artifacts from ST-1–ST-3
- **Files to create/modify**: No new files — append compatibility verification note to `patch-queue-pattern.md` or add as inline comment in schema
- **ACs covered**: AC-6
- **Depends on**: ST-1, ST-2, ST-3
- **Verification**: Manual checklist — schema path matches, example is 10-25 lines, AJV steps documented for WINT-0210 implementer
