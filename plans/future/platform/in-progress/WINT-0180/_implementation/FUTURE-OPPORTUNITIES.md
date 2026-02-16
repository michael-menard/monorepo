# Future Opportunities - WINT-0180

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No similarity search algorithm specified | Medium | Medium | AC-5 defines `findSimilarExamples(context: string)` but doesn't specify HOW similarity is computed. For MVP, exact category match is fine. Future: semantic embeddings. |
| 2 | No deprecation workflow for outdated examples | Low | Low | AC-4 defines lifecycle states but not WHO deprecates or WHEN. Future story: automated staleness detection (e.g., example references code patterns no longer in use). |
| 3 | No pagination strategy for query results | Low | Low | AC-5 defines `limit` parameter but no offset/cursor for large result sets. Current WINT pattern uses simple limits. Future: cursor-based pagination if example library grows >1000 entries. |
| 4 | No duplicate detection in migration script | Medium | Low | AC-7 requires migration validation (count matching) but not duplicate detection across inline examples in multiple files. Edge case: same example in decision-handling.md AND expert-intelligence.md. |
| 5 | No example conflict resolution strategy | Low | Medium | If two examples give contradictory advice for same scenario, how does agent choose? Future: add `precedence` field or `supersedes` relationship. |
| 6 | No multi-language example support | Low | High | Examples are English-only. Future internationalization may need localized examples or language-agnostic code snippets. |
| 7 | No example source attribution | Low | Low | Who created the example? From which story? AC schema includes outcome tracking but not authorship/source story. Future: add `created_by` and `source_story_id` fields. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Example usage analytics dashboard | Medium | High | Track which examples are most referenced, which have highest success_rate (AC-6 metrics). Build dashboard for agents/humans to discover high-value examples. Post-MVP: WINT-3xxx telemetry integration. |
| 2 | Example recommendation system | High | High | Proactive: when agent starts task, recommend top 3 relevant examples based on story context. Requires ML embeddings pipeline (WINT-5xxx). High value for reducing query overhead. |
| 3 | Example versioning and diff tracking | Medium | Medium | Track how examples evolve over time. When schema changes (AC-1 schema_version), show diff between v1.0 and v2.0 of an example. Helps understand pattern evolution. |
| 4 | Negative example differentiation | Low | Low | AC schema includes both positive_example and negative_example fields, but no guidance on weighting. Future: separate query modes (`queryAntiPatterns()`) for "what NOT to do" scenarios. |
| 5 | Cross-project example sharing | High | Medium | Current story scoped to monorepo. Future: share examples across multiple codebases (e.g., LEGO platform team shares examples with other teams). Requires central example registry or federation. |
| 6 | Example effectiveness A/B testing | Medium | High | When multiple examples exist for same scenario, randomly assign to agents and measure outcomes. Data-driven curation of example library. |
| 7 | Natural language example creation | High | High | Allow agents to CREATE examples from successful decisions, not just query. Auto-populate example library from high-confidence decisions in wint.agentDecisions table. |
| 8 | Example compression for token efficiency | Medium | Medium | Large example libraries increase query overhead. Future: summarize examples, use embeddings for retrieval, full text only on-demand. |
| 9 | Example relationship graph | Low | Medium | Examples may reference or build on other examples. Future: graph visualization showing example dependencies (e.g., "API endpoint example" requires "Zod schema example"). |
| 10 | Example expiry warnings | Low | Low | AC-4 lifecycle includes deprecated state, but no warning when example is old but not yet deprecated. Future: flag examples >6 months old for review. |

## Categories

### Edge Cases
- **Gap #2**: Deprecation workflow undefined (who/when)
- **Gap #3**: No pagination for large result sets
- **Gap #4**: Migration duplicate detection edge case
- **Gap #5**: Example conflict resolution strategy missing

### UX Polish
- **Enhancement #1**: Analytics dashboard for example effectiveness
- **Enhancement #3**: Example versioning and diff tracking
- **Enhancement #9**: Example relationship graph visualization

### Performance
- **Enhancement #8**: Example compression for token efficiency
- **Gap #3**: Pagination strategy for query performance at scale

### Observability
- **Enhancement #1**: Usage analytics dashboard
- **Enhancement #6**: A/B testing for example effectiveness
- **Gap #7**: Example source attribution and authorship tracking

### Integrations
- **Enhancement #2**: Example recommendation system (WINT-5xxx ML pipeline)
- **Enhancement #5**: Cross-project example sharing
- **Enhancement #7**: Auto-populate examples from agentDecisions table

### Future-Proofing
- **Gap #1**: Similarity search algorithm (semantic embeddings path)
- **Gap #6**: Multi-language support for internationalization
- **Enhancement #4**: Negative example differentiation and anti-pattern queries

---

## Implementation Prioritization (Post-MVP)

**Wave 2 (Quick Wins - Low Effort, High Impact):**
- Gap #7: Add source attribution fields (trivial schema update)
- Enhancement #10: Example expiry warnings (simple date check)
- Enhancement #4: Negative example query mode (filter on field)

**Wave 3 (Foundation for ML - Medium Effort, High Future Value):**
- Gap #1: Define similarity algorithm (groundwork for WINT-5xxx)
- Enhancement #7: Auto-populate from agentDecisions (data pipeline)
- Enhancement #3: Example versioning (supports schema evolution)

**Wave 4 (Advanced Features - High Effort, High Impact):**
- Enhancement #2: Example recommendation system (requires WINT-5xxx)
- Enhancement #1: Analytics dashboard (requires WINT-3xxx telemetry)
- Enhancement #6: A/B testing framework (full experiment infrastructure)

**Deferred (Nice-to-Have):**
- Gap #6: Multi-language support (no current requirement)
- Enhancement #5: Cross-project sharing (single codebase for now)
- Enhancement #9: Relationship graph (low immediate value)

---

## Notes on AC-2 Storage Decision Impact

The hybrid storage recommendation (common examples in `wint.examples` table, agent-specific in `.agent.md` files) has implications for several opportunities:

**If Database Storage Chosen:**
- Enhancement #1 (analytics) becomes easier - SQL queries on usage metrics
- Enhancement #6 (A/B testing) becomes feasible - relational joins to outcomes
- Gap #3 (pagination) becomes necessary - large table scans
- Enhancement #5 (cross-project) becomes possible - shared database access

**If Filesystem-Only Storage Chosen:**
- Enhancement #8 (compression) less critical - no query overhead
- Gap #2 (deprecation) harder - no lifecycle tracking in git
- Enhancement #7 (auto-populate) infeasible - no pipeline integration
- Gap #4 (duplicate detection) easier - grep across files

**Hybrid Approach (Recommended):**
- Best of both: queryable common examples, simple agent-local examples
- Defer advanced features to WINT-5xxx when ML pipeline exists
- Keep migration path open (filesystem → database as library grows)
