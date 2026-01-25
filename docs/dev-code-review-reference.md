# Code Review Command Reference

This document contains detailed templates, diagrams, and examples for the `/dev-code-review` command.

---

## Execution Flow

```
Phase 0 (Orchestrator) ─── Validate preconditions, identify touched files
       │
       ▼
Phase 1: ┌─ Lint Agent ──────────────┐
         │                            │
         ├─ Style Compliance Agent ──┤  (ALL PARALLEL)
         │                            │
         ├─ Syntax Agent ────────────┤
         │                            │
         └─ Security Agent ──────────┘
       │
       ▼
Phase 2 (Orchestrator) ─── Synthesize results, write CODE-REVIEW-STORY-XXX.md
       │
       ▼
Phase 3 (Orchestrator) ─── Update status, state next step
       │
       ▼
Phase 4 (Orchestrator) ─── Log token usage via /token-log
```

---

## Sub-Agent Summary

| Agent | File | Output | Completion Signal |
|-------|------|--------|-------------------|
| Lint | `code-review-lint.agent.md` | `CODE-REVIEW-LINT.md` | LINT PASS/FAIL |
| Style | `code-review-style-compliance.agent.md` | `CODE-REVIEW-STYLE.md` | STYLE COMPLIANCE PASS/FAIL |
| Syntax | `code-review-syntax.agent.md` | `CODE-REVIEW-SYNTAX.md` | SYNTAX PASS/FAIL |
| Security | `code-review-security.agent.md` | `CODE-REVIEW-SECURITY.md` | SECURITY PASS/FAIL |

---

## Final Report Template

Write to: `plans/stories/in-progress/STORY-XXX/CODE-REVIEW-STORY-XXX.md`

```markdown
# Code Review: STORY-XXX

## Verdict: PASS / PASS-WITH-WARNINGS / FAIL

## Summary
<1-2 sentence summary>

## Sub-Agent Results

| Check | Result | Blocking Issues |
|-------|--------|-----------------|
| Lint | PASS/FAIL | <count> |
| Style Compliance | PASS/FAIL | <count> |
| ES7+ Syntax | PASS/FAIL | <count> |
| Security | PASS/FAIL | <count> |

## Files Reviewed
<combined list from all sub-agents>

## Blocking Issues (Must Fix)

### Style Compliance Violations (HARD RULE)
<from CODE-REVIEW-STYLE.md, or "None">

### Lint Errors
<from CODE-REVIEW-LINT.md, or "None">

### Syntax Issues
<from CODE-REVIEW-SYNTAX.md, or "None">

### Security Issues
<from CODE-REVIEW-SECURITY.md, or "None">

## Warnings (Should Fix)
<combined warnings from all sub-agents>

## Required Fixes (if FAIL)
<explicit list of what must be fixed>

## Next Step
<state the next command to run>
```

---

## Verdict Logic

| Condition | Verdict |
|-----------|---------|
| ANY sub-agent FAIL | FAIL |
| All PASS, some warnings | PASS-WITH-WARNINGS |
| All PASS, no warnings | PASS |

---

## Status Transitions

| Verdict | New Status | Next Command |
|---------|------------|--------------|
| PASS / PASS-WITH-WARNINGS | `ready-for-qa` | `/qa-verify-story STORY-XXX` |
| FAIL | `code-review-failed` | `/dev-fix-story STORY-XXX` |

---

## Hard Rules (Enforced by Style Agent)

1. **Style Compliance is MANDATORY**
   - ALL styling MUST come from Tailwind CSS or `@repo/app-component-library`
   - NO custom CSS, inline styles, or arbitrary Tailwind values
   - ZERO TOLERANCE - any violation = FAIL

2. **Lint on Touched Files Only**
   - Do NOT lint the entire codebase
   - Only lint files created/modified by the story

3. **ES7+ Syntax Required**
   - Modern JavaScript/TypeScript patterns required
   - Do NOT fail on stylistic differences (Prettier handles that)

---

## Story Context Template

When spawning sub-agents, include this context block:

```
STORY CONTEXT:
Story ID: STORY-XXX
Story file: plans/stories/in-progress/STORY-XXX/STORY-XXX.md
Implementation dir: plans/stories/in-progress/STORY-XXX/_implementation/
Output file: plans/stories/in-progress/STORY-XXX/_implementation/<OUTPUT-FILE>.md

TOUCHED FILES (from implementation logs):
<list the touched files here>
```

---

## Error Handling

If any sub-agent fails to complete:
1. Report which agent failed
2. Include any partial output
3. Do NOT mark the code review as complete
4. Recommend re-running the command

---

## Token Estimation

```
tokens ≈ bytes / 4
```

Typical code review: 15,000-30,000 input tokens, 2,000-5,000 output tokens.
