# PROOF-WINT-0190

**Generated**: 2026-02-21T04:30:00Z
**Story**: WINT-0190
**Evidence Version**: 1

---

## Summary

This implementation establishes the foundational schema and documentation for the Patch Queue pattern, a critical guardrail for controlling mega-patch sprawl in the WINT workflow. The story creates a machine-readable `patch-plan.schema.json` with enforced constraints, canonical examples, and comprehensive pattern documentation for both Patch Queue and Repair Loop workflows. All 6 acceptance criteria passed with complete schema validation and pattern documentation.

---

## Acceptance Criteria Evidence

| AC | Status | Primary Evidence |
|----|--------|------------------|
| AC-1 | PASS | patch-plan.schema.json created with JSON Schema draft 2020-12, correct $id, schema_version pattern, patches maxItems:10, PatchStep in $defs with patch_type enum and max_files/max_diff_lines constraints |
| AC-2 | PASS | RepairLoop defined in $defs with fix_only_referenced_errors (boolean), max_iterations (integer max:5 min:1), rerun_command (string); repair_loop NOT in PatchStep required array |
| AC-3 | PASS | patch-plan.example.json created, validates against schema, demonstrates types_schema → api → tests ordering, at least one patch step with repair_loop fix_only_referenced_errors:true, line count 10-25 |
| AC-4 | PASS | patch-queue-pattern.md at .claude/prompts/role-packs/_specs/ with decision rule, 2 positive examples, 1 negative example, each ≤25 lines, default limit rationale, cross-reference to repair-loop-pattern.md |
| AC-5 | PASS | repair-loop-pattern.md at .claude/prompts/role-packs/_specs/ defining fix-only-referenced-errors constraint, minimal changes requirement, rerun-until-green sequence with max_iterations guardrail, activation trigger, cross-reference to patch-queue-pattern.md |
| AC-6 | PASS | Schema path confirmed matches WINT-0210 reference, example 10-25 lines confirmed, types_schema → api → ui → tests → cleanup ordering demonstrated, AJV validation steps documented in pattern docs |

### Detailed Evidence

#### AC-1: Create `patch-plan.schema.json` at packages/backend/orchestrator/src/schemas/ following JSON Schema draft 2020-12, correct $id, schema_version pattern, patches maxItems:10, PatchStep in $defs with patch_type enum and max_files/max_diff_lines constraints

**Status**: PASS

**Evidence Items**:
- **file**: `packages/backend/orchestrator/src/schemas/patch-plan.schema.json` - Schema created with $schema draft 2020-12, $id set to https://lego-moc-platform.com/schemas/patch-plan.schema.json, schema_version with pattern constraint, patches array maxItems:10, PatchStep in $defs with patch_type enum (types_schema/api/ui/tests/cleanup), max_files maximum:10, max_diff_lines maximum:300
- **command**: `AJV 8.17.1 compile test` - PASS - Schema compiles successfully

#### AC-2: RepairLoop defined in $defs with fix_only_referenced_errors (boolean), max_iterations (integer max:5 min:1), rerun_command (string); repair_loop NOT in PatchStep required array

**Status**: PASS

**Evidence Items**:
- **file**: `packages/backend/orchestrator/src/schemas/patch-plan.schema.json` - RepairLoop in $defs with fix_only_referenced_errors boolean, max_iterations integer (minimum:1, maximum:5), rerun_command string. PatchStep required array is [patch_type, description, max_files, max_diff_lines] — repair_loop absent from required
- **command**: `AJV enforcement test: repair_loop optional` - PASS - valid document without repair_loop validates correctly

#### AC-3: patch-plan.example.json created, validates against schema, demonstrates types_schema → api → tests ordering (minimum), at least one patch step with repair_loop fix_only_referenced_errors:true, line count 10-25

**Status**: PASS

**Evidence Items**:
- **file**: `packages/backend/orchestrator/src/schemas/examples/patch-plan.example.json` - 11-line example with 5 patch steps demonstrating types_schema → api → ui → tests → cleanup ordering. First step includes repair_loop with fix_only_referenced_errors:true, max_iterations:3
- **command**: `AJV 8.17.1 validate example against schema` - PASS - Example validates
- **command**: `wc -l patch-plan.example.json` - 11 lines (within 10-25 constraint)

#### AC-4: patch-queue-pattern.md at .claude/prompts/role-packs/_specs/ with decision rule, 2 positive examples, 1 negative example, each ≤25 lines, default limit rationale, cross-reference to repair-loop-pattern.md

**Status**: PASS

