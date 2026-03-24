---
name: review-draft-story
description: Comprehensive draft story review with parallel specialist sub-agents. Spawns PM, UX, and SM agents to review stories from product, design, and implementation readiness perspectives before development begins.
---

# /review-draft-story - Draft Story Review

## Description

Full-spectrum story review using parallel specialist sub-agents BEFORE implementation begins. Each specialist reviews from their domain perspective, findings are aggregated, and a final readiness decision is produced.

**Key Features:**

- Parallel specialist sub-agents (PM, UX, SM/Checklist)
- Product requirements completeness validation
- UX/UI specification review
- Implementation readiness assessment
- Consolidated feedback and recommendations
- GO/NO-GO decision with actionable fixes

## Usage

```bash
# Review a specific story
/review-draft-story 2002

# Review a story by ID
/review-draft-story WISH-2002

# Quick review (skip deep analysis)
/review-draft-story 2002 --quick

# Focus on specific aspect
/review-draft-story 2002 --focus=ux

# Skip PM review (no product context available)
/review-draft-story 2002 --skip-pm
```

## Parameters

- **story** - Story number (e.g., `2002`) or full path to story file
- **--quick** - Run lightweight review, skip deep specialists
- **--focus** - Focus on specific aspect: `pm`, `ux`, or `sm`
- **--skip-pm** - Skip PM review if no PRD/epic context
- **--skip-ux** - Skip UX review if no UI in this story

---

## EXECUTION INSTRUCTIONS

**CRITICAL: Use Task tool to spawn parallel sub-agents. Use TodoWrite to track progress.**

---

## Context Optimization Strategy

**To minimize context consumption:**

1. **Don't load epic/architecture content into parent** - only get file paths
2. **Pass file paths to sub-agents** - let them read files directly
3. **Use concise YAML output** - only report issues, not all sections
4. **SM checklist: reference file** - don't duplicate all items in prompt
5. **Use Haiku for sub-agents** - faster and cheaper

**Impact:** Reduces parent context by 60-80% for stories with large epic/architecture docs.

---

## Phase 0: Initialize & Gather Context

```
TodoWrite([
  { content: "Gather story context", status: "in_progress", activeForm: "Gathering context" },
  { content: "Spawn specialist sub-agents", status: "pending", activeForm: "Spawning specialists" },
  { content: "Collect specialist feedback", status: "pending", activeForm: "Collecting feedback" },
  { content: "Aggregate findings", status: "pending", activeForm: "Aggregating findings" },
  { content: "Generate review report", status: "pending", activeForm: "Generating report" }
])
```

**Gather context:**

1. Fetch story from KB: `kb_get_story({ story_id: "{STORY_ID}", include_artifacts: true })`
2. Extract from the KB story record:
   - Title and description
   - Acceptance criteria
   - Tasks/subtasks
   - Dev Notes (from story fields or attached artifacts)
   - Testing section
   - Referenced files/architecture paths (just paths, not content)
