# Follow-Ups: APIP

Deferred items from epic elaboration on 2026-02-25T14:30:00Z.

## Deferred Findings

| ID | Issue | Reason | Action | Review By |
|---|-------|--------|--------|-----------|
| SEC-003-story | Security Scanning Gate in Code Review Graph | APIP-1050 review graph already scopes security review worker; verify scope during /elab-story before creating separate story | Confirm APIP-1050 AC explicitly includes SAST/scanning gate during /elab-story for APIP-1050 | 2026-03-15 |
| SEC-001-full-auth | Full auth/authz layer for LangGraph Platform | Internal tooling on dedicated internal server; network isolation sufficient for MVP; defer to Phase 2 external access | Document network boundary in APIP-5003 AC; schedule full auth/authz for Phase 2 when external access planned | 2026-04-30 |

## Deferred Concerns (Downgraded)

| ID | Concern | Original Severity | Action | Owner |
|---|---------|-------------------|--------|-------|
| QA-001 | Stories lack unit, integration, E2E test specification detail | Blocker → Medium | Test spec detail enforced at /elab-story level for each story | QA |
| QA-006 | No E2E test plan for critical path | Blocker → Medium | Created APIP-5002 as P1 story; schedule before Phase 0 completion | QA |
| SEC-001 | No formal auth/authz layer defined | Blocker → Low | Network isolation + APIP-5003 sufficient for MVP; Phase 2 for full auth/authz | Platform |
| SEC-003 | Model-generated code merges without explicit security review gate | Blocker → Low | APIP-1050 already covers; verify during elaboration | Dev |

## Action Items Summary

| ID | Action | Owner | Status |
|---|--------|-------|--------|
| ENG-001 | Schema review and versioning strategy must gate APIP-1020 implementation start | Dev | Open |
| COST-CONTROL-001 | Define circuit breaker enforcement in APIP-0040 AC before APIP-1030 starts | Dev | Open |
| PLAT-001 | Provision dedicated server as part of Foundation phase; gate APIP-0030 on availability | Platform | Open (APIP-5006 created) |
| PLAT-002 | Document checkpoint schema and Aurora integration before Phase 0 completion | Dev | Open (APIP-5007 created) |
| UX-001 | Add APIP-5005 (Minimal CLI) to Phase 1 story list | Dev | Complete ✓ |
| QA-001 | Enforce test coverage targets and integration scenarios in each /elab-story output | QA | Open |
| QA-006 | Create APIP-5002 (E2E Test Plan) as P1 story and schedule before Phase 0 completion | QA | Complete ✓ |
| QA-002 | Define AC verification prompt template, evidence mapping, false-positive thresholds in /elab-story for APIP-1060 | QA | Open (at /elab-story time) |
| SEC-001 | Document network boundary and access controls in APIP-5003 AC; schedule auth/authz for Phase 2 | Platform | Open (APIP-5003 created) |
| SEC-003 | Confirm APIP-1050 AC explicitly includes SAST/scanning gate; defer APIP-5008 until verified | Dev | Open (defer until /elab-story for APIP-1050) |

## Next Review

- Review deferred SEC-003-story during APIP-1050 elaboration
- Review deferred SEC-001-full-auth during Phase 2 planning (external access scope)
- Verify all action items closed during story elaboration phase (/elab-story)
