# Fix Context - WISH-2009 (Iteration 2)

## Previous Fixes (Iteration 1) - COMPLETE

- [x] TypeScript errors in repositories.ts - FIXED (DrizzleAny type alias)
- [x] Barrel file adapters/index.ts - DELETED
- [x] Barrel file application/index.ts - DELETED
- [x] Frontend tests MSW/fetch mock conflict - FIXED (added MSW handlers)
- [x] Prettier formatting in server.ts - FIXED

## Issues to Fix (Iteration 2)

### MEDIUM Priority

- [x] **Relative parent import violation** - FIXED
  - File: `apps/api/lego-api/middleware/feature-flag.ts`
  - Line: 2
  - Problem: ESLint `import/no-relative-parent-imports` rule violation
  - Current: `import { FeatureFlagsMapSchema } from '../domains/config/types.js'`
  - Fix options:
    1. Move the type to a shared location that middleware can import without parent traversal
    2. Export the type from a package that middleware can import
    3. Use inline type definition in middleware
  - Recommended: Define a minimal inline type in the middleware file since it only needs the response shape
  - **Resolution**: Defined inline Zod schema `FeatureFlagsResponseSchema` and minimal `FeatureFlagService` interface directly in the middleware file. No parent imports needed.

- [x] **Unused import 'rateLimit'** - FIXED
  - File: `apps/api/lego-api/server.ts`
  - Line: 4
  - Problem: ESLint `@typescript-eslint/no-unused-vars` violation
  - Current: `import { rateLimit } from './middleware/rate-limit.js'` - imported but never used
  - Fix: Remove the unused import (the rate limiting was added but then commented out)
  - **Resolution**: Removed the unused import line entirely.

## Pre-Existing Issues (DO NOT FIX)

These issues exist before WISH-2009 and should NOT be fixed in this story:

1. Build fails in `@repo/rate-limit` (missing axe-core types) - Not from WISH-2009
2. Build fails in `@repo/knowledge-base` (missing uuid types) - Not from WISH-2009

## Fix Strategy

### Fix 1: Relative Parent Import
The feature-flag middleware imports `FeatureFlagsMapSchema` from `../domains/config/types.js`.

Options:
1. **Inline the type** - Define the minimal schema directly in the middleware (recommended for simple cases)
2. **Move to shared types** - But this adds complexity for a simple middleware

Since the middleware only needs to validate the response shape, an inline Zod schema is cleanest.

### Fix 2: Unused Import
Simply remove the unused `rateLimit` import from server.ts.

## Verification

After fixes, run:
- `pnpm lint` - should pass with 0 errors
- `pnpm check-types` - should pass
- `pnpm test --filter=@repo/lego-api` - backend tests should pass