3. Get parent epic from KB if referenced: `kb_search({ query: "epic {epic_name}", tags: ["plan"] })`
4. Get architecture doc references if present (don't read content — pass references to sub-agents)
5. Determine if story has UI components (affects UX review)

**OPTIMIZATION: Don't load epic/architecture content into parent context - pass file paths to sub-agents**

**Skip Logic:**

- Skip UX review if story has no UI components (API-only, backend, migrations)
- Skip PM review if `--skip-pm` or no epic/PRD context available

---

## Phase 1: Spawn Specialist Sub-Agents

**CRITICAL: Spawn all applicable specialists in parallel using run_in_background: true**

### 1.1 Product Manager (PM) Specialist

````
Task(
  subagent_type: "general-purpose",
  model: "haiku",
  description: "PM story review",
  run_in_background: true,
  prompt: "You are John, an experienced Product Manager reviewing a story draft.

           Story ID: {STORY_ID}
           Epic KB reference: {EPIC_KB_ID or 'Not provided'}

           IMPORTANT: Fetch the story from KB: kb_get_story({ story_id: '{STORY_ID}', include_artifacts: true }). If epic reference provided, fetch it from KB for context.

           Review the story from a PRODUCT perspective:

           1. **Requirements Clarity**
              - Are requirements clearly defined and unambiguous?
              - Is the 'why' (business value) clearly articulated?
              - Are success metrics or outcomes defined?

           2. **Scope Appropriateness**
              - Is the scope right-sized for a single story?
              - Are there scope creep risks?
              - Should this be split into multiple stories?

           3. **User Value**
              - Is user value clearly identified?
              - Does the story solve a real user problem?
              - Is the user persona/context clear?

           4. **Acceptance Criteria Quality**
              - Are ACs testable and measurable?
              - Do ACs cover happy path AND edge cases?
              - Are ACs written from user perspective (not technical)?

           5. **Dependencies & Sequencing**
              - Are dependencies clearly identified?
              - Is this story properly sequenced in the epic?
              - Are there hidden dependencies?

           6. **Risk Identification**
              - Are potential risks called out?
              - Are there business/compliance considerations?
              - Is there fallback behavior defined?

           Output format (ONLY include sections with issues):
           ```yaml
           pm_review:
             overall_assessment: READY|NEEDS_WORK|BLOCKED
             confidence: high|medium|low

             issues:
               - category: requirements_clarity|scope|user_value|acceptance_criteria|dependencies|risks
                 severity: blocking|should_fix|note
                 issue: 'Clear description'
                 suggestion: 'How to fix'

             summary: 'Brief 1-2 sentence assessment'
           ```

           NOTE: Only list actual issues. Omit categories with no concerns."
)
````

### 1.2 UX Expert Specialist

````
Task(
  subagent_type: "general-purpose",
  model: "haiku",
  description: "UX story review",
  run_in_background: true,
  prompt: "You are Sally, an experienced UX Expert reviewing a story draft.

           Story ID: {STORY_ID}
           Architecture file paths: {ARCHITECTURE_FILE_PATHS or 'Not provided'}

           IMPORTANT: Fetch the story from KB: kb_get_story({ story_id: '{STORY_ID}', include_artifacts: true }). If architecture paths provided, read them for context.

           Review the story from a UX/UI perspective:

           1. **User Flow Clarity**
              - Is the user journey clearly described?
              - Are entry/exit points defined?
              - Is the happy path obvious?

           2. **Interaction Design**
              - Are user interactions specified?
              - Are click/tap targets and gestures defined?
              - Is feedback for user actions specified?

           3. **Visual Specifications**
              - Are layout requirements clear?
              - Is component placement described?
              - Are spacing/sizing considerations mentioned?

           4. **State Handling**
              - Are loading states defined?
              - Are error states and messages specified?
              - Are empty states considered?
              - Is disabled state behavior clear?

           5. **Accessibility Considerations**
              - Are a11y requirements mentioned?
              - Is keyboard navigation considered?
              - Are screen reader needs addressed?

           6. **Responsive Design**
              - Are mobile/tablet considerations mentioned?
              - Are breakpoint behaviors defined?
              - Is touch vs mouse interaction considered?

           7. **Component Reusability**
              - Can existing components be reused?
              - Are new components clearly specified?
              - Is design system alignment mentioned?

           Output format (ONLY include sections with issues):
           ```yaml
           ux_review:
             overall_assessment: READY|NEEDS_WORK|BLOCKED
             confidence: high|medium|low
             ui_complexity: low|medium|high

             issues:
               - category: user_flow|interaction|visual|states|accessibility|responsive|components
                 severity: blocking|should_fix|note
                 issue: 'Clear description'
                 suggestion: 'How to fix'

             summary: 'Brief 1-2 sentence assessment'
           ```

           NOTE: Only list actual issues. Omit categories with no concerns."
)
````

### 1.3 Scrum Master / Implementation Readiness Specialist

**This sub-agent executes the standard story draft checklist criteria.**

````
Task(
  subagent_type: "general-purpose",
  model: "haiku",
  description: "SM checklist review",
  run_in_background: true,
  prompt: "You are Bob, a Scrum Master executing the Story Draft Checklist.

           Story ID: {STORY_ID}

           IMPORTANT:
           1. Fetch the story from KB: kb_get_story({ story_id: '{STORY_ID}', include_artifacts: true })
           2. Use the standard story draft checklist criteria:
              - Requirements clarity: Are requirements clearly defined and unambiguous?
              - Technical guidance: Are technical decisions and architecture guidance provided?
              - Testing: Are test scenarios defined including error/edge cases?
              - Self-containment: Can a developer implement this without seeking additional context?
              - Tasks: Are tasks broken down to a manageable level?
           3. Execute each checklist item systematically
           4. For each item, mark: [x] PASS, [~] PARTIAL, [ ] FAIL
           5. Identify blocking vs should_fix vs note issues

           Output format (ONLY include actual issues):
           ```yaml
           sm_review:
             overall_assessment: READY|NEEDS_REVISION|BLOCKED
             clarity_score: 1-10
             could_implement: true|false

             issues:
               - category: goal_clarity|technical_guidance|references|self_containment|testing
                 severity: blocking|should_fix|note
                 issue: 'Clear description of what''s missing or unclear'
                 suggestion: 'How to fix'

             developer_questions:
               - 'Question a dev would have'

             summary: 'Brief 1-2 sentence assessment from dev perspective'
           ```

           NOTE: Only list actual issues. If everything passes, issues array should be empty."
)
````

---

## Phase 2: Collect Results

**Wait for all specialists to complete:**

```
results = {
  pm: TaskOutput(task_id: "{pm_id}", block: true),
  ux: TaskOutput(task_id: "{ux_id}", block: true),
  sm: TaskOutput(task_id: "{sm_id}", block: true)
}
```

---

## Phase 3: Synthesize Concerns

**Parent orchestrator extracts and synthesizes all sub-agent findings into a unified concerns list:**

```yaml
concerns:
  - id: 1
    source: pm|ux|sm
    severity: blocking|should_fix|note
    category: requirements|scope|ux|technical|testing|etc
    concern: 'Clear description of the issue'
    suggestion: 'How to address it'
```

**Severity Levels:**

- **blocking**: Must fix before story can proceed
- **should_fix**: Important issue that should be addressed
- **note**: Minor observation, nice-to-have improvement

**Synthesis Rules (MUCH SIMPLER NOW):**

1. Parse YAML output from each sub-agent
2. Concatenate all `issues` arrays from PM, UX, and SM
3. Add sequential IDs and source labels
4. Sort by severity (blocking → should_fix → note)
5. Deduplicate if needed (keep highest severity)

**Example:**

```python
all_issues = pm_review.issues + ux_review.issues + sm_review.issues
concerns = [
  {id: i+1, source: issue.source, **issue}
  for i, issue in enumerate(sorted(all_issues, key=lambda x: severity_rank[x.severity]))
]
```

---

## Phase 4: Decision & Action

**Decision Logic:**

```python
blocking_count = len([c for c in concerns if c.severity == 'blocking'])
should_fix_count = len([c for c in concerns if c.severity == 'should_fix'])

if blocking_count > 0:
    decision = 'FAIL'
    action = 'APPEND_CONCERNS_TO_STORY'
elif should_fix_count > 0:
    decision = 'CONCERNS'
    action = 'APPEND_CONCERNS_TO_STORY'
else:
    decision = 'PASS'
    action = 'APPROVE_STORY'  # or MERGE_PR if post-implementation
```

---

### Path A: FAIL or CONCERNS → Write Review Artifact to KB

**Write concerns as a KB review artifact:**

Call `kb_write_artifact({ story_id: "{STORY_ID}", artifact_type: "review", artifact_name: "REVIEW-DRAFT", content: {concerns_content} })` with the following content structure:

```yaml
review_date: '{ISO-8601}'
reviewed_by: 'PM (John), UX (Sally), SM (Bob)'
decision: '{FAIL|CONCERNS}'

blocking_issues:
  - id: 1
    source: pm
    category: requirements
    concern: 'User value not clearly articulated'
    suggestion: 'Add explicit user benefit statement to story description'

  - id: 2
    source: sm
    category: testing
    concern: 'No test scenarios defined for error cases'
    suggestion: 'Add error handling test cases to Testing section'

should_fix_issues:
  - id: 3
    source: ux
    category: states
    concern: 'Loading state not specified'
    suggestion: 'Define skeleton/spinner behavior during data fetch'

notes:
  - id: 4
    source: pm
    category: scope
    concern: 'Consider splitting into two stories if complexity grows'
```

**Update story status in KB:**

```
kb_update_story_status({ story_id: "{STORY_ID}", status: "needs_revision" })  # if FAIL
kb_update_story_status({ story_id: "{STORY_ID}", status: "created" })         # if CONCERNS (can proceed with awareness)
```

---

### Path B: PASS (No Concerns) → Auto-Approve

**When all sub-agents return zero blocking or should_fix concerns:**

#### For Draft Story Review (pre-implementation):

1. **Update story status to Approved in KB:**

   ```
   kb_update_story_status({ story_id: "{STORY_ID}", status: "ready" })
   ```

2. **Write approval artifact to KB:**

   ```
   kb_write_artifact({ story_id: "{STORY_ID}", artifact_type: "review", artifact_name: "REVIEW-DRAFT", content: {
     review_date: "{ISO-8601}",
     reviewed_by: "PM (John), UX (Sally), SM (Bob)",
     decision: "APPROVED",
     summary: "All review criteria passed. Story is ready for implementation."
   }})
   ```

3. **Report success and next step:**
   ```
   ✓ APPROVED - Ready for /implement {story_id}
   ```

#### For PR Review (post-implementation):

1. **Merge the PR:**

   ```bash
   gh pr merge {PR_NUMBER} --squash --delete-branch
   ```

2. **Update story status to Done in KB:**

   ```
   kb_update_story_status({ story_id: "{STORY_ID}", status: "UAT" })
   ```

3. **Close associated GitHub issue (if any):**
   ```bash
   gh issue close {ISSUE_NUMBER} --comment "Completed and merged in PR #{PR_NUMBER}"
   ```

---

## Phase 5: Report to User

```
════════════════════════════════════════════════════════════════════
  Story Review: {STORY_ID} - {STORY_TITLE}
════════════════════════════════════════════════════════════════════

SPECIALIST RESULTS
──────────────────────────────────────────────────────────────────────
  PM (John):      {PASS|CONCERNS} - {1-line summary}
  UX (Sally):     {PASS|CONCERNS|SKIPPED} - {1-line summary}
  SM (Bob):       {PASS|CONCERNS} - {1-line summary}

──────────────────────────────────────────────────────────────────────
  DECISION:       {PASS|CONCERNS|FAIL}
  CONCERNS:       {N} total ({blocking} blocking, {should_fix} should-fix)
──────────────────────────────────────────────────────────────────────

{If concerns > 0:}
CONCERNS LIST
  1. [{severity}] {source}: {concern}
     → {suggestion}
  2. ...

ACTION TAKEN
  {If PASS - draft:}    Story approved. Status: Draft → Approved
  {If PASS - PR:}       PR #{N} merged. Story archived. Status: Done
  {If CONCERNS/FAIL:}   Concerns appended to story. Status: Needs Revision

NEXT STEPS
  {If PASS:}            → /implement {story_id}
  {If CONCERNS/FAIL:}   → Address concerns, then re-run /review-draft-story

════════════════════════════════════════════════════════════════════
```

---

## Sub-Agent Architecture

```
Main Orchestrator (/review-draft-story)
    │
    ├─▶ Phase 0: Context Gathering (inline)
    │   ├── Fetch story from KB (kb_get_story)
    │   ├── Load epic context from KB (if available)
    │   ├── Detect if PR exists (post-impl review)
    │   └── Determine applicable reviews (skip UX for API-only, etc.)
    │
    ├─▶ Phase 1: Specialist Sub-Agents (parallel, haiku, run_in_background)
    │   ├── PM (John) - product/requirements perspective
    │   ├── UX (Sally) - design/interaction perspective
    │   └── SM (Bob) - checklist execution
    │
    ├─▶ Phase 2: Collect Results (blocking wait for all)
    │
    ├─▶ Phase 3: Synthesize Concerns (inline)
    │   ├── Parse each sub-agent's YAML output
    │   ├── Extract issues as concerns
    │   ├── Deduplicate and sort by severity
    │   └── Build unified concerns list
    │
    ├─▶ Phase 4: Decision & Action (inline)
    │   ├── IF no concerns → PASS → approve/merge
    │   └── IF concerns → FAIL/CONCERNS → append to story
    │
    └─▶ Phase 5: Report (inline)
```

---

## Concern Categories

| Source | Categories                                                                     |
| ------ | ------------------------------------------------------------------------------ |
| PM     | requirements, scope, user_value, acceptance_criteria, dependencies, risks      |
| UX     | user_flow, interaction, visual, states, accessibility, responsive, components  |
| SM     | goal_clarity, technical_guidance, references, self_containment, testing, tasks |

---

## Usage Modes

### Draft Story Review (pre-implementation)

```bash
/review-draft-story 2002
```

- Reviews story before coding begins
- PASS → status becomes "Approved", ready for `/implement`
- CONCERNS/FAIL → concerns appended, status becomes "Needs Revision"

### PR Review (post-implementation)

```bash
/review-draft-story 2002 --pr
```

- Reviews story after implementation, with associated PR
- PASS → PR merged, story archived, status becomes "Done"
- CONCERNS/FAIL → concerns appended, PR remains open

### Quick Review

```bash
/review-draft-story 2002 --quick
```

- Lightweight review, skips deep analysis
- Good for simple stories or re-reviews after fixes

### Skip Specific Reviewers

```bash
/review-draft-story 2002 --skip-ux    # API-only story
/review-draft-story 2002 --skip-pm    # No PRD context available
```

---

## Integration with BMAD Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    BMAD Story Lifecycle                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. /sm *draft              Create story                        │
│         ↓                                                       │
│  2. /review-draft-story     ← THIS SKILL (pre-impl)             │
│         ↓                                                       │
│     ┌───┴───┐                                                   │
│   PASS    FAIL/CONCERNS                                         │
│     ↓         ↓                                                 │
│  Approved   Fix & Re-review                                     │
│     ↓                                                           │
│  3. /implement {story}      Code the story                      │
│         ↓                                                       │
│  4. /review-draft-story --pr  ← THIS SKILL (post-impl)          │
│         ↓                                                       │
│     ┌───┴───┐                                                   │
│   PASS    CONCERNS                                              │
│     ↓         ↓                                                 │
│  Merged    Fix & Re-review                                      │
│  & Done                                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```
