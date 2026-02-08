---
doc_type: story
title: "SETS-MVP-0400: Consumer Notification and Migration Guide for API Endpoint Transition"
story_id: SETS-MVP-0400
story_prefix: SETS-MVP
status: backlog
follow_up_from: SETS-MVP-0310
phase: 2
created_at: "2026-02-01T19:45:00-07:00"
updated_at: "2026-02-01T19:45:00-07:00"
depends_on: [SETS-MVP-0310]
estimated_points: 1
---

# SETS-MVP-0400: Consumer Notification and Migration Guide for API Endpoint Transition

## Follow-up Context

- **Parent Story:** SETS-MVP-0310 (Status Update Flow)
- **Source:** QA Discovery Notes - Follow-up Stories Suggested
- **Original Finding:** "Consumer notification strategy for API transition"
- **Category:** Enhancement Opportunity
- **Impact:** Medium - Affects consumers of existing API endpoint
- **Effort:** Low - Documentation and communication task

## Context

SETS-MVP-0310 introduces a new `PATCH /api/wishlist/:id/purchase` endpoint that replaces the behavior of the existing `POST /api/wishlist/:id/purchased` endpoint from WISH-2004. The new endpoint uses the unified model approach (status updates) rather than the legacy approach (create Set + delete wishlist item).

During the transition period, API consumers need clear guidance on:
1. When and how to migrate from POST to PATCH
2. What the behavioral differences are
3. Whether backward compatibility will be maintained
4. Deprecation timeline for the old endpoint

Without proper consumer notification and migration documentation, frontend teams may continue using the deprecated endpoint, encounter unexpected behavior, or experience integration issues during the transition.

## Goal

Create comprehensive migration documentation and establish a notification strategy to guide API consumers through the transition from `POST /api/wishlist/:id/purchased` to `PATCH /api/wishlist/:id/purchase`, ensuring smooth adoption of the unified model approach.

## Non-goals

