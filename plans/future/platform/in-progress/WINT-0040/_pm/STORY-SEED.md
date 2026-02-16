---
generated: "2026-02-14"
baseline_used: "/Users/michaelmenard/Development/monorepo/plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: false
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: WINT-0040

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No ADR-LOG.md available for architecture decisions, no lesson-learned KB queries performed (Phase 3 skipped - foundation story)

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| WINT Core Schemas (6 groups) | `packages/backend/database-schema/src/schema/wint.ts` | WINT-0010 (UAT) created foundation schemas including telemetry tables in wint.* namespace |
| Telemetry Workflow Events | `packages/backend/database-schema/src/schema/telemetry.ts` | INFR-0040 (ready-for-qa) created separate telemetry.workflow_events table for orchestrator events |
| Drizzle ORM v0.44.3 | `packages/backend/database-schema/` | Standard ORM for all schema definitions |
| drizzle-zod | `packages/backend/database-schema/` | Auto-generates Zod schemas from Drizzle tables |
| @repo/db client | `packages/backend/db/` | Connection pooling, exports, testConnection() |

### Active In-Progress Work

| Story | Status | Overlap Risk | Notes |
|-------|--------|--------------|-------|
| WINT-0020 | in-progress | None | Story Management Tables (different schema group) |
| WINT-0070 | in-progress | None | Workflow Tracking Tables (different schema group) |
| INFR-0040 | ready-for-qa | **MEDIUM** | Created telemetry.workflow_events - may overlap with WINT telemetry tables |

### Constraints to Respect

1. **Schema Isolation**: All WINT tables MUST live in `wint` PostgreSQL schema namespace (not `telemetry`)
2. **Zod-First Types**: ALWAYS use Zod schemas with `z.infer<>`, NEVER TypeScript interfaces (per CLAUDE.md)
3. **Pattern Reuse**: Follow existing WINT-0010 patterns (pgSchema, enums, table structure, indexes, relations, Zod exports)
4. **No Breaking Changes**: Protected features include `@repo/db` API surface, existing WINT schemas from WINT-0010
5. **Index Strategy**: Follow WINT-0010 composite index ordering (highest cardinality first)

---

## Retrieved Context

### Related Endpoints
- None (pure database schema work, no API endpoints)

### Related Components
- `packages/backend/database-schema/src/schema/wint.ts` - WINT schema file (will be extended)
- `packages/backend/database-schema/src/schema/telemetry.ts` - Separate telemetry namespace (INFR-0040)
- `packages/backend/database-schema/src/schema/index.ts` - Schema exports
- `packages/backend/db/src/generated-schemas.ts` - Auto-generated Zod schemas

### Reuse Candidates

| Component | Location | Purpose |
|-----------|----------|---------|
| wintSchema pgSchema | `wint.ts:41` | Use existing `wintSchema` namespace for new telemetry tables |
| agentInvocations table | `wint.ts:600-638` | Existing telemetry table for agent invocations (Section 3) |
| agentDecisions table | `wint.ts:645-675` | Existing telemetry table for agent decisions (Section 3) |
| agentOutcomes table | `wint.ts:682-715` | Existing telemetry table for agent outcomes (Section 3) |
| stateTransitions table | `wint.ts:722-749` | Existing telemetry table for state changes (Section 3) |
| createInsertSchema/createSelectSchema | `wint.ts:1453+` | drizzle-zod pattern for Zod schema generation |
| relations() | `wint.ts:1251+` | Drizzle ORM relations pattern |

---

## Knowledge Context

### Lessons Learned
(No KB search performed - this is a foundation schema story with clear patterns from WINT-0010)

### Blockers to Avoid (from past stories)
- None identified (foundation story)

### Architecture Decisions (ADRs)
No ADR-LOG.md available. However, existing code patterns establish de-facto architecture:
- WINT tables live in `wint.*` schema namespace (WINT-0010 decision)
- Telemetry infrastructure tables live in `telemetry.*` schema namespace (INFR-0040 decision)
- Zod-first types enforced by CLAUDE.md
- drizzle-zod for auto-schema generation

### Patterns to Follow
- Use `wintSchema.table()` for all new WINT telemetry tables
- Use `pgEnum()` for constrained value sets (decision types, metric types)
- Create composite indexes for common query patterns (see WINT-0010 AC-008)
- Export both Drizzle table definitions AND Zod schemas in index.ts
- Use `timestamp('col', { withTimezone: true })` for all timestamp columns
- Use `jsonb().$type<T>()` for typed JSON columns with Zod schemas

