# Dev Feasibility Review: WINT-0040 - Create Telemetry Tables

## Feasibility Summary

- **Feasible for MVP**: Yes
- **Confidence**: High
- **Why**: This is additive schema work extending established WINT-0010 patterns. All new columns are nullable or have defaults, ensuring backward compatibility. The reuse of existing Drizzle patterns, composite index strategies, and Zod schema generation makes this low-risk foundational work.

## Likely Change Surface (Core Only)

### Core Packages

| Package | Why |
|---------|-----|
| `packages/backend/database-schema` | Primary change - extend wint.ts with new columns, regenerate migration |
| `packages/backend/db` | Auto-generated Zod schemas will update in generated-schemas.ts |

### Core Files

| File | Change Type | Risk |
|------|-------------|------|
| `packages/backend/database-schema/src/schema/wint.ts` | **MODIFY** - Lines 600-749 (Section 3: Telemetry Schema) | Low - additive column additions |
| `packages/backend/database-schema/src/schema/index.ts` | **MODIFY** - Add new Zod schema exports | Low - standard pattern |
| `packages/backend/db/src/generated-schemas.ts` | **AUTO-REGENERATE** - drizzle-zod output | None - automated |
| `packages/backend/db/src/index.ts` | **VERIFY** - Ensure new schemas exported | Low - may not need changes |

### Migration Files (Generated)

- `packages/backend/database-schema/src/migrations/app/00XX_*.sql` - New migration file
- `packages/backend/database-schema/src/migrations/app/meta/_journal.json` - Migration index update
- `packages/backend/database-schema/src/migrations/app/meta/00XX_snapshot.json` - Schema snapshot

### Critical Deploy Touchpoints

1. **Database Migration Execution** - Apply new migration to Aurora PostgreSQL (reversible)
2. **Type Regeneration** - `pnpm build` in database-schema must complete before db package build
3. **No Service Restarts Required** - Schema changes only, no runtime code changes

## MVP-Critical Risks

### Risk 1: Drizzle ORM Nullable Column Handling

**Why it blocks MVP**:
If Drizzle requires explicit `.optional()` or `.nullable()` chaining for new columns and we miss it, existing code that inserts to these tables will fail at runtime with "column X cannot be null" errors.

**Required mitigation**:
- Review Drizzle v0.44.3 docs for nullable column syntax
- Test existing agentInvocations insert code against new schema
- Verify `createInsertSchema()` generates correct optional types for new columns
- AC-10 explicitly tests backward compatibility - make this a HARD REQUIREMENT

**Verification**:
```typescript
// Test that this still works without new columns
await db.insert(agentInvocations).values({
  agentName: 'test',
  sessionId: 'session-1',
  startedAt: new Date(),
  // NEW columns omitted - must not throw
})
```

### Risk 2: Composite Index Cardinality Ordering

**Why it blocks MVP**:
If composite indexes are created with wrong column order (low cardinality first), query performance will degrade instead of improve. This defeats AC-5's purpose and may make telemetry queries unusable at scale.

**Required mitigation**:
- Follow WINT-0010 AC-008 index ordering: `(agentName, startedAt)` not `(startedAt, agentName)`
- Rationale: agentName has ~20-50 distinct values, startedAt is unique → high cardinality first
- Test with EXPLAIN ANALYZE on 10K+ row dataset
- Document index rationale in code comments

**Verification**:
```sql
-- Must use index scan, not seq scan
EXPLAIN SELECT * FROM wint.agent_invocations
WHERE agent_name = 'pm-leader'
  AND started_at > NOW() - INTERVAL '1 day';
```

### Risk 3: JSONB Schema Validation Gap

**Why it blocks MVP**:
PostgreSQL allows ANY valid JSON in JSONB columns. If Zod validation is bypassed (raw SQL inserts, external tools), invalid structures leak into database. Future code expecting structured data (e.g., `securityIssues[0].severity`) will throw runtime errors.

**Required mitigation**:
- AC-8 MUST test that Zod schema validation catches invalid JSONB before DB insert
- Document expected JSONB structures in JSDoc (AC-9)
- Consider adding DB-level CHECK constraints for critical fields (future enhancement, not MVP-blocking)
- Ensure @repo/db exports ONLY go through drizzle-zod validation layer

