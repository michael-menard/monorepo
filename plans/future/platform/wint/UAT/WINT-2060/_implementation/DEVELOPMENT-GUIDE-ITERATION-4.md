# Development Guide - WINT-2060 Fix Iteration 4

**Story**: Populate Library Cache — Cache Common Library Patterns (React 19, Tailwind, Zod, Vitest)

**Setup Completed**: 2026-03-07T23:30:00Z

**Status**: Ready for Development Phase

---

## Overview

This is iteration 4 (final attempt) of a QA failure recovery. Previous iterations 1-2 successfully addressed code review feedback by extracting a shared `readDoc()` utility. Iteration 3 QA verification failed, moving the story to failed-qa status.

---

## What Changed in Previous Iterations

### Iteration 1-2: Code Review Fixes
- **Issue**: Duplicated `readDoc()` utility function across three populate-* scripts
- **Fix Applied**: Extracted shared utility to `packages/backend/mcp-tools/src/scripts/utils/read-doc.ts`
- **Status**: Code review passed, verification passed
- **Files Modified**:
  - ✓ Created: `packages/backend/mcp-tools/src/scripts/utils/read-doc.ts`
  - ✓ Updated: `packages/backend/mcp-tools/src/scripts/populate-library-cache.ts`
  - ✓ Updated: `packages/backend/mcp-tools/src/scripts/populate-domain-kb.ts`
  - ✓ Updated: `packages/backend/mcp-tools/src/scripts/populate-project-context.ts`

### Iteration 3: QA Verification
- **Status**: FAILED
- **Reason**: Unknown (QA test failure during integration testing)
- **Story Status**: Moved to failed-qa

---

## What to Fix in Iteration 4

The QA test failures likely relate to one or more of these scenarios from the test plan:

### Happy Path Tests (HP-1 through HP-5)
- [ ] **HP-1**: Script populates all 4 library cache packs successfully
  - Expected: { attempted: 4, succeeded: 4, failed: 0 }
  - Check: 4 rows in context_packs table with correct pack_keys
  
- [ ] **HP-2**: Script is idempotent — re-run produces same 4 rows
  - Expected: Row count remains exactly 4 after second run
  - Check: No duplicate rows created
  
- [ ] **HP-3**: Each pack content has required JSONB structure
  - Expected: summary (length > 10), patterns (length >= 3), rules (length >= 1)
  - Expected: Total JSONB size < 8000 bytes
  - Check: SELECT pack_key, content->>'summary', jsonb_array_length(content->'patterns') FROM context_packs
  
- [ ] **HP-4**: contextCachePut called with correct TTL
  - Expected: TTL = 2592000 (30 days in seconds)
  - Check: Mock spy on contextCachePutFn
  
- [ ] **HP-5**: Script exits 0 via pnpm tsx
  - Expected: Exit code 0 with correct log output
  - Check: Process completion and logger output

### Error Case Tests (EC-1 through EC-3)
- [ ] **EC-1**: Single pack write failure doesn't abort remaining packs
  - Check: result.failed > 0, result.succeeded < 4
  
- [ ] **EC-2**: Missing source document handled gracefully
  - Check: readDoc() returns null → pack skipped with warning, no throw
  
- [ ] **EC-3**: All write failures returns clean result
  - Check: { attempted: 4, succeeded: 0, failed: 4 }

### Edge Case Tests (ED-1 through ED-4)
- [ ] **ED-1**: Minimal source doc doesn't throw
- [ ] **ED-2**: Content size guard prevents oversized JSONB
- [ ] **ED-3**: Only 'codebase' packType written
- [ ] **ED-4**: Result conforms to PopulateResultSchema

---

## Key Implementation Files

### 1. populate-library-cache.ts
**Location**: `packages/backend/mcp-tools/src/scripts/populate-library-cache.ts`

**Responsibility**: Main script that orchestrates library cache population

**Key Functions**:
- `populateLibraryCache(options?)` - Main entry point
- `extractReact19Patterns(_doc: string)` - Extract React 19 patterns
- `extractTailwindPatterns(_doc: string)` - Extract Tailwind patterns
- `extractZodPatterns(_doc: string)` - Extract Zod patterns
- `extractVitestPatterns(_doc: string)` - Extract Vitest patterns
- `readDoc(relPath: string)` - Local wrapper for shared utility

**Dependencies**:
- `readDoc as readDocUtil` from `./utils/read-doc.js` (shared utility)
- `contextCachePut` from `../context-cache/context-cache-put.js`
- `@repo/logger` from `@repo/logger`
- Zod schemas: `PopulateResultSchema`, `LibraryContentSchema`

**Zod Schemas**:
```typescript
PopulateResultSchema = z.object({
  attempted: z.number(),
  succeeded: z.number(),
  failed: z.number(),
})

LibraryContentSchema = z.object({
  summary: z.string(),
  patterns: z.array(z.string()),
  rules: z.array(z.string()),
  examples: z.array(z.string()).optional(),
})
```

**Export**: `export function populateLibraryCache(options?: { ... }): Promise<PopulateResult>`

---

### 2. utils/read-doc.ts
**Location**: `packages/backend/mcp-tools/src/scripts/utils/read-doc.ts`

**Responsibility**: Shared utility for reading files relative to monorepo root

