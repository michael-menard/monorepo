---
doc_type: story
title: "WKFL-010: Improvement Proposal Generator"
story_id: WKFL-010
story_prefix: WKFL
status: ready-to-work
phase: experimentation
created_at: "2026-02-06T17:00:00-07:00"
updated_at: "2026-02-22T00:00:00Z"
depends_on: [WKFL-006, WKFL-002, WKFL-003, WKFL-004, WKFL-008]
blocks: []
estimated_tokens: 55000
---

# WKFL-010: Improvement Proposal Generator

## Context

As the workflow learning system matures with calibration (WKFL-002), heuristics (WKFL-003), feedback (WKFL-004), pattern mining (WKFL-006), and experiments (WKFL-008) producing outputs, there is no mechanism to aggregate those insights into actionable workflow improvements. Without a weekly synthesis step, the self-improvement loop remains incomplete — insights accumulate but are never converted into proposals.

**Dependencies:**
- **WKFL-006**: Pattern mining provides anti-patterns and agent hints
- **WKFL-002**: Calibration provides accuracy data and threshold recommendations
- **WKFL-003**: Heuristics provides tier promotion/demotion candidates
- **WKFL-004**: Feedback provides recurring false positive patterns
- **WKFL-008**: Experiments provides winning/failed experiment results

## Goal

Generate improvement proposals by:
1. Aggregating insights from calibration, patterns, experiments
2. Generating prioritized proposals with effort/impact ratings
3. Tracking proposal outcomes (accepted/rejected/implemented)
4. Learning from acceptance patterns to improve proposals

## Non-goals

- Auto-implementing proposals
- Proposals for non-workflow changes
- Real-time proposal generation

## Scope

**In Scope:**
- `improvement-proposer.agent.md` (sonnet)
- `/improvement-proposals` command
- `IMPROVEMENT-PROPOSALS-{date}.md` output
- Proposal tracking (accepted/rejected/implemented)
- Integration with all learning components
- Meta-learning from proposal acceptance

**Out of Scope:**
- Auto-implementing changes
- Code changes (workflow config only)

## Acceptance Criteria

- [ ] **AC-1**: Aggregate inputs from calibration, patterns, experiments
  - **Verification**: Proposer queries all learning data sources per the data query contract defined in Technical Notes

- [ ] **AC-2**: Generate proposals with effort/impact ratings
  - **Verification**: `IMPROVEMENT-PROPOSALS-{date}.md` has `Impact` and `Effort` fields for each proposal

- [ ] **AC-3**: Prioritize by impact/effort ratio
  - **Verification**: Proposals sorted by ROI score computed via the formula defined in Technical Notes

- [ ] **AC-4**: Track: proposed, accepted, rejected, implemented
  - **Verification**: Proposal tracking KB entries queryable by `status:proposed`, `status:accepted`, `status:rejected`, `status:implemented`

- [ ] **AC-5**: Baseline proposal acceptance rate established after first 3 runs
  - **Verification**: After 3 `/improvement-proposals` runs, a `PROPOSAL-ACCEPTANCE-BASELINE.yaml` exists in the feature directory with acceptance rate, total proposed, accepted, rejected counts; long-term improvement tracked from this baseline
  _Added by autonomous elaboration_

- [ ] **AC-6**: Data query contract per source is defined and implemented
  - **Verification**: `improvement-proposer.agent.md` specifies exact KB tag queries, YAML file path patterns, and field mappings for each of the 5 input sources (calibration, patterns, experiments, heuristics, feedback); AC-1 is not completable without this
  _Added by autonomous elaboration_

- [ ] **AC-7**: ROI score formula is defined and deterministic
  - **Verification**: Technical Notes defines numeric mappings: `impact: high=3, medium=2, low=1`; `effort_inverse: low=3, medium=2, high=1`; `roi_score = (impact_value * effort_inverse_value) / 1.0` (scale 1–9); AC-3 is not completable without this
  _Added by autonomous elaboration_

- [ ] **AC-8**: Cold-start and missing-dependency behavior is documented
  - **Verification**: `improvement-proposer.agent.md` documents skip-with-log behavior for each source when no data is available (e.g. WKFL-008 not yet run); no source failure causes the entire command to fail; fallback output notes missing sources
  _Added by autonomous elaboration_

- [ ] **AC-9**: Dependency list in story.yaml includes all 5 input sources
  - **Verification**: `story.yaml` `dependencies:` field contains WKFL-002, WKFL-003, WKFL-004, WKFL-006, WKFL-008; scheduler gates correctly
  _Added by autonomous elaboration_

## Technical Notes

### Input Sources

The proposer aggregates from:

1. **Calibration (WKFL-002)**
   - Agents with low accuracy
   - Threshold adjustment recommendations
   - Query: KB tag `category:calibration` + `stage:dev`; field: `accuracy`, `threshold_recommendation`

2. **Patterns (WKFL-006)**
   - Anti-patterns to address
   - Agent hints to inject
   - Query: KB tag `category:pattern-mining` + `pattern-type:anti-pattern`; YAML: `PATTERN-REPORT-{date}.yaml`

3. **Experiments (WKFL-008)**
   - Winning experiments to roll out
   - Failed experiments to stop
   - Query: KB tag `category:experiment` + `status:concluded`; YAML: `EXPERIMENT-RESULTS-{date}.yaml`; skip-with-log if WKFL-008 not yet run

4. **Heuristics (WKFL-003)**
   - Tier promotions/demotions
   - Query: KB tag `category:heuristics` + `action:promote` or `action:demote`

