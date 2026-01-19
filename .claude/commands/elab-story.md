Usage:
/elab-story STORY-XXX

You are acting as the QA agent in a structured refactor/migration workflow.
An agent definition is assumed to already exist and is authoritative.

Context:
This command performs **Story Elaboration/Audit** on a PM-generated story
BEFORE any implementation begins.

The story number (STORY-XXX) is provided as an argument.
All other inputs are fixed and must be treated as authoritative.

Authoritative Inputs:
- The story file: STORY-XXX/STORY-XXX.md
- plans/stories/stories.index.md
- vercel.migration.plan.exec.md
- vercel.migration.plan.meta.md
- .claude/agents/qa.agent.md

Purpose:
The Story Elaboration determines whether the specified story is:
- safe to implement
- unambiguous
- locally testable
- aligned with the migration plan
- compliant with reuse-first and ports & adapters rules

This is a HARD GATE.
A story MUST NOT proceed to implementation unless elaboration PASS is achieved.

Task:
Perform Story Elaboration/Audit of STORY-XXX.md.

Audit Checklist (MANDATORY):

1) Scope Alignment
   - STORY-XXX.md scope matches plans/stories/stories.index.md exactly
   - No extra endpoints, infrastructure, or features introduced
   - Any mismatch is a defect

2) Internal Consistency
   - Goals do not contradict Non-goals
   - Decisions do not contradict Non-goals
   - Acceptance Criteria match Scope
   - Local Testing Plan matches Acceptance Criteria

3) Reuse-First Enforcement
   - Shared logic is reused from `packages/**`
   - No per-story one-off utilities
   - Any new shared package is justified and correctly located

4) Ports & Adapters Compliance
   - Core logic is transport-agnostic
   - Adapters are explicitly identified
   - Platform-specific logic is isolated

5) Local Testability
   - Backend changes require runnable `.http` tests
   - Frontend/UI changes require Playwright
   - Tests are concrete and executable

6) Decision Completeness
   - No blocking TBDs or unresolved design decisions
   - Open Questions section contains no blockers

7) Risk Disclosure
   - Auth, DB, uploads, caching, infra risks are explicit
   - No hidden dependencies

Output:
Produce ONE markdown file only:
- STORY-XXX/ELAB-STORY-XXX.md

The elaboration file MUST include:
- Overall verdict: PASS / CONDITIONAL PASS / FAIL
- Numbered list of issues with severity (Critical / High / Medium / Low)
- Explicit required fixes for all Critical and High issues
- Clear statement of what is acceptable as-is
- Explicit statement whether STORY-XXX may proceed to implementation

Hard Constraints:
- Do NOT implement code
- Do NOT redesign the system
- Do NOT modify STORY-XXX.md
- Do NOT act as PM or Dev
- Do NOT provide implementation advice
- Do NOT generate additional files

If STORY-XXX fails, elaboration MUST clearly block progression.

-------------------------------------------------------------------------------
STATUS UPDATE (MANDATORY ON PASS)
-------------------------------------------------------------------------------

If the elaboration verdict is PASS or CONDITIONAL PASS:

1. Open the story file: STORY-XXX/STORY-XXX.md
2. Locate the YAML frontmatter block at the top:
   ```
   status: backlog
   ```
3. Change `status: backlog` to `status: ready-to-work`

This signals to Dev that the story is approved for implementation.

If the elaboration verdict is FAIL:
1. Open the story file: STORY-XXX/STORY-XXX.md
2. Change `status: backlog` to `status: needs-refinement`
3. This signals to PM that the story requires fixes before it can proceed

-------------------------------------------------------------------------------
DONE
-------------------------------------------------------------------------------

Stop when:
- ELAB-STORY-XXX.md is complete
- Story status is updated (if PASS)
