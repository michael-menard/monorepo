---
doc_type: story
title: "SETS-MVP-0380: WISH-2004 Endpoint Deprecation and Migration Strategy"
story_id: SETS-MVP-0380
story_prefix: SETS-MVP
status: pending
follow_up_from: SETS-MVP-0310
phase: 2
created_at: "2026-02-01T20:00:00-07:00"
updated_at: "2026-02-01T20:00:00-07:00"
depends_on: [SETS-MVP-0310]
estimated_points: 1
---

# SETS-MVP-0380: WISH-2004 Endpoint Deprecation and Migration Strategy

## Follow-up Context

- **Parent Story:** SETS-MVP-0310
- **Source:** QA Discovery Notes - Finding #1
- **Original Finding:** "WISH-2004 migration strategy undefined - Story mentions 'clarify migration strategy before implementation' but provides no decision criteria. Must document: deprecation timeline, feature flag approach, backward compatibility requirements."
- **Category:** Gap
- **Impact:** High
- **Effort:** Low

## Context

SETS-MVP-0310 implements a new unified model approach to marking wishlist items as purchased using a PATCH endpoint to update item status. However, the existing WISH-2004 endpoint (`POST /api/wishlist/:id/purchased`) uses the old architecture where marking an item as purchased creates a new Set record and deletes the wishlist item.

This creates several architectural and operational challenges:
1. Two different approaches to the same user action (purchase/got-it flow)
2. Service method naming conflict: `markAsPurchased()` exists with WISH-2004 behavior but SETS-MVP-0310 needs the same method with different behavior
3. Frontend consumers (GotItModal) need clear guidance on when to use which endpoint
4. No defined sunset timeline for the legacy endpoint
5. No documentation on backward compatibility requirements or migration path

Without a clear deprecation and migration strategy, teams risk:
- Confusion about which endpoint to use
- Service layer code conflicts and complexity
- Incomplete migrations leaving legacy code paths active indefinitely
- Breaking changes for consumers without proper notice

## Goal

Document a clear deprecation timeline and migration strategy for the WISH-2004 endpoint (`POST /api/wishlist/:id/purchased`) after SETS-MVP-0310 is deployed, ensuring smooth transition to the unified model approach with minimal disruption to consumers.

## Non-goals

- Implementing the migration code itself (this is documentation/strategy only)
- Deprecating the WISH-2004 UI flow (only the API endpoint)
- Migrating existing Set records to the unified model (data migration out of scope)
- Feature flag implementation (if needed, create separate story)

## Scope

This story produces **documentation only**. Create a migration strategy document that includes:

1. **Deprecation Timeline**
   - Announcement date (when deprecation is communicated)
   - Parallel operation period (how long both endpoints run)
   - Sunset date (when old endpoint is removed)

2. **Migration Approach**
   - Feature flag strategy (if applicable)
   - Rollout phases
   - Consumer notification plan
   - Backward compatibility requirements

3. **Service Layer Resolution**
   - How to handle `markAsPurchased()` method conflict
   - Whether to rename old method or use versioning
   - Code organization strategy

4. **Consumer Migration Guide**
   - Step-by-step guide for frontend teams
   - Example code showing old vs new approach
   - Testing guidance for migration

5. **Rollback Plan**
   - Conditions that would trigger rollback
   - How to roll back safely if needed

## Acceptance Criteria

### Documentation Requirements
- [ ] AC1: Migration strategy document created in `plans/future/wish/backlog/SETS-MVP-0380/_pm/MIGRATION-STRATEGY.md`
- [ ] AC2: Document includes deprecation timeline with specific dates/phases
- [ ] AC3: Document specifies feature flag approach OR explains why feature flags not needed
- [ ] AC4: Document includes service layer resolution strategy for `markAsPurchased()` conflict
- [ ] AC5: Document includes consumer notification plan with communication templates
- [ ] AC6: Document includes consumer migration guide with code examples
- [ ] AC7: Document includes rollback plan with trigger conditions
- [ ] AC8: Document reviewed by at least one backend engineer and one frontend engineer

