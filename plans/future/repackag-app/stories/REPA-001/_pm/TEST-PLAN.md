# Test Plan: REPA-001

## Scope Summary

- **Endpoints touched**: None (infrastructure only)
- **UI touched**: No
- **Data/storage touched**: No
- **Package structure**: New package creation at `packages/core/upload/`

## Happy Path Tests

### Test 1: Package Installation
- **Setup**: Fresh monorepo clone
- **Action**: Run `pnpm install` from monorepo root
- **Expected outcome**: Package installed successfully with all dependencies resolved
- **Evidence**: No errors in pnpm output, `node_modules/@repo/upload` symlink exists

### Test 2: TypeScript Build
- **Setup**: Package installed
- **Action**: Run `pnpm --filter @repo/upload build`
- **Expected outcome**: Package builds successfully to `dist/` directory
- **Evidence**:
  - Exit code 0
  - `dist/index.js` and `dist/index.d.ts` files created
  - No TypeScript errors in output

### Test 3: Type Checking
- **Setup**: Package installed
- **Action**: Run `pnpm --filter @repo/upload check-types`
- **Expected outcome**: Type checking passes with no errors
- **Evidence**: Exit code 0, no TypeScript compilation errors

### Test 4: Linting
- **Setup**: Package installed
- **Action**: Run `pnpm --filter @repo/upload lint`
- **Expected outcome**: Linting passes with no errors or warnings
- **Evidence**: Exit code 0, ESLint output shows 0 problems

### Test 5: Test Infrastructure
- **Setup**: Package installed
- **Action**: Run `pnpm --filter @repo/upload test`
- **Expected outcome**: Vitest runs and smoke test passes
- **Evidence**:
  - Exit code 0
  - Test output shows "1 passed"
  - Coverage report generated

### Test 6: Directory Structure Validation
- **Setup**: Package created
- **Action**: Verify directory structure exists
- **Expected outcome**: All required directories present
- **Evidence**: The following directories exist:
  - `packages/core/upload/src/client/`
  - `packages/core/upload/src/hooks/`
  - `packages/core/upload/src/image/`
  - `packages/core/upload/src/components/`
  - `packages/core/upload/src/types/`

### Test 7: Package Importability
- **Setup**: Package built successfully
- **Action**: Create test file importing from `@repo/upload` in another package
- **Expected outcome**: Import resolves successfully
- **Evidence**: TypeScript recognizes import, no module resolution errors

## Error Cases

### E1: Missing Dependencies
- **Setup**: Remove a required dependency from package.json
- **Action**: Run `pnpm install`
- **Expected outcome**: Installation fails with clear error message
- **Evidence**: Error message indicates missing peer dependency or dependency conflict

### E2: TypeScript Misconfiguration
- **Setup**: Break tsconfig.json (e.g., remove "strict": true)
- **Action**: Run `pnpm check-types`
- **Expected outcome**: Build fails or reports configuration error
- **Evidence**: Clear error message about configuration issue

### E3: ESLint Violation
- **Setup**: Add placeholder file with intentional lint error (e.g., unused variable)
- **Action**: Run `pnpm lint`
- **Expected outcome**: ESLint catches error
- **Evidence**: Exit code 1, ESLint reports the violation

## Edge Cases (Reasonable)

### EC1: Empty Source Files
- **Setup**: Package created with no actual implementation code
- **Action**: Run build, test, lint
- **Expected outcome**: All commands succeed (structure is valid, just empty)
- **Evidence**: Build produces empty artifacts but no errors

### EC2: Turborepo Pipeline Integration
- **Setup**: Package added to Turborepo
- **Action**: Run `pnpm build` from monorepo root
- **Expected outcome**: Turborepo includes @repo/upload in build pipeline
- **Evidence**: Turborepo output shows @repo/upload task execution

### EC3: Concurrent Builds
- **Setup**: Multiple terminal sessions
- **Action**: Run `pnpm build` in two terminals simultaneously
- **Expected outcome**: Both builds complete successfully without conflicts
- **Evidence**: No file lock errors, both processes exit 0

## Required Tooling Evidence

### Backend
Not applicable - this is pure infrastructure setup

### Frontend
Not applicable - no UI components in this story

### Infrastructure Verification

**CLI Commands to Run**:

```bash
# From monorepo root
pnpm install

# Verify package structure
ls -R packages/core/upload/src

# Build package
pnpm --filter @repo/upload build

# Type check
pnpm --filter @repo/upload check-types

# Lint
pnpm --filter @repo/upload lint

# Test
pnpm --filter @repo/upload test

# Verify exports
cat packages/core/upload/package.json | grep -A 10 '"exports"'

# Check Turborepo integration
pnpm turbo run build --filter=@repo/upload --dry-run
```

**Required Assertions**:

- All commands exit with code 0
- `dist/` directory contains compiled output
- `package.json` exports field properly configured
- ESLint shows 0 problems
- TypeScript compilation successful
- Vitest runs at least one smoke test

**Artifacts to Capture**:

- Build log output
- Test coverage report
- Package.json for validation
- Directory structure listing

## Risks to Call Out

### R1: Missing Template Files
**Risk**: If packages/.template/ doesn't contain current reference files, we may miss required configuration

**Mitigation**: Cross-reference with multiple existing packages (app-component-library, gallery, logger)

### R2: Turborepo Configuration
**Risk**: Package may not be automatically included in Turborepo pipeline

**Mitigation**: Verify `turbo.json` includes patterns that match `packages/core/*`

### R3: Dependency Version Conflicts
**Risk**: New package may introduce version conflicts with existing packages

**Mitigation**: Use exact versions from other working packages, run `pnpm install` to verify resolution

### R4: Export Configuration
**Risk**: Incorrect `package.json` exports field may prevent other packages from importing

**Mitigation**: Test importability from another workspace package before completing story
