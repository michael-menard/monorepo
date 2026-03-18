---
created: 2026-01-15
updated: 2026-03-14
version: 4.0.0
type: orchestrator
agents:
  [
    'qa-verify-setup-leader.agent.md',
    'qa-verify-verification-leader.agent.md',
    'qa-verify-completion-leader.agent.md',
    'evidence-judge.agent.md',
  ]
---

/qa-verify-story {STORY_ID}

> **Fresh context recommended.** Run `/clear` before this command when verifying a new story. Prior session context can cause phantom test results and incorrect gate decisions.

Post-Implementation Verification orchestrator. Final quality gate before DONE. Do NOT implement directly.

## Usage

```
/qa-verify-story WISH-001
```

## Output

Updates: `verification` KB artifact (verdict + gate sections)

## Phases

| #   | Agent                                    | Model  | Signal                                       |
| --- | ---------------------------------------- | ------ | -------------------------------------------- |
| 0   | `qa-verify-setup-leader.agent.md`        | haiku  | SETUP COMPLETE                               |
| 1   | `qa-verify-verification-leader.agent.md` | sonnet | VERIFICATION COMPLETE                        |
| 1.5 | `evidence-judge.agent.md`                | haiku  | EVIDENCE-JUDGE COMPLETE / BLOCKED (advisory) |
| 2   | `qa-verify-completion-leader.agent.md`   | haiku  | QA PASS / QA FAIL                            |

## Step 0.6: Claim Story in KB

1. Call `kb_update_story_status({ story_id: "{STORY_ID}", state: "in_qa", phase: "qa_verification" })`
2. **Guard:** If already `in_qa`, STOP: "Story {STORY_ID} is already being QA'd by another agent."

## Execution

For each phase:

```
Task tool:
  subagent_type: "general-purpose"
  model: <from table>
  description: "Phase N QA-Verify {STORY_ID}"
  prompt: |
    Read instructions: .claude/agents/<agent>
    Story ID: {STORY_ID}
```

- Wait for signal
- BLOCKED/FAILED → stop, report (except Phase 1.5 — see below)
- COMPLETE → next phase

### Phase 1.5: Evidence Judge (Phase 4 — Advisory)

> **Advisory only.** This phase NEVER blocks QA completion. All signals route to: log + continue.

After Phase 1 (verification-leader) completes and before Phase 2 (completion-leader), spawn the evidence-judge agent:

```
Task tool:
  subagent_type: "general-purpose"
  model: haiku
  description: "Phase 1.5 evidence-judge {STORY_ID}"
  prompt: |
    Read instructions: .claude/agents/evidence-judge.agent.md
    Story ID: {STORY_ID}

    Signal when done: EVIDENCE-JUDGE COMPLETE, EVIDENCE-JUDGE COMPLETE WITH WARNINGS, or EVIDENCE-JUDGE BLOCKED
```

Wait for signal:

- `EVIDENCE-JUDGE BLOCKED` → Log warning: `"QA Advisory: evidence-judge BLOCKED — continuing to Phase 2"`. Proceed to Phase 2.
- `ac-verdict.json` absent after completion → Log warning: `"QA Advisory: ac-verdict.json not found — continuing to Phase 2"`. Proceed to Phase 2.
- `EVIDENCE-JUDGE COMPLETE` or `EVIDENCE-JUDGE COMPLETE WITH WARNINGS` → Read `ac-verdict.json` from `tree/story/{STORY_ID}/_implementation/ac-verdict.json`.

**Verdict routing (all paths are advisory — never block):**

| `overall_verdict` | Action                                                                                                                                                                |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PASS`            | Log: `"Evidence Judge: all ACs have verifiable proof"`. Proceed to Phase 2.                                                                                           |
| `CHALLENGE`       | Add advisory note to QA report: `"QA Advisory [WINT-4120 Phase 1.5]: One or more ACs have weak evidence. See ac-verdict.json for details."`. Proceed to Phase 2.      |
| `FAIL`            | Surface as QA issue in report: `"QA Issue [WINT-4120 Phase 1.5]: One or more ACs have no verifiable evidence. See ac-verdict.json for details."`. Proceed to Phase 2. |

**Key rules for Phase 1.5:**

- ALL verdicts are ADVISORY in v1.0 — NEVER hard-block QA completion
- `overall_verdict: FAIL` is informational only; it does not cause `QA FAIL`
- BLOCKED signals always route to: log warning + continue to Phase 2
- The existing qa-verify-completion-leader owns the final `QA PASS / QA FAIL` decision

## Error

Report: "{STORY_ID} blocked at Phase N: <reason>"

(Phase 1.5 BLOCKED does NOT trigger this error path — log warning and continue.)

## Done

On `QA PASS`:

- Update KB: `kb_update_story_status({ story_id: "{STORY_ID}", state: "completed", phase: "qa_verification" })`
- Story status: ✅ `uat`
- Log telemetry (fire-and-forget — never blocks workflow):
  ```
  /telemetry-log {STORY_ID} qa-verify-story qa success
  ```
  If the call returns null or throws, log a warning and continue.

On `QA FAIL`:

- Update KB: `kb_update_story_status({ story_id: "{STORY_ID}", state: "failed_qa", phase: "qa_verification" })`
- Story status: ⚠️ `failed-qa`
- Log telemetry (fire-and-forget — never blocks workflow):
  ```
  /telemetry-log {STORY_ID} qa-verify-story qa failure
  ```
  If the call returns null or throws, log a warning and continue.

**Next (on FAIL)**: `/dev-fix-story {STORY_ID}`

## Phase 4 Reference

### Evidence Judge (Phase 1.5)

| Component      | Agent file                | Model | Output file       | Signal                                                           |
| -------------- | ------------------------- | ----- | ----------------- | ---------------------------------------------------------------- |
| evidence-judge | `evidence-judge.agent.md` | haiku | `ac-verdict.json` | `EVIDENCE-JUDGE COMPLETE` / `COMPLETE WITH WARNINGS` / `BLOCKED` |

**Signal routing (all paths are advisory — never block QA):**

| Signal / Condition                                             | Route                                              |
| -------------------------------------------------------------- | -------------------------------------------------- |
| `EVIDENCE-JUDGE BLOCKED`                                       | Log warning, proceed to Phase 2                    |
| `ac-verdict.json` absent                                       | Log warning, proceed to Phase 2                    |
| `EVIDENCE-JUDGE COMPLETE [WITH WARNINGS]`, verdict `PASS`      | Log success, proceed to Phase 2                    |
| `EVIDENCE-JUDGE COMPLETE [WITH WARNINGS]`, verdict `CHALLENGE` | Add advisory note to QA report, proceed to Phase 2 |
| `EVIDENCE-JUDGE COMPLETE [WITH WARNINGS]`, verdict `FAIL`      | Surface as QA issue in report, proceed to Phase 2  |

**Advisory format:**

- CHALLENGE: `"QA Advisory [WINT-4120 Phase 1.5]: {details from ac-verdict.json}"`
- FAIL: `"QA Issue [WINT-4120 Phase 1.5]: {details from ac-verdict.json}"`

**Graceful degradation:** Stories without `EVIDENCE.yaml` (pre-Phase-4 infra or docs stories) complete normally. evidence-judge emits `COMPLETE WITH WARNINGS` with all-REJECT verdicts for missing EVIDENCE.yaml, which is handled by the signal routing table above (as an advisory FAIL note).

## Ref

`.claude/docs/qa-verify-story-reference.md`

## Abort / Error Recovery

If interrupted after Step 0.6, release manually:
`kb_update_story_status({ story_id: "{STORY_ID}", state: "ready_for_qa" })`