**Verification**:
```typescript
// This must throw Zod error, not DB error
await db.insert(agentOutcomes).values({
  securityIssues: "invalid string not array"  // Zod should catch
})
```

## Missing Requirements for MVP

### 1. NULL vs DEFAULT Strategy

**What's missing**: Story doesn't specify whether new columns should be NULL-allowed or have DEFAULT values.

**Why it matters**: Affects backward compatibility and migration complexity.

**Required decision**:
```
PM must add to story:
- cachedTokens: INTEGER DEFAULT 0 (not NULL, default to 0)
- totalTokens: INTEGER DEFAULT 0 (not NULL, computed or default)
- estimatedCost: NUMERIC DEFAULT 0.0 (not NULL, default to 0.0)
- modelName: TEXT NULL (nullable, can be unknown)
- evaluatedAt: TIMESTAMP NULL (nullable, evaluation happens later)
- evaluatedBy: TEXT NULL (nullable)
- correctnessScore: INTEGER NULL (nullable, not always evaluated)
- alternativesConsidered: INTEGER DEFAULT 0 (not NULL)
- lintErrors: INTEGER DEFAULT 0 (not NULL)
- typeErrors: INTEGER DEFAULT 0 (not NULL)
- securityIssues: JSONB DEFAULT '[]'::jsonb (not NULL, default empty array)
- performanceMetrics: JSONB DEFAULT '{}'::jsonb (not NULL, default empty object)
- artifactsMetadata: JSONB DEFAULT '{}'::jsonb (not NULL)
- previousMetadata: JSONB NULL (nullable, may not exist)
- newMetadata: JSONB NULL (nullable, may not exist)
- validationErrors: JSONB DEFAULT '[]'::jsonb (not NULL)
- rollbackAllowed: BOOLEAN DEFAULT true (not NULL)
```

**Impact if not addressed**: Migration may fail, or backward compatibility breaks.

### 2. Index Naming Convention

**What's missing**: Index names not specified in ACs.

**Required decision**:
```
PM must add to AC-5:
- idx_agent_invocations_agent_name_started_at
- idx_agent_decisions_decision_type_evaluated_at
- idx_agent_outcomes_outcome_type_created_at
- idx_state_transitions_entity_type_transitioned_at

Follow pattern: idx_{table}_{col1}_{col2}
```

**Impact if not addressed**: Inconsistent naming makes index maintenance harder.

### 3. totalTokens Computation Strategy

**What's missing**: AC-1 mentions totalTokens as "computed field" but doesn't specify if it's:
- A) PostgreSQL GENERATED ALWAYS AS column (computed at DB level)
- B) Application-computed before insert (Drizzle ORM level)

**Required decision**:
```
PM must clarify:
Option A (GENERATED): totalTokens = inputTokens + outputTokens + COALESCE(cachedTokens, 0)
Option B (App-level): Compute in application before db.insert()

Recommendation: Option A (DB-level) for data integrity
```

**Impact if not addressed**: Implementation ambiguity, potential for inconsistent data.

## MVP Evidence Expectations

### 1. Migration Idempotency

**What to prove**:
- Migration can be applied multiple times without error (using IF NOT EXISTS checks)
- Migration can be rolled back cleanly
- Rollback + reapply leaves schema in same state

**How**:
```bash
# Apply migration
pnpm --filter @repo/database-schema migrate:apply

# Rollback migration
pnpm --filter @repo/database-schema migrate:down

# Reapply migration
pnpm --filter @repo/database-schema migrate:apply

# Verify schema matches original
```

### 2. Backward Compatibility

**What to prove**:
- All WINT-0010 queries still work against WINT-0040 schema
- Existing insert code works without specifying new columns
- Drizzle relations (one-to-many, many-to-one) still resolve

**How**:
- Run existing `wint-schema.test.ts` (if exists) or `unified-wint.test.ts` against new schema
- ALL tests must pass without modification

### 3. Index Performance

**What to prove**:
- Composite indexes provide >10x speedup vs sequential scan
- Write performance does not degrade >20% with new indexes

