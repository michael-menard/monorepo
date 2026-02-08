---
doc_type: story
title: "WKFL-003: Emergent Heuristic Discovery"
story_id: WKFL-003
story_prefix: WKFL
status: elaboration
phase: adaptation
created_at: "2026-02-06T17:00:00-07:00"
updated_at: "2026-02-07T18:11:00Z"
depends_on: [WKFL-002, WKFL-004]
blocks: [WKFL-010]
estimated_points: 3
estimated_tokens: 60000
---

# WKFL-003: Emergent Heuristic Discovery

## Context

As agents make decisions across stories, we accumulate data on which patterns are consistently auto-accepted versus overridden by users. This creates an opportunity to evolve our autonomy tiers based on actual behavioral data rather than upfront heuristics.

Currently, `.claude/config/decision-classification.yaml` defines fixed autonomy tiers (1-5) that categorize decisions as auto-accept, notify-only, or require-approval. However, we have no mechanism to learn from decision outcomes and adjust these classifications over time.

**Dependencies:**
- **WKFL-002**: Provides calibration data and initial decision tracking
- **WKFL-004**: Provides user feedback on decisions

**Blocks:**
- **WKFL-010**: Pattern evolution requires heuristic discovery foundation

## Goal

Create a system that:
1. Tracks auto-accept success rate per decision pattern
2. Proposes tier promotions when success rate > 95%
3. Proposes tier demotions when success rate < 80%
4. Updates decision-classification.yaml with proposals (not auto-apply)

This enables data-driven evolution of autonomy boundaries while maintaining human oversight on tier changes.

## Non-goals

- Auto-applying tier changes (all changes remain proposals)
- Learning across projects (scoped to this monorepo)
- Real-time tier updates (batch analysis only)
- Pattern mining (handled by WKFL-006)

## Scope

**In Scope:**
- Decision outcome tracking schema
- `heuristic-evolver.agent.md` (sonnet model)
- Tier adjustment proposals in `HEURISTIC-PROPOSALS.yaml`
- Integration with `.claude/config/decision-classification.yaml`
- Success rate calculation per pattern (minimum 5 samples)

**Out of Scope:**
- Auto-applying changes to tier classifications
- Pattern mining and discovery (WKFL-006)
- Initial calibration data (WKFL-002 provides this)

**Files to Create:**
- `.claude/agents/heuristic-evolver.agent.md`
- `.claude/schemas/decision-outcome-schema.md`
- `.claude/config/HEURISTIC-PROPOSALS.yaml` (output location)

**Files to Modify:**
- None (proposals only, no auto-apply)

## Acceptance Criteria

- [ ] **AC-1**: Track decision outcomes with fields: pattern, auto_accepted, user_outcome (confirmed/overridden), tier, story_id, decision_id, timestamp
  - **Verification**: KB entries have all required fields and are queryable by pattern

- [ ] **AC-2**: Compute success rate per pattern (minimum 5 samples required)
  - **Verification**: Only patterns with 5+ samples have computed success rates

- [ ] **AC-3**: Propose promotion when success rate > 95%
  - **Verification**: `HEURISTIC-PROPOSALS.yaml` contains promotion entries with rationale

- [ ] **AC-4**: Propose demotion when success rate < 80%
  - **Verification**: `HEURISTIC-PROPOSALS.yaml` contains demotion entries with rationale

- [ ] **AC-5**: All changes are proposals, not auto-applied
  - **Verification**: `.claude/config/decision-classification.yaml` unchanged after agent run

## Reuse Plan

**Must Reuse:**
- Calibration data from WKFL-002
- Feedback data from WKFL-004
- Existing autonomy tier definitions in `.claude/config/decision-classification.yaml`
- KB search/write patterns from existing agents

**May Create:**
- `heuristic-evolver.agent.md` - new agent for tier evolution
- Decision outcome tracking schema
- `HEURISTIC-PROPOSALS.yaml` - proposal output format

**Dependencies:**
- WKFL-002 must be completed (provides initial calibration data)
- WKFL-004 must be completed (provides user feedback mechanism)

## Architecture Notes

### Decision Outcome Schema

```yaml
type: decision_outcome
pattern: "loading.*state|skeleton"
story_id: WISH-2045
decision_id: dec-042
tier: 3
auto_accepted: true
user_outcome: confirmed  # or overridden
timestamp: 2026-02-06T15:30:00Z
```

