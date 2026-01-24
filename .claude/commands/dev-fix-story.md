Usage:
/dev-fix-story STORY-XXX

You are acting as the Dev agent in a structured refactor/migration workflow.
An agent definition is assumed to already exist and is authoritative.

Context:
This command is used when a story has FAILED either:
- Code Review (`/dev-code-review`) - status: `code-review-failed`
- QA Verification (`/qa-verify-story`) - status: `needs-work`

This is a remediation step.
It MUST NOT change scope, requirements, or story intent.

The story number (STORY-XXX) is provided as an argument.
All other inputs are fixed and must be treated as authoritative.

-------------------------------------------------------------------------------
AUTHORITATIVE INPUTS
-------------------------------------------------------------------------------

- The story file: plans/stories/STORY-XXX/STORY-XXX.md
- The Dev proof file: plans/stories/STORY-XXX/PROOF-STORY-XXX.md
- The code review file: plans/stories/STORY-XXX/CODE-REVIEW-STORY-XXX.md (if exists)
- The QA verify file: plans/stories/STORY-XXX/QA-VERIFY-STORY-XXX.md (if exists)
- Implementation artifacts: plans/stories/STORY-XXX/_implementation/

-------------------------------------------------------------------------------
PRECONDITIONS (HARD STOP)
-------------------------------------------------------------------------------

Before beginning fixes, validate ONE of:

- STORY-XXX.md has `status: code-review-failed` (failed code review)
- STORY-XXX.md has `status: needs-work` (failed QA verification)

If neither status matches: STOP and report.

-------------------------------------------------------------------------------
DETERMINE FAILURE SOURCE
-------------------------------------------------------------------------------

Based on the status, identify what needs fixing:

**If status = `code-review-failed`:**
- Read CODE-REVIEW-STORY-XXX.md for issues to fix
- Focus on: lint errors, style compliance, syntax issues, security issues
- Read sub-agent reports in _implementation/:
  - CODE-REVIEW-LINT.md
  - CODE-REVIEW-STYLE.md
  - CODE-REVIEW-SYNTAX.md
  - CODE-REVIEW-SECURITY.md

**If status = `needs-work`:**
- Read QA-VERIFY-STORY-XXX.md for issues to fix
- Focus on: AC coverage, test execution, proof completeness

-------------------------------------------------------------------------------
PURPOSE
-------------------------------------------------------------------------------

Correct implementation issues so that STORY-XXX can pass the next gate.

This step exists to:
- fix code review violations (lint, style, syntax, security)
- fix broken or incomplete implementation
- run missing or failed tests
- correct architectural or reuse violations
- complete missing proof or evidence

This step does NOT allow:
- changing Acceptance Criteria
- redefining scope
- adding new features
- rewriting the story

-------------------------------------------------------------------------------
TASK
-------------------------------------------------------------------------------

1. Read the failure report (CODE-REVIEW or QA-VERIFY)
2. Address EVERY blocking issue listed
3. Update implementation code as needed
4. Re-run verification (`pnpm check-types`, `pnpm test`, `pnpm lint`)
5. Update PROOF-STORY-XXX.md with new evidence

-------------------------------------------------------------------------------
RULES (MANDATORY)
-------------------------------------------------------------------------------

1) Every blocking issue MUST be addressed
2) Fixes MUST remain within the scope of STORY-XXX.md
3) Reuse-first and architectural rules MUST be preserved
4) Style compliance is MANDATORY - all styling from Tailwind/@repo/app-component-library
5) Missing tests MUST be executed (not waived)
6) Proof MUST be updated to reflect the new implementation state

-------------------------------------------------------------------------------
DELIVERABLES (MANDATORY)
-------------------------------------------------------------------------------

1) Updated code changes addressing all blocking issues
2) Updated local verification evidence:
   - `pnpm check-types` output
   - `pnpm test` output
   - `pnpm lint` output (on touched files)
   - `.http` execution results (backend)
   - Playwright output (if applicable)

3) Updated markdown file:
   - PROOF-STORY-XXX.md (revised)

-------------------------------------------------------------------------------
HARD CONSTRAINTS
-------------------------------------------------------------------------------

- Do NOT modify STORY-XXX.md (except status)
- Do NOT modify plans/stories/stories.index.md
- Do NOT reinterpret Acceptance Criteria
- Do NOT introduce new utilities or frameworks
- Do NOT generate QA/review output
- Do NOT proceed if a failure cannot be resolved within scope

-------------------------------------------------------------------------------
STATUS UPDATE ON START (MANDATORY)
-------------------------------------------------------------------------------

Before beginning fixes:

1. Open plans/stories/STORY-XXX/STORY-XXX.md
2. Change current status to `status: in-progress`
   - From `code-review-failed` → `in-progress`
   - From `needs-work` → `in-progress`

This signals that Dev is actively fixing the issues.

-------------------------------------------------------------------------------
STATUS UPDATE ON COMPLETION (MANDATORY)
-------------------------------------------------------------------------------

After fixes and updated PROOF-STORY-XXX.md are complete:

1. Open plans/stories/STORY-XXX/STORY-XXX.md
2. Change `status: in-progress` to `status: ready-for-code-review`

This ensures the story goes through code review again before QA verification.

-------------------------------------------------------------------------------
TOKEN LOGGING (REQUIRED)
-------------------------------------------------------------------------------

After fixes are complete, log token usage:

1. Estimate token usage from `/cost` command output or byte calculations
2. Run: `/token-log STORY-XXX dev-fix <input-tokens> <output-tokens>`

Example:
```
/token-log STORY-XXX dev-fix 30000 8000
```

This logs the phase tokens to `_implementation/TOKEN-LOG.md` for tracking.

-------------------------------------------------------------------------------
NEXT STEP (IMPORTANT)
-------------------------------------------------------------------------------

After fixes are complete:

→ Run `/dev-code-review STORY-XXX`

The code review will:
- Verify all code review issues are resolved
- If PASS → set status to `ready-for-qa` → proceed to `/qa-verify-story`
- If FAIL → set status to `code-review-failed` → repeat this fix cycle

-------------------------------------------------------------------------------
DONE
-------------------------------------------------------------------------------

Stop when:
- All blocking issues are fixed
- Verification passes (`pnpm check-types`, `pnpm test`, `pnpm lint`)
- Updated PROOF-STORY-XXX.md is written
- Token usage logged via `/token-log STORY-XXX dev-fix`
- Story status is updated to `ready-for-code-review`
- Next step stated: `/dev-code-review STORY-XXX`
