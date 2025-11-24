# Error Fix Roadmap - lego-api-serverless

**112 TypeScript Errors** → **0 Errors** in 5 Phases

---

## 📊 Error Breakdown

```
Response Helpers    ████████████████████████████████████████ 43 (38%)
Missing Properties  ██████████████████████                   24 (21%)
Unused Variables    ███████████████                          15 (13%)
AWS SDK Conflicts   ███████████████                          15 (13%)
Database Schema     ████████                                  8 (7%)
Type Safety         ██████                                    5 (4%)
Missing Modules     ██                                        2 (2%)
Other              ██                                        2 (2%)
```

---

## 🎯 Phase 1: Dependencies (30 min) → Fixes ~30 errors

### Actions

```bash
cd apps/api

# 1. Force single Smithy version (fixes 15 AWS SDK errors)
cat >> package.json << 'EOF'
,
  "pnpm": {
    "overrides": {
      "@smithy/types": "4.9.0"
    }
  }
EOF

# 2. Install missing Cognito SDK (fixes 1 error)
pnpm add @aws-sdk/client-cognito-identity-provider

# 3. Reinstall to apply overrides
pnpm install

# 4. Verify reduction
pnpm tsc --noEmit | grep "error TS" | wc -l
# Expected: ~82 errors (down from 112)
```

### Files Fixed

- ✅ `core/storage/retry.ts` - All AWS SDK conflicts
- ✅ `endpoints/moc-instructions/_shared/moc-file-service.ts` - S3Client type errors
- ✅ `endpoints/moc-instructions/initialize-with-files/handler.ts` - S3Client type errors
- ✅ `core/auth/cognito.ts` - Missing import

---

## 🎯 Phase 2: Database Schema (1 hour) → Fixes ~8 errors

### Investigation

```bash
# 1. Check actual schema
cat core/database/schema.ts | grep -A 5 "export const moc"

# 2. Find all references
grep -rn "mocPartsListItems" endpoints/
grep -rn "mocInstructionId" endpoints/
grep -rn "totalParts" endpoints/
```

### Actions

**Option A: Schema has `mocPartsLists` table**

```bash
# Replace mocPartsListItems → mocPartsLists
find endpoints/moc-parts-lists -name "*.ts" -exec sed -i '' 's/mocPartsListItems/mocPartsLists/g' {} +

# Replace mocInstructionId → mocId
find endpoints/moc-parts-lists -name "*.ts" -exec sed -i '' 's/mocInstructionId/mocId/g' {} +

# Remove totalParts references (or add to schema)
```

**Option B: Schema has `mocPartsListItems` table**

```bash
# Update imports in handlers
find endpoints/moc-parts-lists -name "*.ts" -exec sed -i '' 's/from.*schema.*mocPartsLists.*/from "...schema" { mocPartsListItems }/g' {} +
```

### Files Fixed

- ✅ `endpoints/moc-parts-lists/create/handler.ts` - 3 errors
- ✅ `endpoints/moc-parts-lists/update/handler.ts` - 3 errors
- ✅ `endpoints/moc-parts-lists/delete/handler.ts` - 2 errors

---

## 🎯 Phase 3: Response Helpers (1 hour) → Fixes ~43 errors

### Investigation

```bash
# Check actual signatures
cat core/utils/responses.ts | grep -A 5 "export function errorResponse"
cat core/utils/responses.ts | grep -A 5 "export function successResponse"
```

### Expected Signatures

```typescript
// Old (2 params)
errorResponse(statusCode: number, message: string)

// New (3-4 params)
errorResponse(statusCode: number, code: string, message: string, metadata?: unknown)
```

### Migration Script

Create `fix-response-helpers.sh`:

```bash
#!/bin/bash

# Fix errorResponse calls
find endpoints/moc-parts-lists -name "*.ts" -exec sed -i '' \
  's/errorResponse(400, '\''Missing required fields'\'')/errorResponse(400, "VALIDATION_ERROR", "Missing required fields")/g' {} +

find endpoints/moc-parts-lists -name "*.ts" -exec sed -i '' \
  's/errorResponse(403, '\''Unauthorized'\'')/errorResponse(403, "FORBIDDEN", "Unauthorized")/g' {} +

find endpoints/moc-parts-lists -name "*.ts" -exec sed -i '' \
  's/errorResponse(404, '\''Not found'\'')/errorResponse(404, "NOT_FOUND", "Not found")/g' {} +

find endpoints/moc-parts-lists -name "*.ts" -exec sed -i '' \
  's/errorResponse(500, '\''Internal server error'\'')/errorResponse(500, "INTERNAL_ERROR", "Internal server error")/g' {} +
```

**OR** Manual pattern:

```typescript
// Find this pattern
return errorResponse(400, 'Missing required fields')

// Replace with
return errorResponse(400, 'VALIDATION_ERROR', 'Missing required fields')
```

### Error Code Mapping

- 400 → `VALIDATION_ERROR`
- 403 → `FORBIDDEN`
- 404 → `NOT_FOUND`
- 500 → `INTERNAL_ERROR`
- 409 → `CONFLICT`

### Files to Update

All 6 handlers in `endpoints/moc-parts-lists/`:

- `create/handler.ts` (8 calls)
- `delete/handler.ts` (7 calls)
- `get-user-summary/handler.ts` (7 calls)
- `get/handler.ts` (7 calls)
- `update-status/handler.ts` (7 calls)
- `update/handler.ts` (7 calls)

---

## 🎯 Phase 4: API Gateway v2 (30 min) → Fixes ~10 errors

### Actions

**A. Fix Authorizer Access (3 errors)**

```typescript
// Old (API Gateway v1)
const userId = event.requestContext.authorizer.claims.sub

// New (API Gateway v2)
const userId = event.requestContext.authorizer?.jwt?.claims?.sub
```

