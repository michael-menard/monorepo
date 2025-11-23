# Story 1.16: Express Backend Decommissioning

**Epic:** Epic 1: Frontend Serverless Migration

**Story ID:** 1.16

**Priority:** Medium

**Estimated Effort:** 3 story points

---

## User Story

**As a** DevOps engineer,
**I want** to safely decommission the Express backend infrastructure,
**so that** we realize cost savings and eliminate dual-maintenance burden.

---

## Acceptance Criteria

**AC1**: 1-week wait after 100% cutover with zero rollbacks and stable metrics

**AC2**: Final data validation: PostgreSQL, Redis, S3 contain no Express-specific data dependencies

**AC3**: Express backend shutdown:

- Stop EC2/ECS instances or disable service
- Remove Route53 DNS record for Express endpoint (retain 0-weight record for 1 week as safety)
- Archive Express codebase to GitHub with "DEPRECATED" tag

**AC4**: Cost savings validated: $200/month reduction in AWS bill confirmed in next billing cycle

**AC5**: Documentation updated:

- Remove Express API references from developer guides
- Update architecture diagrams to show only Serverless backend
- Archive Express-specific troubleshooting docs

**AC6**: Post-migration cleanup:

- Remove `MIGRATION_MODE` env var from Serverless backend
- Flush `v1:*` Redis cache keys
- Remove `/config.json` feature flag (embed API Gateway URL in frontend build for future deployments)

**AC7**: Post-migration retrospective conducted, lessons learned documented in `docs/retrospectives/frontend-serverless-migration.md` for future reference

**AC8**: Support team briefed on migration, runbook shared, common troubleshooting scenarios documented

---

## Integration Verification

**IV1**: Express infrastructure terminated: No running instances, no ongoing costs

**IV2**: Application fully functional: All features work without Express backend available

**IV3**: Team confirmation: Engineering and DevOps agree migration is complete and successful

---

## Definition of Done

- [ ] 1-week wait completed
- [ ] Data validation completed
- [ ] Express backend shut down
- [ ] Route53 record removed
- [ ] Codebase archived with DEPRECATED tag
- [ ] Cost savings validated
- [ ] Documentation updated
- [ ] Post-migration cleanup completed
- [ ] Retrospective conducted and documented
- [ ] Support team briefed
- [ ] All Integration Verification criteria passed
- [ ] Migration declared complete

---

**Story Created:** 2025-11-23
