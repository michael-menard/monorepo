# Future Opportunities - KNOW-040

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No template for new agent creation | Medium | Low | Story creates integration guide for existing agents but doesn't update agent template/scaffold. If new agents are created without KB integration, adoption goal degrades over time. **Recommendation**: Create follow-up story to update `.claude/agents/TEMPLATE.agent.md` (if exists) or add KB integration to agent creation checklist. Ensures all future agents inherit pattern. |
| 2 | No measurement of KB integration adoption | High | Low | After implementing KB integration, no tracking of: which agents actually call kb_search, how often, query result relevance, queries returning zero results. **Recommendation**: Create follow-up story for KB usage analytics dashboard (note: KNOW-041 covers query logging infrastructure but not analysis/visualization). Helps identify under-utilized agents and KB content gaps. |
| 3 | No guidance for updating KB integration when KB evolves | Medium | Low | KB schema may change in future stories (new parameters, deprecated fields). Agent instruction examples become stale. **Recommendation**: Document maintenance plan in integration guide: "When KB API changes, update all agent examples via search/replace" or create validation test suite that runs on KB schema changes. Prevents instruction drift. |
| 4 | Query patterns don't cover all agent workflow phases | Medium | Medium | Story focuses on "before implementation" KB queries but agents have multiple phases (setup, planning, implementation, verification, learnings). Each phase may benefit from different KB queries. **Example**: learnings agent should query KB to check if similar lesson already exists before adding duplicate. **Recommendation**: Expand AC2 in follow-up story to include workflow phase-specific query patterns. |
| 5 | No guidance for multi-step query refinement | Low | Low | Agents may need to refine KB queries based on initial results (e.g., if "drizzle migration" returns 0 results, try "database migration"). Instructions don't cover iterative querying patterns. **Recommendation**: Add to integration guide: "If no results, broaden query" with concrete examples. Improves query success rate. |
| 6 | Integration guide doesn't cover worker agents | Medium | Low | Story targets leader agents (dev-implement-implementation-leader, qa-verify-verification-leader) but leader agents spawn worker agents (backend-coder, frontend-coder, playwright). Should worker agents also query KB? **Recommendation**: Create follow-up story to define KB integration pattern for worker agents. If workers should query KB, add worker-specific instructions to integration guide. If not, document reasoning. |
| 7 | Over-querying budget not quantified | Low | Low | Risk #2 mentions "excessive queries slow down workflows" but doesn't provide numeric guideline. **Recommendation**: Add to integration guide: "Target: 1-2 queries per major task, max 5 queries per story workflow". Helps agents self-regulate without hard limits. |
| 8 | No KB citation linting | Low | Medium | Agent output may cite KB sources inconsistently ("Per KB entry 123", "Based on KB 123", "KB123 says"). AC6 defines format but no automated enforcement. **Recommendation**: Create linter script (`scripts/verify-kb-citations.ts`) that parses agent artifacts for citation format compliance. Run as optional CI check. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | KB query result caching in agent context | High | Medium | Leader agents query KB once at start, use results throughout workflow. But results live in agent's memory (not persistent). If workflow fails mid-execution, retry queries KB again (duplicate cost). **Enhancement**: Save KB query results to `_implementation/KB-CONTEXT.md`. Workers read from file instead of re-querying. **Benefits**: Reduces API calls (cost), improves consistency (all workers use same KB snapshot), enables audit trail. **Effort**: Medium (requires leader agent modification + worker agent read logic). |
| 2 | KB-driven decision trees | High | High | Power feature: KB entries could include decision trees ("If authentication story, consider: OAuth vs JWT vs session-based"). Agents parse decision tree from KB and present options to user via AskUserQuestion tool. **Benefits**: Structured knowledge reuse, consistent decision-making, reduces PM/architect involvement. **Effort**: High (requires KB schema extension + agent parsing logic + content authoring). **Recommendation**: Defer to future research story. |
| 3 | Automatic KB result relevance scoring | Medium | Medium | Agents receive KB search results but must manually assess relevance. Could enhance agent prompt: "Rate each KB result 1-5 for relevance to current task, explain why in reasoning section". **Benefits**: Improves agent reasoning transparency, helps refine KB content (low-rated entries may need better tagging/titles), provides feedback loop for KB quality. **Effort**: Medium (prompt engineering + output format validation). |
| 4 | KB query templates per agent type | Medium | Low | Instead of documenting query patterns in each agent file (duplication across 70+ agents), create shared query template library: `.claude/kb-query-templates.yaml`. Example entry: `{type: "authentication", query: "authentication architecture decision", tags: ["auth", "security"], role: "dev"}`. Agents reference templates by type. **Benefits**: Reduces maintenance (update template once, all agents inherit), ensures consistency, enables template evolution. **Effort**: Low (create YAML file + agent instruction updates). **Recommendation**: High ROI, consider adding to KNOW-040 scope or immediate follow-up. |
| 5 | Integration test automation | High | Medium | AC5 requires manual pilot story execution. Could automate: create test suite (`apps/api/knowledge-base/__tests__/agent-kb-integration.test.ts`) that spawns agent with KB integration, runs simple story, validates KB query count (1-3), validates citations exist with correct format. **Benefits**: Prevents regression when KB API changes, reduces manual QA burden, enables CI/CD integration. **Effort**: Medium (test harness + agent spawning + log parsing). **Recommendation**: High ROI, add as follow-up story after KNOW-040 ships. |
| 6 | KB result excerpting in citations | Medium | Low | Current citation format: "Per KB entry kb_123 'Title': summary". Could enhance: include relevant excerpt from KB entry content. **Example**: "Per KB entry kb_123 'Drizzle Best Practices': 'Use db.transaction() for multi-table operations' (excerpt from KB content)". **Benefits**: Improves traceability without requiring user to manually query KB entry, provides context in citation. **Effort**: Low (update citation format guidance + agent examples). |
| 7 | KB query suggestions in agent prompts | Low | Low | UX delight: when agent receives task, suggest KB queries based on task keywords. **Example**: story mentions "authentication" → agent prompts user "I found 5 KB entries on authentication. Should I review before proceeding?". **Benefits**: Proactive knowledge reuse, reduces forgotten KB queries. **Effort**: Low (keyword extraction + pre-query step). **Recommendation**: Defer until KB adoption is proven (avoid premature optimization). |
| 8 | KB integration verification script | Medium | Low | Create CI check: parse all agent .md files, verify KB integration sections exist (for required agents), validate example syntax against kb_search schema (parameter names), check character limits (≤1500 chars per block). **Script**: `scripts/verify-kb-integration.ts`. **Benefits**: Prevents drift as agents evolve, enforces consistency, catches typos in examples. **Effort**: Low (markdown parser + schema validation). **Recommendation**: High ROI, add as immediate follow-up or extend KNOW-040 scope. |
| 9 | KB-first workflow metrics dashboard | Medium | High | After KNOW-041 implements query logging, create analytics dashboard: which agents use KB most, which queries return 0 results, average query time, most popular tags/roles. **Benefits**: Identifies under-utilized agents (need better instructions), poor queries (need query refinement), KB content gaps (need more entries), over-querying patterns. **Effort**: High (requires KNOW-041 completion + dashboard UI + query analysis). **Recommendation**: Defer to separate story after KNOW-041 ships. |
| 10 | Contextual KB query expansion | Low | High | Advanced: when agent queries "drizzle migration", KB system automatically expands to related tags (database, schema, migration). Returns results matching any related concept using tag relationship graph or embedding-based expansion. **Benefits**: Improves recall for ambiguous queries, reduces zero-result scenarios. **Effort**: High (requires tag ontology or embedding model). **Recommendation**: Defer to future research story, evaluate ROI after 6 months of KB usage data. |

