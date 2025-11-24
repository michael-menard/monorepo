# TypeScript Error Catalog - lego-api-serverless

**Total Errors**: 112
**Date**: 2025-11-23
**Status**: Systematic issues from code reorganization

---

## Executive Summary

The API has 112 TypeScript errors categorized into 8 major groups. Most errors stem from:

1. Response helper function signature changes (38%)
2. AWS SDK dependency version mismatches (13%)
3. Database schema inconsistencies (11%)
4. Unused variable warnings (13%)
5. Missing module/property issues (23%)

---

## Error Categories by Priority

### 🔴 CRITICAL - Blocks Functionality (51 errors)

#### 1. Response Helper Signature Changes (43 errors - TS2554)

**Impact**: All error responses fail to compile
**Root Cause**: `errorResponse()`, `successResponse()`, etc. changed signatures during reorganization

**Affected Files**:

- `endpoints/moc-parts-lists/create/handler.ts` (8 occurrences)
- `endpoints/moc-parts-lists/delete/handler.ts` (7 occurrences)
- `endpoints/moc-parts-lists/get-user-summary/handler.ts` (7 occurrences)
- `endpoints/moc-parts-lists/get/handler.ts` (7 occurrences)
- `endpoints/moc-parts-lists/update-status/handler.ts` (7 occurrences)
- `endpoints/moc-parts-lists/update/handler.ts` (7 occurrences)

**Error Pattern**:

```
error TS2554: Expected 3-4 arguments, but got 2.
```

**Example**:

```typescript
// Current (broken)
return errorResponse(400, 'Missing required fields')

// Expected signature
return errorResponse(400, 'VALIDATION_ERROR', 'Missing required fields')
// OR
return errorResponse(400, 'VALIDATION_ERROR', 'Missing required fields', metadata)
```

**Fix Strategy**:

1. Check `core/utils/responses.ts` for actual function signatures
2. Create find-replace script to update all calls systematically
3. Add error codes (second parameter) to all error responses

---

#### 2. Database Schema Issues (8 errors - TS2552, TS2353, TS2339, TS2769)

**Impact**: MOC Parts Lists feature completely broken
**Root Cause**: Schema was reorganized but table references weren't updated

**A. Missing Table Reference (6 errors - TS2552)**

```
error TS2552: Cannot find name 'mocPartsListItems'. Did you mean 'mocPartsLists'?
```

**Affected Files**:

- `endpoints/moc-parts-lists/create/handler.ts:93`
- `endpoints/moc-parts-lists/create/handler.ts:111`
- `endpoints/moc-parts-lists/update/handler.ts:114`
- `endpoints/moc-parts-lists/update/handler.ts:122`
- (2 more instances)

**Fix**:

- Either rename table to `mocPartsListItems` in schema
- Or update all references to use `mocPartsLists`
- Check `core/database/schema` for actual table name

**B. Unknown Column `mocInstructionId` (multiple instances - TS2339)**

```
error TS2339: Property 'mocInstructionId' does not exist
```

**Fix**: Column was renamed to `mocId` - update all references

**C. Unknown Column `totalParts` (1 error - TS2353)**

```
endpoints/moc-parts-lists/update/handler.ts:122
error TS2353: Object literal may only specify known properties, and 'totalParts' does not exist
```

**Fix**: Remove or rename to match schema

---

#### 3. Missing Module Imports (2 errors - TS2307)

**Impact**: Build failures in core modules

**A. Missing Cognito SDK**

```
core/auth/cognito.ts:14
error TS2307: Cannot find module '@aws-sdk/client-cognito-identity-provider'
```

**Fix**:

```bash
pnpm add @aws-sdk/client-cognito-identity-provider
```

**B. Missing S3 Client Export**

```
core/storage/retry.ts:266
error TS2307: Cannot find module './s3-client'
```

**Fix**: Create export or update import path

---

#### 4. Missing Property/Method (24 errors - TS2339)

**Impact**: Lambda authorizer, WebSocket, and response handling broken

**A. Missing `authorizer` Property (3 errors)**

```
core/utils/lambda-wrapper.ts:67,79
endpoints/moc-instructions/upload-file/handler.ts:194
error TS2339: Property 'authorizer' does not exist on type 'APIGatewayEventRequestContextV2'
```

**Root Cause**: API Gateway v2 uses different auth structure than v1

**Fix**: Update to use `event.requestContext.authorizer.jwt.claims`

**B. Missing `statusCode` on Response (3 errors)**

```
core/utils/lambda-wrapper.ts:199,208,222
error TS2339: Property 'statusCode' does not exist on type 'APIGatewayProxyResultV2'
```

**Root Cause**: `APIGatewayProxyResultV2` can be `string | object`

