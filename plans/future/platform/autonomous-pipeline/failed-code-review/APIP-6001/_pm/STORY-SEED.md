---
generated: "2026-03-01"
baseline_used: "pipeline-audit-2026-03-01"
baseline_date: "2026-03-01"
lessons_loaded: true
adrs_loaded: false
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: APIP-6001

## Reality Context

### Baseline Status
- Loaded: yes (pipeline audit)
- Date: 2026-03-01
- Source: Audit of stuck stories in autonomous-pipeline (APIP-1050, APIP-3050, APIP-5002, etc.)

### Problem Statement

The autonomous pipeline (`implement-stories.sh`) has a systemic failure mode: **stories advance between phases without the required output artifacts being validated**. This causes three stuck-story patterns:

1. **Phantom Completion**: A phase runs, agent exits cleanly, but the required artifact (REVIEW.yaml, EVIDENCE.yaml, VERIFICATION.yaml) is never written. The story moves forward and gets stuck at the next phase gate.

2. **No Commits, No Evidence**: Implementation runs but doesn't commit code to the worktree. `generate_evidence()` can't produce EVIDENCE.yaml without commits, so the story is stuck in `needs-code-review` indefinitely.

3. **Failed and Forgotten**: Stories fail code review with `--max-retries=0` (the default). No fix cycle is attempted. Stories rot in `failed-code-review` permanently.

### Current Recovery Mechanisms (Insufficient)

The script has some recovery logic:
- `generate_evidence()` auto-generates EVIDENCE.yaml from worktree if missing
- Missing REVIEW.yaml at QA stage moves story back to `needs-code-review`
- Cycle detection at MAX_TRANSITIONS=12

**Gaps**:
- Recovery only triggers AFTER the story has already moved to the wrong stage
- No pre-transition validation ("is this artifact present and valid BEFORE moving?")
- Default `--max-retries=0` means failed stories never get a fix attempt
- No schema validation on artifact contents (e.g., REVIEW.yaml exists but has no `verdict` field)

### Affected Stories (Current)

| Story | Stuck Pattern | Current Stage |
|-------|--------------|---------------|
| APIP-1050 | No commits/no evidence | needs-code-review |
| APIP-5002 | Failed and forgotten | failed-code-review |
| APIP-5006 | Failed and forgotten | failed-code-review |
| APIP-1040 | Failed and forgotten | failed-code-review |
| APIP-2030 | Failed and forgotten | failed-code-review |
| APIP-3010 | Failed and forgotten | failed-code-review |

---

## Story Seed

### Title

Pipeline Phase Gate Validation

### Description

**Context**: The autonomous pipeline advances stories through 7 phases (ready-to-work → in-progress → needs-code-review → ready-for-qa → UAT → done), with `failed-code-review` and `failed-qa` as retry loops. Each phase produces specific artifacts that downstream phases depend on.

**Problem**: Phase transitions happen without validating that required artifacts were produced. Stories move forward into states where they can't proceed, creating "stuck stories" that require manual intervention.

**Proposed Solution**: Add artifact validation gates at every phase boundary in `implement-stories.sh`:

1. **Pre-transition gates**: Before `move_story_to()` is called, validate that the outgoing phase produced its required artifacts with correct schema.

2. **Artifact schema validation**: Each artifact type (EVIDENCE.yaml, REVIEW.yaml, VERIFICATION.yaml) has required fields. Validate not just existence but content.

3. **Gate failure behavior**: If gate fails, retry the phase (up to max-retries) instead of moving the story forward.

4. **Default max-retries=1**: Change from 0 to 1, giving every failed phase one automatic fix attempt before giving up.

### Acceptance Criteria

- [ ] AC-1: A `validate_phase_gate()` function exists in implement-stories.sh that takes (story_id, from_stage, to_stage) and returns 0 only if all required artifacts for the transition are present and valid
- [ ] AC-2: Gate validation rules are defined for each transition:
  - impl → needs-code-review: EVIDENCE.yaml exists, has `touched_files` with count > 0, has `commands_run` array
  - review → ready-for-qa: REVIEW.yaml exists, has `verdict` field with value "pass" or "conditional-pass"
  - review → failed-code-review: REVIEW.yaml exists, has `verdict` field with value "fail" or "concerns"
  - qa → UAT: VERIFICATION.yaml exists, has `verdict` field with value "pass"
  - qa → failed-qa: VERIFICATION.yaml exists, has `verdict` field with value "fail"
- [ ] AC-3: Every call to `move_story_to()` in the state machine is preceded by `validate_phase_gate()`. If validation fails, the phase is retried (up to max-retries) instead of advancing
- [ ] AC-4: Default `--max-retries` changed from 0 to 1 for all phase types
- [ ] AC-5: When a gate validation fails, a structured log entry is emitted: `GATE FAIL: {story_id} ({from} → {to}): missing {artifact} field {field}`
- [ ] AC-6: When max-retries is exhausted after gate failures, story is moved to the appropriate failure stage (failed-code-review or failed-qa) with a GATE-FAILURE.yaml artifact recording what was missing
- [ ] AC-7: Existing stories that already passed through the pipeline are not blocked by new gates (backward compatibility)
- [ ] AC-8: Gate validation is also applied in `implement-dispatcher.sh` for stories it dispatches

### Non-Goals

- Changing the artifact formats themselves (EVIDENCE.yaml, REVIEW.yaml, etc.)
- Adding new pipeline phases
- Modifying the agent skills (/dev-implement-story, /dev-code-review, etc.)
- KB-filesystem reconciliation (covered by APIP-6003)
- Stuck story detection/recovery (covered by APIP-6002)

### Technical Approach

The implementation modifies `implement-stories.sh` and `implement-dispatcher.sh`:

1. Add `validate_artifact_schema()` — checks a YAML file for required fields using grep/yq
2. Add `validate_phase_gate()` — calls artifact validation for the specific transition
3. Wrap all `move_story_to()` calls with gate validation
4. Add retry logic: on gate failure, re-run the phase command, then re-validate
5. Change default max-retries from 0 to 1

### Reuse Plan

- Existing `validate_artifact()` function in implement-stories.sh (extend it)
- Existing `has_evidence()` and `is_reviewed()` helper functions (refactor into gate framework)
- YAML field extraction via grep (bash 3.2 compatible, no yq dependency)