**How**:
```sql
-- Before: Sequential scan baseline
EXPLAIN ANALYZE SELECT * FROM wint.agent_invocations
WHERE agent_name = 'test' AND started_at > NOW() - INTERVAL '1 day';

-- After: Index scan with new composite index
-- Compare execution time
```

### 4. Zod Schema Validation

**What to prove**:
- Invalid JSONB structures are rejected before DB insert
- Zod schemas correctly infer TypeScript types with `z.infer<>`
- `createInsertSchema()` and `createSelectSchema()` include new columns

**How**:
- Unit tests in `wint-telemetry.test.ts`
- Test both valid and invalid JSONB structures
- Verify TypeScript compilation with inferred types

## Critical CI/Deploy Checkpoints

1. **TypeScript Compilation**: `pnpm check-types:all` must pass
2. **Database Schema Tests**: `pnpm --filter @repo/database-schema test` must pass with 80%+ coverage
3. **Migration Generation**: `pnpm --filter @repo/database-schema migrate:generate` must produce valid SQL
4. **Migration Smoke Test**: Apply migration to test database, verify schema with `\d wint.agent_invocations`
5. **Rollback Test**: Roll back migration, verify no orphaned constraints or data

## Dependencies & Blockers

### Hard Dependencies

- ✅ WINT-0010 (UAT) - Foundation WINT schemas must exist
- ✅ Drizzle ORM v0.44.3 - Schema definition patterns
- ✅ drizzle-zod - Zod schema auto-generation
- ✅ @repo/db - Database client and connection pooling

### Soft Dependencies (Non-blocking)

- ⚠️ INFR-0040 (ready-for-qa) - Created telemetry.workflow_events (separate namespace, no conflict)
- ⚠️ WINT-0020 (ready-to-work) - Story Management Tables (different schema group)
- ⚠️ WINT-0070 (ready-for-qa) - Workflow Tracking Tables (different schema group)

### No Blockers Identified

All dependencies are satisfied or non-conflicting. Story is ready for implementation.

## Reuse Opportunities

| Component | Existing Pattern | Reuse Strategy |
|-----------|------------------|----------------|
| `wintSchema` namespace | `wint.ts:41` | Use existing pgSchema, no new namespace needed |
| Composite index pattern | WINT-0010 AC-008 | Copy index structure, adapt column names |
| Zod schema generation | `wint.ts:1453+` | Use same createInsertSchema/createSelectSchema pattern |
| JSONB typing | `wint.ts:612, 658, 694, 738` | Use `jsonb().$type<T>()` with Zod schemas |
| Timestamp columns | All existing tables | Use `timestamp('col', { withTimezone: true })` |
| Migration tooling | Drizzle Kit | Use existing `migrate:generate` and `migrate:apply` scripts |

## Scope Tightening Recommendations

### In Scope (MVP-Critical)

- Extend 4 existing telemetry tables (agentInvocations, agentDecisions, agentOutcomes, stateTransitions)
- Add specified columns with NULL/DEFAULT strategy
- Create 4 composite indexes per AC-5
- Generate Drizzle migration
- Auto-generate Zod schemas
- Write unit tests with 80%+ coverage
- Update schema documentation

### Out of Scope (Defer to Later Stories)

- ❌ **Telemetry ingestion adapters** → WINT-0120 (Telemetry MCP Tools)
- ❌ **Telemetry collection logic** → WINT-3020 (Invocation Logging)
- ❌ **Analytics queries** → TELE-0030 (Dashboards-as-Code)
- ❌ **Prometheus export** → TELE-0020 (Prometheus Metrics)
- ❌ **ML model training** → WINT-0050 (ML Pipeline)
- ❌ **New telemetry tables** → Avoid schema sprawl, extend existing only
- ❌ **Cross-namespace joins** → Keep wint.* and telemetry.* separate

## Estimated Effort

- **Schema changes**: 2 hours (extend 4 tables, follow existing patterns)
- **Migration generation & testing**: 1 hour (Drizzle Kit automation)
- **Unit tests**: 3 hours (JSONB validation, backward compatibility, index performance)
- **Documentation**: 1 hour (JSDoc comments, AC-9 requirements)
- **Rollback testing**: 1 hour (Edge Case 3 verification)

**Total**: ~8 hours (1 development day)

**Confidence**: High - additive work with clear patterns from WINT-0010.
