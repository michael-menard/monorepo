# Proof Document - WKFL-003: Emergent Heuristic Discovery

**Generated**: 2026-02-07T00:00:00Z
**Story**: WKFL-003
**Evidence Source**: EVIDENCE.yaml

## Acceptance Criteria Verification

| AC | Description | Status | Evidence |
|----|-------------|--------|----------|
| AC-1 | Track decision outcomes with fields: pattern, auto_accepted, user_outcome, tier, story_id, decision_id, timestamp | PASS | decision-outcome-schema.md defines all required fields with comprehensive documentation including examples, KB query patterns, and integration points |
| AC-2 | Compute success rate per pattern (minimum 5 samples required) | PASS | heuristic-evolver.agent.md documents success rate calculation formula (confirmed / total) and enforces minimum 5 sample requirement with template for insufficient_samples tracking |
| AC-3 | Propose promotion when success rate > 95% | PASS | Promotion logic documented in heuristic-evolver.agent.md with single-step tier decrease, complete rule set, and concrete example showing 95.7% success rate promotion |
| AC-4 | Propose demotion when success rate < 80% | PASS | Demotion logic documented in heuristic-evolver.agent.md with single-step (80%-50%) and two-step (<50%) rules, plus examples demonstrating both severities |
| AC-5 | All changes are proposals, not auto-applied | PASS | Agent explicitly states role as proposal-only in Non-Negotiables section, Phase 6 verifies decision-classification.yaml unchanged via git diff, HEURISTIC-PROPOSALS.yaml header mandates human review before applying |

## Files Created/Modified

| File | Action | Purpose |
|------|--------|---------|
| .claude/schemas/decision-outcome-schema.md | created | Decision outcome tracking schema with field definitions, examples, integration points, KB query patterns, and evolution notes |
| .claude/agents/heuristic-evolver.agent.md | created | Heuristic evolver agent definition with complete execution flow, tier logic (promotion/demotion), KB queries, error handling, and future enhancements |
| .claude/config/HEURISTIC-PROPOSALS.yaml | created | Proposal output template with examples for promotions, demotions, no-change patterns, insufficient samples, and human review workflow |

## Key Decisions

1. **Single-step tier changes by default** - Gradual evolution reduces risk of over-correction, with exception for <50% success allowing 2-step demotion for severe issues
2. **Cap promotions at Tier 2** - Tier 1 requires exceptional track record; first-time promotions should not jump directly to Tier 1
3. **Tier 4 patterns never promoted/demoted** - Destructive actions should always escalate regardless of success rate; safety takes precedence over autonomy
4. **Minimum 5 samples required** - Statistical significance requires adequate sample size to prevent premature tier changes based on limited data
5. **Include rationale and example stories in every proposal** - Transparency and traceability for human review; reviewers need context to approve/reject proposals

## Known Deviations

- No unit tests - agent/config-only story per story_type: infra
- E2E exempt - infrastructure story type (no app code to test)
- WKFL-002 dependency listed but implementation continued per user instruction to force-continue
- KB tools (kb_search, kb_query) referenced in agent but not implemented yet - will be available when KB is implemented

## E2E Gate

- Status: exempt
- Reason: story_type: infra - agent/config files only, no app code to test

## Quality Gates

| Gate | Status |
|------|--------|
| Linting | pass |
| Type Check | n/a |
| Build | n/a |
| Unit Tests | exempt |
| Integration Tests | exempt |
| E2E Tests | exempt |

## Integration Points

**Producers (future)**:
- dev-plan-leader (logs decisions to DECISIONS.yaml)
- dev-implementation-worker (logs decisions to DECISIONS.yaml)
- dev-fix-worker (logs decisions to DECISIONS.yaml)
- qa-verify-leader (logs decisions to DECISIONS.yaml)

**Consumers**:
- heuristic-evolver.agent.md (this story - analyzes decision_outcome entries)
- calibration.agent.md (WKFL-002 - correlates decision overhead with token usage)
- pattern-miner.agent.md (WKFL-006 - identifies cross-story decision patterns)
- workflow-retro.agent.md (future - retrospective analysis)

**Dependencies**:
- Knowledge Base (KB) implementation - required for kb_search queries
- decision-classification.yaml - source of truth for current tier rules
- autonomy-tiers.md - tier system reference documentation

## Verdict

**PASS** - All five acceptance criteria verified and met. Decision outcome tracking schema defined, success rate computation with statistical safeguards implemented, promotion/demotion logic fully specified with concrete examples, and proposal-only safeguards in place with decision-classification.yaml integrity verified unchanged. Infrastructure story deliverables complete with no code to test.

## Evidence Hash

```
story_id: WKFL-003
evidence_version: 1
evidence_timestamp: 2026-02-07T00:00:00Z
ac_pass_count: 5/5
files_created: 3
quality_gates_pass: 1 (linting)
quality_gates_exempt: 5 (type_check, build, unit_tests, integration_tests, e2e_tests)
```
