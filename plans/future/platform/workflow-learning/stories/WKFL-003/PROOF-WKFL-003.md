# PROOF-WKFL-003: Emergent Heuristic Discovery

**Story**: WKFL-003
**Status**: IMPLEMENTATION COMPLETE
**Date**: 2026-02-22
**Story Type**: Agent-Tooling (docs/config)

## Summary

WKFL-003 implements a data-driven heuristic discovery system that tracks decision outcomes from agent runs and proposes tier adjustments to the autonomy classification config. Three files were created: a Sonnet worker agent (`heuristic-evolver.agent.md`) that collects outcomes, computes per-pattern success rates, and emits promotion/demotion proposals; a KB entry schema (`decision-outcome-schema.md`) defining all required tracking fields; and a proposal output template (`HEURISTIC-PROPOSALS.yaml`). All five acceptance criteria are satisfied, and the integrity constraint — that `decision-classification.yaml` is never auto-modified — is enforced both by explicit agent rules and verified via `git diff`.

## Acceptance Criteria Verification

### AC-1: Decision Outcome Tracking Schema
- **Status**: PASS
- **Evidence**: `.claude/schemas/decision-outcome-schema.md`, Field Descriptions table (lines 70-97). All seven required fields are present and marked `Required: Yes`:
  - `pattern` — Regex pattern that triggered classification
  - `auto_accepted` — `true` = autonomous, `false` = escalated
  - `user_outcome` — enum: `confirmed | overridden | modified`
  - `tier` — Autonomy tier (1-5)
  - `story_id` — Story identifier
  - `decision_id` — Unique decision identifier from DECISIONS.yaml
  - `timestamp` — ISO 8601 timestamp

### AC-2: Success Rate per Pattern (min 5 samples)
- **Status**: PASS
- **Evidence**: `.claude/agents/heuristic-evolver.agent.md`, Phase 2 (line 138): "For each pattern with **minimum 5 samples**:". Non-Negotiables (line 364): "**Minimum 5 samples required** - Patterns with fewer samples are skipped". Test Case 5 (line 539) specifies that a pattern with 3 outcomes produces output: "Insufficient samples (3 < 5)". `.claude/config/HEURISTIC-PROPOSALS.yaml` lines 90-99 show the `insufficient_samples` output section that records skipped patterns with the reason.
  - Success rate formula (lines 140-146):
    ```
    confirmed / total
    where confirmed = count(user_outcome === "confirmed")
    ```

### AC-3: Propose Promotions (>95% success)
- **Status**: PASS
- **Evidence**: `.claude/agents/heuristic-evolver.agent.md`, Phase 3 Promotion Logic (line 158): "**Rule**: If success_rate > 95%, propose tier decrease (higher autonomy)." Success Criteria (lines 35-38): "Patterns with >95% confirmation rate are promoted (higher autonomy)". `.claude/config/HEURISTIC-PROPOSALS.yaml` line 25 header comment: "# Promotion logic: success_rate > 95% → propose tier - 1 (single-step)". Example promotion entry in that file shows `success_rate: 0.957` triggering a Tier 3 → Tier 2 proposal.

### AC-4: Propose Demotions (<80% success)
- **Status**: PASS
- **Evidence**: `.claude/agents/heuristic-evolver.agent.md`, Phase 4 Demotion Logic (lines 185-186):
  - "If success_rate < 80%: propose tier increase (lower autonomy)"
  - "If success_rate < 50%: propose tier increase by 2 (severe issues)"

  Non-Negotiables (line 365): "**Single-step tier changes** - Exception: <50% success allows 2-step demotion". `.claude/config/HEURISTIC-PROPOSALS.yaml` lines 43-45 header comments confirm both demotion levels:
  ```
  # Demotion logic:
  #   - 50% <= success_rate < 80% → propose tier + 1 (single-step)
  #   - success_rate < 50% → propose tier + 2 (two-step, severe)
  ```

### AC-5: Proposals Only, No Auto-Apply
- **Status**: PASS
- **Evidence** (three independent controls):
  1. `.claude/agents/heuristic-evolver.agent.md` line 25 (header CRITICAL note): "This agent generates PROPOSALS ONLY. It NEVER modifies `decision-classification.yaml` directly."
  2. Phase 6 Verify Integrity (lines 263-270): agent runs `git diff .claude/config/decision-classification.yaml` and ABORTs if any diff is detected. Error Handling table (line 381): "decision-classification.yaml modified | ABORT with message 'Integrity violation: decision-classification.yaml was modified'".
  3. `.claude/config/HEURISTIC-PROPOSALS.yaml` lines 8-9: "# IMPORTANT: These are PROPOSALS only. Do NOT auto-apply. # Human review required before updating decision-classification.yaml."
  4. Live `git diff HEAD -- .claude/config/decision-classification.yaml` command confirmed empty output — file unmodified from HEAD.

## Deliverables

| File | Status | Purpose |
|------|--------|---------|
| `.claude/agents/heuristic-evolver.agent.md` | Created | Sonnet worker agent — data collection, success rate calculation, promotion/demotion logic, proposal generation, integrity verification |
| `.claude/schemas/decision-outcome-schema.md` | Created | KB entry schema defining all required decision outcome fields with validation rules |
| `.claude/config/HEURISTIC-PROPOSALS.yaml` | Created | Proposal output template with promotion/demotion example entries, analysis metadata, and human reviewer instructions |

## Known Deviations

- Implementation files were committed to main in PR #356 (commit `522a8c94`) before formal workflow artifacts (PLAN.yaml, CHECKPOINT.yaml, SCOPE.yaml, EVIDENCE.yaml) were generated. All deliverables verified against ACs by direct file inspection. EVIDENCE.yaml was created retroactively.
- No unit or integration tests apply — agent-tooling story produces markdown and YAML documentation files only. Functional verification was performed via inspection of agent specification text and test cases embedded within the agent file.

## Test Summary

| Suite | Pass | Fail |
|-------|------|------|
| Unit | 0 | 0 |
| Functional (AC inspection) | 5 | 0 |
| Integration | 0 | 0 |
| E2E | exempt | — |

## E2E Gate

**Status**: EXEMPT
**Reason**: Agent-tooling story — creates markdown agent, schema, and YAML config files only. No UI, API, or database surface.

## Next Steps

- `/dev-code-review plans/future/platform/workflow-learning WKFL-003`
