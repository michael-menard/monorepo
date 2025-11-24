# Quick Error Reference - lego-api-serverless

**Total**: 112 errors | **Time to Fix**: ~4 hours

---

## 🎯 Top 5 Error Patterns (90% of all errors)

### 1️⃣ Response Helper Signature (43 errors - 38%)

```typescript
❌ return errorResponse(400, 'Missing fields')
✅ return errorResponse(400, 'VALIDATION_ERROR', 'Missing fields')
```

**Fix**: Add error code as 2nd parameter in all `endpoints/moc-parts-lists/*.ts`

---

### 2️⃣ Missing Properties (24 errors - 21%)

```typescript
❌ event.requestContext.authorizer.claims.sub
✅ event.requestContext.authorizer?.jwt?.claims?.sub

❌ if (result.statusCode >= 400)
✅ if (typeof result !== 'string' && result.statusCode >= 400)
```

**Fix**: Update API Gateway v2 event handling in `core/utils/lambda-wrapper.ts`

---

### 3️⃣ AWS SDK Version Conflict (15 errors - 13%)

```json
❌ Multiple @smithy/types versions (4.8.0 and 4.9.0)
✅ Add to package.json:
{
  "pnpm": {
    "overrides": {
      "@smithy/types": "4.9.0"
    }
  }
}
```

**Fix**: Add override then run `pnpm install`

---

### 4️⃣ Unused Variables (15 errors - 13%)

```typescript
❌ import { ApiError } from './errors'  // never used
✅ Remove the import

❌ const durationMs = Date.now() - startTime
✅ const _durationMs = Date.now() - startTime  // prefix with _
```

**Fix**: Remove or prefix with `_` in 9 files

---

### 5️⃣ Database Schema (8 errors - 7%)

```typescript
❌ mocPartsListItems.insert(...)
✅ mocPartsLists.insert(...)  // or update schema

❌ { mocInstructionId: '123' }
✅ { mocId: '123' }
```

**Fix**: Check schema, then bulk replace in `endpoints/moc-parts-lists/*.ts`

---

## 🔧 Error Code Decoder

| Code       | Meaning                   | Quick Fix                                    |
| ---------- | ------------------------- | -------------------------------------------- |
| **TS2554** | Wrong number of arguments | Check function signature, add missing params |
| **TS2339** | Property doesn't exist    | Check type definition, add type guard        |
| **TS6133** | Unused variable           | Remove or prefix with `_`                    |
| **TS2345** | Type mismatch             | Check dependency versions (usually AWS SDK)  |
| **TS2552** | Can't find name           | Typo or missing import                       |
| **TS2307** | Can't find module         | Missing dependency or wrong path             |

---

## 📁 Files by Error Count

| File                                                    | Errors  | Priority  |
| ------------------------------------------------------- | ------- | --------- |
| `endpoints/moc-parts-lists/create/handler.ts`           | 11      | 🔴 High   |
| `endpoints/moc-parts-lists/delete/handler.ts`           | 9       | 🔴 High   |
| `endpoints/moc-parts-lists/get-user-summary/handler.ts` | 7       | 🔴 High   |
| `endpoints/moc-parts-lists/get/handler.ts`              | 7       | 🔴 High   |
| `endpoints/moc-parts-lists/update-status/handler.ts`    | 7       | 🔴 High   |
| `endpoints/moc-parts-lists/update/handler.ts`           | 10      | 🔴 High   |
| `core/utils/lambda-wrapper.ts`                          | 10      | 🟡 Medium |
| `core/storage/retry.ts`                                 | 8       | 🟡 Medium |
| `core/observability/metrics.ts`                         | 8       | 🟢 Low    |
| All others                                              | <5 each | 🟢 Low    |

---

## ⚡ Fastest Wins

### 5-Minute Fixes (30+ errors)

