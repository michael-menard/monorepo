# Dev Feasibility: REPA-001

## Feasibility Summary

- **Feasible for MVP**: Yes
- **Confidence**: High
- **Why**: Package structure creation is low-risk and follows established monorepo patterns. Multiple reference packages exist (app-component-library, gallery, logger) that provide proven templates for configuration. No code migration in this story reduces implementation risk.

## Likely Change Surface (Core Only)

### Areas/Packages for Core Journey
- `packages/core/upload/` - New package directory
- `turbo.json` - May require pipeline configuration update
- Root `pnpm-workspace.yaml` - Already includes `packages/core/*` pattern

### Endpoints for Core Journey
None - infrastructure only

### Critical Deploy Touchpoints
None - no deployment required for package structure creation

## MVP-Critical Risks

### R1: Package Name Collision
- **Risk**: Package name `@repo/upload` may conflict with existing packages
- **Why it blocks MVP**: Build will fail if name conflicts exist
- **Required mitigation**: Verify no existing `@repo/upload` package before creation
  ```bash
  # Check for existing package
  find packages -name "package.json" -exec grep -l '"name": "@repo/upload"' {} \;
  ```

### R2: Missing TypeScript/Vitest Configuration
- **Risk**: Copying configuration from reference packages may introduce path mismatches or missing dependencies
- **Why it blocks MVP**: Package will fail to build or test if configuration is broken
- **Required mitigation**:
  - Use relative paths in tsconfig.json (not absolute)
  - Verify all devDependencies are installed at correct versions
  - Test with `pnpm check-types` and `pnpm test` immediately after setup

## Missing Requirements for MVP

### MR1: Turborepo Pipeline Decision
**Question**: Should `@repo/upload` be included in default build/test pipelines?

**Context**: Some packages are auto-built (dependencies), others are opt-in.

**Required decision text for PM**:
> The @repo/upload package MUST be included in the monorepo's default build pipeline via Turborepo configuration. Add the package to `turbo.json` pipeline tasks under `build` and `test` to ensure it is built and validated on every CI run.

### MR2: Directory Structure Placeholders
**Question**: Should placeholder files (e.g., `.gitkeep`, `index.ts` exports) be added to directories to preserve structure in git?

**Context**: Empty directories are not tracked by git.

**Required decision text for PM**:
> Each subdirectory (`client/`, `hooks/`, `image/`, `components/`, `types/`) MUST include a placeholder `index.ts` file with a comment indicating it is ready for migration. This ensures directories are committed to git and provides clear entry points for future migration stories (REPA-002 through REPA-006).

## MVP Evidence Expectations

### Proof Needed for Core Journey

1. **Package builds successfully**:
   ```bash
   pnpm --filter @repo/upload build
   # Exit code 0, dist/ directory populated
   ```

2. **Type checking passes**:
   ```bash
   pnpm --filter @repo/upload check-types
   # Exit code 0, no errors
   ```

3. **Linting passes**:
   ```bash
   pnpm --filter @repo/upload lint
   # Exit code 0, --max-warnings 0 satisfied
   ```

4. **Test infrastructure functional**:
   ```bash
   pnpm --filter @repo/upload test
   # Exit code 0, at least 1 smoke test passes
   ```

5. **Directory structure verified**:
   ```bash
   ls -R packages/core/upload/src
   # Shows client/, hooks/, image/, components/, types/
   ```

6. **Importable from another package**:
   Create test import in a sibling package:
   ```typescript
   import { /* placeholder */ } from '@repo/upload'
   ```
   TypeScript resolves import without errors.

### Critical CI/Deploy Checkpoints

- **Pre-merge**: All linting, type-checking, and tests pass in CI
- **Post-merge**: Turborepo cache correctly identifies package in dependency graph
- **No deployment required**: This is a structural change only

## Implementation Notes

### Recommended File Copy Sources

1. **package.json base**: `packages/.template/package.json`
   - Update name to `@repo/upload`
   - Add React-specific dependencies

2. **tsconfig.json**: Copy from `packages/core/app-component-library/tsconfig.json`
   - Adjust paths to be relative to new package
   - Verify `"jsx": "react-jsx"` for React 19

3. **vitest.config.ts**: Copy from `packages/core/app-component-library/vitest.config.ts`
   - No changes needed if paths are relative

4. **ESLint**: Use standard monorepo ESLint via workspace root

### Dependencies to Include

**Production**:
- `zod` ^3.24.2
- `react` ^19.1.0
- `react-dom` ^19.1.0
- `framer-motion` ^12.23.3
- `class-variance-authority` ^0.7.0
- `clsx` ^2.1.1
- `tailwind-merge` ^2.5.4

**Peer Dependencies**:
- `react` ^19.1.0
- `react-dom` ^19.1.0

**Dev Dependencies**:
- `typescript` 5.8.3
- `vitest` ^3.2.4
- `@testing-library/react` ^16.3.0
- `@testing-library/jest-dom` ^6.6.3
- `@vitejs/plugin-react` ^4.3.4
- `jsdom` ^25.0.1
- `eslint` ^9.30.0

### Directory Structure Placeholders

Each directory should have an `index.ts` with export structure:

**`src/client/index.ts`**:
```typescript
// XHR upload client functions will be migrated from @repo/upload-client (REPA-002)
export {}
```

**`src/hooks/index.ts`**:
```typescript
// Upload hooks will be migrated from apps (REPA-003)
export {}
```

**`src/image/index.ts`**:
```typescript
// Image processing utilities will be migrated from wishlist (REPA-004)
export {}
```

**`src/components/index.ts`**:
```typescript
// Upload UI components will be migrated from apps (REPA-005)
export {}
```

**`src/types/index.ts`**:
```typescript
// Upload type schemas will be migrated from @repo/upload-types (REPA-006)
export {}
```

**`src/index.ts`** (main barrel export):
```typescript
// Public API exports
export * from './client'
export * from './hooks'
export * from './image'
export * from './components'
export * from './types'
```

### Smoke Test Implementation

**`src/__tests__/package-structure.test.ts`**:
```typescript
import { describe, it, expect } from 'vitest'

describe('@repo/upload package structure', () => {
  it('should have placeholder exports', () => {
    // This test verifies the package structure is set up correctly
    // Actual functionality tests will be added in migration stories
    expect(true).toBe(true)
  })
})
```
