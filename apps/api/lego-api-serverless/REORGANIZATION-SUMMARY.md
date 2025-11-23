# Directory Reorganization Summary

## Overview

This reorganization transforms the `lego-api-serverless` directory structure from a `src/`-based layout to a cleaner `functions/` and `core/` separation.

## What Was Changed

### Configuration Files (Already Updated)

The following files have been automatically updated and are ready to use:

1. **tsconfig.json**
   - Updated `paths` mapping from `@/lib/*` to specific core paths
   - Updated `include` array to include `core/**/*` and `functions/**/*`
   - Old paths removed

2. **drizzle.config.ts**
   - Schema path: `./src/db/schema.ts` → `./core/db/schema.ts`
   - Migrations path: `./src/db/migrations` → `./core/db/migrations`

3. **sst.config.ts**
   - All Lambda handler paths updated from:
     - `health/` → `functions/health/`
     - `gallery/` → `functions/gallery/`
     - `wishlist/` → `functions/wishlist/`
     - `mocInstructions/` → `functions/moc-instructions/`
     - `moc-parts-lists/` → `functions/moc-parts-lists/`

### Directory Structure Changes

**Before:**
```
apps/api/lego-api-serverless/
├── src/
│   ├── lib/
│   │   ├── db/
│   │   ├── services/
│   │   ├── cache/
│   │   ├── search/
│   │   ├── storage/
│   │   ├── validation/
│   │   └── utils/
│   ├── types/
│   └── __tests__/
├── gallery/
├── wishlist/
├── mocInstructions/
├── moc-parts-lists/
└── health/
```

**After:**
```
apps/api/lego-api-serverless/
├── functions/                  # Lambda handlers
│   ├── gallery/
│   ├── wishlist/
│   ├── moc-instructions/       # Renamed from mocInstructions
│   ├── moc-parts-lists/
│   └── health/
├── core/                       # Shared business logic
│   ├── db/
│   ├── services/
│   ├── clients/
│   │   ├── cache/
│   │   ├── search/
│   │   └── storage/
│   ├── validation/
│   ├── utils/
│   └── types/
└── __tests__/                  # Root-level tests
```

### Import Path Changes

All TypeScript imports will be automatically updated:

| Old Import | New Import |
|------------|------------|
| `@/lib/db/` | `@/db/` |
| `@/lib/services/` | `@/services/` |
| `@/lib/cache/` | `@/clients/cache/` |
| `@/lib/search/` | `@/clients/search/` |
| `@/lib/storage/` | `@/clients/storage/` |
| `@/lib/validation/` | `@/validation/` |
| `@/lib/utils/` | `@/utils/` |

### Files to be Removed

The reorganization script will remove these obsolete directories:
- `src/lib/errors/` (migrated to packages)
- `src/lib/responses/` (migrated to packages)
- `src/lib/cognito/` (migrated to packages)
- `src/lib/middleware/` (migrated to packages)
- `src/lib/services/image-processing.ts` (migrated)
- `src/lib/utils/multipart-parser.ts` (migrated)
- `src/lib/utils/cloudwatch-metrics.ts` (migrated)

## Execution Instructions

### Prerequisites

1. **Clean Git Working Directory**
   ```bash
   git status
   # If you have uncommitted changes:
   git add . && git commit -m "WIP: Before reorganization"
   # Or stash them:
   git stash
   ```

2. **Verify Location**
   ```bash
   cd /Users/michaelmenard/Development/Monorepo/apps/api/lego-api-serverless
   pwd  # Should show the correct path
   ```

### Option 1: Run Master Script (Recommended)

The master script executes all steps in sequence:

```bash
chmod +x run-reorganization.sh
./run-reorganization.sh
```

This will:
1. Check for uncommitted changes (with warning)
2. Run directory reorganization
3. Update all import paths
4. Verify TypeScript compilation
5. Display summary

### Option 2: Run Steps Manually

