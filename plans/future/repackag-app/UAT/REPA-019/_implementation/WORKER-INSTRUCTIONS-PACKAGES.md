# Worker Instructions: Packages Implementation

## Context
Story: REPA-019 - Add Error Mapping to @repo/api-client
Worker Type: Packages implementation
Output File: PACKAGES-LOG.md

## Your Mission
Implement steps 1-6 and 11 from PLAN.yaml (packages slice).

## Steps to Execute

### Step 1: Create errors/ directory structure
- Create: packages/core/api-client/src/errors/

### Step 2: Move errorMapping.ts
- Read: apps/web/main-app/src/services/api/errorMapping.ts
- Create: packages/core/api-client/src/errors/error-mapping.ts
- Preserve all functions, schemas, types, ERROR_MAPPINGS constant (21 error codes)

### Step 3: Move and refactor authFailureHandler.ts
- Read: apps/web/main-app/src/services/api/authFailureHandler.ts
- Create: packages/core/api-client/src/errors/auth-failure.ts
- Refactor to use dependency injection (no Redux coupling)
- Factory function: createAuthFailureHandler(options: AuthFailureHandlerOptions)
- Options: { onAuthFailure: (path: string) => void, isAuthPage: (path: string) => boolean, resetApiState?: () => void }

### Step 4: Update package.json exports
- Add exports for ./errors/error-mapping
- Add exports for ./errors/auth-failure

### Step 5: Migrate errorMapping.test.ts
- Read: apps/web/main-app/src/services/api/__tests__/errorMapping.test.ts (401 lines)
- Create: packages/core/api-client/src/errors/__tests__/error-mapping.test.ts
- Update imports to use package paths

### Step 6: Migrate and update authFailureHandler.test.ts
- Read: apps/web/main-app/src/services/api/__tests__/authFailureHandler.test.ts (252 lines)
- Create: packages/core/api-client/src/errors/__tests__/auth-failure.test.ts
- Update for new dependency injection API

### Step 11: Add documentation
- Create: packages/core/api-client/src/errors/README.md
- Document module responsibilities and usage examples

## Fast-Fail Verification
After each chunk:
```bash
pnpm check-types --filter @repo/api-client
```

After all code complete:
```bash
pnpm build --filter @repo/api-client
pnpm test --filter @repo/api-client
```

## Completion Signal
End with "PACKAGES COMPLETE" when all packages work is done.

## Blockers
If blocked, write to BLOCKERS.md and end with "BLOCKED: <reason>".