### Patterns to Avoid
- Don't use TypeScript interfaces (Zod-first requirement)
- Don't put WINT tables in `telemetry.*` namespace (schema isolation)
- Don't create one-off index naming schemes (follow idx_tablename_column pattern)
- Don't skip relations() definitions (breaks Drizzle query.table.findMany({ with: {} }))
- Don't mix cardinality in composite indexes (high → low ordering)

---

## Conflict Analysis

**No conflicts detected.**

WINT-0040 extends Section 3 (Telemetry Schema) in `wint.ts` with additional tables. This is additive work that does not conflict with:
- WINT-0020 (Section 1: Story Management)
- WINT-0070 (Section 6: Workflow Tracking)
- INFR-0040 (separate `telemetry.*` namespace for orchestrator events)

The WINT telemetry tables focus on agent-level observability (invocations, decisions, outcomes, state transitions) while INFR-0040's telemetry.workflow_events focuses on workflow-level orchestrator events. These are complementary, not overlapping.

---

## Story Seed

### Title
Create Telemetry Tables

### Description

**Context:**
WINT-0010 (UAT) established the WINT schema foundation with 6 schema groups in the `wint.*` PostgreSQL namespace. Section 3 (Telemetry Schema) currently contains 4 tables:
- `agentInvocations` (tracks agent invocations)
- `agentDecisions` (records key decisions)
- `agentOutcomes` (tracks invocation outcomes)
- `stateTransitions` (audit trail for state changes)

These tables provide basic observability for agent execution, but lack advanced telemetry capabilities needed for ML pipeline training (WINT-0050), quality analysis, and workflow optimization.

INFR-0040 (ready-for-qa) created a separate `telemetry.workflow_events` table for orchestrator-level events, establishing a pattern for workflow observability at the infrastructure layer.

**Problem:**
The current WINT telemetry tables are sufficient for basic agent tracking but insufficient for:
1. **Token/Cost Tracking**: No granular LLM usage metrics (input/output/cached tokens, API costs)
2. **Performance Metrics**: Limited timing and resource consumption data
3. **Quality Analysis**: No structured quality scores, test coverage, or review feedback aggregation
4. **ML Training Data**: Missing metadata needed for quality prediction models (WINT-0050)
5. **Decision Context**: Limited context capture for decision outcomes and learning

**Proposed Solution:**
Extend Section 3 (Telemetry Schema) in `wint.ts` with additional columns and potentially new tables to capture:
- Token usage metrics (input, output, cached tokens per invocation)
- Cost tracking (API costs, model selection metadata)
- Enhanced performance metrics (CPU time, memory usage, duration breakdowns)
- Quality scores and test coverage (for outcome analysis)
- Rich decision context (alternatives considered, confidence scores, correctness tracking)
- Review feedback and quality ratings

This story focuses on **schema definition only** - actual ingestion adapters and MCP tools will be implemented in WINT-0120 (Telemetry MCP Tools) and WINT-3020 (Invocation Logging).

The schema design should align with INFR-0040's patterns (indexed append-only logs, JSONB for flexible metadata) while remaining in the `wint.*` namespace for agent-level telemetry.

### Initial Acceptance Criteria

- [ ] **AC-1**: Extend `agentInvocations` table with token tracking columns
  - Add `cachedTokens` (integer) for prompt caching metrics
  - Add `totalTokens` (integer) computed field
  - Add `estimatedCost` (numeric/decimal) for API cost tracking
  - Add `modelName` (text) to track which LLM was used

- [ ] **AC-2**: Extend `agentDecisions` table with outcome tracking columns
  - Add `evaluatedAt` (timestamp) when decision correctness was assessed
  - Add `evaluatedBy` (text) agent or user who evaluated correctness
  - Add `correctnessScore` (integer 0-100) instead of binary wasCorrect
  - Add `alternativesConsidered` (integer) count of alternatives evaluated

- [ ] **AC-3**: Extend `agentOutcomes` table with detailed quality metrics
  - Add `lintErrors` (integer) count of linting issues
  - Add `typeErrors` (integer) count of TypeScript errors
  - Add `securityIssues` (jsonb) array of security findings
  - Add `performanceMetrics` (jsonb) for timing breakdowns
  - Add `artifactsMetadata` (jsonb) for detailed artifact tracking

- [ ] **AC-4**: Extend `stateTransitions` table with audit enhancements
  - Add `previousMetadata` (jsonb) snapshot of state before transition
  - Add `newMetadata` (jsonb) snapshot of state after transition
  - Add `validationErrors` (jsonb) array of validation issues during transition
  - Add `rollbackAllowed` (boolean) flag for safety checks