**Key Function**:
```typescript
export function readDoc(relPath: string, callerTag?: string): string | null
```

**Behavior**:
- Resolves monorepo root (6 directories up from script location)
- Reads file relative to root
- Returns null on failure (logs warning with callerTag)
- Uses @repo/logger instead of console

**Used By**:
- populate-library-cache.ts
- populate-domain-kb.ts
- populate-project-context.ts

---

### 3. populate-library-cache.test.ts
**Location**: `packages/backend/mcp-tools/src/scripts/__tests__/populate-library-cache.test.ts`

**Responsibility**: Comprehensive test coverage for library cache population

**Required Scenarios**:
- All 9 QA test scenarios (HP-1 through ED-4)
- Mock patterns: readDocFn, contextCachePutFn
- Coverage: >= 45% (project requirement)

**Test Structure**:
- Happy path tests (5 tests)
- Error case tests (3 tests)
- Edge case tests (4 tests)

---

## Common Issues to Check

1. **JSONB Content Structure**
   - Ensure summary is non-empty and > 10 characters
   - Ensure patterns array has at least 3 items
   - Ensure rules array has at least 1 item
   - Ensure total JSON size is < 8000 bytes

2. **TTL Values**
   - Verify contextCachePut is called with ttl: 2592000
   - Check constant: `const TTL_30_DAYS = 2592000`

3. **Pack Keys**
   - Verify all 4 pack keys are created:
     - lib-react19
     - lib-tailwind
     - lib-zod
     - lib-vitest

4. **Pack Type**
   - Verify all packs use pack_type: 'codebase'

5. **Error Handling**
   - Verify readDoc null returns are handled gracefully
   - Verify contextCachePut failures don't abort remaining packs
   - Verify result object is always well-formed

6. **Idempotency**
   - Verify re-running script produces same 4 rows (no duplicates)
   - Check for upsert logic or row deduplication

---

## Database Information

**Table**: `wint.context_packs`

**Expected Rows After Success**:
```sql
SELECT COUNT(*) FROM wint.context_packs 
WHERE pack_key IN ('lib-react19','lib-tailwind','lib-zod','lib-vitest') 
  AND pack_type='codebase'
-- Expected: 4
```

**Expected Row Structure**:
```sql
SELECT 
  pack_key, 
  pack_type,
  content->>'summary' as summary,
  jsonb_array_length(content->'patterns') as pattern_count,
  jsonb_array_length(content->'rules') as rule_count,
  LENGTH(content::text) as content_size
FROM wint.context_packs 
WHERE pack_key LIKE 'lib-%'
```

**Testing Checklist**:
- [ ] Run script against local dev database (port 5432, lego_dev)
- [ ] Verify 4 rows created with correct pack_keys
- [ ] Verify all rows have pack_type='codebase'
- [ ] Verify content JSONB structure is valid
- [ ] Verify summary length > 10 characters
- [ ] Verify patterns array has >= 3 items
- [ ] Verify rules array has >= 1 item
- [ ] Verify total JSON size < 8000 bytes
- [ ] Run script again, verify row count stays at 4
- [ ] Clean rows, run script, verify fresh creation works

---

## Running the Script

### From Monorepo Root
```bash
# Set database connection
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lego_dev"

# Run the script
pnpm tsx packages/backend/mcp-tools/src/scripts/populate-library-cache.ts

# Expected output in logs:
# [populate-library-cache] Populating library cache...
# [populate-library-cache] Successfully populated: { attempted: 4, succeeded: 4, failed: 0 }
```

### Running Tests
```bash
# Run all mcp-tools tests
pnpm --filter @repo/mcp-tools run test

# Run just populate-library-cache tests
pnpm --filter @repo/mcp-tools run test -- populate-library-cache

# Expected: 362 tests pass, 100%
```

### Type Checking & Linting
```bash
# Type check
pnpm --filter @repo/mcp-tools run check-types

# Lint
pnpm --filter @repo/mcp-tools exec eslint "src/scripts/**/*.ts"

# Both should pass with no errors
```

---

## Success Criteria

All of the following must pass for iteration 4 to succeed:

- [ ] All 9 QA test scenarios pass (HP-1 through ED-4)
- [ ] Type checking passes (pnpm check-types)
- [ ] Linting passes (no errors)
- [ ] All 362 mcp-tools tests pass
- [ ] No new issues introduced
- [ ] Code follows CLAUDE.md guidelines
- [ ] Zod schemas are used consistently
- [ ] Error handling is comprehensive
- [ ] Idempotency is verified
- [ ] JSONB content structure is correct

---

## Resources

**Story Requirements**: See WINT-2060.md (frontmatter, test_plan section)

**Code Review Feedback**: See VERIFICATION.md (previous fix iterations)

**Setup Artifacts**:
- CHECKPOINT.yaml - Current phase and iteration tracking
- SETUP-LOG-FIX-ITERATION-4.md - Setup phase summary
- FIX-SUMMARY-ITERATION-4.yaml - Detailed issue list and checklist
- SETUP-COMPLETE-ITERATION-4.md - Full setup documentation

---

**IMPORTANT**: This is iteration 4 (final attempt). The story has exceeded max_iterations (3). Success in this iteration is critical to move the story out of failed-qa status.
