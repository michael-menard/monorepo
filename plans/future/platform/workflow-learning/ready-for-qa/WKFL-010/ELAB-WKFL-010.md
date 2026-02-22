# Elaboration Report - WKFL-010

**Date**: 2026-02-22
**Verdict**: CONDITIONAL PASS

## Summary

The Improvement Proposal Generator story is sound in concept and scope, with clear non-goals and a well-considered reuse plan. Five MVP-critical gaps were identified and resolved as new acceptance criteria (AC-6 through AC-9), and AC-5 was revised for measurability. The story is ready to proceed to implementation with these additions.

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | stories.index.md lists WKFL-010 as "Improvement Proposal Generator" with exact match to story.yaml scope |
| 2 | Internal Consistency | CONDITIONAL PASS | Medium | AC-5 revised to be concretely verifiable within story bounds (baseline after 3 runs, not long-term emergence) |
| 3 | Reuse-First | PASS | — | reuse_plan correctly mandates reuse of all WKFL component outputs and KB tools |
| 4 | Ports & Adapters | PASS | — | No API endpoints; agent files and commands are the only adapters |
| 5 | Local Testability | CONDITIONAL PASS | Medium | AC-6 requires data query contract in improvement-proposer.agent.md with explicit KB tag queries and YAML file path patterns; AC-7 requires ROI formula; these provide concrete verification targets |
| 6 | Decision Completeness | FAIL → RESOLVED | High | Three blockers resolved: (1) data query contract added to Technical Notes and AC-6; (2) ROI formula defined in Technical Notes and AC-7; (3) cold-start behavior documented in Technical Notes and AC-8 |
| 7 | Risk Disclosure | FAIL → RESOLVED | High | Risks section added to WKFL-010.md covering: upstream data gaps with cold-start mitigation, INFR-001 dependency with YAML fallback, meta-learning bootstrap problem deferred to post-3-run baseline, KB write conflict window noted as low risk |
| 8 | Story Sizing | PASS | — | 9 ACs (5 original + 4 new), no API endpoints, agent-only scope, no frontend work |
| 9 | Subtask Decomposition | FAIL → DEFERRED | High | Per WKFL-009 precedent, subtask decomposition deferred to SETUP phase. Implementation agent will decompose into subtasks covering: (ST-1) aggregate inputs per data query contract, (ST-2) compute ROI scores, (ST-3) generate IMPROVEMENT-PROPOSALS-{date}.md, (ST-4) write proposal tracking KB entries, (ST-5) meta-learning KB query/update and baseline capture |

## Issues & Required Fixes

| # | Issue | Severity | Required Fix | Status |
|---|-------|----------|--------------|--------|
| 1 | AC-5 not verifiable within story scope | Medium | Replace with "Baseline established after 3 runs" proxy | RESOLVED |
| 2 | ROI score formula undefined | High | Define numeric mappings and formula in Technical Notes | RESOLVED |
| 3 | Data query contract missing | High | Specify KB tag queries, YAML file paths per source in Technical Notes | RESOLVED |
| 4 | Cold-start behavior undefined | High | Document skip-with-log behavior in Technical Notes and AC-8 | RESOLVED |
| 5 | No risks section | High | Added to WKFL-010.md with 4 material risks | RESOLVED |
| 6 | No subtask decomposition | High | Deferred to SETUP phase per precedent (WKFL-009) | DEFERRED |
| 7 | Dependency list incomplete | Medium | Added WKFL-003, WKFL-004, WKFL-008 to dependencies and AC-9 | RESOLVED |
| 8 | Local testing plan absent | Medium | AC-6, AC-7, AC-8 provide concrete verification targets | RESOLVED |

## Discovery Findings

### MVP Gaps Identified

| # | Finding | Decision | AC Added |
|---|---------|----------|----------|
| 1 | Data query contract for each input source not defined | Add as AC | AC-6 |
| 2 | ROI score formula undefined | Add as AC | AC-7 |
| 3 | Cold-start / missing-dependency behavior undefined | Add as AC | AC-8 |
| 4 | Dependency list incomplete (WKFL-003, WKFL-004, WKFL-008 missing) | Add as AC | AC-9 |

### AC-5 Revision

Original: "acceptance rate of proposals improves over time" (not verifiable within story bounds)

Revised: "Baseline proposal acceptance rate established after first 3 runs" with concrete deliverable `PROPOSAL-ACCEPTANCE-BASELINE.yaml` (testable within story scope)

### Enhancement Opportunities (Non-Blocking, Queued for KB)

| # | Finding | Category | Notes |
|---|---------|----------|-------|
| 1 | AC-5 measurement window undefined (rolling 4-week, n>=10) | future-work | Deferred; baseline established first |
| 2 | No deduplication logic for repeated proposals | edge-case | Deferred |
| 3 | No post-implementation validation loop | future-work | Deferred |
| 4 | Rejection reason vocabulary not enumerated | edge-case | Deferred |
| 5 | Slack/notification integration for high-ROI proposals | integration | Deferred |
| 6 | Proposal diffing (delta_from_prior field) | ux-polish | Deferred |
| 7 | Dashboard rendering for proposals (browser-renderable index.html) | future-work | Deferred with telemetry dashboard work |
| 8 | Cross-proposal dependency detection (blocks field + topological sort) | future-work | Deferred; high effort |
| 9 | Confidence scoring mirroring WKFL-006 pattern confidence | enhancement | Deferred |

### Follow-up Stories Suggested

None at this time. Enhancement items are logged to KB for future iterations.

### Items Marked Out-of-Scope

None. All out-of-scope items remain as documented in story.yaml (auto-implementing changes, non-workflow changes, real-time generation).

### Summary

- **ACs added**: 4 (AC-6, AC-7, AC-8, AC-9)
- **ACs revised**: 1 (AC-5 rewritten for measurability)
- **Audit issues resolved**: 5 (Decision Completeness, Risk Disclosure, Internal Consistency, Dependency List, Local Testability)
- **Audit issues deferred**: 1 (Subtask Decomposition → SETUP phase per WKFL-009 precedent)
- **Enhancement findings logged**: 9 (non-blocking; queued for KB)
- **Mode**: autonomous
- **Verdict**: CONDITIONAL PASS

## Proceed to Implementation?

**YES** - All MVP-critical gaps resolved. Story ready for SETUP phase with implementation team decomposing subtasks. Conditional pass due to AC-5 revision (non-breaking) and Subtask Decomposition deferral (precedent-based per WKFL-009).
