# Elaboration Analysis - WINT-0080

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | FAIL | Critical | Agent/command/skill tables do NOT exist in unified-wint.ts schema |
| 2 | Internal Consistency | PASS | — | Goals, non-goals, decisions, and ACs are consistent |
| 3 | Reuse-First | PASS | — | Story correctly plans to reuse @repo/db, existing Drizzle patterns, glob/yaml parsing |
| 4 | Ports & Adapters | PASS | — | No API endpoints - database seeding story only |
| 5 | Local Testability | PASS | — | Test plan includes unit tests with fixtures and integration tests against test DB |
| 6 | Decision Completeness | PASS | — | No blocking TBDs. Pre-flight checks documented. Idempotency strategy clear. |
| 7 | Risk Disclosure | PASS | — | Frontmatter format variations, missing table schemas, dependency stories - all disclosed |
| 8 | Story Sizing | PASS | — | 8 points, 5 seeders, 3 parsers, well-scoped. No split indicators. |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | Missing agent/command/skill table schemas | Critical | Tables MUST be defined in unified-wint.ts before seeding. Story incorrectly assumes they exist. |
| 2 | Scope mismatch: stories.index.md lists 115 agents, story says 143 | High | Reconcile agent count. Current reality: 143 agent files found. Update stories.index.md or story description. |
| 3 | Scope mismatch: stories.index.md lists 28 commands, story says 33 | High | Reconcile command count. Current reality: 33 command files found. Update stories.index.md or story description. |
| 4 | Scope mismatch: stories.index.md lists 13 skills, story says 14 | Medium | Reconcile skill count. Current reality: 14 skill directories found. Update stories.index.md or story description. |
| 5 | workflow.phases table not found in unified-wint.ts | Critical | WINT-0070 dependency may not be complete. Phases table must exist before seeding. |
| 6 | graph.capabilities table exists but story assumes workflow.phases | Critical | Scope confusion: capabilities table is in graph schema (line 482), not workflow schema. Story must clarify namespace. |

## Split Recommendation

Not applicable - story size is appropriate (8 points, clear boundaries).

## Preliminary Verdict

**Verdict**: FAIL

**Rationale**: Multiple critical blocking issues:
1. **Missing table schemas** - Agent/command/skill tables do NOT exist in unified-wint.ts (checked lines 1-500, grep search confirmed)
2. **Incorrect dependency assumption** - Story assumes WINT-0070 (workflow.phases) and WINT-0060 (graph.capabilities) are complete, but schema verification shows:
   - `workflow.phases` table: NOT FOUND in unified-wint.ts
   - `graph.capabilities` table: EXISTS at line 482 in unified-wint.ts
3. **Schema namespace confusion** - Story uses `workflow.phases` but should use `wint.phases` per schema namespace convention
4. **Inventory count discrepancies** - Reality baseline shows 143 agents, 33 commands, 14 skills but stories.index.md lists different counts

**Required Actions Before Implementation:**
1. Verify WINT-0070 completion - confirm workflow.phases table exists or update dependency
2. Verify WINT-0060 completion - confirm graph.capabilities table exists (confirmed at line 482)
3. Add agent/command/skill table schemas to unified-wint.ts OR update scope to exclude them
4. Reconcile inventory counts between reality baseline and stories.index.md
5. Clarify schema namespace: use `wint.phases` not `workflow.phases` per schema design

---

## MVP-Critical Gaps

Only gaps that **block the core user journey**:

| # | Gap | Blocks | Required Fix |
|---|-----|--------|--------------|
| 1 | Missing table schemas for agents/commands/skills | Cannot seed data into non-existent tables | Add table definitions to unified-wint.ts with: id (uuid), name (text unique), type/description, metadata (jsonb), created_at, updated_at |
| 2 | workflow.phases table does not exist | Cannot seed 8 phases | Verify WINT-0070 completion OR add phases table to unified-wint.ts |
| 3 | Schema namespace inconsistency | Seed scripts will use wrong table names | Update all references from `workflow.phases` to `wint.phases` and confirm `wint.capabilities` vs `graph.capabilities` |

---

## Worker Token Summary

- Input: ~12,500 tokens (story file, stories.index.md, unified-wint.ts partial, agent instructions, api-layer.md)
- Output: ~1,200 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
- Total: ~13,700 tokens
