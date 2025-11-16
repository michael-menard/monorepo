# Package Organization Migration Guide

This guide documents the changes made to improve the packages directory organization and provides migration instructions.

## 📋 Summary of Changes

### 1. Standardized Naming Conventions

All packages now use the `@repo/` prefix for consistency:

| Old Name                    | New Name                          |
| --------------------------- | --------------------------------- |
| `@monorepo/shared`          | `@repo/shared`                    |
| `@monorepo/tech-radar`      | `@repo/tech-radar`                |
| `@monorepo/features-shared` | `@repo/features-shared`           |
| `@monorepo/fileupload`      | `@monorepo/upload` (consolidated) |
| `@repo/file-upload`         | `@monorepo/upload` (consolidated) |
| `@repo/image-upload-modal`  | `@monorepo/upload` (consolidated) |
| `@repo/shared-image-utils`  | `@monorepo/upload` (consolidated) |

### 2. Updated Dependencies

- **React**: Standardized to `^19.1.0` across all packages
- **TypeScript**: Standardized to `5.8.3` (exact version)
- **Zod**: Updated to `^3.25.76`
- **Testing libraries**: Updated to latest versions

### 3. Standardized Scripts

All packages now include consistent npm scripts:

- `build`, `dev`, `check-types`, `type-check`
- `lint`, `test`, `test:watch`, `test:ui`, `test:coverage`
- `clean`

### 4. Workspace Configuration

Simplified workspace configuration in root `package.json`:

```json
{
  "workspaces": ["apps/*", "apps/api/*", "apps/web/*", "packages/*", "packages/features/*"]
}
```

## 🔄 Migration Steps

### Step 1: Update Import Statements

If you have any imports using the old package names, update them:

```typescript
// Before
import { something } from '@monorepo/shared'
import { TechRadar } from '@monorepo/tech-radar'
import { FileUpload } from '@monorepo/fileupload'
import { Upload, processImage } from '@monorepo/upload'

// After
import { something } from '@repo/shared'
import { TechRadar } from '@repo/tech-radar'
import { Upload, processImage } from '@monorepo/upload'
```

### Step 2: Update Package Dependencies

Update any `package.json` files that reference the old package names:

```json
{
  "dependencies": {
    "@repo/shared": "workspace:*",
    "@repo/tech-radar": "workspace:*",
    "@monorepo/upload": "workspace:*"
  }
}
```

### Step 3: Update Configuration Files

Update any configuration files that reference the old names:

#### Vite Configuration

```typescript
// vite.config.ts
export default defineConfig({
  resolve: {
    alias: {
      '@repo/shared': resolve(__dirname, '../../../packages/shared/src'),
      '@repo/tech-radar': resolve(__dirname, '../../../packages/tech-radar/src'),
    },
  },
})
```

#### TypeScript Configuration

```json
{
  "compilerOptions": {
    "paths": {
      "@repo/shared": ["../../packages/shared/src"],
      "@repo/tech-radar": ["../../packages/tech-radar/src"]
    }
  }
}
```

### Step 4: Clean and Reinstall Dependencies

After making the changes, clean and reinstall dependencies:

```bash
# Clean all node_modules and dist directories
pnpm run clean

# Remove lock file for fresh install
rm pnpm-lock.yaml

# Reinstall dependencies
pnpm install

# Rebuild all packages
pnpm build
```

## 🧪 Verification Steps

After migration, verify everything works correctly:

### 1. Build Verification

```bash
# Build all packages
pnpm build

# Should complete without errors
```

### 2. Type Checking

```bash
# Check types across all packages
pnpm check-types

# Should pass without errors
```

### 3. Test Verification

```bash
# Run all tests
pnpm test

# Should pass all tests
```

### 4. Lint Verification

```bash
# Run linting
pnpm lint

# Should pass without warnings
```

## 🔍 What to Look For

### Import Errors

If you see import errors like:

```
Module '"@monorepo/shared"' has no exported member 'something'
```

This means you need to update the import to use `@repo/shared`.

### Build Errors

If builds fail with module resolution errors, check:

1. Package names in `package.json` dependencies
2. Import statements in source code
3. Alias configurations in build tools

### Type Errors

If TypeScript can't find types, verify:

1. Package exports include type definitions
2. TypeScript path mappings are updated
3. All packages are built and have generated `.d.ts` files

## 📚 Updated Documentation

The following documentation has been created/updated:

1. **`packages/README.md`** - Overview of package structure and conventions
2. **`packages/DEVELOPMENT_GUIDELINES.md`** - Detailed development guidelines
3. **`packages/.template/`** - Template for new packages
4. **This migration guide** - Instructions for updating existing code

## 🚨 Breaking Changes

### Package Name Changes

All package names have changed from `@monorepo/` to `@repo/` prefix. This is a breaking change that requires updating:

- Import statements
- Package dependencies
- Configuration files
- Documentation

### Dependency Updates

- React updated to v19.1.0 (may require code changes)
- TypeScript updated to 5.8.3 (may require type fixes)
- Other dependencies updated to latest versions

## 🔧 Troubleshooting

### Common Issues and Solutions

#### "Cannot resolve module" errors

**Solution**: Update import statements to use new package names

#### Build failures after migration

**Solution**:

1. Clean all build artifacts: `pnpm run clean`
2. Remove lock file: `rm pnpm-lock.yaml`
3. Reinstall: `pnpm install`
4. Rebuild: `pnpm build`

#### Type errors in IDE

**Solution**: Restart TypeScript service in your IDE after migration

#### Workspace dependency issues

**Solution**: Ensure all internal dependencies use `workspace:*` syntax

## ✅ Post-Migration Checklist

- [ ] All imports updated to new package names
- [ ] All package.json dependencies updated
- [ ] Configuration files updated (vite.config.ts, tsconfig.json)
- [ ] Clean install completed successfully
- [ ] All packages build without errors
- [ ] All tests pass
- [ ] Type checking passes
- [ ] Linting passes
- [ ] Applications start and run correctly
- [ ] Documentation updated

## 🎉 Benefits of the Migration

After completing this migration, you'll have:

1. **Consistent naming** across all packages
2. **Standardized configurations** for easier maintenance
3. **Up-to-date dependencies** with latest features and security fixes
4. **Better documentation** for new developers
5. **Cleaner workspace configuration** that's easier to understand
6. **Template package** for creating new packages quickly

## 📞 Support

If you encounter issues during migration:

1. Check this guide for common solutions
2. Review the error messages carefully
3. Ensure all steps were followed in order
4. Try a clean reinstall if problems persist
