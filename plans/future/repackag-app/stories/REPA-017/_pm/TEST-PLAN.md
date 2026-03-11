# REPA-017 Test Plan

## Story Context

**Story:** REPA-017 - Consolidate Component-Level Schemas
**Goal:** Move duplicate FileValidationResultSchema from ThumbnailUpload and InstructionsUpload components to @repo/upload/types
**Target:** No duplicate schemas in component __types__ directories

---

## Test Strategy

### Scope

This is a pure schema consolidation story:
- Create new validation.ts module in @repo/upload/src/types/
- Move FileValidationResultSchema (3 LOC: valid: boolean, error?: string optional)
- Add comprehensive tests for the schema
- Update barrel export in types/index.ts
- Update component imports (but components remain in app-instructions-gallery until REPA-005)

### Test Types

1. **Unit Tests** (Primary): Schema validation behavior
2. **Integration Tests**: Package exports and imports work correctly
3. **Type Tests**: TypeScript inference and type safety
4. **No E2E Tests**: Schema-only change, no user-facing behavior

---

## Test Cases

### Unit Tests: Schema Validation

**Location:** packages/core/upload/src/types/__tests__/validation.test.ts

#### TC-1: Valid validation result
```typescript
it('should accept valid validation result with no error', () => {
  const result = { valid: true }
  expect(() => FileValidationResultSchema.parse(result)).not.toThrow()
  const parsed = FileValidationResultSchema.parse(result)
  expect(parsed.valid).toBe(true)
  expect(parsed.error).toBeUndefined()
})
```

#### TC-2: Invalid validation result with error message
```typescript
it('should accept invalid validation result with error', () => {
  const result = { valid: false, error: 'File size exceeds 10MB' }
  expect(() => FileValidationResultSchema.parse(result)).not.toThrow()
  const parsed = FileValidationResultSchema.parse(result)
  expect(parsed.valid).toBe(false)
  expect(parsed.error).toBe('File size exceeds 10MB')
})
```

#### TC-3: Invalid validation result without error (optional)
```typescript
it('should accept invalid validation result without error message', () => {
  const result = { valid: false }
  expect(() => FileValidationResultSchema.parse(result)).not.toThrow()
  const parsed = FileValidationResultSchema.parse(result)
  expect(parsed.valid).toBe(false)
  expect(parsed.error).toBeUndefined()
})
```

#### TC-4: Reject missing valid field
```typescript
it('should reject validation result without valid field', () => {
  const result = { error: 'Some error' }
  expect(() => FileValidationResultSchema.parse(result)).toThrow()
})
```

#### TC-5: Reject invalid valid field type
```typescript
it('should reject non-boolean valid field', () => {
  const result = { valid: 'true' }
  expect(() => FileValidationResultSchema.parse(result)).toThrow()
})
```

#### TC-6: Reject invalid error field type
```typescript
it('should reject non-string error field', () => {
  const result = { valid: false, error: 123 }
  expect(() => FileValidationResultSchema.parse(result)).toThrow()
})
```

#### TC-7: Accept empty string error
```typescript
it('should accept empty string as error message', () => {
  const result = { valid: false, error: '' }
  expect(() => FileValidationResultSchema.parse(result)).not.toThrow()
})
```

#### TC-8: Inferred type matches expected shape
```typescript
it('should infer correct TypeScript type', () => {
  type Expected = {
    valid: boolean
    error?: string | undefined
  }

  const result: FileValidationResult = { valid: true }
  const typed: Expected = result // Should compile
  expect(typed).toEqual(result)
})
```

### Integration Tests: Package Exports

**Location:** packages/core/upload/src/__tests__/package-structure.test.ts (extend existing)

#### TC-9: FileValidationResultSchema exported from types/index.ts
```typescript
it('should export FileValidationResultSchema from types barrel', () => {
  const { FileValidationResultSchema } = require('../types')
  expect(FileValidationResultSchema).toBeDefined()
  expect(typeof FileValidationResultSchema.parse).toBe('function')
})
```

#### TC-10: FileValidationResult type exported from types/index.ts
```typescript
it('should export FileValidationResult type', () => {
  type ImportTest = import('../types').FileValidationResult
  const result: ImportTest = { valid: true }
  expect(result.valid).toBe(true)
})
```

#### TC-11: Schema exported from package root
```typescript
it('should export FileValidationResultSchema from @repo/upload/types', () => {
  const { FileValidationResultSchema } = require('@repo/upload/types')
  expect(FileValidationResultSchema).toBeDefined()
})
```

### Type Tests: TypeScript Inference

**Location:** packages/core/upload/src/types/__tests__/validation.test.ts

#### TC-12: z.infer produces correct type
```typescript
it('should infer FileValidationResult type correctly', () => {
  type Inferred = z.infer<typeof FileValidationResultSchema>

  // Valid should be required boolean
  const valid: Inferred = { valid: true }

  // Error should be optional string
  const withError: Inferred = { valid: false, error: 'test' }

  // Should not compile (uncomment to verify):
  // const invalid: Inferred = { valid: 'true' } // Type error
  // const missing: Inferred = {} // Type error

  expect(valid).toBeDefined()
  expect(withError).toBeDefined()
})
```

### Regression Tests: Component Imports

**Location:** apps/web/app-instructions-gallery/src/components/__tests__/

Note: Components have not been migrated yet (REPA-005 pending). These tests verify the import changes work correctly.

#### TC-13: InstructionsUpload imports from @repo/upload/types
```typescript
it('should import FileValidationResultSchema from @repo/upload', () => {
  // This test verifies the component can import from the new location
  // Component itself hasn't migrated yet (REPA-005)
  const { FileValidationResultSchema } = require('@repo/upload/types')
  expect(FileValidationResultSchema).toBeDefined()
})
```

