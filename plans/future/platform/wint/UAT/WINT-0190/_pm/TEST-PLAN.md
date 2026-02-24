# Test Plan: WINT-0190 — Create Patch Queue Pattern and Schema

## Scope Summary

- **Endpoints touched:** none
- **UI touched:** no
- **Data/storage touched:** yes (new files: `packages/backend/orchestrator/src/schemas/patch-plan.schema.json`, `packages/backend/orchestrator/src/schemas/examples/patch-plan.example.json`, `.claude/prompts/role-packs/_specs/patch-queue-pattern.md`)
- **Test approach:** Schema structural validation + example-against-schema validation + manual pattern review
- **Automated unit tests required:** no (documentation/schema artifacts only)

---

## Happy Path Tests

### Test 1: `patch-plan.schema.json` is valid JSON Schema (AC-1, AC-2)

**Setup:**
- `packages/backend/orchestrator/src/schemas/patch-plan.schema.json` exists on disk
- AJV CLI installed (`npx ajv` or `ajv` available globally)

**Action:**
```bash
# Validate the schema itself against the JSON Schema meta-schema
npx ajv validate -s https://json-schema.org/draft/2020-12/schema -d packages/backend/orchestrator/src/schemas/patch-plan.schema.json
```

**Expected outcome:**
- Exit code 0
- No validation errors reported

**Evidence:**
- AJV CLI output: `packages/backend/orchestrator/src/schemas/patch-plan.schema.json valid`

---

### Test 2: Schema structure matches project conventions (AC-1)

**Setup:**
- `patch-plan.schema.json` exists
- Reference: `packages/backend/orchestrator/src/schemas/user-flows.schema.json`

**Action:** Manual inspection — read schema and verify:
1. `$schema` field is `"https://json-schema.org/draft/2020-12/schema"`
2. `$id` field is `"https://lego-moc-platform.com/schemas/patch-plan.schema.json"`
3. `schema_version` field present with `pattern: "^\d+\.\d+\.\d+$"` constraint
4. `patches` array present with `maxItems` set (e.g., 10)
5. `patch_type` field in each patch uses `enum: ["types_schema", "api", "ui", "tests", "cleanup"]`
6. `max_files` field has `maximum` constraint (not just a description)
7. `max_diff_lines` field has `maximum` constraint
8. `$defs` section present with `RepairLoop` or equivalent definition

**Expected outcome:**
- All 8 structural checks pass
- No field uses verbal documentation as the only constraint for numeric limits

**Evidence:**
- Screenshot or diff of schema file showing each checked field

---

### Test 3: `repair_loop` sub-schema is valid and complete (AC-2)

**Setup:**
- `patch-plan.schema.json` exists with `$defs` section

**Action:** Manual inspection of `repair_loop` definition:
1. `fix_only_referenced_errors` field present with `type: boolean`
2. `max_iterations` field present with `type: integer` and `maximum` constraint (e.g., 5)
3. `rerun_command` field present with `type: string`
4. `repair_loop` referenced correctly from within patch item definition

**Expected outcome:**
- All 4 fields present and typed correctly
- `repair_loop` is optional in patch steps (not in `required` array at patch level)

**Evidence:**
- Diff of schema `$defs.RepairLoop` section

---

### Test 4: Example file validates against schema (AC-3)

**Setup:**
- `packages/backend/orchestrator/src/schemas/patch-plan.schema.json` exists
- `packages/backend/orchestrator/src/schemas/examples/patch-plan.example.json` exists

**Action:**
```bash
npx ajv validate \
  -s packages/backend/orchestrator/src/schemas/patch-plan.schema.json \
  -d packages/backend/orchestrator/src/schemas/examples/patch-plan.example.json
```

**Expected outcome:**
- Exit code 0
- Output: `packages/backend/orchestrator/src/schemas/examples/patch-plan.example.json valid`

**Evidence:**
- AJV CLI output captured in QA report

