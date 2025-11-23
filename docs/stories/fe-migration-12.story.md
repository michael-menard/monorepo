# Story 1.12: Production Rollout - 10% Stage

**Epic:** Epic 1: Frontend Serverless Migration

**Story ID:** 1.12

**Priority:** High

**Estimated Effort:** 5 story points

---

## User Story

**As a** DevOps engineer,
**I want** to route 10% of production traffic to the serverless backend,
**so that** we can validate production behavior with limited user exposure.

---

## Acceptance Criteria

**AC1**: Pre-rollout checklist completed:

- CloudWatch dashboard operational
- Alarms configured and tested
- Redis cache flush script tested in dry-run
- Team notified in Slack: "10% rollout starting"

**AC2**: Redis cache flushed: `pnpm flush:migration-cache` executed, 2-minute wait before Route53 update

**AC3**: Route53 weights updated: 10 (Serverless) / 90 (Express)

**AC4**: Monitoring period: 30 minutes active observation, then 24-hour passive monitoring

**AC5**: Go/no-go criteria met:

- Error rate <2% increase vs baseline
- P95 latency <600ms (NA), <900ms (EU)
- No critical user-reported issues
- Cache hit rate recovered to >80%

**AC6**: Rollback procedure ready: Scripts tested, team briefed on rollback decision criteria

---

## Integration Verification

**IV1**: Traffic distribution verified: CloudWatch shows ~10% requests hitting Serverless Lambda functions

**IV2**: Both backends operational: Express and Serverless handling requests without errors

**IV3**: User experience validated: Smoke test critical flows (login, upload MOC, browse gallery) successful

---

## Definition of Done

- [ ] Pre-rollout checklist completed
- [ ] Cache flushed
- [ ] Route53 weights updated to 10/90
- [ ] 30 minutes active monitoring completed
- [ ] 24-hour passive monitoring completed
- [ ] All go/no-go criteria met
- [ ] Rollback procedure documented and ready
- [ ] All Integration Verification criteria passed
- [ ] Stakeholder approval for next stage

---

**Story Created:** 2025-11-23
