# WINT-9010: Working Set

## Story

Create Shared Business Logic Package — Extend @repo/workflow-logic with Decision, Artifact, Context, and Token Modules

## Current Phase

Implementation (setup complete)

## Worktree

/Users/michaelmenard/Development/monorepo/tree/story/WINT-9010

## Branch

story/WINT-9010

## Constraints (from CLAUDE.md + kb-integration.md)

1. **Use Zod schemas for all types**
   - No TypeScript interfaces
   - Use `z.infer<>` for type derivation
   - z.record() must use two-argument form: `z.record(z.string(), valueSchema)`

2. **No barrel files**
   - Don't create index.ts that purely re-exports from multiple sub-modules
   - Named exports preferred

3. **Use @repo/logger, not console**
   - For any logging needed

4. **Minimum 45% test coverage**
   - Target 60% for new modules (target 100% branch coverage for classification functions)

5. **Named exports preferred**
   - Avoid default exports

6. **Zero runtime dependencies**
   - `@repo/workflow-logic` must remain dependency-free of MCP SDK, LangGraph, AWS services, DB clients
   - Zod is already a dependency
   - @repo/logger is available but not required for pure modules

7. **No prose-to-code drift**
   - Decision classification encoding must match `_shared/decision-handling.md` exactly
   - Artifact phase mapping must match `_shared/kb-integration.md` exactly
   - Token formatting must match `_shared/token-tracking.md` exactly

## Next Steps

1. Read story requirements in detail
2. Study canonical reference files (\_shared/\*.md)
3. Implement decision/ module (decision tier classification, escalation matrix)
4. Implement artifact/ module (artifact type/phase mapping)
5. Implement context/ module (KB query string builders)
6. Implement token/ module (token estimation and formatting)
7. Wire all four modules into src/index.ts exports
8. Write comprehensive unit tests for all modules
9. Run verification (pnpm test, pnpm check-types)