---

### Test 5: Example file is within line length requirement (AC-3)

**Setup:**
- `packages/backend/orchestrator/src/schemas/examples/patch-plan.example.json` exists

**Action:**
```bash
wc -l packages/backend/orchestrator/src/schemas/examples/patch-plan.example.json
```

**Expected outcome:**
- Line count is between 10 and 25 (inclusive)

**Evidence:**
- `wc -l` output

---

### Test 6: Example demonstrates correct patch ordering (AC-3, AC-6)

**Setup:**
- `patch-plan.example.json` exists and has validated against schema (Test 4 passes)

**Action:** Manual inspection:
1. Example includes at least 2 patches
2. `patch_type` values appear in correct order: `types_schema` before `api`, `api` before `tests`
3. At least one patch step includes `repair_loop`
4. `max_files` and `max_diff_lines` values are within schema-defined maximums

**Expected outcome:**
- Ordering convention clearly demonstrated
- `repair_loop` usage shown with `fix_only_referenced_errors: true`

**Evidence:**
- Manual review note confirming ordering and repair loop presence

---

### Test 7: Pattern documentation files exist and are complete (AC-4, AC-5)

**Setup:**
- `.claude/prompts/role-packs/_specs/patch-queue-pattern.md` (or equivalent) exists

**Action:** Manual inspection:
1. File exists at documented path
2. Contains at least 2 positive examples
3. Contains exactly 1 negative example
4. Decision rule section present (when to use Patch Queue)
5. Default limits documented with rationale (why max_files=10, why max_diff_lines=300)
6. Repair Loop pattern documented separately (or in separate file)
7. Both patterns cross-reference each other

**Expected outcome:**
- All 7 checks pass
- Examples are within 25-line limit each (per examples-framework.md)

**Evidence:**
- Manual review note with word count and example structure summary

---

### Test 8: WINT-0210 compatibility gate (AC-6)

**Setup:**
- `patch-plan.schema.json` and `patch-plan.example.json` both exist

**Action:** Manual cross-reference against WINT-0210.md:
1. Schema path `packages/backend/orchestrator/src/schemas/patch-plan.schema.json` matches WINT-0210 AC-1 reference
2. Example is 10-25 lines (suitable for WINT-0210 pattern skeleton requirement)
3. Example shows `types_schema → api → ui → tests → cleanup` ordering (WINT-0210 AC-7)
4. AJV validation steps documented (WINT-0210 AC-7 validation)

**Expected outcome:**
- All 4 cross-story checks pass
- No path mismatches

**Evidence:**
- Side-by-side review note referencing WINT-0210.md ACs

---

## Error Cases

### Error Case 1: Schema has invalid `$ref` (structural regression)

**Setup:** Deliberately introduce a broken `$ref` into schema (e.g., `"$ref": "#/$defs/NonExistent"`)

**Action:** Run AJV validation on schema

**Expected:** AJV reports `$ref` resolution error

**Evidence:** Error output confirming `$ref` resolution failure. Revert mutation after test.

---

### Error Case 2: Example exceeds `maxItems` on patches array

**Setup:** Create test document with more patches than schema's `maxItems` limit

**Action:**
```bash
# Create temp file with N+1 patches where N = maxItems
# Run AJV against it
npx ajv validate -s patch-plan.schema.json -d /tmp/test-too-many-patches.json
```

**Expected:** AJV reports `maxItems` violation

**Evidence:** AJV error output showing `maxItems` enforcement is working

---

### Error Case 3: Example uses invalid `patch_type` value

**Setup:** Create test document with `"patch_type": "refactoring"` (not in enum)

**Action:**
```bash
npx ajv validate -s patch-plan.schema.json -d /tmp/test-invalid-patch-type.json
```

**Expected:** AJV reports enum violation for `patch_type`

**Evidence:** AJV error output confirming enum enforcement

---

