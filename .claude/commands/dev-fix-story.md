Usage:
/dev-fix-story STORY-XXX

You are acting as the Dev agent in a structured refactor/migration workflow.
An agent definition is assumed to already exist and is authoritative.

Context:
This command is used ONLY when Story Elaboration has FAILED for a story
due to implementation, testing, or proof deficiencies.

This is a remediation step.
It MUST NOT change scope, requirements, or story intent.

The story number (STORY-XXX) is provided as an argument.
All other inputs are fixed and must be treated as authoritative.

Authoritative Inputs:
- The story file: STORY-XXX.md
- The QA verify file: ELAB-STORY-XXX.md
- The Dev proof file: PROOF-STORY-XXX.md
- The code review file: CODE-REVIEW-STORY-XXX.md
- vercel.migration.plan.exec.md
- vercel.migration.plan.meta.md
- Agent definition file

Preconditions (MANDATORY):
- ELAB-STORY-XXX.md exists
- QA verdict is FAIL
- STORY-XXX.md has `status: needs-work` in its frontmatter

Purpose:
Correct implementation issues so that STORY-XXX can PASS Story Elaboration.

This step exists to:
- fix broken or incomplete implementation
- run missing or failed tests
- correct architectural or reuse violations
- complete missing proof or evidence

This step does NOT allow:
- changing Acceptance Criteria
- redefining scope
- adding new features
- rewriting the story

Task:
Update the implementation to resolve ALL issues listed in ELAB-STORY-XXX.md.

Rules (MANDATORY):
1) Every failure item in ELAB-STORY-XXX.md MUST be addressed.
2) Fixes MUST remain within the scope of STORY-XXX.md.
3) Reuse-first and architectural rules MUST be preserved.
4) Missing tests MUST be executed (not waived).
5) Proof MUST be updated to reflect the new implementation state.

Deliverables (MANDATORY):
1) Updated code changes addressing QA failures
2) Updated local verification evidence:
   - commands run
   - test output
   - `.http` execution results (backend)
   - Playwright output (if applicable)

3) ONE updated markdown file:
   - PROOF-STORY-XXX.md (revised)

Hard Constraints:
- Do NOT modify STORY-XXX.md
- Do NOT modify plans/stories.index.md
- Do NOT reinterpret Acceptance Criteria
- Do NOT introduce new utilities or frameworks
- Do NOT generate QA output
- Do NOT proceed if a failure cannot be resolved within scope

-------------------------------------------------------------------------------
STATUS UPDATE ON START (MANDATORY)
-------------------------------------------------------------------------------

Before beginning fixes:

1. Open STORY-XXX/STORY-XXX.md
2. Change `status: needs-work` to `status: in-progress`

This signals that Dev is actively fixing the issues.

-------------------------------------------------------------------------------
STATUS UPDATE ON COMPLETION (MANDATORY)
-------------------------------------------------------------------------------

After fixes and updated PROOF-STORY-XXX.md are complete:

1. Open STORY-XXX/STORY-XXX.md
2. Change `status: in-progress` to `status: ready-for-qa`

This signals the story is ready for QA re-verification.

-------------------------------------------------------------------------------
NEXT STEP
-------------------------------------------------------------------------------

After fixes are complete, Story Elaboration MUST be run again using:
- /elab-story STORY-XXX

-------------------------------------------------------------------------------
DONE
-------------------------------------------------------------------------------

Stop when:
- Fixes are complete
- Updated PROOF-STORY-XXX.md is written
- Story status is updated to `ready-for-qa`
