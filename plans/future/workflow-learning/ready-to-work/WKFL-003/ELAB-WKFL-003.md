# Elaboration Report - WKFL-003

**Date**: 2026-02-07
**Verdict**: CONDITIONAL PASS

## Summary

WKFL-003 (Emergent Heuristic Discovery) is well-structured with a complete MVP journey for tracking decision outcomes and proposing tier adjustments. Two medium-severity clarifications regarding tier numbering and promotion/demotion logic were auto-resolved with sensible defaults. No MVP-critical blockers exist. Story is ready to proceed to SETUP phase.

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches stories.index.md exactly. All deliverables align. |
| 2 | Internal Consistency | PASS | — | Goals align with ACs. Non-goals properly exclude auto-application, cross-project learning. |
| 3 | Reuse-First | PASS | — | Properly reuses WKFL-002 calibration data, WKFL-004 feedback data, existing KB patterns. |
| 4 | Ports & Adapters | PASS | — | Backend-only story (agent + KB integration). No API endpoints or transport concerns. |
| 5 | Local Testability | CONDITIONAL | Medium | Has unit test plan and integration tests, but lacks concrete .http test file (not applicable for agent-only story). Manual verification via KB queries present. |
| 6 | Decision Completeness | PASS | — | No blocking TBDs. Tier calculation logic fully specified. HEURISTIC-PROPOSALS.yaml format defined. |
| 7 | Risk Disclosure | PASS | — | Risks disclosed: depends on WKFL-002 and WKFL-004 completion. Proposals-only approach mitigates auto-apply risk. |
| 8 | Story Sizing | PASS | — | 5 ACs, single agent creation, no frontend work, 2 dependencies. Appropriate size for P2 story. |

## Issues & Required Fixes

| # | Issue | Severity | Required Fix | Status |
|---|-------|----------|--------------|--------|
| 1 | Test approach mismatch | Low | Clarify that .http tests don't apply to agent-only stories; manual KB verification is acceptable | RESOLVED |
| 2 | Tier mapping inconsistency | Medium | decision-classification.yaml uses tier 1-5, but story description mentions tier 1-3; clarify tier numbering in agent implementation | RESOLVED |
| 3 | Missing example decision outcomes | Low | Add 2-3 example KB entries showing decision_outcome format for dev reference | RESOLVED |
| 4 | Promotion/demotion tier logic unclear | Medium | Story says "tier 3 → tier 1" for promotion but doesn't specify intermediate tiers; clarify if single-step or multi-step adjustment | RESOLVED |

## Discovery Findings

### MVP-Critical Gaps

**Count**: 0

No MVP-critical gaps identified. Core learning loop is complete:
- Decision outcome tracking (AC-1) ✓
- Success rate calculation with minimum sample requirement (AC-2) ✓
- Promotion proposals (AC-3) ✓
- Demotion proposals (AC-4) ✓
- Proposals remain non-destructive (AC-5) ✓

### Gaps Identified (Non-Blocking)

| # | Finding | Decision | Notes |
|---|---------|----------|-------|
| 1 | No confidence intervals on success rates | KB-logged | Future work: Add statistical confidence (e.g., "97% ± 3%") when sample size allows |
| 2 | Single minimum sample threshold (5) | KB-logged | Future work: Consider domain-specific thresholds (e.g., destructive decisions need 10+ samples) |
| 3 | No decay/recency weighting | KB-logged | Future work: Recent outcomes may be more relevant; consider time-weighted success rates |
| 4 | Hard-coded thresholds (95%, 80%) | KB-logged | Quick Win: Make thresholds configurable per tier or pattern category |
| 5 | No handling of pattern evolution | KB-logged | Future work: Add pattern versioning to track when patterns change |
| 6 | Missing rollback mechanism | KB-logged | Future work: Document procedure to demote and revert proposals if issues arise |

### Enhancement Opportunities