Stored in KB via `kb_add_lesson` or similar mechanism for queryability.

### Success Rate Calculation

```
success_rate = confirmed_decisions / total_decisions

where:
  confirmed_decisions = count(user_outcome == "confirmed")
  total_decisions = count(all decisions for pattern)
```

**Minimum sample size:** 5 decisions per pattern before computing rates.

### Promotion/Demotion Logic

```
If success_rate > 0.95 AND samples >= 5:
  Propose: Promote to higher autonomy (e.g., tier 3 → tier 1)

If success_rate < 0.80 AND samples >= 5:
  Propose: Demote to lower autonomy (e.g., tier 1 → tier 3)
```

**Tier meanings:**
- Tier 1: Auto-accept (highest autonomy)
- Tier 2: Notify only
- Tier 3: Require approval (lowest autonomy)
- Tier 4-5: Reserved for high-risk decisions

### HEURISTIC-PROPOSALS.yaml Format

```yaml
generated_at: 2026-02-06T16:00:00Z
analyzed_stories: [WISH-2045, WISH-2046, WISH-2047]
total_decisions: 142

promotions:
  - pattern: "loading.*state|skeleton"
    current_tier: 3
    proposed_tier: 1
    success_rate: 0.97
    samples: 23
    rationale: "Users consistently accept loading state additions"
    example_stories: [WISH-2045, WISH-2046]

demotions:
  - pattern: "breaking.*api"
    current_tier: 2
    proposed_tier: 4
    success_rate: 0.12
    samples: 8
    rationale: "Users often override API breaking change auto-decisions"
    example_stories: [WISH-2047]
```

### Integration with decision-classification.yaml

The heuristic evolver agent:
1. Reads current tier definitions from `.claude/config/decision-classification.yaml`
2. Queries KB for decision outcome data
3. Computes success rates per pattern
4. Generates proposals in `HEURISTIC-PROPOSALS.yaml`
5. **Does NOT modify** `decision-classification.yaml` (human reviews proposals first)

## Test Plan

### Unit Tests

**Test 1: Decision Outcome Tracking**
- Given: A decision with pattern "loading.*state" is auto-accepted
- When: User confirms the decision
- Then: KB entry created with `user_outcome: confirmed`

**Test 2: Success Rate Calculation (Sufficient Samples)**
- Given: Pattern "loading.*state" has 10 decisions, 9 confirmed, 1 overridden
- When: Heuristic evolver runs
- Then: Success rate = 0.90

**Test 3: Success Rate Calculation (Insufficient Samples)**
- Given: Pattern "new.*pattern" has 3 decisions
- When: Heuristic evolver runs
- Then: No success rate computed, pattern skipped

**Test 4: Promotion Proposal**
- Given: Pattern "loading.*state" has success_rate = 0.97, samples = 23, current_tier = 3
- When: Heuristic evolver runs
- Then: Promotion proposal created: tier 3 → tier 1

**Test 5: Demotion Proposal**
- Given: Pattern "breaking.*api" has success_rate = 0.12, samples = 8, current_tier = 2
- When: Heuristic evolver runs
- Then: Demotion proposal created: tier 2 → tier 4

**Test 6: No Auto-Apply**
- Given: Heuristic evolver generates promotion/demotion proposals
- When: Agent completes
- Then: `.claude/config/decision-classification.yaml` is unchanged

### Integration Tests

**Test 7: End-to-End Heuristic Evolution**
1. WKFL-002 tracks 50 decisions across 5 patterns
2. WKFL-004 captures user feedback (confirm/override)
3. WKFL-003 analyzes outcomes
4. Proposals generated in `HEURISTIC-PROPOSALS.yaml`
5. Human reviews proposals
6. Manual update to `decision-classification.yaml` if approved

**Test 8: KB Queryability**
- Given: 100 decision outcomes stored in KB
- When: Query for pattern = "loading.*state"
- Then: All matching decisions returned with outcome data

### Manual Verification

**Verify AC-1**: Decision outcome tracking
```bash
# Query KB for decision outcomes
kb_search({ query: "decision_outcome loading.*state", limit: 10 })
# Verify fields: pattern, auto_accepted, user_outcome, tier, story_id
```

**Verify AC-2**: Minimum sample size
```bash
# Run heuristic evolver
/heuristic-evolve
# Check that patterns with < 5 samples are skipped
```