**Fix**: Add type guard:

```typescript
if (typeof result !== 'string' && result.statusCode) {
  // Handle object response
}
```

**C. Missing `queryStringParameters` (1 error)**

```
endpoints/websocket/connect/handler.ts:37
error TS2339: Property 'queryStringParameters' does not exist on type 'APIGatewayProxyWebsocketEventV2'
```

**Fix**: Update to `event.queryStringParameters` (might be missing from types)

**D. Missing OpenSearch Method (1 error)**

```
endpoints/moc-instructions/finalize-with-files/handler.ts:183
error TS2339: Property 'indexMoc' does not exist on type 'typeof import(...opensearch)'
```

**Fix**: Method was renamed or removed - check opensearch module exports

**E. Missing Metrics Export (1 error)**

```
core/utils/lambda-wrapper.ts:34
error TS2305: Module '@/core/observability/metrics' has no exported member 'emitMetric'
```

**Fix**: Export was renamed or removed - update import

**F. Missing `isRetryable` Property (1 error)**

```
core/utils/retry.ts:154
error TS2339: Property 'isRetryable' does not exist on type 'ApiError'
```

**Fix**: Add property to `ApiError` class or remove check

**G. Database Schema Property Issues (14 errors)**

- See "Database Schema Issues" section above

---

### 🟡 MEDIUM - Code Quality Issues (15 errors - TS6133)

#### Unused Variables/Imports

**Impact**: None (warnings only, but enforce strict mode)

**Files with unused declarations**:

1. `core/database/schema/umami.ts:23` - `pgTable`
2. `core/observability/error-sanitizer.ts:24` - `InternalServerError`, `ApiError`
3. `core/observability/error-sanitizer.ts:109` - `message`
4. `core/observability/metrics.ts:38` - `EMF_FLUSH_TIMEOUT`
5. `core/observability/metrics.ts:286,299,312` - `durationMs` (3 instances)
6. `core/observability/tracing.ts:26` - `S3Client`
7. `core/observability/tracing.ts:136` - `parentSubsegment`
8. `core/search/retry.ts:183` - `isRetryable`
9. `core/utils/image-upload-service.ts:115` - `uploadType`
10. `core/utils/lambda-wrapper.ts:78` - `getUserId`
11. `endpoints/moc-instructions/_shared/moc-file-service.ts:50` - `ALLOWED_MIME_TYPES`
12. `endpoints/moc-instructions/upload-parts-list/handler.ts:30` - `uuidv4`

**Fix Strategy**:

1. Remove unused imports
2. Prefix intentionally unused vars with `_` (e.g., `_durationMs`)
3. Use the variable or remove declaration

---

### 🟠 HIGH - Type Safety Issues (16 errors)

#### 1. AWS SDK Version Conflicts (15 errors - TS2345)

**Impact**: S3 retry logic fails, breaks file uploads
**Root Cause**: Multiple `@smithy/types` versions (4.8.0 vs 4.9.0)

**Affected Files**:

- `core/storage/retry.ts` (5 instances)
- `endpoints/moc-instructions/_shared/moc-file-service.ts` (2 instances)
- `endpoints/moc-instructions/initialize-with-files/handler.ts` (1 instance)

**Error Pattern**:

```
error TS2345: Argument of type 'S3Client' is not assignable to parameter of type 'Client<any, ServiceInputTypes, MetadataBearer, any>'
```

**Root Cause**: Dependency version mismatch

```
@smithy/types@4.8.0 (from some packages)
@smithy/types@4.9.0 (from other packages)
```

**Fix Strategy**:

1. **Option A**: Update all AWS SDK packages to latest compatible versions

