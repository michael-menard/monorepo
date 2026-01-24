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
- The story file: plans/stories/elaboration/STORY-XXX/STORY-XXX.md
- plans/stories/stories.index.md
- vercel.migration.plan.exec.md
- vercel.migration.plan.meta.md
- .claude/agents/qa.agent.md

-------------------------------------------------------------------------------
PHASE 0 — DIRECTORY SETUP (MANDATORY, RUN FIRST)
-------------------------------------------------------------------------------

Before performing any elaboration, move the story from backlog to elaboration:

1. Ensure the elaboration directory exists:
   ```bash
   mkdir -p plans/stories/elaboration
   ```

2. Move the story directory from backlog to elaboration:
   ```bash
   mv plans/stories/backlog/STORY-XXX plans/stories/elaboration/STORY-XXX
   ```

3. Verify the move succeeded:
   ```bash
   ls plans/stories/elaboration/STORY-XXX/STORY-XXX.md
   ```

If the move fails (story not found in backlog), check if it already exists in elaboration.
If found in neither location, STOP and report error.

All subsequent operations use the elaboration path: plans/stories/elaboration/STORY-XXX/

-------------------------------------------------------------------------------

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
Perform Story Elaboration/Audit of plans/stories/elaboration/STORY-XXX/STORY-XXX.md.

Audit Checklist (MANDATORY):

1) Scope Alignment
   - plans/stories/elaboration/STORY-XXX/STORY-XXX.md scope matches plans/stories/stories.index.md exactly
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

8) Story Sizing (Too Large Detection)
   - Stories should be completable in 1-3 focused dev sessions
   - Check for these "too large" indicators:
     a) More than 8 Acceptance Criteria
     b) More than 5 endpoints being created/modified
     c) Both significant frontend AND backend work (consider splitting)
     d) Multiple independent features bundled together
     e) More than 3 distinct test scenarios in happy path
     f) Touches more than 2 packages in `packages/**`
   - If 2+ indicators are present: recommend story split
   - Split recommendations MUST:
     - Propose specific STORY-XXX-A, STORY-XXX-B naming
     - Define clear boundaries between split stories
     - Identify which AC belong to which split
     - Maintain dependency order (e.g., backend before frontend)
     - Ensure each split is independently testable
   - Story sizing issues are severity: High (blocks implementation)

-------------------------------------------------------------------------------
DISCOVERY PHASE (After Audit, Before Verdict)
-------------------------------------------------------------------------------

After completing the audit checklist, perform discovery analysis by answering:

**Question 1: What have we not thought about? What are we missing?**
Analyze the story for:
- Edge cases not covered in AC
- Error scenarios not addressed
- Security considerations overlooked
- Performance implications not mentioned
- Accessibility gaps (if UI involved)
- Data migration or backward compatibility concerns
- Monitoring/observability gaps
- Documentation gaps

**Question 2: What additional functionality would make this a killer feature?**
Consider:
- UX improvements that would delight users
- Power-user features that add minimal complexity
- Integration opportunities with other system features
- Analytics/insights that could be captured
- Automation possibilities
- Future-proofing enhancements

Compile findings into two lists:
- **Gaps & Blind Spots** (things missing that should be addressed)
- **Enhancement Opportunities** (nice-to-haves that could elevate the feature)

-------------------------------------------------------------------------------
INTERACTIVE IMPROVEMENT DISCUSSION (MANDATORY)
-------------------------------------------------------------------------------

After compiling discovery findings, ask the user:

"I've identified [N] potential gaps and [M] enhancement opportunities for this story.
Would you like to discuss these improvements before I finalize the elaboration? (yes/no)"

**If user says YES:**

1. Present each item ONE AT A TIME in this format:
   ```
   [Gap/Enhancement #X of N]
   Category: [Gaps & Blind Spots | Enhancement Opportunity]

   Finding: [Description of the gap or opportunity]

   Recommendation: [Specific suggestion for addressing it]

   Impact: [Low | Medium | High]
   Effort: [Low | Medium | High]

   Would you like to:
   (1) Add to story as new AC
   (2) Add as follow-up story note
   (3) Mark as out-of-scope (with justification)
   (4) Skip / Not relevant
   ```

2. Wait for user response before presenting the next item

3. Track user decisions for each item

**If user says NO:**
- Include all findings in plans/stories/elaboration/STORY-XXX/ELAB-STORY-XXX.md under "## Discovery Findings (Not Reviewed)"
- Proceed directly to verdict

-------------------------------------------------------------------------------
PM IMPROVEMENT NOTES (Write to Story)
-------------------------------------------------------------------------------

After the interactive discussion (or if user skipped), append to plans/stories/elaboration/STORY-XXX/STORY-XXX.md:

```markdown
## QA Discovery Notes (for PM Review)

_Added by QA Elaboration on [date]_

### Gaps Identified
| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | [finding] | [Added as AC / Follow-up / Out-of-scope / Skipped] | [any notes] |

### Enhancement Opportunities
| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | [finding] | [Added as AC / Follow-up / Out-of-scope / Skipped] | [any notes] |

### Follow-up Stories Suggested
- [ ] [Brief description of follow-up story 1]
- [ ] [Brief description of follow-up story 2]

### Items Marked Out-of-Scope
- [Item]: [Justification provided by user]
```

These notes are for PM to review during `/pm-fix-story` if the story needs refinement,
or to inform future story planning if the story passes.

Output:
Produce ONE markdown file only:
- plans/stories/elaboration/STORY-XXX/ELAB-STORY-XXX.md

The elaboration file MUST include:
- Overall verdict: PASS / CONDITIONAL PASS / FAIL / SPLIT REQUIRED
- Numbered list of issues with severity (Critical / High / Medium / Low)
- Explicit required fixes for all Critical and High issues
- Clear statement of what is acceptable as-is
- Explicit statement whether STORY-XXX may proceed to implementation
- If SPLIT REQUIRED verdict:
  - Proposed split structure (STORY-XXX-A, STORY-XXX-B, etc.)
  - AC allocation per split story
  - Recommended dependency order
  - Brief scope summary for each split
- Discovery Findings section:
  - Summary of gaps/blind spots identified
  - Summary of enhancement opportunities identified
  - User decisions for each item (if interactive discussion occurred)
  - List of suggested follow-up stories

Hard Constraints:
- Do NOT implement code
- Do NOT redesign the system
- Do NOT modify plans/stories/elaboration/STORY-XXX/STORY-XXX.md EXCEPT to append "## QA Discovery Notes" section
- Do NOT act as PM or Dev
- Do NOT provide implementation advice
- Do NOT generate additional files beyond plans/stories/elaboration/STORY-XXX/ELAB-STORY-XXX.md

If STORY-XXX fails, elaboration MUST clearly block progression.

-------------------------------------------------------------------------------
STATUS UPDATE (MANDATORY ON PASS)
-------------------------------------------------------------------------------

If the elaboration verdict is PASS or CONDITIONAL PASS:

1. Open the story file: plans/stories/elaboration/STORY-XXX/STORY-XXX.md
2. Locate the YAML frontmatter block at the top:
   ```
   status: backlog
   ```
3. Change `status: backlog` to `status: ready-to-work`

4. Move the story directory to ready-to-work:
   ```bash
   mkdir -p plans/stories/ready-to-work
   mv plans/stories/elaboration/STORY-XXX plans/stories/ready-to-work/STORY-XXX
   ```

5. Verify the move succeeded:
   ```bash
   ls plans/stories/ready-to-work/STORY-XXX/STORY-XXX.md
   ```

This signals to Dev that the story is approved for implementation.

If the elaboration verdict is FAIL:
1. Open the story file: plans/stories/elaboration/STORY-XXX/STORY-XXX.md
2. Change `status: backlog` to `status: needs-refinement`
3. This signals to PM that the story requires fixes before it can proceed

If the elaboration verdict is SPLIT REQUIRED:
1. Open the story file: plans/stories/elaboration/STORY-XXX/STORY-XXX.md
2. Change `status: backlog` to `status: needs-split`
3. This signals to PM that the story must be split before implementation
4. PM must create the split stories in stories.index.md and generate them via /pm-generate-story
5. Original STORY-XXX should be marked as `status: superseded` once splits are created

-------------------------------------------------------------------------------
TOKEN LOGGING (REQUIRED)
-------------------------------------------------------------------------------

After elaboration is complete, log token usage using the centralized skill:

1. Estimate token usage from `/cost` command output or byte calculations
2. Run: `/token-log STORY-XXX elaboration <input-tokens> <output-tokens>`

Example:
```
/token-log STORY-XXX elaboration 20000 2000
```

This logs the phase tokens to `_implementation/TOKEN-LOG.md` for tracking.

See `.claude/agents/_token-logging.md` for estimation formulas.

-------------------------------------------------------------------------------
DONE
-------------------------------------------------------------------------------

Stop when:
- ELAB-STORY-XXX.md is complete (including Discovery Findings)
- Token usage logged via `/token-log STORY-XXX elaboration`
- Story status is updated (based on verdict)
- QA Discovery Notes appended to STORY-XXX.md (if any findings)
- Interactive discussion completed (if user opted in)
- If PASS/CONDITIONAL PASS: Story directory moved to plans/stories/ready-to-work/STORY-XXX