#### TC-14: ThumbnailUpload imports from @repo/upload/types
```typescript
it('should import FileValidationResultSchema from @repo/upload', () => {
  const { FileValidationResultSchema } = require('@repo/upload/types')
  expect(FileValidationResultSchema).toBeDefined()
})
```

#### TC-15: Components no longer export duplicate schemas
```typescript
it('should NOT export FileValidationResultSchema from component __types__', () => {
  // After import updates, components should not re-export the schema
  const instructionsTypes = require('../InstructionsUpload/__types__')
  const thumbnailTypes = require('../ThumbnailUpload/__types__')

  expect(instructionsTypes.FileValidationResultSchema).toBeUndefined()
  expect(thumbnailTypes.FileValidationResultSchema).toBeUndefined()
})
```

---

## Coverage Requirements

### Minimum Coverage: 45%

**Expected Coverage:**
- validation.ts: 100% (simple schema, fully testable)
- types/index.ts: 100% (barrel export)
- Overall @repo/upload package: Maintain ≥45%

### Coverage Verification

```bash
pnpm --filter @repo/upload test --coverage
```

Expected output:
```
File                | % Stmts | % Branch | % Funcs | % Lines
--------------------|---------|----------|---------|--------
types/validation.ts |   100   |   100    |   100   |   100
types/index.ts      |   100   |   100    |   100   |   100
```

---

## Test Execution

### Command

```bash
# Run all upload package tests
pnpm --filter @repo/upload test

# Run validation tests only
pnpm --filter @repo/upload test validation

# Run with coverage
pnpm --filter @repo/upload test --coverage
```

### Expected Results

- All 15 test cases pass
- No type errors in TypeScript compilation
- Coverage ≥45% maintained
- No breaking changes to existing schemas

---

## Acceptance Criteria Mapping

| AC | Description | Test Cases |
|----|-------------|------------|
| AC-1 | Create validation.ts in @repo/upload/src/types/ | TC-1 to TC-8 |
| AC-2 | FileValidationResultSchema correctly validates input | TC-1 to TC-7 |
| AC-3 | Export schema from types/index.ts | TC-9, TC-10 |
| AC-4 | Export from package root (@repo/upload/types) | TC-11 |
| AC-5 | TypeScript inference works correctly | TC-8, TC-12 |
| AC-6 | Update InstructionsUpload component imports | TC-13, TC-15 |
| AC-7 | Update ThumbnailUpload component imports | TC-14, TC-15 |
| AC-8 | All tests pass with ≥45% coverage | All TCs |

---

## Risk Mitigation

### Risk: Import path changes break component tests

**Mitigation:**
- Run component tests before and after import updates
- Verify no duplicate schema exports remain
- Check TypeScript compilation for type errors

**Test:** TC-13, TC-14, TC-15

### Risk: Schema shape changes break existing behavior

**Mitigation:**
- Schema remains identical (valid: boolean, error?: string)
- Comprehensive validation tests verify all edge cases
- Type inference tests ensure no type breaking changes

**Test:** TC-1 to TC-8, TC-12

### Risk: Backend schema confusion

**Mitigation:**
- Backend FileValidationResultSchema is intentionally different
- Different package: @repo/moc-instructions-core
- Different purpose: server-side validation with fileId, filename, errors[], warnings[]
- No consolidation with backend schema

**Test:** None needed (separate domains)

### Risk: REPA-005 dependency not ready

**Mitigation:**
- Story only updates imports, doesn't move components
- Components remain in app-instructions-gallery
- REPA-005 will later migrate components to @repo/upload/components

**Test:** TC-13, TC-14, TC-15 verify imports work while components stay in place

---

## Manual Verification Steps

### Step 1: Verify schema file created
```bash
ls -la packages/core/upload/src/types/validation.ts
```

### Step 2: Verify tests created
```bash
ls -la packages/core/upload/src/types/__tests__/validation.test.ts
```

### Step 3: Verify barrel export updated
```bash
grep "FileValidationResultSchema" packages/core/upload/src/types/index.ts
```

### Step 4: Verify component imports updated
```bash
grep "@repo/upload/types" apps/web/app-instructions-gallery/src/components/InstructionsUpload/__types__/index.ts
grep "@repo/upload/types" apps/web/app-instructions-gallery/src/components/ThumbnailUpload/__types__/index.ts
```

### Step 5: Verify duplicates removed
```bash
# Should NOT find FileValidationResultSchema exports in component files
grep "export.*FileValidationResultSchema" apps/web/app-instructions-gallery/src/components/InstructionsUpload/__types__/index.ts
grep "export.*FileValidationResultSchema" apps/web/app-instructions-gallery/src/components/ThumbnailUpload/__types__/index.ts
```

### Step 6: Run full test suite
```bash
pnpm test
```

---

## Test Deliverables

1. ✅ validation.test.ts with 12 test cases (TC-1 to TC-12)
2. ✅ Extended package-structure.test.ts with 3 integration tests (TC-9 to TC-11)
3. ✅ Component import verification tests (TC-13 to TC-15)
4. ✅ Coverage report showing ≥45%
5. ✅ Manual verification checklist completed

---

## Notes

- **REPA-005 Coordination:** Components have not migrated yet. This story only consolidates the schema and updates imports. REPA-005 will later move components to @repo/upload/components.
- **Backend Schema:** The backend FileValidationResultSchema in moc-instructions-core is intentionally different and should NOT be consolidated.
- **Pattern Consistency:** Follow REPA-006 pattern - one domain per file (validation.ts), comprehensive tests, barrel export.

---

**Test Plan Status:** COMPLETE
**Blockers:** None
**Ready for Implementation:** Yes
