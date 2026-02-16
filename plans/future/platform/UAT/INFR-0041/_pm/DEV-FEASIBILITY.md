# Dev Feasibility Assessment: INFR-0041

**Story**: INFR-0041 - Workflow Event SDK - Typed Schemas & Validation
**Assessed**: 2026-02-14
**Assessor**: pm-story-followup-leader (autonomous)
**Estimated Effort**: 1 story point (4-6 hours)

---

## Overview

This story extends INFR-0040 by adding type-safe Zod schemas for event payloads, validation logic, helper functions, and metadata columns. All work is additive - no breaking changes to existing INFR-0040 functionality.

**Verdict**: ✅ **FEASIBLE** - Well-scoped follow-up with clear implementation path

---

## Technical Feasibility

### Dependencies
- **Hard Dependency**: INFR-0040 (ready-for-qa) must complete QA and be promoted to UAT before starting
- **Tooling**: Drizzle ORM, Zod, Vitest (all already in use)
- **Database**: PostgreSQL 14+ (already running in Docker Compose)
- **No New Packages Required**: All work within existing @repo/db and database-schema

### Implementation Complexity

#### LOW Complexity (4 ACs)
- **AC-6, AC-7, AC-8**: Add 3 metadata columns to table
  - Simple Drizzle schema update + migration
  - Nullable columns, backward compatible
  - No data migration needed
  - **Effort**: 30 minutes

- **AC-13**: Unit tests for schemas
  - Standard Vitest + Zod validation tests
  - Test valid/invalid payloads for each schema
  - **Effort**: 1 hour

#### MEDIUM Complexity (7 ACs)
- **AC-1, AC-2, AC-3, AC-4, AC-5**: Define 5 Zod schemas
  - Straightforward schema definitions
  - Use Zod enums for constrained values
  - Reuse patterns from existing schemas
  - **Effort**: 2 hours (30 min per schema + testing)

- **AC-10, AC-11**: Create 5 helper functions
  - Simple constructors with UUID generation
  - Validate params and construct WorkflowEventInput
  - **Effort**: 1.5 hours

- **AC-12**: Export unified schemas object
  - Trivial export statement
  - **Effort**: 5 minutes

- **AC-14**: Unit tests for validation
  - Extend existing workflow-events.test.ts
  - Test valid/invalid events for all types
  - **Effort**: 45 minutes

#### MEDIUM-HIGH Complexity (2 ACs)
- **AC-9**: Add validation to insertWorkflowEvent()
  - Discriminated union pattern based on event_type
  - Select correct schema, parse payload
  - Error handling with clear messages
  - **Challenge**: Need to handle 5 event types cleanly
  - **Effort**: 1 hour

- **AC-15**: Write README.md documentation
  - Document all 5 event types with examples
  - Usage examples for helpers
  - Migration notes
  - **Effort**: 1 hour

### Total Estimated Effort
- Schema definition: 2 hours
- Migration: 0.5 hours
- Validation logic: 1 hour
- Helper functions: 1.5 hours
- Testing: 1.75 hours
- Documentation: 1 hour
- **Total**: ~7.75 hours ≈ **1 story point**

---

## Implementation Strategy

### Phase 1: Database Schema (AC-6, AC-7, AC-8)
1. Update `packages/backend/database-schema/src/schema/telemetry.ts`
   - Add 3 columns: `uuid('correlation_id')`, `text('source')`, `text('emitted_by')`
   - All nullable
2. Generate migration: `pnpm --filter database-schema generate`
3. Test migration locally: `pnpm --filter @repo/db migrate:run`
4. Verify schema: `psql -c "\d telemetry.workflow_events"`

### Phase 2: Event Type Schemas (AC-1 to AC-5)
1. Create `packages/backend/db/src/workflow-events/schemas.ts`
2. Define 5 Zod schemas:
   ```typescript
   export const ItemStateChangedPayloadSchema = z.object({
     from_state: z.string(),
     to_state: z.string(),
     item_id: z.string(),
     item_type: z.string(),
     reason: z.string().optional(),
   })

   export const StepCompletedPayloadSchema = z.object({
     step_name: z.string(),
     duration_ms: z.number(),
     tokens_used: z.number().optional(),
     model: z.string().optional(),
     status: z.enum(['success', 'error']),
     error_message: z.string().optional(),
   })

   // ... 3 more schemas
   ```
