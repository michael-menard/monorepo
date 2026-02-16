# Test Plan: WINT-0180 — Define Examples + Negative Examples Framework

## Scope Summary

- **Endpoints touched**: None (this is a framework definition story)
- **UI touched**: No
- **Data/storage touched**: Yes (schema definitions, potential database tables)

---

## Happy Path Tests

### Test 1: Zod Schema Validation — ExampleEntry Round-Trip
- **Setup**: Create Zod schema for ExampleEntry with all required fields
- **Action**:
  1. Create example object with all fields populated
  2. Parse object through Zod schema
  3. Serialize back to YAML/JSON
  4. Re-parse through schema
- **Expected outcome**: Object validates successfully on both parse cycles with no data loss
- **Evidence**:
  - Schema definition file
  - Unit test assertion results
  - Console output showing successful validation

### Test 2: Lifecycle State Transitions
- **Setup**: Define lifecycle states (created, validated, deprecated) in schema
- **Action**:
  1. Create example in 'created' state
  2. Transition to 'validated' state
  3. Transition to 'deprecated' state
- **Expected outcome**: All state transitions are valid and tracked
- **Evidence**:
  - State field validates against enum
  - Timestamp fields populated for each transition
  - Invalid transitions rejected

### Test 3: Query Pattern Effectiveness — Category Filter
- **Setup**: Create 3 examples in different categories (decision-making, testing, deployment)
- **Action**: Query examples by category = "testing"
- **Expected outcome**: Returns only the testing category example
- **Evidence**:
  - Query function returns 1 result
  - Result matches expected example
  - Other categories not returned

### Test 4: Integration with decision-handling.md
- **Setup**: Define integration point in decision-handling.md for example queries
- **Action**: Read decision-handling.md and verify example query reference exists
- **Expected outcome**: Documentation clearly defines when/how to query examples
- **Evidence**:
  - Markdown file contains query pattern documentation
  - Integration point matches defined schema

---

## Error Cases

### Error 1: Invalid Schema Field Types
- **Setup**: Create ExampleEntry with wrong field types
- **Action**: Attempt to validate object through Zod schema
- **Expected**: Validation error with clear field-level error message
- **Evidence**:
  - Zod error object with field path
  - Error message indicates type mismatch

### Error 2: Missing Required Fields
- **Setup**: Create ExampleEntry missing required field (e.g., 'id')
- **Action**: Attempt to validate through schema
- **Expected**: Validation error indicating missing required field
- **Evidence**:
  - Zod error specifying field name
  - Error type: 'required'

### Error 3: Invalid Lifecycle State Transition
- **Setup**: Example in 'deprecated' state
- **Action**: Attempt to transition to 'validated' state
- **Expected**: Transition rejected (deprecated is terminal state)
- **Evidence**:
  - State machine validation error
  - Current state remains 'deprecated'

### Error 4: Query Pattern Returns Empty
- **Setup**: Database/storage with no examples
- **Action**: Query for examples by category
- **Expected**: Empty array returned (not null/undefined)
- **Evidence**:
  - Return value is `[]`
  - No exceptions thrown

---

## Edge Cases (Reasonable)

### Edge 1: Example with All Optional Fields Empty
- **Setup**: Create minimal ExampleEntry with only required fields
- **Action**: Validate and store
- **Expected**: Validates successfully, optional fields are undefined/null
- **Evidence**:
  - Schema allows optional fields to be absent
  - Storage doesn't enforce optional fields

### Edge 2: Example with Very Long Description
- **Setup**: Create example with 10,000 character description
- **Action**: Validate and query
- **Expected**: Validates successfully, query returns full text
- **Evidence**:
  - No string length constraints violated
  - Full text retrieved on query

### Edge 3: Duplicate Example IDs
- **Setup**: Attempt to create two examples with same ID
- **Action**: Store second example
- **Expected**: Duplicate rejected with clear error
- **Evidence**:
  - Unique constraint enforced
  - Error message indicates ID collision

### Edge 4: Query by Non-Existent Category
- **Setup**: Database with examples
- **Action**: Query for category = "nonexistent"
- **Expected**: Returns empty array without error
- **Evidence**:
  - Return value is `[]`
  - No exceptions

### Edge 5: Migration Path from Existing Inline Examples
- **Setup**: Parse existing decision-handling.md for inline examples
- **Action**: Run migration script to convert to new schema
- **Expected**: All inline examples converted successfully
- **Evidence**:
  - Original examples count matches converted count
  - No data loss in conversion
  - New schema validates all migrated examples

### Edge 6: Version Compatibility — Schema Evolution
- **Setup**: Create example with v1 schema, evolve to v2 schema with new field
- **Action**: Load v1 example with v2 schema parser
- **Expected**: Backward compatibility maintained, new field defaults applied
- **Evidence**:
  - v1 examples load successfully
  - Missing v2 fields use default values
  - No validation errors

---

## Required Tooling Evidence

### Backend

Since this is a framework definition story, testing will focus on schema validation and documentation:

**Required files**:
- Zod schema definition file (e.g., `packages/backend/orchestrator/src/artifacts/example-entry.ts`)
- Unit test file for schema validation
- Migration script for existing examples (if applicable)

**Assertions**:
- Zod parse succeeds for valid examples
- Zod parse fails with specific errors for invalid examples
- Lifecycle state transitions enforce valid paths
- Query patterns return expected results

**Test commands**:
```bash
pnpm test packages/backend/orchestrator/src/artifacts/__tests__/example-entry.test.ts
```

### Frontend
Not applicable — no UI component.

---

## Risks to Call Out

### Risk 1: Storage Strategy Ambiguity
**Issue**: Story defines schema but storage location (database table vs filesystem YAML vs inline) is TBD.

**Impact**: Test plan cannot fully specify integration tests without knowing storage mechanism.

**Mitigation**: Acceptance criteria AC-2 must specify storage strategy before implementation begins. Tests will need to be updated based on chosen approach.

### Risk 2: Schema Evolution Strategy Not Defined
**Issue**: AC-4 defines lifecycle but not versioning strategy for schema itself.

**Impact**: Version compatibility tests may be incomplete without migration strategy.

**Mitigation**: Add AC or clarification for schema versioning approach (e.g., semver, breaking change policy).

### Risk 3: Query Performance Not Scoped
**Issue**: Query pattern effectiveness (AC-5) defined but performance criteria not specified.

**Impact**: Tests may pass but queries could be slow with large example sets.

**Mitigation**: Consider adding performance benchmarks to future stories (not MVP-blocking).

### Risk 4: Integration Test Complexity
**Issue**: Testing integration with decision-handling.md, KB-AGENT-INTEGRATION.md, and wint.agentDecisions requires mocking/setup.

**Impact**: Integration tests may be fragile or require significant test infrastructure.

**Mitigation**: Start with unit tests for schema and lifecycle. Add integration tests incrementally as downstream stories (WINT-0190, 0200, 0210) implement usage patterns.
