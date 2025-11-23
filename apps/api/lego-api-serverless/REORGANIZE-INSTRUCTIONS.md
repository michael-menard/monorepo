# Directory Reorganization Instructions

This directory contains scripts to reorganize the `lego-api-serverless` project structure from `src/` to `functions/` and `core/`.

## Overview

The reorganization will:
1. Create new `functions/` and `core/` directories
2. Move Lambda handlers to `functions/`
3. Move shared code to `core/`
4. Update all import paths
5. Update configuration files

## Prerequisites

- Clean git working directory (commit or stash changes first)
- Run from project root: `/Users/michaelmenard/Development/Monorepo/apps/api/lego-api-serverless`

## Execution Steps

### Step 1: Run Directory Reorganization Script

```bash
cd /Users/michaelmenard/Development/Monorepo/apps/api/lego-api-serverless
chmod +x reorganize-structure.sh
./reorganize-structure.sh
```

This script will:
- Create `functions/` and `core/` directory structure
- Move Lambda handler directories using `git mv`:
  - `gallery/` → `functions/gallery/`
  - `wishlist/` → `functions/wishlist/`
  - `mocInstructions/` → `functions/moc-instructions/`
  - `moc-parts-lists/` → `functions/moc-parts-lists/`
  - `health/` → `functions/health/`
- Move `src/db/` → `core/db/`
- Move `src/lib/services/` → `core/services/`
- Move `src/lib/cache/` → `core/clients/cache/`
- Move `src/lib/search/` → `core/clients/search/`
- Move `src/lib/storage/` → `core/clients/storage/`
- Move `src/lib/validation/` → `core/validation/`
- Move `src/lib/utils/` → `core/utils/`
- Move `src/types/` → `core/types/`
- Move `src/__tests__/` → `__tests__/`
- Remove old directories

### Step 2: Update Import Paths

**Option A: Using Python Script (Recommended)**

```bash
chmod +x update-imports.py
python3 update-imports.py
```

**Option B: Using Bash Script**

```bash
chmod +x update-import-paths.sh
./update-import-paths.sh
```

This will update all import statements:
- `@/lib/db/` → `@/db/`
- `@/lib/services/` → `@/services/`
- `@/lib/cache/` → `@/clients/cache/`
- `@/lib/search/` → `@/clients/search/`
- `@/lib/storage/` → `@/clients/storage/`
- `@/lib/validation/` → `@/validation/`
- `@/lib/utils/` → `@/utils/`

### Step 3: Verify Changes

The following files have already been updated:
- ✅ `tsconfig.json` - Updated paths and includes
- ✅ `drizzle.config.ts` - Updated schema path

Verify all changes:

```bash
# Check TypeScript compilation
pnpm check-types

# Check for any remaining old import paths
grep -r "@/lib/" --include="*.ts" --exclude-dir=node_modules .

# Check git status
git status
```

### Step 4: Test

```bash
# Run tests
pnpm test

# Build the project
pnpm build
```

### Step 5: Commit Changes

```bash
git add .
git commit -m "Reorganize directory structure to use functions/ and core/

- Move Lambda handlers to functions/ directory
- Move shared code to core/ directory structure
- Update import paths throughout codebase
- Update tsconfig.json and drizzle.config.ts

Preserves git history using git mv commands."
```

## New Directory Structure

```
apps/api/lego-api-serverless/
├── functions/                  # Lambda function handlers
│   ├── gallery/                # Gallery endpoints
│   ├── wishlist/               # Wishlist endpoints
│   ├── moc-instructions/       # MOC instructions endpoints (renamed from mocInstructions)
│   ├── moc-parts-lists/        # Parts list endpoints
│   └── health/                 # Health check endpoint
├── core/                       # Shared business logic
│   ├── db/                     # Database client and schema
│   ├── services/               # Business logic services
│   ├── clients/                # External service clients
│   │   ├── cache/              # Redis client
│   │   ├── search/             # OpenSearch client
│   │   └── storage/            # S3 client
│   ├── validation/             # Zod schemas
│   ├── utils/                  # Utility functions
│   └── types/                  # TypeScript types
├── __tests__/                  # Test files (moved from src/__tests__)
├── sst.config.ts               # SST infrastructure config
├── tsconfig.json               # TypeScript config (updated)
└── drizzle.config.ts           # Drizzle ORM config (updated)
```

## Updated Path Aliases

**Old:**
```json
{
  "@/*": ["./src/*"],
  "@/functions/*": ["./src/functions/*"],
  "@/lib/*": ["./src/lib/*"],
  "@/types/*": ["./src/types/*"]
}
```

**New:**
```json
{
  "@/*": ["./core/*"],
  "@/db/*": ["./core/db/*"],
  "@/services/*": ["./core/services/*"],
  "@/clients/*": ["./core/clients/*"],
  "@/validation/*": ["./core/validation/*"],
  "@/utils/*": ["./core/utils/*"],
  "@/types/*": ["./core/types/*"]
}
```

## Rollback (If Needed)

If something goes wrong:

```bash
# Reset all changes
git reset --hard HEAD

# Or restore from stash
git stash pop
```

## Troubleshooting

### Issue: "Permission denied" when running scripts

```bash
chmod +x reorganize-structure.sh
chmod +x update-imports.py
chmod +x update-import-paths.sh
```

### Issue: Import paths not resolving

1. Restart TypeScript server in your editor
2. Clear build cache: `rm -rf dist .sst .build`
3. Reinstall dependencies: `pnpm install`

### Issue: Tests failing

Check test files in `__tests__/` for any hardcoded paths or imports that need updating.

## Notes

- The `mocInstructions/` directory is renamed to `moc-instructions/` for consistency
- Migrated packages (errors, responses, cognito, middleware) are removed as they're now in monorepo packages
- Migrated individual files (image-processing.ts, multipart-parser.ts, cloudwatch-metrics.ts) are removed
- All directory moves use `git mv` to preserve history
