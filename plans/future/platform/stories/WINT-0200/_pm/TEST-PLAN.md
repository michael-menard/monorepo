# Test Plan: WINT-0200

**Story:** Create User Flows Schema with State/Capability Enums
**Generated:** 2026-02-15
**Test Framework:** Vitest
**Test Location:** `packages/backend/orchestrator/src/artifacts/__tests__/user-flows.test.ts`

---

## Testing Approach

This is a **schema definition story** with validation-focused testing. No database setup, API mocking, or UI testing required.

### Test Strategy

1. **Unit tests for Zod schema validation** (AC-5)
2. **Round-trip validation** between JSON Schema and Zod (AC-5)
3. **Edge case coverage** for constraints and enums
4. **Example validation** to ensure reference flow is valid (AC-6)

---

## Test Scenarios

### 1. Schema Validation Tests (AC-5)

#### Happy Path
- **Test:** Valid flow with all required fields passes Zod validation
- **Given:** Flow with 3 flows, each with ≤7 steps, using valid states and capabilities
- **When:** Parse with UserFlowsSchema
- **Then:** Parsing succeeds, output matches input

#### Max Flows Constraint
- **Test:** Feature with >5 flows fails validation
- **Given:** Flow definition with 6 flows
- **When:** Parse with UserFlowsSchema
- **Then:** Zod throws error: "Maximum 5 flows per feature"

#### Max Steps Constraint
- **Test:** Flow with >7 steps fails validation
- **Given:** Single flow with 8 steps
- **When:** Parse with UserFlowsSchema
- **Then:** Zod throws error: "Maximum 7 steps per flow"

#### Invalid State Enum
- **Test:** Flow using invalid state value fails validation
- **Given:** Flow with state "invalid_state"
- **When:** Parse with UserFlowsSchema
- **Then:** Zod throws error listing valid states

#### Invalid Capability Enum
- **Test:** Flow using invalid capability value fails validation
- **Given:** Flow with capability "invalid_capability"
- **When:** Parse with UserFlowsSchema
- **Then:** Zod throws error listing valid capabilities

---

### 2. Round-Trip Validation (AC-5)

#### JSON Schema → Zod → JSON
- **Test:** Example flow validates through both schemas without data loss
- **Given:** Example user flow JSON (AC-6)
- **When:**
  1. Validate with JSON Schema (user-flows.schema.json)
  2. Parse with Zod schema (UserFlowsSchema)
  3. Stringify result
- **Then:**
  - JSON Schema validation passes
  - Zod parsing succeeds
  - Output JSON matches input JSON

---

### 3. Edge Cases

#### Empty Flows Array
- **Test:** Feature with zero flows (clarify if valid or invalid in AC-1)
- **Given:** Flow definition with empty flows array `[]`
- **When:** Parse with UserFlowsSchema
- **Then:** TBD - document decision in schema

#### Minimum Valid Flow
- **Test:** Single flow with single step is valid
- **Given:** 1 flow with 1 step, using 1 state and 1 capability
- **When:** Parse with UserFlowsSchema
- **Then:** Parsing succeeds

#### All Capabilities Used
- **Test:** Flow using all 7 capabilities is valid
- **Given:** Flow with steps covering all capabilities (create, view, edit, delete, upload, replace, download)
- **When:** Parse with UserFlowsSchema
- **Then:** Parsing succeeds

#### All States Covered
- **Test:** Flow using all 5 required states is valid
- **Given:** Flow with steps covering all states (loading, empty, validation_error, server_error, permission_denied)
- **When:** Parse with UserFlowsSchema
- **Then:** Parsing succeeds

#### Missing Required Fields
- **Test:** Flow missing required enum fields fails validation
- **Given:** Flow without `states` or `capabilities` field
- **When:** Parse with UserFlowsSchema
- **Then:** Zod throws error: "Required field missing"

---

## Test Data

### Valid Example (AC-6)
```json
{
  "schema_version": "1.0.0",
  "flows": [
    {
      "name": "Create MOC",
      "steps": [
        {"action": "navigate_to_mocs", "capabilities": ["view"], "states": ["loading", "empty"]},
        {"action": "click_create", "capabilities": ["create"], "states": ["validation_error"]},
        {"action": "fill_form", "capabilities": ["create"], "states": ["validation_error"]},
        {"action": "submit", "capabilities": ["create"], "states": ["server_error"]},
        {"action": "view_created", "capabilities": ["view"], "states": ["loading"]}
      ]
    }
  ]
}
```

### Invalid Examples
```json
// Too many flows (6 > 5)
{"flows": [{...}, {...}, {...}, {...}, {...}, {...}]}

// Too many steps (8 > 7)
{"flows": [{"steps": [{}, {}, {}, {}, {}, {}, {}, {}]}]}

// Invalid state
{"flows": [{"steps": [{"states": ["invalid_state"]}]}]}

// Invalid capability
{"flows": [{"steps": [{"capabilities": ["invalid_capability"]}]}]}
```

---

## Dependencies

### Blocking
- **None** - can proceed immediately

### Optional References
- **WINT-0180 AC-1** (example-entry.ts) - use as reference for schema versioning pattern when available
- Not blocking - can use temporary versioning and update later

---

## Test Environment

### Setup
```bash
cd packages/backend/orchestrator
pnpm install
pnpm test user-flows.test.ts
```

### No Database Required
- Pure validation logic, no database access
- No fixtures or seed data needed

### No API Mocking Required
- No HTTP calls or external services
- No MSW setup needed

---

## Coverage Requirements

### Minimum Coverage: 45% (global)
**Target for this story: 100%** (validation logic is deterministic)

### Coverage Breakdown
- **AC-1:** JSON Schema definition exists
- **AC-2:** Zod schema mirrors JSON Schema
- **AC-5:** All test scenarios listed above
- **AC-6:** Example flow validates successfully

---

## Success Criteria

- [ ] All validation tests pass (happy path + error cases)
- [ ] Round-trip validation succeeds (JSON Schema ↔ Zod)
- [ ] Edge cases covered (empty, minimum, maximum, all enums)
- [ ] Example flow (AC-6) validates successfully with both schemas
- [ ] Test coverage ≥ 100% for schema validation logic
- [ ] Clear error messages for validation failures

---

## Notes

### Testing Pattern Reference
Follow Zod schema testing pattern from `packages/backend/mcp-tools/src/session-management/__tests__/` (WINT-0110):
- Test valid inputs first
- Test each constraint independently
- Test enum validation separately
- Use `.safeParse()` for error case testing

### JSON Schema Validation
Use a JSON Schema validator library (e.g., `ajv`) in tests to ensure JSON Schema file is valid and matches Zod schema behavior.

### Schema Evolution
Include test for `schema_version` field presence - ensures future versions can be detected and migrated.
