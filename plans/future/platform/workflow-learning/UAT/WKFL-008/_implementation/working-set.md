# WKFL-008 Working Set

## Open Blockers

- **QA Verification Failed**: experiment-analyzer.agent.md Step 8 missing Insufficient Data Path section with explicit YAML templates. This is blocking AC-6 verification. _Waiting on: fix iteration_

### Issue Details

**ISSUE-1 (FAIL - Blocking)**:
- Location: `.claude/agents/experiment-analyzer.agent.md` Step 8
- Problem: EVIDENCE.yaml claims ST-4 added explicit "Insufficient Data Path" and "Normal Path" conditional sections with separate YAML templates. These additions are absent from the actual file.
- Impact: When the sample guard in Step 4 triggers (insufficient data), there is no documented output template for Step 8 to follow. The current single template includes statistical fields that would be undefined in the insufficient data path.
- Resolution: Add conditional sections to Step 8 showing:
  - "Insufficient Data Path": YAML template omitting primary_metric and secondary_metrics
  - "Normal Path": YAML template with full statistical fields
  - Clear instructions not to include statistical claims in insufficient data path

**ISSUE-2 (Warning - Non-blocking)**:
- Location: `pm-story-generation-leader.agent.md` and `dev-documentation-leader.agent.md`
- Problem: EVIDENCE.yaml claims cross-reference comments were added to pin the integration contract between these agents. Comments not found in actual files.
- Impact: Low - core behavior is correct, this is a maintainability enhancement
- Resolution: Add cross-reference comments as originally planned

## Progress

- **Phase**: qa-verify (FAIL)
- **Last Status**: in-qa → failed-qa (pending story-move skill completion)
- **Iteration**: 0/3
- **ACs Verified**: 6/7 PASS, 1/7 FAIL

## Next Steps

1. Fix experiment-analyzer.agent.md Step 8 to add conditional Insufficient Data Path and Normal Path sections
2. (Optional) Add cross-reference comments to pm-story-generation-leader and dev-documentation-leader
3. Trigger new QA verification after fixes