If you prefer to run each step separately:

**Step 1: Directory Reorganization**
```bash
chmod +x reorganize-structure.sh
./reorganize-structure.sh
```

**Step 2: Update Import Paths**
```bash
# Option A: Python (recommended)
chmod +x update-imports.py
python3 update-imports.py

# Option B: Bash
chmod +x update-import-paths.sh
./update-import-paths.sh
```

**Step 3: Verify**
```bash
# Check for remaining old imports
grep -r "@/lib/" --include="*.ts" --exclude-dir=node_modules .

# Type check
pnpm check-types

# Run tests
pnpm test

# Build
pnpm build
```

## Verification Checklist

After running the reorganization, verify:

- [ ] No TypeScript compilation errors: `pnpm check-types`
- [ ] No old `@/lib/` imports remain
- [ ] All tests pass: `pnpm test`
- [ ] Project builds successfully: `pnpm build`
- [ ] Git shows expected changes: `git status`
- [ ] Review git diff: `git diff`

## Expected Git Changes

You should see:
- ✅ Renamed directories (using `git mv`)
- ✅ Modified: `tsconfig.json`
- ✅ Modified: `drizzle.config.ts`
- ✅ Modified: `sst.config.ts`
- ✅ Modified: All TypeScript files with updated imports
- ✅ Deleted: Migrated packages and files

## Committing Changes

Once verified, commit the changes:

```bash
git add .
git commit -m "Reorganize directory structure to use functions/ and core/

- Move Lambda handlers to functions/ directory
- Move shared code to core/ directory structure
- Update import paths throughout codebase
- Update tsconfig.json, drizzle.config.ts, and sst.config.ts
- Remove migrated packages (errors, responses, cognito, middleware)

Preserves git history using git mv commands."
```

## Rollback Instructions

If something goes wrong:

```bash
# Option 1: Reset all changes
git reset --hard HEAD

# Option 2: Restore from stash
git stash pop

# Option 3: Undo last commit (if already committed)
git reset --soft HEAD~1
```

## Benefits of New Structure

1. **Clear Separation of Concerns**
   - `functions/` = Lambda handlers (infrastructure concern)
   - `core/` = Business logic (domain concern)

2. **Better Discoverability**
   - Easy to find all Lambda functions
   - Easy to find shared services and utilities

3. **Cleaner Imports**
   - More specific path aliases
   - Easier to understand dependencies

4. **SST Best Practices**
   - Aligns with SST v3 conventions
   - Easier to configure in `sst.config.ts`

5. **Consistent Naming**
   - `mocInstructions` → `moc-instructions` (kebab-case)
   - Matches project naming conventions

## Troubleshooting

### Issue: "Permission denied" when running scripts

```bash
chmod +x reorganize-structure.sh
chmod +x update-imports.py
chmod +x run-reorganization.sh
```

### Issue: TypeScript errors after reorganization

1. Restart TypeScript server in your editor
2. Clear build cache: `rm -rf dist .sst .build`
3. Reinstall dependencies: `pnpm install`
4. Check for missed imports: `grep -r "@/lib/" --include="*.ts" .`

### Issue: Tests failing

Check test files in `__tests__/` for any hardcoded paths that need updating.

### Issue: SST deploy fails

Verify all handler paths in `sst.config.ts` point to correct locations in `functions/`.

## Support Files Created

The reorganization process created these helper files:

1. `reorganize-structure.sh` - Directory reorganization script
2. `update-imports.py` - Python import update script (recommended)
3. `update-import-paths.sh` - Bash import update script (fallback)
4. `run-reorganization.sh` - Master orchestration script
5. `REORGANIZE-INSTRUCTIONS.md` - Detailed instructions
6. `REORGANIZATION-SUMMARY.md` - This file

You can delete these files after successful reorganization and commit.

## Questions?

Review the detailed instructions in `REORGANIZE-INSTRUCTIONS.md`.
