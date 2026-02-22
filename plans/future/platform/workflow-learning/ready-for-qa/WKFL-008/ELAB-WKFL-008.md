# Elaboration Report: WKFL-008

**Date**: 2026-02-22
**Story ID**: WKFL-008
**Title**: Workflow Experimentation Framework
**Verdict**: CONDITIONAL PASS

## Summary

WKFL-008 defines a complete experimentation framework for testing workflow variations (e.g., fast-track elaboration, parallel review) via A/B testing with traffic splits, statistical significance computation, and rollout recommendations. The story is well-scoped, internally coherent, and appropriately sized. Critical issues (risk disclosure, AC-4 testability, integration point specification) have been resolved through autonomous amendment.

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story title and summary align with WKFL-001 dependency chain. WKFL-001 confirms WKFL-008 is a declared downstream consumer. |
| 2 | Internal Consistency | CONDITIONAL PASS | Low | Goals, ACs, and non-goals are coherent. Technical implementation patterns clearly documented. |
| 3 | Reuse-First Enforcement | PASS | — | `reuse_plan.must_reuse` explicitly calls out OUTCOME.yaml from WKFL-001 and existing story creation flow. |
| 4 | Ports & Adapters Compliance | N/A | — | Agent/YAML-based story; no ports & adapters requirement applies. |
| 5 | Local Testability | PASS | — | All 5 ACs now have concrete, locally-verifiable test steps. AC-6 (new) adds fixture-based verification of minimum sample guard. |
| 6 | Decision Completeness | PASS | — | All unresolved decisions addressed: AC-7 pins integration point to dev-documentation-leader.agent.md; per-variant storage approach documented. |
| 7 | Risk Disclosure | PASS | — | Three risks added (R-1: experiment interference; R-2: statistical validity at low N; R-3: variant tagging integrity) with severity ratings and mitigations. |
| 8 | Story Sizing | PASS | — | 7 ACs (under 8 threshold). 4 deliverables (schema, agent, command, routing hook) are related and non-independent. Within sizing bounds. |
| 9 | Subtask Decomposition | PASS | — | Implementation note section added to technical_notes covering 6 sequential phases with phase dependencies and verifiability. |

## Issues & Required Fixes

| # | Issue | Severity | Required Fix | Status |
|---|-------|----------|--------------|--------|
| 1 | No risk disclosure section | High | Add `risks:` block covering experiment interference, statistical validity at low N, and variant tagging integrity. | RESOLVED |
| 2 | AC-4 verification under-specified | Medium | Provide concrete local test step: fixture with 8 samples per variant, run /experiment-report, verify "insufficient data" output. | RESOLVED as AC-6 |
| 3 | Traffic routing integration point unnamed | Medium | Specify target agent file (dev-documentation-leader.agent.md) and integration step. | RESOLVED as AC-7 |
| 4 | Per-variant metric storage unspecified | Medium | Clarify storage mechanism (KB query vs. aggregated YAML vs. DB). | RESOLVED (KB-logged) |
| 5 | No subtasks section | Medium | Add subtasks covering schema, routing hook, metric collection, analysis agent, report command, E2E verification. | RESOLVED |

## Discovery Findings

### Gap 1: AC-4 Verification Under-Specified
**Finding**: No concrete fixture, command, or expected output defined for minimum sample guard behaviour.
**Decision**: Add as AC-6
**Rationale**: Blocks local testability of the enforcement mechanism for statistical validity. Without a verifiable test step, the guard could be omitted or incorrectly implemented.
**Resolution**: AC-6 added with explicit test procedure: Create EXPERIMENT-REPORT fixture with 8 samples per variant, run /experiment-report command, verify report omits statistical claims and outputs 'insufficient data' rather than a confidence-scored recommendation.

### Gap 2: Traffic Routing Integration Point Unnamed
**Finding**: Story describes routing pseudocode but does not name which agent file receives the hook.
**Decision**: Add as AC-7
**Rationale**: Blocks AC-2 implementation clarity. Integration point must be pinned to prevent implementer ambiguity and protect against silent tagging breakage (R-3).
**Resolution**: AC-7 added specifying dev-documentation-leader.agent.md as the integration target, with explicit acceptance criteria for experiment eligibility check and variant assignment at story creation time.

### Gap 3: Risk Disclosure Absent
**Finding**: No `risks:` section covering experiment interference, low-N statistical reliability, or variant tagging integrity.
**Decision**: Added to story.yaml
**Rationale**: Audit FAIL — risk disclosure is a structural requirement for implementation readiness.
**Resolution**: Three risk entries added to story.yaml:
- **R-1** (Experiment Interference, Medium): Two active experiments may compete for same story; mitigation is documented `break`-after-first-match rule and priority ranking convention.
- **R-2** (Statistical Invalidity at Low N, High): p-values on n=10 are unreliable; mitigation requires AC-6 guard to suppress claims below min_sample_size and surface N in all reports.
- **R-3** (Silent Variant Tagging Breakage, Medium): Refactoring could remove variant tagging step silently; mitigation pins integration to dev-documentation-leader.agent.md (AC-7) and suggests follow-on monitoring story.