Files:

- `core/utils/lambda-wrapper.ts:67,79`
- `endpoints/moc-instructions/upload-file/handler.ts:194`

**B. Fix Response Type Guards (3 errors)**

```typescript
// Add type guard
if (typeof result !== 'string') {
  if (result.statusCode >= 400) {
    // Handle error
  }
}
```

Files:

- `core/utils/lambda-wrapper.ts:199,208,222`

**C. Fix WebSocket Query Params (1 error)**

```typescript
// Check actual event structure
const token = event.queryStringParameters?.token
```

File:

- `endpoints/websocket/connect/handler.ts:37`

**D. Fix Missing Exports (2 errors)**

```typescript
// Check what's actually exported
import {} from /* actual exports */ '@/core/observability/metrics'
import {} from /* actual exports */ '@/core/search/opensearch'
```

Files:

- `core/utils/lambda-wrapper.ts:34` - emitMetric
- `endpoints/moc-instructions/finalize-with-files/handler.ts:183` - indexMoc

**E. Fix Spread Operator (1 error)**

```typescript
// Add null check
const headers = typeof result !== 'string' && result.headers ? { ...result.headers } : {}
```

File:

- `core/utils/lambda-wrapper.ts:238`

---

## 🎯 Phase 5: Cleanup (30 min) → Fixes ~15 errors

### Remove Unused Imports/Variables

```bash
# Automated cleanup
npx eslint --fix core/ endpoints/ --rule "no-unused-vars: error"

# OR manual for each file:
```

**Files to clean:**

1. `core/database/schema/umami.ts:23` - Remove `pgTable` import
2. `core/observability/error-sanitizer.ts:24,109` - Remove unused imports
3. `core/observability/metrics.ts:38,286,299,312` - Remove or use vars
4. `core/observability/tracing.ts:26,136` - Remove unused imports
5. `core/search/retry.ts:183` - Remove `isRetryable`
6. `core/utils/image-upload-service.ts:115` - Prefix with `_uploadType`
7. `core/utils/lambda-wrapper.ts:78` - Remove `getUserId`
8. `endpoints/moc-instructions/_shared/moc-file-service.ts:50` - Remove or use
9. `endpoints/moc-instructions/upload-parts-list/handler.ts:30` - Remove `uuidv4`

### Fix Remaining Type Issues

**A. Index Signature (1 error)**

```typescript
// core/observability/frontend-errors.ts
interface FrontendErrorContext {
  [key: string]: unknown
  // ... existing properties
}
```

**B. File Type (2 errors)**

```typescript
// endpoints/moc-instructions/_shared/moc-file-service.ts:172,433
const file: UniversalFile = {
  ...existingProps,
  fieldname: 'file',
  encoding: '7bit',
}
```

**C. Variable Initialization (1 error)**

```typescript
// endpoints/moc-parts-lists/update/handler.ts:157
let partsList: PartsList | null = null
// ... later
if (!partsList) {
  return errorResponse(404, 'NOT_FOUND', 'Parts list not found')
}
```

---

## 🎯 Verification

After each phase:

```bash
# Run type check
pnpm tsc --noEmit 2>&1 | tee errors.txt

# Count remaining
cat errors.txt | grep "error TS" | wc -l

# Group by type
cat errors.txt | grep "error TS" | sed 's/.*error //' | cut -d: -f1 | sort | uniq -c | sort -rn
```

Final verification:

```bash
# Should show 0 errors
pnpm check-types

# Should build successfully
pnpm build
```

---

## 📋 Checklist

### Phase 1: Dependencies

- [ ] Add Smithy type override to package.json
- [ ] Install @aws-sdk/client-cognito-identity-provider
- [ ] Run pnpm install
- [ ] Verify ~30 errors resolved

### Phase 2: Database Schema

- [ ] Audit schema for actual table names
- [ ] Fix mocPartsListItems references
- [ ] Fix mocInstructionId → mocId
- [ ] Remove or add totalParts column
- [ ] Verify ~8 errors resolved

### Phase 3: Response Helpers

- [ ] Check response function signatures
- [ ] Update all errorResponse calls (43 instances)
- [ ] Add error codes as second parameter
- [ ] Verify all 43 errors resolved

### Phase 4: API Gateway v2

- [ ] Fix authorizer access (3 files)
- [ ] Add response type guards (1 file)
- [ ] Fix WebSocket query params (1 file)
- [ ] Fix missing exports (2 files)
- [ ] Fix spread operator (1 file)
- [ ] Verify ~10 errors resolved

### Phase 5: Cleanup

- [ ] Remove unused imports (9 files)
- [ ] Add index signature (1 file)
- [ ] Fix file type (1 file)
- [ ] Initialize variables (1 file)
- [ ] Verify final ~15 errors resolved

### Final

- [ ] Run full type check (0 errors)
- [ ] Run build (success)
- [ ] Run tests
- [ ] Commit fixes

---

## 🚀 Quick Start

```bash
# Clone this terminal session and run phases sequentially:
cd /Users/michaelmenard/Development/Monorepo/apps/api

# Phase 1
./scripts/fix-phase-1-dependencies.sh

# Phase 2
./scripts/fix-phase-2-schema.sh

# Phase 3
./scripts/fix-phase-3-responses.sh

# Phase 4
./scripts/fix-phase-4-api-gateway.sh

# Phase 5
./scripts/fix-phase-5-cleanup.sh

# Verify
pnpm build && echo "✅ SUCCESS"
```

---

**Time Estimate**: 3-4 hours total
**Risk**: Low - all changes are systematic and reversible
**Testing**: Each phase can be tested independently

**Generated**: 2025-11-23 by dev agent (James)