### Decision Documentation
- [ ] AC9: Document clearly states whether parallel operation is needed or immediate cutover
- [ ] AC10: Document specifies monitoring/metrics to track during migration
- [ ] AC11: Document addresses backward compatibility constraints (if any)

## Reuse Plan

### Information Sources
- SETS-MVP-0310 story and elaboration (architectural context)
- WISH-2004 original implementation (legacy behavior)
- API versioning/deprecation best practices from team standards
- Existing migration strategy examples from similar past migrations (if any)

### Templates
- Use standard API deprecation notice template (if exists)
- Follow team's migration documentation format (if exists)

## Architecture Notes

This story is documentation-only and does not produce code artifacts. However, the migration strategy should account for:

### Service Layer Conflict Resolution Options

**Option 1: Feature Flag with Dual Methods**
```typescript
// Old method (WISH-2004)
export async function markAsPurchased_v1(userId, itemId) { ... }

// New method (SETS-MVP-0310)
export async function markAsPurchased_v2(userId, itemId, purchaseDetails) { ... }

// Wrapper method
export async function markAsPurchased(userId, itemId, purchaseDetails) {
  if (featureFlags.unifiedModel) {
    return markAsPurchased_v2(userId, itemId, purchaseDetails)
  }
  return markAsPurchased_v1(userId, itemId)
}
```

**Option 2: Immediate Replacement**
- Replace old method completely
- Deprecate POST endpoint immediately
- Provide grace period for consumers to migrate

**Option 3: Service Namespace**
```typescript
// wishlist-legacy-service.ts
export async function markAsPurchased(userId, itemId) { ... }

// wishlist-service.ts (new)
export async function markAsPurchased(userId, itemId, purchaseDetails) { ... }
```

The migration strategy document should recommend one approach with clear rationale.

### Endpoint Coexistence

Should document whether:
1. Both endpoints run in parallel temporarily
2. New endpoint launches, old endpoint marked deprecated immediately
3. Feature flag controls which endpoint is active

## Test Plan

### Validation Tests
- Migration strategy document passes review by backend engineer
- Migration strategy document passes review by frontend engineer
- Consumer migration guide code examples are syntactically correct
- Timeline is realistic and accounts for typical sprint planning cycles

### Completeness Checks
- All AC items are addressed in the documentation
- Rollback plan is actionable (not just theoretical)
- Communication templates are ready to use
- Service layer resolution strategy is implementable

## Risks / Edge Cases

### Documentation Risks
1. **Overly Aggressive Timeline**: Deprecation timeline too short for consumers to migrate
   - Mitigation: Include buffer time, validate with consumer teams

2. **Incomplete Consumer List**: Missing some consumers of the old endpoint
   - Mitigation: Audit API Gateway logs to identify all active consumers

3. **Unclear Rollback Triggers**: Rollback plan too vague to be actionable
   - Mitigation: Define specific metrics/thresholds that trigger rollback

### Migration Risks (to document)
1. **Service Layer Conflict**: New code deployed before migration strategy documented
   - Mitigation: Block SETS-MVP-0310 implementation until this story completes

2. **Consumer Confusion**: Frontend teams unaware of deprecation
   - Mitigation: Proactive communication via migration notification plan

3. **Data Inconsistency**: Some items created with old model, some with new
   - Mitigation: Document compatibility requirements and data access patterns

## Definition of Done

- [ ] MIGRATION-STRATEGY.md document created
- [ ] Document includes all required sections per AC1-11
- [ ] Document reviewed and approved by backend engineer
- [ ] Document reviewed and approved by frontend engineer
- [ ] Communication templates ready for distribution
- [ ] Consumer migration guide includes working code examples
- [ ] Rollback plan is specific and actionable
- [ ] Document committed to repository

---

## Open Questions

None - this story is documentation-only and should resolve open questions from SETS-MVP-0310.

---

## Related Stories

- **Parent:** SETS-MVP-0310 (Status Update Flow)
- **Dependency:** This story should complete before SETS-MVP-0310 implementation begins
- **Related:** WISH-2004 (original "Got it" flow implementation)