## Categories

- **Edge Cases**: Query refinement (Gap #5), over-querying budget (Gap #7), KB citation linting (Gap #8)
- **UX Polish**: KB query suggestions (Enhancement #7), KB result excerpting (Enhancement #6), relevance scoring (Enhancement #3)
- **Performance**: KB query result caching (Enhancement #1), query templates (Enhancement #4)
- **Observability**: Usage analytics dashboard (Gap #2, Enhancement #9), integration verification script (Enhancement #8)
- **Integrations**: Worker agent integration (Gap #6), KB-driven decision trees (Enhancement #2), query expansion (Enhancement #10)
- **Maintenance**: Template updates (Gap #1), KB evolution guidance (Gap #3), integration test automation (Enhancement #5)

## Recommended Follow-Up Stories

### High Priority (Within 2-4 sprints)
1. **KNOW-040-TEMPLATES**: KB query templates library (Enhancement #4) - Low effort, high ROI for maintenance
2. **KNOW-040-VERIFICATION**: KB integration verification script (Enhancement #8) - Prevents drift, enforces consistency
3. **KNOW-040-WORKERS**: Worker agent KB integration pattern (Gap #6) - Completes KB-first workflow coverage

### Medium Priority (Within 3-6 months)
4. **KNOW-040-CACHING**: KB query result caching in agent context (Enhancement #1) - Reduces API costs
5. **KNOW-040-AUTOMATION**: Integration test automation (Enhancement #5) - Reduces manual QA burden
6. **KNOW-040-ANALYTICS**: KB usage analytics dashboard (Gap #2, Enhancement #9) - Requires KNOW-041 first

### Low Priority (Future Research)
7. **KNOW-040-DECISION-TREES**: KB-driven decision trees (Enhancement #2) - High effort, requires KB schema evolution
8. **KNOW-040-EXPANSION**: Contextual KB query expansion (Enhancement #10) - Research story, evaluate ROI after usage data

## Notes

All gaps and enhancements are **non-MVP**. KNOW-040 core scope is complete and achieves primary goal: establish KB-first workflow pattern for 5+ agents with reusable integration guide.

High-ROI enhancements (query templates, verification script, worker integration) can be added to KNOW-040 scope if bandwidth allows, or deferred to immediate follow-up stories without blocking current implementation.