3. Test schemas: Write unit tests in `__tests__/schemas.test.ts`

### Phase 3: Validation Logic (AC-9)
1. Update `packages/backend/db/src/workflow-events.ts`
2. Add schema map:
   ```typescript
   const PAYLOAD_SCHEMAS = {
     item_state_changed: ItemStateChangedPayloadSchema,
     step_completed: StepCompletedPayloadSchema,
     story_changed: StoryChangedPayloadSchema,
     gap_found: GapFoundPayloadSchema,
     flow_issue: FlowIssuePayloadSchema,
   } as const
   ```
3. Update insertWorkflowEvent():
   ```typescript
   export async function insertWorkflowEvent(event: WorkflowEventInput) {
     // Validate payload
     const schema = PAYLOAD_SCHEMAS[event.event_type]
     if (!schema) {
       throw new Error(`Unknown event_type: ${event.event_type}`)
     }

     try {
       schema.parse(event.payload) // Fail fast on invalid payload
     } catch (err) {
       if (err instanceof z.ZodError) {
         throw new Error(
           `Validation failed for ${event.event_type} payload: ${err.message}`
         )
       }
       throw err
     }

     // Insert (existing logic)
     // ...
   }
   ```
4. Test validation: Extend existing tests in `__tests__/workflow-events.test.ts`

### Phase 4: Helper Functions (AC-10, AC-11)
1. Create `packages/backend/db/src/workflow-events/helpers.ts`
2. Implement 5 helper functions:
   ```typescript
   import { randomUUID } from 'crypto'

   export function createItemStateChangedEvent(params: {
     fromState: string
     toState: string
     itemId: string
     itemType: string
     reason?: string
     runId?: string
     workflowName?: string
     agentRole?: string
     correlationId?: string
     source?: string
     emittedBy?: string
   }): WorkflowEventInput {
     const payload = {
       from_state: params.fromState,
       to_state: params.toState,
       item_id: params.itemId,
       item_type: params.itemType,
       reason: params.reason,
     }

     // Validate before returning
     ItemStateChangedPayloadSchema.parse(payload)

     return {
       event_id: randomUUID(),
       event_type: 'item_state_changed',
       payload,
       run_id: params.runId,
       item_id: params.itemId,
       workflow_name: params.workflowName,
       agent_role: params.agentRole,
       correlation_id: params.correlationId,
       source: params.source,
       emitted_by: params.emittedBy,
     }
   }

   // ... 4 more helper functions
   ```
3. Test helpers: Write unit tests in `__tests__/helpers.test.ts`

### Phase 5: Exports & Documentation (AC-12, AC-15)
1. Export schemas object:
   ```typescript
   // packages/backend/db/src/workflow-events/schemas.ts
   export const WorkflowEventSchemas = {
     item_state_changed: ItemStateChangedPayloadSchema,
     step_completed: StepCompletedPayloadSchema,
     story_changed: StoryChangedPayloadSchema,
     gap_found: GapFoundPayloadSchema,
     flow_issue: FlowIssuePayloadSchema,
   } as const
   ```
2. Add to main export: `packages/backend/db/src/index.ts`
3. Write README.md with:
   - Table of all 5 event types
   - Payload field descriptions
   - Example JSON for each type
   - Helper function usage examples
   - Migration notes

---

## Technical Risks

### Risk 1: Validation Performance
- **Risk**: Zod validation adds overhead to event insertion
- **Likelihood**: Low
- **Impact**: Low
- **Mitigation**: Benchmark validation time (target <5ms per event)
- **Fallback**: Consider caching parsed schemas if needed

### Risk 2: Schema Evolution
- **Risk**: Future changes to event schemas break existing code
- **Likelihood**: Medium
- **Impact**: Medium
- **Mitigation**:
  - Use event_version field for schema versioning
  - Document schema change process
  - Consider versioned schemas (V1, V2, etc.)
- **Fallback**: Maintain multiple schema versions side-by-side

### Risk 3: Enum Growth
- **Risk**: Adding new enum values requires code changes
- **Likelihood**: High (expected as product evolves)
- **Impact**: Low
- **Mitigation**:
  - Document process for adding new enum values
  - Consider using string unions instead of enums for extensibility
- **Fallback**: Use `.or(z.string())` for open-ended enums

