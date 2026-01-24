Usage:
/pm-generate-followup-story STORY-XXX [finding-number]

You are acting as the PM agent in a structured refactor/migration workflow.
An agent definition is assumed to already exist and is authoritative.

Context:
This command generates a **follow-up story** from findings identified during
QA Elaboration of a parent story. During `/elab-story`, gaps and enhancement
opportunities may be marked as "Add as follow-up story note" - this command
converts those notes into proper stories.

Arguments:
- STORY-XXX — the SOURCE story whose elaboration identified follow-up work
- [finding-number] — (optional) specific finding number to generate
  - If provided: generate only that finding as a follow-up story
  - If omitted: list all follow-up suggestions and prompt for selection

Authoritative Inputs:
- The source story: plans/stories/STORY-XXX/STORY-XXX.md
- The elaboration file: plans/stories/STORY-XXX/ELAB-STORY-XXX.md
- plans/stories/stories.index.md
- .claude/agents/pm.agent.md

-------------------------------------------------------------------------------
PRECONDITIONS (HARD STOP)
-------------------------------------------------------------------------------

1. STORY-XXX.md exists
2. STORY-XXX.md contains a "## QA Discovery Notes" section
3. The QA Discovery Notes contain at least one item in:
   - "### Follow-up Stories Suggested" list, OR
   - Items marked with decision "Follow-up" in the tables

If no follow-up items exist: STOP and report "No follow-up stories found in STORY-XXX"

-------------------------------------------------------------------------------
YOUR ROLE (PM ORCHESTRATOR)
-------------------------------------------------------------------------------

Act STRICTLY as the PM agent.
You MUST NOT implement code.
You MUST NOT generate QA or Dev outputs.

You WILL:
- Parse follow-up suggestions from the source story's QA Discovery Notes
- Generate properly structured follow-up stories
- Link follow-up stories to their parent

-------------------------------------------------------------------------------
PHASE 1 — PARSE FOLLOW-UP SUGGESTIONS
-------------------------------------------------------------------------------

1.1 Read STORY-XXX.md
1.2 Locate the "## QA Discovery Notes" section
1.3 Extract follow-up items from:

    a) "### Follow-up Stories Suggested" checklist:
       ```
       - [ ] Brief description of follow-up story 1
       - [ ] Brief description of follow-up story 2
       ```

    b) Tables with "Follow-up" decision:
       ```
       | # | Finding | User Decision | Notes |
       | 1 | [finding] | Follow-up | [notes] |
       ```

1.4 Build a numbered list of follow-up candidates:
    ```
    Follow-up candidates from STORY-XXX:
    [1] Brief description (from checklist)
    [2] Finding description (from Gaps table, row N)
    [3] Finding description (from Enhancements table, row M)
    ```

-------------------------------------------------------------------------------
PHASE 2 — SELECTION (if finding-number not provided)
-------------------------------------------------------------------------------

If finding-number argument was NOT provided:

2.1 Display the numbered list of follow-up candidates
2.2 Ask: "Which follow-up would you like to generate? (Enter number, or 'all')"
2.3 Wait for user response
2.4 If "all": queue all candidates for generation
2.5 If number: proceed with that specific candidate

If finding-number argument WAS provided:

2.6 Validate the number exists in the candidate list
2.7 Proceed with that specific candidate

-------------------------------------------------------------------------------
PHASE 3 — DETERMINE STORY ID
-------------------------------------------------------------------------------

3.1 Read plans/stories/stories.index.md
3.2 Find the highest existing STORY-NNN number
3.3 Assign the next sequential number: STORY-(NNN+1)
    - Example: If STORY-017 is highest, new story is STORY-018
3.4 If generating multiple follow-ups, assign sequential numbers

-------------------------------------------------------------------------------
PHASE 4 — GENERATE FOLLOW-UP STORY
-------------------------------------------------------------------------------

For each selected follow-up, generate a story file with:

4.1 Create directory: plans/stories/STORY-NNN/
4.2 Create subdirectory: plans/stories/STORY-NNN/_pm/

4.3 Generate plans/stories/STORY-NNN/STORY-NNN.md with structure:

```markdown
---
status: backlog
follow_up_from: STORY-XXX
---

# STORY-NNN: [Title derived from finding description]

## Follow-up Context

This story is a follow-up from STORY-XXX identified during QA Elaboration.

- **Parent Story:** STORY-XXX
- **Source:** QA Discovery Notes
- **Original Finding:** [The finding description]
- **Category:** [Gap | Enhancement Opportunity]
- **Impact:** [Low | Medium | High] (from original finding)
- **Effort:** [Low | Medium | High] (from original finding)

## Context

[Expand on the finding to provide full context]
[Reference relevant parts of parent story if needed]

## Goal

[Clear goal statement derived from the finding]

## Non-goals

- Not re-implementing functionality from STORY-XXX
- [Other relevant non-goals]

## Scope

### Endpoints/Surfaces
[If applicable]

### Packages/Apps Affected
[Identify based on the finding]

## Acceptance Criteria

[Derive testable AC from the finding]
[Each AC must be observable and verifiable]

## Reuse Plan

- Builds on work from STORY-XXX
- [Other reuse considerations]

## Architecture Notes

[If applicable - ports & adapters considerations]

## Test Plan

### Happy Path
[Concrete test scenarios]

### Error Cases
[If applicable]

### Edge Cases
[If applicable]

## Risks / Edge Cases

[Potential risks from implementing this follow-up]

## Open Questions

[Any questions that need resolution - should be empty or non-blocking]
```

-------------------------------------------------------------------------------
PHASE 5 — UPDATE INDEX
-------------------------------------------------------------------------------

5.1 Open plans/stories/stories.index.md
5.2 Add new entry for the follow-up story:

```markdown
## STORY-NNN: [Title]

**Status:** pending
**Depends On:** STORY-XXX
**Follow-up From:** STORY-XXX

### Scope
[Brief scope from generated story]

### Source
Follow-up from QA Elaboration of STORY-XXX
```

5.3 Update Progress Summary table:
    - Increment `pending` count

-------------------------------------------------------------------------------
PHASE 6 — UPDATE SOURCE STORY
-------------------------------------------------------------------------------

6.1 Open STORY-XXX.md
6.2 In the "### Follow-up Stories Suggested" section:
    - Change `- [ ] [description]` to `- [x] [description] → STORY-NNN`

This marks the follow-up as converted to a real story.

-------------------------------------------------------------------------------
OUTPUT
-------------------------------------------------------------------------------

This command produces:
1. plans/stories/STORY-NNN/STORY-NNN.md (for each generated follow-up)
2. Updated plans/stories/stories.index.md
3. Updated STORY-XXX.md (checkboxes marked)

-------------------------------------------------------------------------------
HARD CONSTRAINTS
-------------------------------------------------------------------------------

- Do NOT implement code
- Do NOT modify the parent story's scope or AC
- Do NOT generate stories for items NOT marked as follow-up
- Do NOT skip the index update
- Follow-up stories MUST depend on their parent story
- Each follow-up MUST be independently testable

-------------------------------------------------------------------------------
NEXT STEPS
-------------------------------------------------------------------------------

After generation, report:
- "Created STORY-NNN: [title]"
- "Next step: Run /elab-story STORY-NNN to elaborate the follow-up story"

-------------------------------------------------------------------------------
DONE
-------------------------------------------------------------------------------

Stop when:
- All selected follow-up stories are created
- Index is updated
- Source story checkboxes are updated
- Summary is reported with next steps