- Implementing the actual endpoint migration (covered in SETS-MVP-0310)
- Creating automated migration tooling
- Writing new API documentation from scratch (extend existing docs)
- Handling feature flag implementation (covered in SETS-MVP-0310's AC13)

## Scope

Create API migration documentation and establish a consumer notification strategy for the wishlist purchase endpoint transition.

### Deliverables

1. **API Migration Guide**: Document the transition from POST to PATCH including:
   - Behavioral differences between endpoints
   - Request/response schema changes
   - Migration steps for consumers
   - Timeline and deprecation schedule
   - Feature flag behavior (if applicable)

2. **Consumer Notification Plan**: Strategy for communicating changes to API consumers:
   - Notification channels (Slack, email, API changelog)
   - Notification timing (before, during, after migration)
   - Key stakeholders to notify (frontend teams, QA, docs team)

3. **API Documentation Updates**: Update existing API docs to reflect:
   - Deprecation notice on old endpoint
   - New endpoint documentation
   - Migration guide reference

## Acceptance Criteria

### Migration Guide
- [ ] AC1: Document behavioral differences between `POST :id/purchased` and `PATCH :id/purchase`
- [ ] AC2: Document request schema changes (what fields are required/optional)
- [ ] AC3: Document response schema changes (what fields are returned)
- [ ] AC4: Provide code examples for both old and new endpoints
- [ ] AC5: Document migration timeline and deprecation schedule
- [ ] AC6: Document feature flag behavior (if applicable per SETS-MVP-0310 AC13)

### Consumer Notification
- [ ] AC7: Define notification channels and timing
- [ ] AC8: Identify all API consumers (GotItModal, any external consumers)
- [ ] AC9: Create notification message template with key information
- [ ] AC10: Schedule notifications before, during, and after migration

### API Documentation
- [ ] AC11: Add deprecation notice to `POST :id/purchased` documentation
- [ ] AC12: Document new `PATCH :id/purchase` endpoint
- [ ] AC13: Link to migration guide from both endpoint docs
- [ ] AC14: Update API changelog with migration information

## Reuse Plan

### Existing Documentation
- Extend existing API documentation structure
- Follow existing API doc format and style
- Integrate with existing changelog system

### Documentation Location
- `docs/api/wishlist/endpoints.md` - API endpoint reference
- `docs/api/migration-guides/` - Migration guide
- `docs/api/CHANGELOG.md` - API changelog

## Architecture Notes

### Documentation Structure

```
docs/
  api/
    wishlist/
      endpoints.md              # Update with deprecation notice and new endpoint
    migration-guides/
      wish-2004-to-sets-mvp-0310.md  # New migration guide
    CHANGELOG.md                # Add entry for this change
```

### Migration Guide Template

```markdown
# Migration Guide: Wishlist Purchase Endpoint (WISH-2004 → SETS-MVP-0310)

## Overview
Brief summary of the change and why it's happening

## Behavioral Differences
Table comparing old vs new behavior

## API Changes

### Old Endpoint (Deprecated)
- Endpoint: POST /api/wishlist/:id/purchased
- Behavior: Creates Set record, deletes wishlist item
- Request/Response schemas

### New Endpoint
- Endpoint: PATCH /api/wishlist/:id/purchase
- Behavior: Updates item status to 'owned' in unified model
- Request/Response schemas

## Migration Steps
Step-by-step guide for consumers

## Timeline
Deprecation schedule and key dates

## Feature Flag (if applicable)
How to use feature flag during transition

## Support
Where to get help during migration
```

## Test Plan

### Documentation Review
- Technical review by backend team (verify accuracy)
- Frontend team review (verify clarity for consumers)
- QA review (verify completeness)

### Notification Test
- Dry-run notification to test channel
- Verify message reaches all intended recipients
- Verify links and documentation are accessible

## Risks / Edge Cases

### Risks
1. **Incomplete Consumer List**: May miss API consumers who need notification
   - Mitigation: Search codebase for references to old endpoint
   - Mitigation: Check API logs for active consumers

2. **Timing Misalignment**: Notification sent before migration guide is ready
   - Mitigation: Complete documentation before sending notifications
   - Mitigation: Use draft review process

3. **Documentation Drift**: Migration guide becomes outdated during implementation
   - Mitigation: Review guide after SETS-MVP-0310 implementation
   - Mitigation: Link to source code for authoritative reference

### Edge Cases
- External API consumers (if any): Need different notification approach
- Automated systems using old endpoint: May need different migration timeline
- Documentation in multiple locations: Ensure all are updated consistently

## Open Questions

None - all questions should be resolved by SETS-MVP-0310 AC13 (migration strategy)

## Definition of Done

- [ ] Migration guide written and reviewed by technical team
- [ ] API documentation updated with deprecation notices
- [ ] Consumer notification plan documented
- [ ] Notification messages drafted and approved
- [ ] All API consumers identified
- [ ] Documentation links verified
- [ ] Peer review completed

---

## Implementation Notes

### Prerequisites
1. SETS-MVP-0310 must be implemented (or at least AC13 resolved)
2. Migration strategy must be documented (SETS-MVP-0310 AC13)
3. Endpoint behavior finalized (SETS-MVP-0310 AC11-AC12)

### Consumer Identification
Search codebase for references:
```bash
# Find consumers of old endpoint
grep -r "POST.*wishlist.*purchased" apps/
grep -r "api/wishlist/.*/purchased" apps/

# Find GotItModal usage
grep -r "GotItModal" apps/
```

### Notification Channels
- **Slack**: #api-changes, #frontend-team, #qa-team
- **Email**: All-hands development update
- **API Docs**: In-page banner for deprecated endpoint
- **Changelog**: Prominent entry in API changelog

### Timeline Considerations
- Notification: T-2 weeks before migration
- Migration guide ready: T-1 week before migration
- Migration window: TBD by SETS-MVP-0310 AC13
- Deprecation: TBD by SETS-MVP-0310 AC13

---

## Related Stories

- **Parent:** SETS-MVP-0310 (Status Update Flow)
- **Depends On:** SETS-MVP-0310 (must be implemented first)
- **Related:** WISH-2004 (original endpoint implementation)
