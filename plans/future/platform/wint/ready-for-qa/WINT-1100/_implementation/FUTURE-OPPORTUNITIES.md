# Future Opportunities - WINT-1100

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Story mentions removing local definitions from repositories but doesn't specify validation strategy for ensuring ALL local schemas are removed | Low | Low | Add grep-based validation in AC verification: `! grep "const.*Schema = z.object" repositories` to catch any remaining local definitions |
| 2 | No explicit guidance on handling schema evolution (what happens when database schema changes after types are shared) | Medium | Low | Document schema versioning strategy in README.md: when database-schema changes, consumers must update imports and handle breaking changes |
| 3 | Story doesn't specify JSDoc structure/content beyond "documenting purpose and usage" | Low | Low | Add JSDoc template example in README.md showing standard format: `@description`, `@example`, `@see` tags |
| 4 | No validation that shared types actually match database schema structure (runtime vs compile-time) | Low | Medium | Add integration test that validates drizzle-zod schemas produce types compatible with actual database queries |
| 5 | Story assumes MCP tools will consume shared types but doesn't validate import path compatibility | Low | Low | Add smoke test that verifies MCP tools can import from orchestrator/__types__ path without circular deps |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Generated column support - drizzle-zod may not auto-generate schemas for PostgreSQL generated columns | Medium | Medium | Investigate if total_tokens (generated column in wint.ts) is correctly handled by createSelectSchema/createInsertSchema |
| 2 | Schema refinements - drizzle-zod auto-generation may not capture all validation rules from database constraints | Medium | High | Add .refine() calls to auto-generated schemas to enforce CHECK constraints (e.g., correctness_score 0-100 range) |
| 3 | Type-safe query builders - shared types could enable strongly-typed repository method signatures | High | High | Create typed query builder utilities that leverage shared schemas for compile-time query validation |
| 4 | Schema documentation generation - auto-generate markdown docs from shared Zod schemas | Medium | Medium | Add script to extract JSDoc from schemas and generate docs/schemas/wint.md reference |
| 5 | Runtime validation middleware - leverage shared schemas for API request validation (when MCP tools migrate) | High | Medium | Create validation middleware factory that uses shared schemas to validate MCP tool inputs |
| 6 | Schema migration tracking - correlate database migrations with shared type version updates | Medium | High | Add migration metadata to shared types (e.g., `@migration 0022_needy_ender_wiggin.sql`) for traceability |
| 7 | Type export tree-shaking - ensure consumers only import needed types to minimize bundle size | Low | Medium | Configure package.json exports to support granular imports: "./__types__/stories", "./__types__/workflow" |
| 8 | Zod schema composition helpers - utilities for common patterns like nullable, array, JSONB wrapping | Medium | Low | Create helper functions for common schema transformations (e.g., `makeNullable`, `makeArray`) |

## Categories

- **Edge Cases**: Gaps #4 (runtime schema validation), #5 (import path compatibility)
- **UX Polish**: Enhancement #4 (schema docs generation), #7 (tree-shaking)
- **Performance**: Enhancement #7 (tree-shaking to reduce bundle size)
- **Observability**: Enhancement #6 (migration tracking for debugging schema mismatches)
- **Integrations**: Enhancement #3 (typed query builders), #5 (validation middleware)
- **Technical Debt**: Enhancement #2 (schema refinements to match CHECK constraints)
