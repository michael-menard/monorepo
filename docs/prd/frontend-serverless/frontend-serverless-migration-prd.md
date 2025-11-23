# Epic: Frontend Serverless Migration

## Status

Draft - Awaiting Stakeholder Approval

## Epic Overview

**Epic ID:** FRONTEND-SERVERLESS-MIGRATION
**Timeline:** 3-4 weeks
**Priority:** HIGH
**Dependencies:** Serverless backend deployed and validated in staging

### Problem Statement

The frontend React application (`lego-moc-instructions-app`) currently connects to the deprecated Express.js backend (`lego-projects-api`). The backend has been successfully migrated to AWS serverless architecture (`lego-api-serverless` with Lambda + API Gateway), but the frontend still points to Express. This blocks new feature releases, increases AWS costs (running dual backends), and creates operational overhead.

### Goal

Safely migrate the frontend to connect to the serverless backend using a feature flag + staged rollout approach, enabling instant rollback and gradual user exposure with zero user disruption.

### Success Criteria

- ✅ Frontend deployed with feature flag for Express ↔ Serverless toggle
- ✅ 100% of production traffic migrated to serverless
- ✅ Error rate remains <2% (within baseline)
- ✅ P95 latency <600ms
- ✅ Zero forced user logouts
- ✅ Express backend decommissioned within 1 week post-cutover

---

## Epic Stories

### Phase 1: Preparation & Infrastructure (Week 1)

**Story 6.1:** Feature Flag Infrastructure Setup
**Story 6.2:** Environment Configuration Updates
**Story 6.3:** Local Development Environment with SST
**Story 6.4:** API Parity Validation & Documentation

### Phase 2: Frontend Code Updates (Week 2)

**Story 6.5:** RTK Query Endpoint Updates for Serverless
**Story 6.6:** Authentication Flow Validation (Cognito JWT)
**Story 6.7:** File Upload Updates (Presigned S3 URLs)
**Story 6.8:** Error Handling Standardization

### Phase 3: Testing & Validation (Week 2-3)

**Story 6.9:** Staging Environment Validation
**Story 6.10:** E2E Test Updates for Serverless
**Story 6.11:** Performance Benchmarking

### Phase 4: Production Rollout (Week 3-4)

**Story 6.12:** Production Deployment with Feature Flag
**Story 6.13:** Staged Rollout (10% → 25% → 50% → 100%)
**Story 6.14:** Monitoring & Observability Setup
**Story 6.15:** Express Backend Decommissioning

---

## Story Breakdown

- **Total Stories:** 15
- **Critical Path:** Stories 6.1 → 6.2 → 6.5 → 6.9 → 6.12 → 6.13
- **Parallelizable:** Stories 6.3, 6.4 (can run alongside 6.2)
- **Dependencies:** Story 6.14 (monitoring) should be deployed before 6.13 (rollout)

---

## Risk Mitigation Summary

| Risk ID  | Description                          | Mitigation Story |
| -------- | ------------------------------------ | ---------------- |
| Risk 1.1 | API Gateway URL configuration errors | Story 6.2, 6.9   |
| Risk 2.1 | JWT token format incompatibility     | Story 6.6, 6.9   |
| Risk 3.2 | File upload failures (>10MB)         | Story 6.7        |
| Risk 5.1 | Missing serverless endpoints         | Story 6.4, 6.9   |
| Risk 7.1 | Error response format differences    | Story 6.8        |
| Risk 8.2 | No rollback plan                     | Story 6.1, 6.12  |

---

## Stakeholder Alignment

**Approvals Required:**

- [ ] Frontend Lead - Confirm team capacity and technical approach
- [ ] DevOps Lead - Approve rollout strategy and monitoring plan
- [ ] QA Lead - Confirm testing capacity for staging validation
- [ ] Product Manager - Approve timeline and scope
- [ ] Security Engineer - Review JWT validation and CORS configuration

**Communication Plan:**

- **Kickoff Meeting:** Day 1 of Week 1 (align on timeline, roles, success criteria)
- **Daily Standups:** 15-min sync during migration period
- **Go/No-Go Reviews:** Before each rollout stage (10%, 25%, 50%, 100%)
- **Retrospective:** 1 week post-cutover

---

## Timeline Milestones

**Week 1 End:** Feature flag deployed, environment configs updated, staging ready
**Week 2 End:** Frontend code updates complete, staging validation passed
**Week 3 End:** Production rollout to 50%, monitoring stable
**Week 4 End:** 100% cutover, Express decommissioned

---

## Resources

**Project Brief:** `docs/brief-frontend-serverless-migration.md`
**Risk Analysis:** See Project Brief, Appendix A
**Architecture Docs:** `docs/architecture/source-tree.md`, `docs/architecture/tech-stack.md`
**Backend API Routes:** `apps/api/lego-api-serverless/sst.config.ts` (lines 598-1521)

---

**Epic Version:** 1.0
**Last Updated:** 2025-11-23
**Status:** Ready for Story Creation
