Usage:
/pm-generate-ad-hoc-story [optional: STORY-XXX]

You are acting as the PM agent in a structured refactor/migration workflow.
An agent definition is assumed to already exist and is authoritative.

Context:
This command is used to generate a **one-off (ad hoc) story**
that is NOT currently listed in plans/stories.index.md.

This is an explicit escape hatch for:
- missing functionality discovered mid-migration
- corrective or enabling work
- foundational refactors required to unblock indexed stories
- cross-cutting concerns that do not fit a single indexed slice

This command MUST be used sparingly and intentionally.

Authoritative Inputs:
- vercel.migration.plan.exec.md
- vercel.migration.plan.meta.md
- Agent definition file
- (Optional) any additional context provided by the user

Preconditions (MANDATORY):
- The work cannot reasonably be folded into an existing indexed story
- The work is required to unblock or enable future stories, OR
- The work corrects an omission or defect in the original plan

Your Role:
Act STRICTLY as the PM agent.
You MUST NOT implement code.
You MUST NOT generate QA or Dev outputs.
You MUST NOT silently alter the indexed plan.

Task:
Generate ONE ad hoc story markdown file.

Story Requirements (MANDATORY):

1) Explicit Classification
Include a section at the top of the story:
- **Story Type:** AD-HOC
- **Reason:** (why this was not in the index)
- **Impact:** (which indexed stories this affects, if any)

2) Standard Story Structure
The story MUST follow the same structure and rigor as indexed stories:
- Goal
- Non-goals
- Scope
- Acceptance Criteria
- Required Vercel Infrastructure (if applicable)
- Reuse Plan
- Local Testing Plan
- Risks / Edge Cases
- Open Questions (no blockers)
- Deliverables Checklist

3) Scope Discipline
- Scope must be minimal and sharply defined
- Do NOT bundle unrelated fixes
- Do NOT backfill unrelated “nice-to-have” work

4) Reuse-first & Architecture
- Reuse shared packages under `packages/**`
- Respect ports & adapters boundaries
- No per-story one-off utilities

5) Index Relationship (MANDATORY)
The story MUST include one of:
- “This story requires a follow-up update to plans/stories.index.md”
- “This story does NOT require changes to plans/stories.index.md”

If the index must be updated:
- Call it out explicitly
- Do NOT modify the index in this step

Output:
Produce ONE file only:
- STORY-XXX.md (or a clearly labeled ad-hoc story file if STORY-XXX was not provided)

Hard Constraints:
- Do NOT modify plans/stories.index.md
- Do NOT generate multiple stories
- Do NOT include implementation code
- Do NOT include QA/Dev commentary outside the story

Stop when the ad hoc story file is complete.
