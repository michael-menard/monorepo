---
created: 2026-01-24
updated: 2026-01-24
version: 1.0.0
command: /qa-verify-story
---

# QA Verify Story - Reference

## Architecture

```
/qa-verify-story STORY-XXX
    │
    ├─→ Phase 0: qa-verify-setup-leader.agent.md (haiku)
    │       ├─→ Validate preconditions (4 gates)
    │       ├─→ Move story to QA directory
    │       ├─→ Update status to in-qa
    │       └─→ Create AGENT-CONTEXT.md
    │
    ├─→ Phase 1: qa-verify-verification-leader.agent.md (sonnet)
    │       ├─→ 1. AC Verification (HARD GATE)
    │       ├─→ 2. Test Quality Review (HARD GATE)
    │       ├─→ 3. Test Coverage Check (HARD GATE)
    │       ├─→ 4. Test Execution (HARD GATE)
    │       ├─→ 5. Proof Quality Check
    │       ├─→ 6. Architecture Compliance
    │       └─→ Update VERIFICATION.yaml
    │
    └─→ Phase 2: qa-verify-completion-leader.agent.md (haiku)
            ├─→ Write gate decision to VERIFICATION.yaml
            ├─→ Update story status (uat or needs-work)
            ├─→ Move story to UAT or back to in-progress
            ├─→ Spawn Index Updater (on PASS only)
            └─→ Log tokens via /token-log
```

## Output Format

All agents follow `.claude/agents/_shared/lean-docs.md`:
- YAML over markdown prose
- Skip empty sections
- Structured data (tables/lists, not paragraphs)

Primary artifact: `_implementation/VERIFICATION.yaml`

## Artifacts

| File | Created By | Purpose |
|------|------------|---------|
| `AGENT-CONTEXT.md` | setup-leader | Context for all phases |
| `VERIFICATION.yaml` | verification-leader | qa_verify + gate sections |
| `stories.index.md` | index-updater | Updated on PASS |

## VERIFICATION.yaml Structure

```yaml
# Existing from /dev-code-review
code_review:
  verdict: PASS
  lint: PASS
  types: PASS
  findings: []

# Added by /qa-verify-story
qa_verify:
  verdict: PASS | FAIL
  tests_executed: true
  test_results:
    unit: { pass: N, fail: N }
    integration: { pass: N, fail: N }
    e2e: { pass: N, fail: N }
    http: { pass: N, fail: N }
  coverage: NN%
  coverage_meets_threshold: true | false
  test_quality:
    verdict: PASS | FAIL
    anti_patterns: []
  acs_verified:
    - ac: "AC text"
      status: PASS | FAIL
      evidence: "file:line or test:name"
  architecture_compliant: true | false
  issues: []

gate:
  decision: PASS | FAIL
  reason: "one line"
  blocking_issues: []
```

## Signals

See: `.claude/agents/_shared/completion-signals.md`

| Phase | Signal | Meaning |
|-------|--------|---------|
| Setup | `SETUP COMPLETE` | Ready for verification |
| Setup | `SETUP BLOCKED: <reason>` | Precondition failed |
| Verification | `VERIFICATION COMPLETE` | Checks done, verdict ready |
| Verification | `VERIFICATION BLOCKED: <reason>` | Cannot complete |
| Completion | `QA PASS` | Story verified, in UAT |
| Completion | `QA FAIL` | Story failed, back to in-progress |

## Token Tracking

See: `.claude/agents/_shared/token-tracking.md`

Each leader estimates tokens. Completion leader calls:
```
/token-log STORY-XXX qa-verify <input> <output>
```

## Status Transitions

| Verdict | From | To | Directory |
|---------|------|----|-----------|
| PASS | `in-qa` | `uat` | `QA/` → `UAT/` |
| FAIL | `in-qa` | `needs-work` | `QA/` → `in-progress/` |

## Preconditions

| Check | Location | Required Value |
|-------|----------|----------------|
| Story exists | `plans/stories/in-progress/{story_id}/` | Directory exists |
| Status | Story frontmatter | `status: ready-for-qa` |
| PROOF file | `PROOF-{story_id}.md` | File exists |
| Code review | `VERIFICATION.yaml` | `code_review.verdict: PASS` |

## Verification Checklist Summary

| # | Check | Threshold | Blocks? |
|---|-------|-----------|---------|
| 1 | AC Verification | All ACs mapped to evidence | Yes |
| 2 | Test Quality | No anti-patterns | Yes |
| 3 | Coverage | 80% new, 90% critical | Yes |
| 4 | Test Execution | All tests pass | Yes |
| 5 | Proof Quality | Complete and verifiable | Yes |
| 6 | Architecture | No violations | Yes |

## Retry Policy

| Error | Action |
|-------|--------|
| Dev server won't start | Retry 2x, then BLOCKED |
| Test timeout | Retry 1x with longer timeout |
| Flaky test failure | Retry 2x, then FAIL |
| File system error | BLOCKED, report to user |

## Troubleshooting

| Issue | Check |
|-------|-------|
| Story not found | Verify `status: ready-for-qa` and location |
| PROOF missing | Run `/dev-implement-story` to completion |
| Code review missing | Run `/dev-code-review` first |
| .http tests fail | Verify dev server is running |
| Playwright fails | Check browser dependencies |

## Next Steps

| Verdict | Next Command |
|---------|--------------|
| PASS | Manual UAT review, then mark `done` |
| FAIL | `/dev-fix-story STORY-XXX` |