### Risk 4: Migration Conflicts
- **Risk**: Migration conflicts with concurrent schema changes
- **Likelihood**: Low (Wave 2 story, few concurrent DB changes)
- **Impact**: Low
- **Mitigation**: Coordinate with other Wave 2 DB stories (WINT-0010, etc.)
- **Fallback**: Regenerate migration after resolving conflicts

---

## Blockers & Dependencies

### Hard Blockers
1. **INFR-0040 must complete QA**
   - Current status: ready-for-qa
   - Action: Wait for QA completion before starting
   - Timeline: 1-2 days

### Soft Dependencies
None - no external API changes, no cross-team coordination needed

### External Dependencies
None - all work contained within backend packages

---

## Rollout Strategy

### Development
1. Create feature branch: `feature/infr-0041-event-schemas`
2. Implement in phases (1-5 above)
3. Run tests locally after each phase
4. Verify migration applies cleanly

### Testing
1. Unit tests: All schemas, helpers, validation logic
2. Integration tests: Migration + full event flow
3. Performance test: Validate 1000 events, measure time
4. Manual test: Insert events for all 5 types via helper functions

### Deployment
1. **Local Dev**:
   - Run migration: `pnpm --filter @repo/db migrate:run`
   - Test event insertion with new helpers
2. **Staging**:
   - Auto-apply migration on deployment
   - Smoke test: Insert 1 event of each type
3. **Production**:
   - Manual migration step (or auto via CI)
   - Verify existing events unaffected (new columns NULL)

### Rollback Plan
If validation breaks event insertion:
1. Revert code changes (keep migration)
2. New columns remain but are unused
3. Fix validation logic in follow-up PR

If migration fails:
1. Drizzle auto-rollback should handle transactional rollback
2. Manual rollback: `pnpm --filter @repo/db migrate:rollback`
3. Manual SQL cleanup if needed: `ALTER TABLE ... DROP COLUMN ...`

---

## Alternative Approaches Considered

### Alternative 1: Skip Helper Functions
- **Pros**: Less code to maintain
- **Cons**: Callers must manually construct events, error-prone
- **Verdict**: Rejected - helpers provide type safety and DX

### Alternative 2: Use TypeScript Interfaces Instead of Zod
- **Pros**: No runtime overhead
- **Cons**: No runtime validation, no schema documentation
- **Verdict**: Rejected - runtime validation is critical for data quality

### Alternative 3: Single Union Schema
- **Pros**: Simpler implementation (1 schema instead of 5)
- **Cons**: Less precise type inference, harder to document
- **Verdict**: Rejected - discriminated union provides better DX

### Alternative 4: Defer Metadata Columns
- **Pros**: Fewer ACs, simpler migration
- **Cons**: INFR-0050 would need another migration for metadata
- **Verdict**: Rejected - add metadata now to avoid future migration

---

## Success Criteria

### Must Have
- [ ] All 15 ACs implemented
- [ ] All tests pass (unit + integration)
- [ ] Migration applies cleanly
- [ ] README.md documentation complete
- [ ] No breaking changes to INFR-0040 functionality

### Should Have
- [ ] Code coverage >80% for new code
- [ ] Validation performance <5ms per event
- [ ] Clear error messages for validation failures

### Nice to Have
- [ ] Snapshot tests for example payloads
- [ ] Performance benchmarks in CI
- [ ] Migration rollback tested in local dev

---

## Recommendation

**APPROVED FOR IMPLEMENTATION** ✅

This story is well-scoped, has clear acceptance criteria, and builds cleanly on INFR-0040 foundation. The implementation path is straightforward with low technical risk. All required tooling is already in place.

**Key Strengths:**
- Additive changes only (no breaking changes)
- Clear validation strategy (fail-fast with Zod)
- Helper functions improve DX for orchestrator integration
- Metadata columns support future telemetry features

**Key Risks:**
- Minor validation performance overhead (mitigated by benchmarking)
- Schema evolution requires careful versioning (mitigated by documentation)

**Next Steps:**
1. Wait for INFR-0040 to complete QA (1-2 days)
2. Assign to implementation team
3. Create feature branch
4. Implement in 5 phases (schema → migration → validation → helpers → docs)
5. Submit PR when all ACs complete

**Estimated Timeline**: 1-2 days development + 1 day review/QA = **3 days total**

---

**Dev Feasibility Assessment Complete**
