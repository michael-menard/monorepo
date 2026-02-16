# Future Risks: WINT-0180

## Non-MVP Risks

### Risk 1: Example Staleness Without Validation Pipeline
- **Impact (if not addressed post-MVP)**: Examples may become outdated as codebase evolves, leading to agents following deprecated patterns.
- **Recommended timeline**: Address in WINT-0200 or WINT-0210 when implementing example lifecycle automation.

### Risk 2: Token Overhead from Large Example Sets
- **Impact**: As example library grows, including examples in agent context could exceed token budgets.
- **Recommended timeline**: Implement example compression/summarization in WINT-5xxx ML pipeline stories.

### Risk 3: Query Performance Degradation
- **Impact**: Linear search across all examples becomes slow with 1000+ examples.
- **Recommended timeline**: Add indexing/caching in Phase 2 (after MVP validation with <100 examples).

### Risk 4: Example Versioning Conflicts Across Agent Updates
- **Impact**: Agent using v1 example schema while others use v2 creates inconsistency.
- **Recommended timeline**: Add schema version compatibility checks in Phase 3 (after schema stabilizes).

### Risk 5: Lack of Example Effectiveness Metrics
- **Impact**: No data-driven way to determine which examples are helpful vs. noise.
- **Recommended timeline**: Integrate with WINT-3xxx telemetry stories to track example usage and correlation with success.

### Risk 6: Manual Example Curation Doesn't Scale
- **Impact**: Relying on humans to write examples limits growth; AI-generated examples may lack quality.
- **Recommended timeline**: WINT-5xxx stories will address automated example generation and validation.

---

## Scope Tightening Suggestions

### Suggestion 1: Defer Database Table Implementation
**Current scope**: AC-2 requires storage strategy decision (could include database table).

**Tightening**: Start with filesystem YAML storage for MVP. Migrate to database table in WINT-0190 if needed.

**Rationale**: Filesystem storage is simpler, requires no schema migration, and supports quick iteration. Database table adds value when query performance matters (100+ examples).

### Suggestion 2: Defer Negative Examples Differentiation
**Current scope**: Title mentions "Negative Examples" but ACs don't distinguish from positive examples.

**Tightening**: Treat positive and negative examples as single schema with `type` field. Defer advanced negative example patterns to WINT-0210.

**Rationale**: Simplifies initial schema. Negative examples are valuable but can be represented as `{ type: "anti-pattern", ... }` in the same ExampleEntry schema.

### Suggestion 3: Defer Cross-Agent Example Sharing
**Current scope**: AC-5 query pattern doesn't specify agent-scoped vs. global examples.

**Tightening**: MVP focuses on agent-local examples (inline in .agent.md files). Defer cross-agent example library to WINT-0200.

**Rationale**: Reduces complexity of query pattern. Agent-local examples are sufficient for initial validation. Global library adds value when reuse across agents is proven.

---

## Future Requirements

### Requirement 1: Example Search by Natural Language
**Description**: Query examples using agent's current context description, not just category/scenario tags.

**Value**: Enables context-aware example retrieval (e.g., "find examples similar to authentication flow with JWT").

**Timeline**: Phase 4-5 (after ML pipeline in WINT-5xxx).

### Requirement 2: Example Effectiveness Leaderboard
**Description**: Dashboard showing most-referenced examples, success rates, staleness indicators.

**Value**: Guides example curation efforts toward high-impact patterns.

**Timeline**: Phase 3 (after telemetry integration in WINT-3xxx).

### Requirement 3: Example Diff Visualization
**Description**: Show what changed between example versions when schema evolves.

**Value**: Helps agents understand why a pattern was updated.

**Timeline**: Phase 3 (after lifecycle automation).

### Requirement 4: Automated Example Deprecation
**Description**: Flag examples as deprecated when related code patterns are refactored.

**Value**: Prevents agents from following outdated patterns.

**Timeline**: Phase 4 (requires code analysis integration).

### Requirement 5: Example Conflict Detection
**Description**: Warn when two examples recommend contradictory approaches for similar scenarios.

**Value**: Improves example library consistency.

**Timeline**: Phase 4 (after example library reaches critical mass).

---

## Notes

**Polish and Edge Case Handling**:
- Example preview in agent context (show first 100 chars)
- Example popularity hints (times referenced)
- Example freshness indicators (last validated timestamp)
- Example source attribution (which agent/story created it)
- Example citation format (how agents should reference examples in decisions)

**Out of Scope for Now**:
- Example translation to other agent frameworks (LangGraph, CrewAI)
- Example export to external knowledge bases
- Example A/B testing (which variant performs better)
- Example personalization (per-user or per-team example preferences)