### Error Case 4: Example exceeds `max_diff_lines` maximum constraint

**Setup:** Create test document with `max_diff_lines: 9999` (exceeds `maximum` constraint)

**Action:**
```bash
npx ajv validate -s patch-plan.schema.json -d /tmp/test-exceeds-diff-lines.json
```

**Expected:** AJV reports `maximum` violation for `max_diff_lines`

**Evidence:** AJV error output confirming numeric constraint enforcement

---

## Edge Cases

### Edge Case 1: Minimal valid patch plan (single patch, no repair_loop)

**Setup:** Create single-patch document with only required fields:
```json
{
  "schema_version": "1.0.0",
  "patches": [
    {
      "patch_type": "types_schema",
      "description": "Add OrderItem Zod schema",
      "max_files": 2,
      "max_diff_lines": 50
    }
  ]
}
```

**Action:** Validate against schema

**Expected:** Passes validation (repair_loop is optional)

**Evidence:** AJV exit code 0

---

### Edge Case 2: Patch with all optional fields populated

**Setup:** Create a patch with `verification_command` and full `repair_loop`:
```json
{
  "patch_type": "tests",
  "description": "Add unit tests for OrderItem",
  "max_files": 3,
  "max_diff_lines": 150,
  "verification_command": "pnpm test --filter @repo/app",
  "repair_loop": {
    "fix_only_referenced_errors": true,
    "max_iterations": 3,
    "rerun_command": "pnpm check-types"
  }
}
```

**Action:** Validate against schema

**Expected:** Passes validation with all optional fields accepted

**Evidence:** AJV exit code 0

---

### Edge Case 3: `schema_version` field pattern validation

**Setup:** Create document with invalid semver: `"schema_version": "v1.0.0"` (leading "v")

**Action:** Validate against schema

**Expected:** AJV reports pattern violation for `schema_version`

**Evidence:** AJV error output referencing `pattern` constraint

---

### Edge Case 4: Pattern documentation within example line limit

**Setup:** Count lines in each positive and negative example within the pattern documentation

**Action:**
```bash
# For each example block in patch-queue-pattern.md
# Count lines between opening ``` and closing ```
grep -c '' .claude/prompts/role-packs/_specs/patch-queue-pattern.md
```

**Expected:** Each example skeleton is 10-25 lines. Documentation file total is within reasonable size.

**Evidence:** Line count output per example block

---

## Required Tooling Evidence

### Backend (schema/documentation artifacts):
- `npx ajv validate -s patch-plan.schema.json` — must exit 0 for schema self-validation
- `npx ajv validate -s patch-plan.schema.json -d patch-plan.example.json` — must exit 0
- `wc -l patch-plan.example.json` — must report 10-25 lines
- All 4 error case AJV runs — must report expected violations (proving constraints enforce)

### Frontend:
- Not applicable (no UI touched)

---

## Risks to Call Out

1. **AJV CLI availability**: Tests assume `npx ajv` is available. If not installed globally, use `npx ajv-cli@latest` or `npm install -g ajv-cli`. Document the exact version used.

2. **JSON Schema draft 2020-12 support**: AJV v8+ is required for draft 2020-12. Older AJV versions may silently ignore some constraints. Verify: `npx ajv --version` should be 8.x.

3. **Ordering convention is not schema-enforced**: JSON Schema cannot enforce sequential ordering of `patch_type` values in an array. The test plan confirms enum values are valid but does NOT test that `types_schema` appears before `api` in the schema itself — only in the example file by convention. This is a known limitation documented in the story.

4. **`.claude/prompts/role-packs/` directory may not exist**: If WINT-0180 has not created this directory, AC-4 documentation may need to be stored in an alternate location. Verify path with implementer before running Test 7.

5. **Cross-story validation (Test 8) is manual**: No automated tool exists to check WINT-0210 compatibility. This requires the QA agent to read WINT-0210.md alongside the artifacts.
