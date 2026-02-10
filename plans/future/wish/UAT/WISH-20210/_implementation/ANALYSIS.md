# Elaboration Analysis - WISH-20210

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Scope matches stories.index.md. Story is focused on CLI tool for schema change impact analysis, follows parent WISH-2057 enhancement suggestion. |
| 2 | Internal Consistency | PASS | — | Goals align with ACs, non-goals properly scoped, test plan covers all AC categories. No contradictions found. |
| 3 | Reuse-First | CONDITIONAL | Medium | Story proposes new external libraries (ts-morph, glob, chalk, yargs) but doesn't verify if TypeScript AST utilities already exist in turbo/generators. Should check existing patterns first. |
| 4 | Ports & Adapters | PASS | — | This is a CLI tool, not an API endpoint. No HTTP layer involved. Tool architecture appropriately uses pure analysis pipeline (parseChange → introspectSchema → scanCodebase → categorizeReport → generateReport). |
| 5 | Local Testability | PASS | — | Test plan includes unit tests (mock codebase), integration tests (real schema), and E2E tests (hypothetical priority column). All tests are concrete and executable. |
| 6 | Decision Completeness | FAIL | High | **Critical TBD**: No decision on where CLI tool entry point lives. Story says `packages/backend/database-schema/scripts/impact-analysis.ts` but doesn't specify how `pnpm db:impact-analysis` command is registered (package.json script? turbo.json task?). Missing integration with existing `db:*` command patterns. |
| 7 | Risk Disclosure | CONDITIONAL | Medium | Story identifies 5 risks but underestimates **false negative risk** (missing dynamic references). No mitigation for production deployment (tool runs locally only, no CI integration in MVP). |
| 8 | Story Sizing | CONDITIONAL | Medium | 22 ACs across 6 categories. Touches only 1 package. No API work. However, AST analysis complexity + report generation + test coverage suggests this is a **Medium-Large story (5-8 points)**. Consider if tool should be split: Phase 1 (Column analysis only), Phase 2 (Enum analysis), Phase 3 (Constraint analysis). |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | CLI command registration not specified | High | Specify how `pnpm db:impact-analysis` is registered. Add script to `packages/backend/database-schema/package.json` and document turbo.json task (if needed). |
| 2 | Missing verification of existing AST utilities | Medium | Story should check if `turbo/generators/config.js` already has TypeScript AST parsing utilities before adding ts-morph dependency. Reuse existing patterns if available. |
| 3 | No output file location decision | Medium | Story says reports stored in `packages/backend/database-schema/impact-reports/` but doesn't specify if this directory should be .gitignored. Clarify ephemeral vs persistent reports. |
| 4 | False negative mitigation incomplete | High | Risk 1 identifies false negatives (missing dynamic references) but only mitigation is "document tool limitations". Should add AC for documenting **known limitations** in IMPACT-ANALYSIS-TOOL.md with examples of what tool CAN'T detect. |
| 5 | No decision on JSON output format schema | Low | Story mentions `--format json` for CI integration but doesn't define JSON schema. Add brief JSON output structure example to scope or defer to future enhancement. |
| 6 | File scanning strategy incomplete | Medium | Story lists file patterns to scan but doesn't address **monorepo-wide type imports** from `packages/core/api-client`. Tool might miss frontend components that import shared Zod schemas. Clarify scope: does tool scan entire monorepo or just specific domains? |

## Split Recommendation

**Not Required** - Story can remain unified if Issues #1-6 are addressed. However, if implementation proves too complex, consider splitting:

| Split | Scope | AC Allocation | Dependency |
|-------|-------|---------------|------------|
| WISH-20210-A | Column Change Analysis + CLI Scaffold | AC 1-9, 13-16, 20-22 | None |
| WISH-20210-B | Enum Change Analysis | AC 10-12, 17-18 | Depends on A |

**Rationale**: Column analysis is higher priority (most common schema change), enum analysis is secondary. Split reduces initial implementation complexity.

## Preliminary Verdict

**Verdict**: CONDITIONAL PASS

**Reasoning**: Story is well-scoped and testable, but has 6 medium-to-high severity issues that block implementation. Must resolve:
1. CLI command registration mechanism (Issue #1)
2. False negative documentation requirement (Issue #4)
3. File scanning scope clarification (Issue #6)

Once these 3 critical issues are resolved, story can proceed to implementation. Issues #2, #3, #5 can be addressed during implementation phase.

---

## MVP-Critical Gaps

Only gaps that **block the core user journey**:

| # | Gap | Blocks | Required Fix |
|---|-----|--------|--------------|
| 1 | CLI command registration undefined | Developer cannot run `pnpm db:impact-analysis` | Add script to `packages/backend/database-schema/package.json`: `"db:impact-analysis": "tsx scripts/impact-analysis.ts"` |
| 2 | False negative limitations not documented | Developers will have false confidence in tool's completeness, leading to missed dependencies in production | Add AC 23: "Documentation includes 'Known Limitations' section with examples of undetectable patterns (dynamic column references, string-based queries, non-TypeScript files)" |
| 3 | File scanning scope ambiguous | Tool may miss frontend impacts or report too many false positives | Clarify in scope: Tool scans `apps/api/lego-api/domains/*`, `apps/web/**/src/**`, `packages/core/api-client/src/**`, `packages/backend/database-schema/src/**`. Excludes `node_modules`, `dist`, `.next`. |

**Impact**: Without these fixes, tool cannot be implemented (Gap #1), will provide misleading results (Gap #2), or will have unpredictable coverage (Gap #3).

---

## Worker Token Summary

- Input: ~48k tokens (story file, schema index, api-layer.md, parent story WISH-2057, agent instructions, package.json files)
- Output: ~2k tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
