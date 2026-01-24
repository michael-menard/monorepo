Usage:
/pm-split-story STORY-XXX

You are acting as the PM agent in a structured refactor/migration workflow.
An agent definition is assumed to already exist and is authoritative.

Context:
This command is used ONLY when a story has received a **SPLIT REQUIRED** verdict
during QA Elaboration because it is too large or complex for a single implementation cycle.

The story number (STORY-XXX) is provided as an argument.
All other inputs are fixed and must be treated as authoritative.

Authoritative Inputs:
- The story file: plans/stories/STORY-XXX/STORY-XXX.md
- The elaboration file: plans/stories/STORY-XXX/ELAB-STORY-XXX.md
- plans/stories/stories.index.md
- .claude/agents/pm.agent.md

-------------------------------------------------------------------------------
PRECONDITIONS (HARD STOP)
-------------------------------------------------------------------------------

1. ELAB-STORY-XXX.md exists with verdict: **SPLIT REQUIRED**
2. STORY-XXX.md has `status: needs-split` in its frontmatter
3. ELAB-STORY-XXX.md contains a "Proposed Split Structure" section with:
   - Named splits (STORY-XXX-A, STORY-XXX-B, etc.)
   - AC allocation per split
   - Recommended dependency order

If preconditions fail: STOP and report which precondition is missing.

-------------------------------------------------------------------------------
YOUR ROLE (PM ORCHESTRATOR)
-------------------------------------------------------------------------------

Act STRICTLY as the PM agent.
You MUST NOT implement code.
You MUST NOT generate QA or Dev outputs.

You WILL:
- Parse the split recommendations from ELAB-STORY-XXX.md
- Create index entries for each split story
- Update the original story status
- Generate the split story files

-------------------------------------------------------------------------------
PHASE 1 — PARSE SPLIT RECOMMENDATIONS
-------------------------------------------------------------------------------

1.1 Read ELAB-STORY-XXX.md
1.2 Extract from "Proposed Split Structure" section:
    - Split story IDs (STORY-XXX-A, STORY-XXX-B, etc.)
    - Scope summary for each split
    - AC allocation (which AC from original belong to which split)
    - Dependency order between splits
1.3 Validate that:
    - All original AC are accounted for across splits
    - Each split is independently testable
    - Dependency order is clear (e.g., A before B)

-------------------------------------------------------------------------------
PHASE 2 — UPDATE STORIES INDEX
-------------------------------------------------------------------------------

2.1 Open plans/stories/stories.index.md
2.2 Locate the entry for STORY-XXX
2.3 Update the original entry:
    - Change `**Status:** generated` to `**Status:** superseded`
    - Add note: `**Superseded By:** STORY-XXX-A, STORY-XXX-B, ...`
2.4 Add NEW entries for each split story IMMEDIATELY AFTER the original:

Format for each split entry:
```markdown
## STORY-XXX-A: [Brief title from scope summary]

**Status:** pending
**Depends On:** [none OR STORY-XXX-A if this is B, etc.]
**Split From:** STORY-XXX

### Scope
[Scope summary from ELAB split recommendations]

### Acceptance Criteria (from parent)
[List the specific AC numbers allocated to this split]
```

2.5 Update the Progress Summary table:
    - Increment `pending` count by number of splits
    - Decrement `generated` by 1 (original is now superseded)
    - Add to `superseded` count

-------------------------------------------------------------------------------
PHASE 3 — CREATE SPLIT STORY DIRECTORIES
-------------------------------------------------------------------------------

3.1 For each split (STORY-XXX-A, STORY-XXX-B, etc.):
    - Create directory: plans/stories/backlog/STORY-XXX-A/
    - Create subdirectory: plans/stories/backlog/STORY-XXX-A/_pm/

-------------------------------------------------------------------------------
PHASE 4 — GENERATE SPLIT STORIES
-------------------------------------------------------------------------------

For each split story, generate the full story file following the same
pipeline as /pm-generate-story but with these modifications:

4.1 The story file MUST include a "Split Context" section at the top:
```markdown
---
status: backlog
split_from: STORY-XXX
split_part: A of N
---

## Split Context

This story is part of a split from STORY-XXX.
- **Original Story:** STORY-XXX
- **Split Reason:** [From ELAB verdict]
- **This Part:** [A/B/C] of [N]
- **Dependency:** [This story depends on STORY-XXX-A | This story has no dependencies]
```

4.2 Scope MUST be limited to only the AC allocated to this split
4.3 Test Plan MUST cover only the AC in this split
4.4 Reuse Plan should reference shared work from sibling splits if applicable

-------------------------------------------------------------------------------
PHASE 5 — VERIFICATION
-------------------------------------------------------------------------------

5.1 Verify all split stories were created:
    - plans/stories/backlog/STORY-XXX-A/STORY-XXX-A.md exists
    - plans/stories/backlog/STORY-XXX-B/STORY-XXX-B.md exists
    - (etc. for all splits)

5.2 Verify index was updated:
    - Original STORY-XXX shows `superseded`
    - All split stories appear with `pending` status
    - Dependencies between splits are correctly recorded

5.3 Report summary:
    - Number of stories created
    - Dependency chain
    - Next step: "Run /elab-story STORY-XXX-A to begin elaboration of first split"

-------------------------------------------------------------------------------
OUTPUT
-------------------------------------------------------------------------------

This command produces:
1. Updated plans/stories/stories.index.md
2. For each split:
   - plans/stories/backlog/STORY-XXX-[A|B|...]/STORY-XXX-[A|B|...].md
   - plans/stories/backlog/STORY-XXX-[A|B|...]/_pm/ directory

-------------------------------------------------------------------------------
HARD CONSTRAINTS
-------------------------------------------------------------------------------

- Do NOT implement code
- Do NOT modify the original STORY-XXX.md (except status if needed)
- Do NOT skip any split recommended in ELAB
- Do NOT combine splits back together
- Do NOT generate splits that weren't in the ELAB recommendations
- Each split MUST be independently testable
- AC allocation MUST be complete (no AC lost in split)

-------------------------------------------------------------------------------
DONE
-------------------------------------------------------------------------------

Stop when:
- All split story files are created
- Index is updated with all splits
- Original story is marked superseded
- Summary is reported with next steps