- [ ] **AC-5**: Create composite indexes for common telemetry queries
  - Index on `agentInvocations(agentName, startedAt)` for timeline views
  - Index on `agentDecisions(decisionType, evaluatedAt)` for quality analysis
  - Index on `agentOutcomes(outcomeType, createdAt)` for outcome trends
  - Index on `stateTransitions(entityType, transitionedAt)` for audit queries

- [ ] **AC-6**: Generate Drizzle migration file for schema changes
  - Run `pnpm --filter @repo/database-schema migrate:generate` to create migration
  - Verify migration includes all new columns and indexes
  - Ensure migration is idempotent (safe to run multiple times)

- [ ] **AC-7**: Auto-generate Zod schemas for updated telemetry tables
  - Ensure `createInsertSchema()` and `createSelectSchema()` include new columns
  - Verify type inference with `z.infer<>` works for all new fields
  - Export updated schemas from `wint.ts`

- [ ] **AC-8**: Write unit tests for new telemetry columns
  - Test insert operations with new columns (null handling, defaults)
  - Test index performance on composite indexes
  - Test Zod schema validation for new JSONB fields
  - Achieve 80%+ coverage for telemetry section (per WINT-0010 standard)

- [ ] **AC-9**: Update schema documentation in `wint.ts`
  - Add JSDoc comments for all new columns explaining purpose
  - Document expected JSONB structure for `securityIssues`, `performanceMetrics`, `artifactsMetadata`, `validationErrors`
  - Reference related stories: WINT-0120 (MCP Tools), WINT-3020 (Ingestion), WINT-0050 (ML Pipeline)

- [ ] **AC-10**: Verify no breaking changes to existing telemetry queries
  - All new columns are nullable or have defaults (backward compatible)
  - Existing indexes remain functional
  - Drizzle ORM relations still work for joins
  - @repo/db exports include updated schemas

### Non-Goals

- **Telemetry ingestion adapters**: Deferred to WINT-0120 (Telemetry MCP Tools)
- **Telemetry collection logic**: Deferred to WINT-3020 (Invocation Logging)
- **Analytics queries or dashboards**: Deferred to TELE-0030 (Dashboards-as-Code)
- **Event export to Prometheus**: Covered by TELE-0020 (Prometheus Metrics)
- **ML model training**: Covered by WINT-0050 (ML Pipeline)
- **Real-time telemetry streaming**: Not in scope for Wave 2
- **Cross-namespace telemetry joins**: Keep `wint.*` and `telemetry.*` separate
- **New telemetry tables**: Extend existing 4 tables only (avoid schema sprawl)

### Reuse Plan

- **Schema Namespace**: Use existing `wintSchema` from line 41 in `wint.ts`
- **Table Definitions**: Extend existing tables at lines 600-749 (Section 3: Telemetry Schema)
- **Index Pattern**: Follow composite index ordering from WINT-0010 AC-008 (high cardinality first)
- **Zod Generation**: Reuse `createInsertSchema()` and `createSelectSchema()` pattern from lines 1453+
- **JSONB Typing**: Use `jsonb().$type<T>()` pattern from existing tables (lines 612, 658, 694, 738)
- **Timestamp Pattern**: Use `timestamp('col', { withTimezone: true })` from existing tables
- **Migration**: Use Drizzle Kit `migrate:generate` command (existing tooling)
- **Test Patterns**: Follow `wint-schema.test.ts` structure (if exists, otherwise create from wishlist-schema.test.ts patterns)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
- Focus on backward compatibility testing (existing queries must still work)
- Test JSONB schema validation for new structured metadata columns
- Verify composite index performance improvements (query plan analysis)
- Ensure migration rollback safety (test down migration)
- Consider edge cases: NULL handling, default values, constraint violations
- Test Zod schema validation catches invalid JSONB structures before DB insert

### For UI/UX Advisor
- No UI work (pure database schema)
- Consider future dashboard requirements when designing JSONB structures
- Ensure column names are descriptive for future analytics queries
- Think about aggregation-friendly data structures (avoid deeply nested JSONB)

### For Dev Feasibility
- Assess migration impact on existing WINT-0010 tables (column additions are additive)
- Verify no circular dependencies between telemetry tables
- Consider index overhead on write performance (4 new composite indexes)
- Evaluate JSONB query performance vs. normalized tables (trade-off analysis)
- Check if any existing code assumes fixed column lists (SELECT * queries)
- Confirm drizzle-zod handles nullable columns correctly in generated schemas

---

**STORY-SEED COMPLETE**
