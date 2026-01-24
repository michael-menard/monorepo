Usage:
/pm-fix-story STORY-XXX

You are acting as the PM agent in a structured refactor/migration workflow.
An agent definition is assumed to already exist and is authoritative.

Context:
This command is used ONLY when a story has FAILED or received a CONDITIONAL PASS
during QA Audit and must be corrected before implementation.

The story number (STORY-XXX) is provided as an argument.
All other inputs are fixed and must be treated as authoritative.

Authoritative Inputs:
- The story file: plans/stories/elaboration/STORY-XXX/STORY-XXX.md
- The QA audit file: plans/stories/elaboration/STORY-XXX/QA-AUDIT-STORY-XXX.md
- plans/stories/stories.index.md
- vercel.migration.plan.exec.md
- vercel.migration.plan.meta.md
- .claude/agents/pm.agent.md

Preconditions (MANDATORY):
- QA-AUDIT-STORY-XXX.md exists with verdict FAIL or CONDITIONAL PASS
- STORY-XXX.md has `status: needs-refinement` in its frontmatter

Purpose:
Revise STORY-XXX.md to fully resolve ALL Critical and High issues
identified in plans/stories/elaboration/STORY-XXX/QA-AUDIT-STORY-XXX.md.

This step exists to:
- eliminate ambiguity
- resolve scope contradictions
- force explicit decisions
- prevent developers from guessing

Task:
Revise plans/stories/elaboration/STORY-XXX/STORY-XXX.md to address EVERY Critical and High issue from plans/stories/elaboration/STORY-XXX/QA-AUDIT-STORY-XXX.md.

Rules (MANDATORY):
1) All Critical and High issues MUST be resolved explicitly in the story.
2) Blocking design decisions MUST be made — do NOT defer them.
3) If scope must change to resolve an issue:
   - Update plans/stories/elaboration/STORY-XXX/STORY-XXX.md accordingly
   - Add a clear note if plans/stories.index.md is now outdated
   - Do NOT modify the index in this step
4) Acceptance Criteria and Local Testing Plan MUST be updated to reflect all fixes.
5) Open Questions MUST NOT contain blocking items when finished.

You MUST NOT:
- Implement code
- Act as QA or Dev
- Introduce new scope unrelated to QA findings
- Modify plans/stories.index.md
- Generate future stories

Output:
Produce ONE markdown file only:
- Updated STORY-XXX.md

Hard Constraints:
- Do NOT generate additional files
- Do NOT include implementation code
- Do NOT include commentary outside the story
- Do NOT change the story ID

-------------------------------------------------------------------------------
STATUS UPDATE ON COMPLETION (MANDATORY)
-------------------------------------------------------------------------------

After the updated STORY-XXX.md is complete:

1. Change `status: needs-refinement` to `status: backlog`

This signals the story is ready for QA audit again.

-------------------------------------------------------------------------------
TOKEN LOGGING (REQUIRED)
-------------------------------------------------------------------------------

After fixes are complete, log token usage:

1. Estimate token usage from `/cost` command output or byte calculations
2. Run: `/token-log STORY-XXX pm-fix <input-tokens> <output-tokens>`

Example:
```
/token-log STORY-XXX pm-fix 18000 3000
```

This logs the phase tokens to `_implementation/TOKEN-LOG.md` for tracking.

-------------------------------------------------------------------------------
NEXT STEP
-------------------------------------------------------------------------------

After fixes are complete, QA Audit MUST be run again using:
- /qa-audit-story STORY-XXX

-------------------------------------------------------------------------------
DONE
-------------------------------------------------------------------------------

Stop when:
- Updated STORY-XXX.md is complete
- Story status is updated to `backlog`
- Token usage logged via `/token-log`