### Enhancement 1: Per-Variant Metric Storage Convention
**Finding**: AC-3 says metrics are "queryable by variant" but does not commit to storage mechanism.
**Decision**: KB-logged (non-blocking)
**Pattern Logged**: Recommended approach is variant-tagged OUTCOME.yaml files queried directly, consistent with WKFL-001 patterns. If aggregation file introduced in future, name it `experiment-metrics.yaml` in `.claude/config/`.

### Enhancement 2: Phased Decomposition Pattern
**Finding**: No subtask decomposition provided for 4 deliverables.
**Decision**: KB-logged (non-blocking) + added to technical_notes
**Pattern Logged**: 6-phase ordering (schema → hook → metrics → agent → command → E2E verification) with phase dependencies and standalone verifiability guidance.

### Enhancement 3: Enum Validation for Recommendation Actions
**Finding**: Rollout action vocabulary defined but no schema validation.
**Decision**: KB-logged (non-blocking)
**Pattern Logged**: Implementer should add Zod enum for recommendation.action in experiment-analyzer agent to prevent silent no-ops from invalid action strings.

### Enhancement 4: Experiment Eligibility Collision Logging
**Finding**: Routing uses `break` after first match; future enhancement could detect multi-experiment collisions.
**Decision**: KB-logged (non-blocking enhancement)
**Pattern Logged**: Candidate WKFL-008 follow-on story to surface experimental design conflicts.

### Enhancement 5: Statistical Power Analysis Tool
**Finding**: min_sample_size: 10 is conservative; future tool could compute required N based on effect size.
**Decision**: KB-logged (non-blocking, high-effort deferred)
**Pattern Logged**: Depends on production data from 3-5 completed experiments; defer until effect size priors available.

### Enhancement 6: Experiment Lifecycle Notifications
**Finding**: No mechanism to notify when experiment reaches min_sample_size or ready for rollout.
**Decision**: KB-logged (non-blocking enhancement)
**Pattern Logged**: Natural companion to /experiment-report command; medium effort, medium impact.

### Enhancement 7: Cross-Experiment Trend Analysis
**Finding**: Once multiple experiments complete, higher-level view comparing workflow dimension improvements valuable.
**Decision**: KB-logged (non-blocking, depends on WKFL-006)
**Pattern Logged**: Successor story after WKFL-006 complete and 3+ experiments finished.

### Enhancement 8: Experiment History Archiving Convention
**Finding**: experiments.yaml will accumulate stopped/rolled-out experiments; no archive convention defined.
**Decision**: KB-logged (non-blocking)
**Pattern Logged**: Move completed experiments to experiments.archive.yaml; keep active experiments.yaml with status: active or paused only.

## KB Entries Created

8 KB entries logged in autonomous decider phase:

1. **Per-Variant Metric Storage Convention for WKFL-008** — Recommended approach: Query OUTCOME.yaml directly by experiment_variant field; avoid separate aggregation YAML unless performance requires it.
2. **Pattern: Phased Decomposition for Experimentation Framework Stories** — 6-phase ordering for schema + agent + command + hook deliverables with phase dependencies.
3. **Pattern: Enum Validation for Recommendation Actions in experiment-analyzer** — Zod enum for rollout action vocabulary to prevent silent no-ops.
4. **Opportunity: Experiment Eligibility Collision Logging** — Detect and log when story eligible for multiple active experiments; WKFL-008 follow-on candidate.
5. **Opportunity: Statistical Power Analysis Tool for Experiment Design** — Sample size calculator based on effect size and confidence level; defer until production data available.
6. **Opportunity: Experiment Lifecycle Notifications** — /experiment-status command to notify when variant crosses min_sample_size or reaches high confidence; companion to /experiment-report.
7. **Opportunity: Cross-Experiment Trend Analysis** — Higher-level view comparing workflow dimension improvements across completed experiments; successor after WKFL-006 + 3+ experiments.
8. **Pattern: Experiment History Archiving Convention** — Move completed experiments to experiments.archive.yaml; keep active experiments.yaml clean.

## Acceptance Criteria Summary

**Total ACs**: 7 (added 2 during elaboration)

- **AC-1**: Define experiments with traffic split — PASS
- **AC-2**: Tag stories with experiment variant — PASS
- **AC-3**: Track metrics per variant — PASS
- **AC-4**: Statistical comparison (min 10 stories per variant) — PASS
- **AC-5**: Generate rollout recommendation — PASS
- **AC-6** (NEW): Minimum sample guard produces 'insufficient data' output when sample < 10 per variant — PASS
- **AC-7** (NEW): Traffic routing hook integrated into dev-documentation-leader.agent.md at story creation time — PASS

## Proceed to Implementation?

**YES**

All audit failures resolved. Risk disclosure complete. AC testability verified. Integration points pinned. Story is ready for implementation pickup.

---

**Elaboration Completed**: 2026-02-22
**Elaboration Mode**: Autonomous
**Verdict**: CONDITIONAL PASS → Ready to Implement
