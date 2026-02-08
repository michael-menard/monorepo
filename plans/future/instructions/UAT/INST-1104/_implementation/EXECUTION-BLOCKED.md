# Execution Blocked: INST-1104

**Story**: Upload Instructions (Direct ≤10MB)
**Agent**: dev-execute-leader
**Timestamp**: 2026-02-07
**Status**: BLOCKED (Pre-existing Build Failure)

---

## Blocker Summary

**Cannot proceed with implementation due to cyclic dependency in package graph.**

The monorepo has a cyclic dependency between three core packages that prevents `pnpm build` from completing:

```
@repo/app-component-library -> @repo/api-client -> @repo/cache -> @repo/app-component-library
```

---

## Detailed Cycle

1. **@repo/app-component-library** (packages/core/app-component-library/package.json:84)
   - Depends on: `@repo/api-client`

2. **@repo/api-client** (packages/core/api-client/package.json:127)
   - Depends on: `@repo/cache`

3. **@repo/cache** (packages/core/cache/package.json:87)
   - Depends on: `@repo/app-component-library`

---

## Evidence

### Build Command Output

```bash
$ pnpm build

> lego-instructions@ build /Users/michaelmenard/Development/Monorepo
> turbo run build

turbo 2.6.1

  x Invalid package dependency graph:
  `-> Cyclic dependency detected:
      	@repo/app-component-library, @repo/cache, @repo/api-client
      
      The cycle can be broken by removing any of these sets of dependencies:
      	{ @repo/app-component-library -> @repo/api-client }
      	{ @repo/api-client -> @repo/cache }
      	{ @repo/cache -> @repo/app-component-library }

 ELIFECYCLE  Command failed with exit code 1.
```

---

## Impact on INST-1104

This story requires:
- Backend changes to `apps/api/lego-api/` (can be coded but not built/tested)
- Frontend changes to `apps/web/app-instructions-gallery/` (can be coded but not built/tested)
- Running unit tests (BLOCKED by build failure)
- Running E2E tests (BLOCKED by build failure)
- Producing EVIDENCE.yaml (BLOCKED - cannot collect test evidence)

**All implementation phases are blocked until the cyclic dependency is resolved.**

---

## Resolution Options

### Option 1: Remove @repo/api-client from @repo/app-component-library

**What**: Remove the dependency at `packages/core/app-component-library/package.json:84`

**Why**: app-component-library should be a pure UI library and shouldn't depend on API client code. This is likely an architectural mistake.

**Impact**: Need to audit app-component-library source code to find where @repo/api-client is imported and refactor those imports out.

**Recommended**: Yes - this is the cleanest architectural fix.

---

### Option 2: Remove @repo/cache from @repo/api-client

**What**: Remove the dependency at `packages/core/api-client/package.json:127`

**Why**: API client might not need caching utilities, or caching could be handled at the consumer level.

**Impact**: Need to audit api-client source code to find where @repo/cache is imported and refactor.

**Recommended**: Possible, but caching in API client is a reasonable pattern.

---

### Option 3: Remove @repo/app-component-library from @repo/cache

**What**: Remove the dependency at `packages/core/cache/package.json:87`

**Why**: Cache utilities shouldn't depend on UI components. This is likely for CacheDashboard component.

**Impact**: Move CacheDashboard out of @repo/cache into a separate package or into an app.

**Recommended**: Yes - cache utilities should be headless and not depend on UI components.

---

## Recommended Fix Path

1. **Audit @repo/app-component-library** to find where @repo/api-client is imported
2. **Extract those imports** into a separate package or move them to app-level code
3. **Remove the dependency** from package.json
4. **Run pnpm build** to verify cycle is broken
5. **Resume INST-1104 implementation**

---

## Agent Action

**Signal**: `EXECUTION BLOCKED: Cyclic dependency in package graph prevents build`

**Next Step**: User must resolve the cyclic dependency before INST-1104 can proceed.

**Fallback**: If user cannot resolve immediately, INST-1104 implementation can be done "code-only" without build/test verification, but this violates the quality gates in the agent protocol.

---

## Related Files

- `packages/core/app-component-library/package.json`
- `packages/core/api-client/package.json`
- `packages/core/cache/package.json`
- `turbo.json` (workspace configuration)
- `package.json` (root workspace)

---

## Git Context

- Current branch: `main`
- Recent commits show WIP state with auth E2E tests
- No indication that cyclic dependency was recently introduced (may be long-standing)

---

**Status**: Awaiting user resolution of cyclic dependency blocker.