5. **Feedback (WKFL-004)**
   - Recurring false positives
   - Missing check patterns
   - Query: KB tag `category:feedback` + `type:false-positive`; minimum 3 occurrences to qualify

### ROI Score Formula

```
impact_value:        high=3, medium=2, low=1
effort_inverse:      low=3, medium=2, high=1
roi_score = (impact_value * effort_inverse) / 1.0   # range: 1.0–9.0
```

### Cold-Start / Missing-Dependency Behavior

When a source has no data:
- Log: `[SKIP] Source {name} has no data (dependency not yet run or no entries found)`
- Continue with remaining sources
- Note in output: `## Data Sources — Missing: {list}`
- Do NOT fail the command if at least 1 source returns data
- If ALL sources return no data: output `IMPROVEMENT-PROPOSALS-{date}.md` with a `## No Proposals` section and reason

### IMPROVEMENT-PROPOSALS-{date}.md Format

```markdown
# Workflow Improvement Proposals - 2026-02-15

Generated: 2026-02-15T10:00:00Z
Data period: 2026-02-01 to 2026-02-14
Stories analyzed: 23

## High Priority

### [P-001] Add lint pre-check to backend-coder

**Source:** Pattern mining (WKFL-006)
**Evidence:** routes.ts fails lint 78% of first reviews (15 samples)

**Proposal:**
Add step to dev-implement-backend-coder.agent.md:
```
Before committing, run: pnpm lint apps/api/
If errors, fix before proceeding.
```

**Impact:** High (reduce 78% of lint failures)
**Effort:** Low (single agent edit)
**ROI Score:** 9.0/9.0

**Status:** proposed

---

## Tracking Summary

| Week | Proposed | Accepted | Rejected | Implemented |
|------|----------|----------|----------|-------------|
| W1 | 5 | 3 | 1 | 2 |
```

### Proposal Tracking Schema

```yaml
type: proposal
id: P-001
title: "Add lint pre-check to backend-coder"
source: pattern_mining
evidence_id: pattern-042
created_at: 2026-02-15
status: proposed  # proposed | accepted | rejected | implemented
accepted_at: null
implemented_at: null
rejection_reason: null
impact: high
effort: low
roi_score: 9.0
tags:
  - proposal
  - source:pattern
  - status:proposed
  - priority:high
```

### Meta-Learning

Track acceptance patterns:
- Which sources generate most accepted proposals?
- Which effort levels get rejected?
- What evidence thresholds correlate with acceptance?

After 3 runs, capture baseline in `PROPOSAL-ACCEPTANCE-BASELINE.yaml`.

## Risks

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| 1 | Upstream data gaps — one or more of WKFL-002/003/004/006/008 has produced no data yet | High | Cold-start behavior documented in Technical Notes (AC-8); skip-with-log per source |
| 2 | INFR-001 dependency — proposal tracking KB schema may not exist | Medium | Fall back to YAML-file-based tracking if KB proposal type is unavailable |
| 3 | Meta-learning bootstrap — cannot learn from acceptance patterns until sufficient proposals have been proposed and acted on | Medium | AC-5 defers improvement claim to after 3 runs; baseline established before asserting improvement |
| 4 | KB write conflicts — concurrent proposal tracking writes during active story runs | Low | Proposals are weekly batch; conflict window is low; document that `/improvement-proposals` should not run during active story implementation |

## Reuse Plan

**Must Reuse:**
- Data from all WKFL components (per data query contract in Technical Notes)
- KB for proposal tracking
- Existing markdown patterns

**May Create:**
- `improvement-proposer.agent.md`
- `/improvement-proposals` command
- Proposal tracking schema
- `PROPOSAL-ACCEPTANCE-BASELINE.yaml` after 3 runs
- Meta-learning on acceptance

## Token Budget

**Estimated:** 55,000 tokens
**Enforcement:** Warning

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-22_

### MVP Gaps Resolved

| # | Finding | Resolution | AC Added |
|---|---------|------------|----------|
| 1 | Data query contract for each input source not defined — AC-1 unimplementable | Add as AC | AC-6 |
| 2 | ROI score formula undefined — AC-3 unimplementable | Add as AC | AC-7 |
| 3 | Cold-start / missing-dependency behavior undefined | Add as AC | AC-8 |
| 4 | Dependency list incomplete (WKFL-003, WKFL-004, WKFL-008 missing) | Add as AC | AC-9 |

### AC-5 Revision

AC-5 rewritten from "acceptance rate improves over time" (not verifiable within story) to "baseline established after 3 runs" (concrete and testable within story bounds).

### Non-Blocking Items (Queued for KB)

| # | Finding | Category |
|---|---------|----------|
| 1 | AC-5 measurement window undefined (rolling 4-week, n>=10) | future-work |
| 2 | No deduplication logic for repeated proposals | edge-case |
| 3 | No post-implementation validation loop | future-work |
| 4 | Rejection reason vocabulary not enumerated | edge-case |
| 5 | Slack/notification integration for high-ROI proposals | integration |
| 6 | Proposal diffing (delta_from_prior field) | ux-polish |
| 7 | Dashboard rendering for proposals (browser-renderable index.html) | future-work |
| 8 | Cross-proposal dependency detection (blocks field + topological sort) | future-work |
| 9 | Confidence scoring mirroring WKFL-006 pattern confidence | enhancement |

### Summary
- ACs added: 4 (AC-6, AC-7, AC-8, AC-9)
- AC-5 revised: rewritten for measurability
- KB entries queued: 9
- Audit issues resolved: 5
- Mode: autonomous
- Verdict: CONDITIONAL PASS