```bash
# 1. Fix AWS SDK conflicts (15 errors fixed)
echo ',
  "pnpm": {
    "overrides": {
      "@smithy/types": "4.9.0"
    }
  }' >> package.json
pnpm install

# 2. Install missing Cognito SDK (1 error fixed)
pnpm add @aws-sdk/client-cognito-identity-provider

# 3. Remove unused imports (15 errors fixed)
# Just delete unused import lines manually (takes 5 min)
```

**Result**: 31 errors → 81 errors in 10 minutes! ⚡

---

## 🛠️ Common Patterns

### Pattern: Database Table Reference

```typescript
// Find all instances
grep -rn "mocPartsListItems" endpoints/moc-parts-lists/

// Replace all
sed -i '' 's/mocPartsListItems/mocPartsLists/g' endpoints/moc-parts-lists/**/*.ts
```

### Pattern: Column Name Change

```typescript
// Find
grep -rn "mocInstructionId" endpoints/moc-parts-lists/

// Replace
sed -i '' 's/mocInstructionId/mocId/g' endpoints/moc-parts-lists/**/*.ts
```

### Pattern: Response Helper

```typescript
// Find all error responses
grep -rn "errorResponse(" endpoints/moc-parts-lists/

// Update each one manually (easier than regex):
errorResponse(400, 'VALIDATION_ERROR', 'Original message')
```

---

## 🎬 Start Here

**Option 1: Quick Wins First**

```bash
# Fix 30+ errors in 10 minutes
cd apps/api
cat ERROR_FIX_ROADMAP.md  # Read Phase 1
# Execute Phase 1 commands
```

**Option 2: Systematic Approach**

```bash
# Read full catalog
cat ERROR_CATALOG.md

# Follow roadmap
cat ERROR_FIX_ROADMAP.md

# Check progress after each phase
pnpm tsc --noEmit | grep "error TS" | wc -l
```

**Option 3: File-by-File**

```bash
# Pick highest error count files first
# Fix all errors in each file before moving to next
vim endpoints/moc-parts-lists/create/handler.ts  # 11 errors
vim endpoints/moc-parts-lists/update/handler.ts  # 10 errors
vim core/utils/lambda-wrapper.ts                 # 10 errors
```

---

## 🧪 Testing Progress

```bash
# Before starting
pnpm tsc --noEmit 2>&1 | tee /tmp/errors-before.txt
cat /tmp/errors-before.txt | grep "error TS" | wc -l  # 112

# After Phase 1
pnpm tsc --noEmit 2>&1 | tee /tmp/errors-phase1.txt
cat /tmp/errors-phase1.txt | grep "error TS" | wc -l  # Expected: ~82

# After Phase 2
pnpm tsc --noEmit 2>&1 | tee /tmp/errors-phase2.txt
cat /tmp/errors-phase2.txt | grep "error TS" | wc -l  # Expected: ~74

# After Phase 3
pnpm tsc --noEmit 2>&1 | tee /tmp/errors-phase3.txt
cat /tmp/errors-phase3.txt | grep "error TS" | wc -l  # Expected: ~31

# After Phase 4
pnpm tsc --noEmit 2>&1 | tee /tmp/errors-phase4.txt
cat /tmp/errors-phase4.txt | grep "error TS" | wc -l  # Expected: ~21

# After Phase 5
pnpm tsc --noEmit  # Expected: 0 errors ✅
```

---

## 💡 Pro Tips

1. **Work in a branch**: `git checkout -b fix/typescript-errors`
2. **Commit after each phase**: Easy to rollback if needed
3. **Test incrementally**: Don't wait until all fixes to test
4. **Use search-replace carefully**: Double-check regex patterns
5. **Keep catalog open**: Reference while fixing

---

## 📞 Need Help?

**Stuck on specific error?**

1. Search error code in `ERROR_CATALOG.md`
2. Find file in error distribution table
3. Check example fix in roadmap

**Can't find pattern?**

```bash
# Show all errors for specific file
pnpm tsc --noEmit | grep "filename.ts"

# Show all errors of specific type
pnpm tsc --noEmit | grep "TS2554"
```

---

**Last Updated**: 2025-11-23
**Status**: Ready to fix
**Estimated Time**: 3-4 hours