**Verify AC-3**: Promotion proposals
```bash
cat .claude/config/HEURISTIC-PROPOSALS.yaml
# Verify promotions section has entries with success_rate > 0.95
```

**Verify AC-4**: Demotion proposals
```bash
cat .claude/config/HEURISTIC-PROPOSALS.yaml
# Verify demotions section has entries with success_rate < 0.80
```

**Verify AC-5**: No auto-apply
```bash
git diff .claude/config/decision-classification.yaml
# Should show no changes after heuristic evolver runs
```

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-07_

### MVP Gaps Resolved

No MVP-critical gaps identified. All acceptance criteria are implementable.

**Core Journey Verified:**
| # | AC | Status | Notes |
|---|-----|--------|-------|
| 1 | Decision outcome tracking | ✓ | Schema defined, KB integration clear |
| 2 | Success rate calculation | ✓ | Min 5 samples requirement specified |
| 3 | Promotion proposals | ✓ | Thresholds and format defined |
| 4 | Demotion proposals | ✓ | Logic and thresholds specified |
| 5 | Non-destructive (proposals only) | ✓ | No auto-apply, human review required |

### Medium-Severity Clarifications (Auto-Resolved)

| # | Finding | Resolution | Action |
|---|---------|------------|--------|
| 1 | Tier numbering inconsistency (1-3 vs 1-5) | Use full 1-5 tier system from autonomy-tiers.md | Update story markdown & agent during SETUP |
| 2 | Promotion/demotion step logic unclear | Single-step tier changes with safety bounds (see DECISIONS.yaml) | Document in heuristic-evolver.agent.md |

### Non-Blocking Items (Logged to KB)

| # | Finding | Category | KB Entry | Quick Win? |
|---|---------|----------|----------|-----------|
| 1 | No confidence intervals on success rates | statistical_rigor | gap-1 | — |
| 2 | Single minimum sample threshold (5) | statistical_rigor | gap-2 | — |
| 3 | No decay/recency weighting | performance | gap-3 | — |
| 4 | Hard-coded thresholds (95%, 80%) | configuration | gap-4 | YES |
| 5 | No handling of pattern evolution | edge_case | gap-5 | — |
| 6 | Missing rollback mechanism | edge_case | gap-6 | — |
| 7 | Interactive proposal review UI | ux_polish | enh-1 | — |
| 8 | A/B test tier changes | integration | enh-2 | — |
| 9 | Pattern similarity clustering | performance | enh-3 | — |
| 10 | Success rate trending | observability | enh-4 | — |
| 11 | Auto-generate rationale improvements | ux_polish | enh-5 | — |
| 12 | Integration with WKFL-008 experiments | integration | enh-6 | — |
| 13 | Pattern lifecycle tracking | observability | enh-7 | — |
| 14 | Multi-dimensional success metrics | statistical_rigor | enh-8 | — |

**Total KB entries**: 14 (currently deferred due to KB write access unavailable; stored in DEFERRED-KB-WRITE.yaml)

### Summary

- ACs added: 0
- KB entries deferred: 14
- Mode: autonomous
- Verdict: CONDITIONAL PASS (ready to proceed to SETUP phase)

### SETUP Phase Priority Actions

1. Update story Architecture Notes to reflect 1-5 tier system (not 1-3)
2. Document promotion/demotion step logic in heuristic-evolver.agent.md
3. Add example KB entries showing decision_outcome format for developer reference

**Quick Win Opportunity**: Gap #4 (configurable thresholds) is low effort and adds flexibility. Consider implementing during SETUP if time permits.

## Token Budget

**Estimated:** 60,000 tokens
**Enforcement:** Warning (log if exceeded)

**Breakdown:**
- Agent creation: 15,000 tokens
- Schema definition: 5,000 tokens
- KB integration: 10,000 tokens
- Testing: 15,000 tokens
- Documentation: 10,000 tokens
- Buffer: 5,000 tokens

## Reality Baseline

**Existing Patterns:**
- `.claude/config/decision-classification.yaml` defines tier structure
- KB integration exists via `kb_search` and similar tools
- Agent spawning patterns established in other workflows

**Constraints:**
- Must not auto-apply tier changes (all proposals only)
- Minimum 5 samples required for statistical significance
- Success rate thresholds: >95% promote, <80% demote

**Reuse Opportunities:**
- Leverage existing KB tools for decision outcome storage
- Follow agent patterns from WKFL-001 (retro agent)
- Use YAML proposal format similar to workflow recommendations
