# PRD: Reorganize lego-api-serverless Directory Structure

## 📋 Overview

**Goal**: Improve code organization by restructuring the `lego-api-serverless` directory to use clear, descriptive folder names that separate Lambda handlers from shared application code.

**Status**: Ready for Implementation
**Priority**: Medium
**Estimated Effort**: 1-2 hours

---

## 🎯 Problem Statement

### Current Issues:
1. **Generic naming**: `src/` doesn't clearly indicate its purpose
2. **Lambda handlers at root**: Functions scattered at project root alongside config files
3. **Unclear organization**: `src/lib/` mixes infrastructure clients with business logic
4. **Inconsistent depth**: Some code is deeply nested (`src/lib/services/`) while handlers are at root

### Current Structure:
```
apps/api/lego-api-serverless/
├── src/                    # ❌ Generic name
│   ├── db/
│   ├── lib/                # ❌ Mixed concerns
│   │   ├── cache/
│   │   ├── db/
│   │   ├── search/
│   │   ├── services/
│   │   ├── storage/
│   │   ├── utils/
│   │   └── validation/
│   └── types/
├── gallery/                # ❌ Lambda at root
├── wishlist/               # ❌ Lambda at root
├── mocInstructions/        # ❌ Lambda at root
├── moc-parts-lists/        # ❌ Lambda at root
├── health/                 # ❌ Lambda at root
├── sst.config.ts
└── package.json
```

---

## ✨ Proposed Solution

### New Structure:
```
apps/api/lego-api-serverless/
├── functions/              # ✅ All Lambda handlers grouped
│   ├── gallery/
│   ├── wishlist/
│   ├── moc-instructions/   # Renamed from mocInstructions
│   ├── moc-parts-lists/
│   └── health/
│
├── core/                   # ✅ Shared application code
│   ├── db/                 # Database schema, migrations, client
│   ├── services/           # Business logic services
│   ├── clients/            # ✅ Infrastructure clients grouped
│   │   ├── cache/          # Redis client
│   │   ├── search/         # OpenSearch client
│   │   └── storage/        # S3 client wrapper
│   ├── validation/         # Zod schemas
│   ├── utils/              # App-specific utilities
│   └── types/              # TypeScript types
│
├── __tests__/              # Test setup and fixtures (moved to root)
├── sst.config.ts
├── drizzle.config.ts
├── tsconfig.json
└── package.json
```

### Benefits:
✅ **Clear separation**: Lambda handlers vs. shared code
✅ **Descriptive names**: `functions/` and `core/` immediately convey purpose
✅ **Better grouping**: Infrastructure clients under `core/clients/`
✅ **Consistent depth**: Related code at similar nesting levels
✅ **Scalability**: Easy to add new Lambda functions or shared modules

---

## 🔧 Implementation Plan

### Phase 1: Create New Directory Structure

```bash
cd /Users/michaelmenard/Development/Monorepo/apps/api/lego-api-serverless

# Create new directories
mkdir -p functions
mkdir -p core/db
mkdir -p core/services
mkdir -p core/clients/cache
mkdir -p core/clients/search
mkdir -p core/clients/storage
mkdir -p core/validation
mkdir -p core/utils
mkdir -p core/types
```

### Phase 2: Move Lambda Handlers to `functions/`

```bash
# Move Lambda handler directories to functions/
git mv gallery functions/gallery
git mv wishlist functions/wishlist
git mv mocInstructions functions/moc-instructions  # Note: rename
git mv moc-parts-lists functions/moc-parts-lists
git mv health functions/health
```

### Phase 3: Move `src/` Contents to `core/`

```bash
# Move database files
git mv src/db/* core/db/

# Move services
git mv src/lib/services/* core/services/

# Move infrastructure clients
git mv src/lib/cache/* core/clients/cache/
git mv src/lib/search/* core/clients/search/
git mv src/lib/storage/* core/clients/storage/

# Move validation
git mv src/lib/validation/* core/validation/

# Move utilities
git mv src/lib/utils/* core/utils/

# Move types
git mv src/types/* core/types/

# Move tests to root level
git mv src/__tests__ ./__tests__
```

### Phase 4: Clean Up Migrated Files

These files/directories have been migrated to shared packages and should be removed:

```bash
# Remove migrated directories
rm -rf src/lib/errors
rm -rf src/lib/responses
rm -rf src/lib/cognito
rm -rf src/lib/middleware

# Remove migrated individual files
rm -f src/lib/services/image-processing.ts
rm -f src/lib/utils/multipart-parser.ts
rm -f src/lib/utils/cloudwatch-metrics.ts

# Remove empty directories
rm -rf src/lib
rm -rf src
```

### Phase 5: Update `tsconfig.json`

**File**: `tsconfig.json`

**Change 1 - Update paths:**
```diff
  "paths": {
-   "@/*": ["./src/*"],
-   "@/functions/*": ["./src/functions/*"],
-   "@/lib/*": ["./src/lib/*"],
-   "@/types/*": ["./src/types/*"]
+   "@/*": ["./core/*"],
+   "@/db/*": ["./core/db/*"],
+   "@/services/*": ["./core/services/*"],
+   "@/clients/*": ["./core/clients/*"],
+   "@/validation/*": ["./core/validation/*"],
+   "@/utils/*": ["./core/utils/*"],
+   "@/types/*": ["./core/types/*"]
  }
```