```bash
pnpm update @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

2. **Option B**: Add resolution to force single Smithy version in `package.json`:

```json
{
  "pnpm": {
    "overrides": {
      "@smithy/types": "4.9.0"
    }
  }
}
```

3. **Option C**: Temporarily disable retry middleware until versions align

---

#### 2. File Type Incompatibility (2 errors - TS2345)

```
endpoints/moc-instructions/_shared/moc-file-service.ts:172,433
error TS2345: Argument of type '{ originalname: string; mimetype: string; size: number; buffer: Buffer }'
is not assignable to parameter of type 'UniversalFile'.
Missing properties: fieldname, encoding
```

**Fix**: Add missing Multer properties:

```typescript
const universalFile = {
  originalname: file.name,
  mimetype: file.type,
  size: file.size,
  buffer: file.buffer,
  fieldname: 'file', // Add
  encoding: '7bit', // Add
}
```

---

#### 3. Other Type Issues (4 errors)

**A. Missing Index Signature (1 error - TS2345)**

```
core/observability/frontend-errors.ts:74
error TS2345: Argument of type 'FrontendErrorContext' is not assignable to parameter of type 'Record<string, unknown>'
```

**Fix**: Add index signature to `FrontendErrorContext`:

```typescript
interface FrontendErrorContext {
  [key: string]: unknown
  // ... existing properties
}
```

**B. Spread Type Error (1 error - TS2698)**

```
core/utils/lambda-wrapper.ts:238
error TS2698: Spread types may only be created from object types
```

**Fix**: Add type guard before spread:

```typescript
const headers = typeof result !== 'string' ? { ...result.headers } : {}
```

**C. WebSocket Message Type Mismatch (1 error - TS2322)**

```
endpoints/websocket/_shared/broadcast.ts:135
error TS2322: Type union doesn't match expected 'WebSocketMessage'
```

**Fix**: Update `WebSocketMessage` type definition to include all message variants

**D. Non-null Assertion Error (1 error - TS2454)**

```
endpoints/moc-parts-lists/update/handler.ts:157
error TS2454: Variable 'partsList' is used before being assigned
```

**Fix**: Initialize variable or add null check

---

## Recommended Fix Order

### Phase 1: Dependencies (30 min)

1. ✅ **Fix AWS SDK version conflicts**

   ```bash
   # Add to apps/api/package.json
   "pnpm": {
     "overrides": {
       "@smithy/types": "4.9.0"
     }
   }
   pnpm install
   ```

2. ✅ **Install missing dependencies**
   ```bash
   pnpm add @aws-sdk/client-cognito-identity-provider
   ```

### Phase 2: Schema Fixes (1 hour)

1. ✅ **Audit database schema**
   - Check `core/database/schema` for actual table/column names
   - Document what changed

2. ✅ **Fix table references**
   - Replace `mocPartsListItems` → `mocPartsLists` (or vice versa)
   - Update `mocInstructionId` → `mocId`
   - Remove `totalParts` references

3. ✅ **Test database operations**

### Phase 3: Response Helpers (1 hour)

1. ✅ **Check function signatures**

   ```bash
   cat core/utils/responses.ts | grep "export.*function"
   ```

2. ✅ **Create migration script**

   ```bash
   # Find all errorResponse/successResponse calls
   # Update to match new signature (add error code param)
   ```

3. ✅ **Update all 43 calls**

### Phase 4: API Gateway v2 Updates (30 min)

1. ✅ **Fix authorizer access**
   - Replace `event.requestContext.authorizer`
   - With `event.requestContext.authorizer.jwt.claims`

2. ✅ **Fix response type guards**
   - Add checks for `typeof result !== 'string'`

3. ✅ **Fix WebSocket event types**

### Phase 5: Cleanup (30 min)

1. ✅ **Remove unused imports** (15 instances)
2. ✅ **Fix type annotations**
3. ✅ **Verify build passes**

---

## Error Distribution by File

### Most Affected Files

1. `endpoints/moc-parts-lists/*` - 43 errors (all response helpers)
2. `core/storage/retry.ts` - 8 errors (AWS SDK versions)
3. `core/utils/lambda-wrapper.ts` - 10 errors (API Gateway v2)
4. `core/observability/metrics.ts` - 8 errors (unused vars + signature)
5. `endpoints/moc-instructions/_shared/moc-file-service.ts` - 5 errors (file types + AWS SDK)

### Clean Files (✅ No Errors)

- `endpoints/gallery/*`
- `endpoints/wishlist/*`
- `endpoints/health/*`
- `core/cache/*`
- Most of `core/database/*` (except retry.ts)

---

## Quick Stats

| Category                   | Count   | %        |
| -------------------------- | ------- | -------- |
| Response Helper Signatures | 43      | 38%      |
| Unused Variables           | 15      | 13%      |
| AWS SDK Version Conflicts  | 15      | 13%      |
| Missing Properties         | 24      | 21%      |
| Database Schema            | 8       | 7%       |
| Type Incompatibility       | 5       | 4%       |
| Missing Modules            | 2       | 2%       |
| Other                      | 2       | 2%       |
| **TOTAL**                  | **112** | **100%** |

---

## Next Steps

1. **Immediate**: Fix Phase 1 (dependencies) to reduce errors by ~27%
2. **Short-term**: Fix Phases 2-4 (schema, responses, API Gateway)
3. **Final**: Phase 5 cleanup

**Estimated Total Time**: ~4 hours of focused work

---

## Notes

- Most errors are systematic - fixing one pattern fixes many instances
- No errors in gallery/wishlist endpoints suggests those were reorganized successfully
- Consider creating automated migration script for response helper updates
- AWS SDK version conflict needs resolution at package.json level

**Generated**: 2025-11-23 by dev agent (James)