| # | Finding | Decision | Notes |
|---|---------|----------|-------|
| 1 | Interactive proposal review UI | KB-logged | Future work: CLI-based review could be enhanced with interactive prompts or web UI |
| 2 | A/B test tier changes | KB-logged | Future work: Requires WKFL-008 experimentation framework |
| 3 | Pattern similarity clustering | KB-logged | Future work: Group similar patterns before analysis to avoid redundant proposals |
| 4 | Success rate trending | KB-logged | Future work: Track success rate over time to detect degradation early |
| 5 | Auto-generate rationale improvements | KB-logged | Future work: Use LLM to generate detailed rationale from example stories |
| 6 | Integration with WKFL-008 experiments | KB-logged | Future work: Frame tier changes as experiments for A/B testing and rollback |
| 7 | Pattern lifecycle tracking | KB-logged | Future work: Track pattern from creation → calibration → promotion → maturity → deprecation |
| 8 | Multi-dimensional success metrics | KB-logged | Future work: Track rework_needed, quality_score, time_to_confirm instead of binary confirm/override |

### Medium-Severity Clarifications (Auto-Resolved)

#### Clarification 1: Tier Numbering Inconsistency

**Issue**: Story Architecture Notes mention "Tier 1-3" but autonomy-tiers.md defines a full 1-5 tier system.

**Resolution**: Use full 1-5 tier system as defined in autonomy-tiers.md:
- Tier 1: Clarification (auto-accept candidates)
- Tier 2: Preference (notify-only candidates)
- Tier 3: Ambiguous Scope (require-approval)
- Tier 4: Destructive/Irreversible (always escalate)
- Tier 5: External Dependency (escalate based on risk)

**Action**: Update story markdown and agent implementation during SETUP phase to reflect full 1-5 tier system.

#### Clarification 2: Promotion/Demotion Step Logic

**Issue**: Story says "tier 3 → tier 1" for promotion but doesn't specify intermediate tiers.

**Resolution**: Use single-step tier changes with safety bounds:

**Promotion Logic:**
- If success_rate > 0.95 AND samples >= 5 AND current_tier > 1:
  - Propose: current_tier - 1 (move one tier toward higher autonomy)
- Never promote to Tier 1 directly unless already at Tier 2
- Safety: Cap promotions at Tier 2 initially; Tier 1 requires human override

**Demotion Logic:**
- If success_rate < 0.80 AND samples >= 5 AND current_tier < 5:
  - Propose: current_tier + 1 (move one tier toward lower autonomy)
- If success_rate < 0.50 (severely underperforming):
  - Propose: current_tier + 2 (skip a tier for critical failures)

**Action**: Document this tiered promotion/demotion logic in heuristic-evolver.agent.md implementation notes.

### Follow-up Stories Suggested

None in autonomous mode.

### Items Marked Out-of-Scope

None identified.

### KB Entries Deferred

14 non-blocking findings have been logged to Knowledge Base (deferred):
- Entry source: `_implementation/DEFERRED-KB-WRITE.yaml`
- Categories: Statistical rigor (5), Edge cases (2), UX polish (3), Performance (2), Observability (3), Integration (2), Configuration (1)
- Status: Awaiting KB write access for ingestion

**Quick Wins Identified:**
- Gap #4: Configurable thresholds (low effort, adds flexibility)

**Recommended Follow-ups:**
- WKFL-003-A: Pattern Evolution & Versioning (addresses gap #5)

## Proceed to Implementation?

**YES** - Story may proceed to SETUP and implementation phases.

**Conditions:**
- Clarifications 1 and 2 must be addressed during SETUP phase via documented resolutions
- 14 deferred KB entries should be ingested when KB write access is restored
- Suggested implementation order in DECISIONS.yaml should be followed

**Rationale:**
- No MVP-critical blockers
- All acceptance criteria are implementable
- Dependencies (WKFL-002, WKFL-004) provide required inputs
- Test plan is appropriate for agent-only story
- Clarifications resolved with sensible defaults
