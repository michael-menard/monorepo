# Agent Context - WINT-4010 Fix Mode Verification

**Story**: WINT-4010 - Create Cohesion Sidecar
**Mode**: Fix (iteration 2)
**Feature Directory**: plans/future/platform/wint
**Story Base Path**: plans/future/platform/wint/in-progress/WINT-4010/
**Implementation Path**: plans/future/platform/wint/in-progress/WINT-4010/_implementation/

## Story Type
- Backend-only sidecar package
- No UI surface (touches_frontend: false)
- Touches: backend, database, infra
- Migrations required: Yes (WINT-4010 must be tested in DB schema context)

## Verification Scope (Fix Mode - Iteration 2)
- Verify package builds and tests pass after code review fixes
- Run type checks, lint, unit tests, integration tests
- Capture all verification results in VERIFICATION.md
- Check coverage thresholds (≥80% branch coverage, AC-10)

## Key ACs to Verify
- AC-1: Package structure (tsconfig, vitest, package.json)
- AC-2: HTTP server using node:http (PORT 3092)
- AC-3/AC-4: Both endpoints functional
- AC-5: Error handling (400/500 responses)
- AC-6: Dependency injection in compute functions
- AC-7: Zod schemas only
- AC-8: Empty graph handling
- AC-9: MCP tool wrappers exported
- AC-10: ≥80% branch coverage
- AC-11: Integration tests pass
- AC-12: No console usage
- AC-13: Workspace detection

## Related Packages (dependencies)
- @repo/cohesion-sidecar (primary package under test)
- @repo/sidecar-http-utils (new shared utilities package from fix iteration 2)
- @repo/db (Drizzle client)
- @repo/database-schema (graph schema)
- @repo/logger (logging)

## Fix Iteration 2 Changes
Key fixes applied:
1. Extracted sendJson/readBody to @repo/sidecar-http-utils
2. Replaced DrizzleDb structural type with NodePgDatabase<any>
3. Added explicit db.select() column selection for flat row shape
4. Removed as-any casts
5. Added JSDoc comments for security
6. Added non-null assertion justifications

## Test Commands
- Unit tests: `pnpm --filter @repo/cohesion-sidecar test`
- Coverage: `pnpm --filter @repo/cohesion-sidecar test:coverage`
- Integration: included in test suite (separate vitest config pattern)
- Type check: `pnpm --filter @repo/cohesion-sidecar check-types`
- Lint: `eslint packages/backend/sidecars/cohesion/src packages/backend/sidecars/http-utils/src --max-warnings 0`
- Build: `pnpm --filter @repo/cohesion-sidecar build && pnpm --filter @repo/sidecar-http-utils build`

## Expected Results (from EVIDENCE.iter2.yaml)
- All 46 unit/integration tests passing
- 84.84% branch coverage (above 80% threshold)
- Type check: SUCCESS
- Lint: SUCCESS
- Build: SUCCESS