**Evidence Items**:
- **file**: `.claude/prompts/role-packs/_specs/patch-queue-pattern.md` - Decision rule documented (>1 layer or >1 concern). 2 positive examples: (1) 3-step ordered patch plan, (2) repair loop scoped to referenced errors. 1 negative example: mega-patch violating ordering and exceeding max_files/max_diff_lines. Default limit rationale: max_files=10 (one feature surface), max_diff_lines=300 (reviewable in one sitting). Cross-reference to repair-loop-pattern.md present.

#### AC-5: repair-loop-pattern.md at .claude/prompts/role-packs/_specs/ defining fix-only-referenced-errors constraint, minimal changes requirement, rerun-until-green sequence with max_iterations guardrail, activation trigger, cross-reference to patch-queue-pattern.md

**Status**: PASS

**Evidence Items**:
- **file**: `.claude/prompts/role-packs/_specs/repair-loop-pattern.md` - Activation trigger documented (verification_command fails). fix_only_referenced_errors constraint: agent may only fix lines/files cited in error output. Minimal changes requirement: smallest change that resolves cited error. Rerun until green sequence with max_iterations guardrail (stop and escalate). 2 positive examples + 1 negative example. Cross-reference to patch-queue-pattern.md present.

#### AC-6: Schema path confirmed matches WINT-0210 reference, example 10-25 lines confirmed, types_schema → api → ui → tests → cleanup ordering demonstrated, AJV validation steps documented in pattern docs

**Status**: PASS

**Evidence Items**:
- **file**: `packages/backend/orchestrator/src/schemas/patch-plan.schema.json` - Path matches WINT-0210 reference exactly: packages/backend/orchestrator/src/schemas/patch-plan.schema.json
- **file**: `packages/backend/orchestrator/src/schemas/examples/patch-plan.example.json` - 11 lines (10-25 constraint satisfied). All 5 patch types in order: types_schema → api → ui → tests → cleanup
- **file**: `.claude/prompts/role-packs/_specs/patch-queue-pattern.md` - AJV validation steps documented with exact npx ajv validate command including schema path and data path

---

## Files Changed

| Path | Action | Lines |
|------|--------|-------|
| `packages/backend/orchestrator/src/schemas/patch-plan.schema.json` | created | - |
| `packages/backend/orchestrator/src/schemas/examples/patch-plan.example.json` | created | 11 |
| `.claude/prompts/role-packs/_specs/patch-queue-pattern.md` | created | - |
| `.claude/prompts/role-packs/_specs/repair-loop-pattern.md` | created | - |

**Total**: 4 files created

---

## Verification Commands

| Command | Result | Timestamp |
|---------|--------|-----------|
| `AJV 8.17.1 compile: patch-plan.schema.json` | SUCCESS | 2026-02-21T04:15:00Z |
| `AJV 8.17.1 validate example against schema` | SUCCESS | 2026-02-21T04:20:00Z |
| `wc -l patch-plan.example.json` | SUCCESS | 2026-02-21T04:20:00Z |
| `AJV enforcement tests (6 cases)` | SUCCESS | 2026-02-21T04:25:00Z |

---

## Test Results

| Type | Passed | Failed |
|------|--------|--------|
| Unit | 0 | 0 |
| Integration | 0 | 0 |
| E2E | 0 | 0 |
| HTTP | 0 | 0 |

**Test Status**: Exempt (story_type: docs/chore — pure schema and documentation artifacts, no runtime code)

---

## API Endpoints Tested

No API endpoints tested.

---

## Implementation Notes

### Notable Decisions

- AJV v8 used via direct node require (ajv@8.17.1 in pnpm store) since npx ajv package was unavailable — functionally equivalent, validates same JSON Schema draft 2020-12
- Example uses compact single-line JSON objects to stay within 10-25 line constraint while demonstrating all 5 patch types
- patch_type enum order (types_schema, api, ui, tests, cleanup) communicates intended sequencing convention per architecture notes — JSON Schema cannot enforce order, this is documented convention only
- repair_loop intentionally absent from PatchStep required array — AC-2 explicitly requires it to be optional

### Known Deviations

- AJV validation run via Node.js script rather than npx ajv CLI — npx ajv package not resolvable in this environment; validation result is identical using ajv@8.17.1 directly

---

## Token Usage

| Phase | Input | Output | Total |
|-------|-------|--------|-------|
| Setup | 0 | 0 | 0 |
| Plan | 0 | 0 | 0 |
| Execute | 45000 | 12000 | 57000 |
| Proof | — | — | — |
| **Total** | **45000** | **12000** | **57000** |

---

*Generated by dev-proof-leader from EVIDENCE.yaml*