**Change 2 - Update include:**
```diff
- "include": ["src/**/*", "sst-env.d.ts"],
+ "include": ["core/**/*", "functions/**/*", "sst-env.d.ts"],
```

### Phase 6: Update Import Paths

**Find and replace across all TypeScript files:**

| Old Import | New Import |
|------------|------------|
| `@/lib/db/` | `@/db/` |
| `@/lib/services/` | `@/services/` |
| `@/lib/cache/` | `@/clients/cache/` |
| `@/lib/search/` | `@/clients/search/` |
| `@/lib/storage/` | `@/clients/storage/` |
| `@/lib/validation/` | `@/validation/` |
| `@/lib/utils/` | `@/utils/` |

**Files to update** (approximate count: ~50+ files):
- All Lambda handlers in `functions/`
- All service files in `core/services/`
- All client files in `core/clients/`
- All test files

**Example changes:**

Before:
```typescript
import { db } from '@/lib/db/client'
import { mocService } from '@/lib/services/moc-service'
import { getRedisClient } from '@/lib/cache/redis-client'
```

After:
```typescript
import { db } from '@/db/client'
import { mocService } from '@/services/moc-service'
import { getRedisClient } from '@/clients/cache/redis-client'
```

### Phase 7: Update Configuration Files

**File**: `drizzle.config.ts`

Update schema path:
```diff
- schema: './src/db/schema.ts',
+ schema: './core/db/schema.ts',
```

**File**: `vitest.config.ts` (if it references src/)

Check and update any path references to use `core/` instead of `src/`.

---

## ✅ Verification Steps

### 1. TypeScript Compilation
```bash
pnpm type-check
```
Expected: No errors

### 2. Build
```bash
pnpm build
```
Expected: Successful build

### 3. Tests
```bash
pnpm test
pnpm test:integration
```
Expected: All tests pass

### 4. Visual Inspection
- [ ] Verify all Lambda handlers are in `functions/`
- [ ] Verify all shared code is in `core/`
- [ ] Verify `src/` directory is completely removed
- [ ] Check git status shows moves, not deletions + additions

### 5. Import Verification
```bash
# Search for any remaining old imports
grep -r "@/lib/" functions/ core/
```
Expected: No results

---

## 📊 File Movement Summary

### Lambda Handlers (5 directories)
- `gallery/` → `functions/gallery/`
- `wishlist/` → `functions/wishlist/`
- `mocInstructions/` → `functions/moc-instructions/` ⚠️ Renamed
- `moc-parts-lists/` → `functions/moc-parts-lists/`
- `health/` → `functions/health/`

### Core Application Code
- `src/db/` → `core/db/`
- `src/lib/services/` → `core/services/`
- `src/lib/cache/` → `core/clients/cache/`
- `src/lib/search/` → `core/clients/search/`
- `src/lib/storage/` → `core/clients/storage/`
- `src/lib/validation/` → `core/validation/`
- `src/lib/utils/` → `core/utils/`
- `src/types/` → `core/types/`
- `src/__tests__/` → `__tests__/`

### Files to Remove (Already migrated to packages)
- `src/lib/errors/`
- `src/lib/responses/`
- `src/lib/cognito/`
- `src/lib/middleware/`
- `src/lib/services/image-processing.ts`
- `src/lib/utils/multipart-parser.ts`
- `src/lib/utils/cloudwatch-metrics.ts`

---

## 🚨 Important Notes

### Git Best Practices
- Use `git mv` to preserve file history
- Commit the reorganization in a single commit
- Include a clear commit message

### Breaking Changes
- **None for runtime** - Only directory structure changes
- **Developer impact** - Import paths change (IDE should auto-update)

### Rollback Plan
If issues arise:
```bash
git revert <commit-hash>
```

---

## 📝 Suggested Commit Message

```
refactor: reorganize lego-api-serverless directory structure

Restructure project to use clear, descriptive folder names:
- Move Lambda handlers from root to functions/
- Rename src/ to core/ for better clarity
- Group infrastructure clients under core/clients/
- Rename mocInstructions to moc-instructions for consistency

Changes:
- Created functions/ directory for all Lambda handlers
- Created core/ directory for shared application code
- Organized clients into core/clients/ (cache, search, storage)
- Updated all import paths (@/lib/* → @/services/*, @/clients/*, etc.)
- Updated tsconfig.json path mappings
- Removed migrated code (errors, responses, cognito, middleware, etc.)
- Moved __tests__/ to root level

Benefits:
- Clear separation between Lambda handlers and shared code
- Descriptive directory names (functions vs core)
- Better grouping of related functionality
- Easier navigation and onboarding
- Consistent with monorepo best practices

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## 📚 Related Documentation

### Files to Update After Reorganization
- [ ] Update README.md with new structure
- [ ] Update any architecture diagrams
- [ ] Update developer onboarding docs

### Future Considerations
- Consider extracting `core/clients/` to shared packages if needed by other services
- Consider moving `core/db/` to a shared database package if reused
- Document the new structure in team wiki/docs

---

## ✨ Success Criteria

✅ All Lambda handlers are in `functions/`
✅ All shared code is in `core/`
✅ No `src/` directory remains
✅ TypeScript compiles without errors
✅ All tests pass
✅ No broken imports
✅ Git history is preserved
✅ Single atomic commit

---

**Document Version**: 1.0
**Created**: 2025-01-17
**Author**: Claude Code
**Status**: Ready for Implementation
