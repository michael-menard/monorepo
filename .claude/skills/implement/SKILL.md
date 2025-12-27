---
name: implement
description: Complete story implementation workflow from start to finish. Use when implementing user stories, features, or epics. Handles validation, development (with optional parallel execution), QA review, issue resolution, and PR creation. Can implement single stories, multiple stories, or entire epics in parallel.
---

# /implement - Complete Story Implementation Workflow

## Description

One-command story implementation from start to finish. Uses Claude Code's Task tool to spawn sub-agents for context-efficient parallel execution.

**Key Features:**
- Heavy phases (development, QA) delegated to sub-agents via Task tool
- Pre-flight checks validate environment before starting
- Resume capability for interrupted work
- Dry-run mode to preview actions
- Smart auto-detection of parallel mode

## Usage

```bash
# Simple story (single-agent)
/implement 1.2

# Complex story (parallel sub-agents)
/implement 1.1 --parallel

# With deep multi-specialist review
/implement 1.1 --parallel --deep-review

# Multiple stories in parallel
/implement 1.1,1.2,1.3 --parallel

# Quick review (skip deep analysis)
/implement 1.2 --quick-review

# Implement entire epic
/implement epic:3 --parallel --deep-review

# Implement epic (shorthand)
/implement 3 --epic --parallel --deep-review

# Preview what would happen (no changes made)
/implement 1.2 --dry-run

# Resume interrupted work
/implement 1.2 --resume
```

## Parameters

- **story number(s)** - Single story (e.g., `1.1`) or multiple stories (e.g., `1.1,1.2,1.3`)
- **epic:{number}** - Implement all stories in an epic (e.g., `epic:3` for Epic 3)
- **--epic** - Treat the number as an epic number
- **--parallel** - Use parallel sub-agent execution (auto-enabled for epics and complex stories)
- **--deep-review** - Multi-specialist QA review (security, performance, accessibility)
- **--quick-review** - Fast single-agent QA review
- **--skip-review** - Skip QA review (not recommended)
- **--dry-run** - Preview what would happen without making changes
- **--resume** - Continue from existing worktree/branch if present

---

## EXECUTION INSTRUCTIONS

**CRITICAL: Follow these phases in order. Use Claude Code's Task tool for sub-agents. Use TodoWrite to track progress.**

---

## Phase -1: Pre-Flight Checks

**Run these checks BEFORE any other work. Fail fast on critical issues.**

```
1. GitHub CLI Authentication
   Run: gh auth status
   - FAIL if not authenticated
   - Provide: "Run 'gh auth login' to authenticate"

2. Git Status Check
   Run: git status --porcelain
   - WARN if uncommitted changes exist
   - ASK user: "Uncommitted changes detected. Continue anyway?"
   - Note: --resume flag skips this warning

3. Git Branch Check
   Run: git branch --show-current
   - FAIL if empty (detached HEAD state)
   - Provide: "Checkout a branch first: git checkout main"

4. Remote Accessibility
   Run: git ls-remote --exit-code origin (with timeout)
   - FAIL if cannot reach remote
   - Provide: "Check network connection or git remote configuration"

5. Story File Exists (quick check)
   Run: ls docs/stories/{STORY_NUM}.*.md
   - FAIL if no matching files
   - Provide: "Story file not found. Create with /create-story {STORY_NUM}"
```

**If --dry-run:** Report all check results and STOP here.

---

## Phase 0: Parse Arguments & Initialize

Parse the provided arguments to determine:
- Story number(s) or epic reference
- Execution mode (single vs parallel)
- Review type (deep, quick, skip)
- Special flags (--dry-run, --resume)

**Initialize progress tracking:**
```
TodoWrite([
  { content: "Pre-flight checks", status: "completed", activeForm: "Running pre-flight checks" },
  { content: "Story discovery & validation", status: "in_progress", activeForm: "Discovering story" },
  { content: "Development setup", status: "pending", activeForm: "Setting up development" },
  { content: "Implementation", status: "pending", activeForm: "Implementing story" },
  { content: "Quality assurance", status: "pending", activeForm: "Running QA review" },
  { content: "Create pull request", status: "pending", activeForm: "Creating PR" }
])
```

---

## Phase 1: Story Discovery & Validation

**Use haiku model for fast, lightweight validation:**

```
Task(
  subagent_type: "Explore",
  model: "haiku",
  description: "Validate story {STORY_NUM}",
  prompt: "Find and validate story file for story {STORY_NUM}.

           Search in: docs/stories/
           Pattern: {STORY_NUM}.*.md

           Extract and return:
           1. story_file_path: Full path to story file
           2. story_title: Title from story file
           3. story_status: Status field (Approved, Ready, Draft, In Progress, Done, etc.)
           4. github_issue: Issue number if present (e.g., #123)
           5. tasks: List of task checkboxes from the story
           6. dependencies: Any story dependencies mentioned
           7. acceptance_criteria: List of acceptance criteria

           Validation rules:
           - FAIL if status is 'Done', 'Complete', or 'Implemented'
           - WARN if status is not 'Approved' or 'Ready'
           - WARN if no GitHub issue linked

           Return as structured data."
)
```

**For epic - filter out completed stories:**
```
Task(
  subagent_type: "Explore",
  model: "haiku",
  description: "Discover epic {EPIC_NUM} stories",
  prompt: "Find all implementable stories in Epic {EPIC_NUM}.

           Search: docs/stories/{EPIC_NUM}.*.md

           For each story, extract: file path, status, dependencies.

           FILTER OUT stories with status: Done, Complete, Implemented, Ready for Review

           Analyze dependencies between remaining stories.
           Create execution waves (stories with no deps first, then dependent stories).

           Return ordered list of stories to implement."
)
```

**Smart parallel detection:**
If story has 5+ tasks OR touches 3+ directories → suggest `--parallel`

---

## Phase 2: Development Setup (Resume-Aware)

**Check for existing worktree/branch first:**

```bash
# Generate expected branch name
BRANCH_NAME="feature/story-{STORY_NUM}-{slug}"

# Check if worktree already exists
git worktree list | grep "{BRANCH_NAME}"

# Check if branch exists
git branch --list "{BRANCH_NAME}"
git branch -r --list "origin/{BRANCH_NAME}"
```

**If --resume or existing work found:**
- Switch to existing worktree: `cd tree/{BRANCH_NAME}`
- Pull latest if remote exists: `git pull --rebase origin {BRANCH_NAME}`
- Report: "Resuming work on existing branch"

**If creating new:**
1. Ensure on main and up-to-date: `git checkout main && git pull`
2. Create worktree: `git worktree add tree/{BRANCH_NAME} -b {BRANCH_NAME}`
3. Navigate: `cd tree/{BRANCH_NAME}`

**Update GitHub issue (if present):**
```bash
gh issue edit {ISSUE_NUMBER} --add-label "in-progress"
gh issue comment {ISSUE_NUMBER} --body "Implementation started by Claude Code"
```

---

## Phase 3: Implementation

**CRITICAL: Spawn sub-agent with full project context.**

**Read CLAUDE.md first to include in prompt:**
```
CLAUDE_MD_CONTENT = Read("/path/to/CLAUDE.md")
```

**Single-agent mode (default):**
```
Task(
  subagent_type: "general-purpose",
  description: "Implement story {STORY_NUM}",
  prompt: "You are implementing story {STORY_NUM}.

           ## Project Guidelines (MUST FOLLOW)
           {CLAUDE_MD_CONTENT}

           ## Story Details
           Story file: {STORY_FILE_PATH}
           Working directory: tree/{BRANCH_NAME}
           Tasks to implement:
           {TASK_LIST}

           ## Implementation Process
           For each task:
           1. Read and understand the requirement
           2. Implement the code changes following project guidelines
           3. Write tests (minimum 45% coverage)
           4. Run tests to verify: pnpm test
           5. Run type check: pnpm check-types
           6. Commit with descriptive message

           ## Critical Rules (from CLAUDE.md)
           - Use @repo/ui for ALL UI components
           - Use @repo/logger instead of console.log
           - Use Zod schemas for types (never TypeScript interfaces)
           - NO barrel files
           - Follow component directory structure

           ## Output
           Report completion status for each task.
           List any issues encountered.
           Provide summary of files changed."
)
```

**Parallel mode (--parallel):**
```
# For multiple stories, spawn in parallel with run_in_background
Task(
  subagent_type: "general-purpose",
  description: "Implement story {STORY_1}",
  run_in_background: true,
  prompt: "..."  # Same as above with story-specific details
)

Task(
  subagent_type: "general-purpose",
  description: "Implement story {STORY_2}",
  run_in_background: true,
  prompt: "..."
)

# Collect results
TaskOutput(task_id: "{agent_id_1}")
TaskOutput(task_id: "{agent_id_2}")
```

**Update progress:**
```
TodoWrite([
  ...previous todos marked complete...,
  { content: "Quality assurance", status: "in_progress", activeForm: "Running QA review" }
])
```

---

## Phase 4: Quality Assurance

**CRITICAL: Use the `/review` or `/qa-gate` skills instead of inline logic.**

**Quick review (--quick-review or default):**

Invoke the `/qa-gate` skill for fast checks:

```
Skill(
  skill: "qa-gate",
  args: "{STORY_NUM}"
)
```

This runs:
- Tests, type checking, linting
- Produces gate file at `docs/qa/gates/{story}-{slug}.yml`
- Returns PASS/CONCERNS/FAIL decision

**Deep review (--deep-review):**

Invoke the `/review` skill for comprehensive analysis:

```
Skill(
  skill: "review",
  args: "{STORY_NUM}"
)
```

This runs:
- All required checks (tests, types, lint)
- 7 specialist sub-agents in parallel:
  - Requirements traceability
  - Code quality
  - Security
  - Performance
  - Accessibility
  - Test coverage
  - Technical debt
- Aggregates findings
- Calls `/qa-gate` to produce gate file
- Updates story with QA Results section

**Gate decision comes from the skill:**
- PASS: No issues or only low severity
- CONCERNS: Medium severity issues present
- FAIL: High severity issues or check failures

---

## Phase 5: Issue Resolution

**If gate is FAIL or CONCERNS:**

1. Display issues to user organized by severity
2. Ask: "Auto-fix issues? (y/n)"

**If yes, spawn fix agent:**
```
Task(
  subagent_type: "general-purpose",
  description: "Fix QA issues for {STORY_NUM}",
  prompt: "Fix these issues found during QA:

           {ISSUES_LIST_WITH_DETAILS}

           Working directory: tree/{BRANCH_NAME}

           ## Project Guidelines
           {CLAUDE_MD_CONTENT}

           For each issue:
           1. Understand the root cause
           2. Implement the fix following project guidelines
           3. Add/update tests to prevent regression
           4. Verify fix works
           5. Commit with message: 'fix: {issue description}'

           Report status for each issue fixed."
)
```

3. Re-run QA review after fixes
4. If still FAIL after 2 attempts → report to user and STOP

---

## Phase 6: Create Pull Request

**Only proceed if gate is PASS (or CONCERNS with user approval).**

```bash
# Ensure all changes committed
git add -A
git status --porcelain
# If uncommitted changes, commit them

# Push branch
git push -u origin {BRANCH_NAME}

# Create PR
gh pr create \
  --title "feat({scope}): {story_title}" \
  --body "## Summary
Implements Story {STORY_NUM}: {story_title}

## Changes
{LIST_OF_CHANGES}

## Test Plan
{ACCEPTANCE_CRITERIA_AS_CHECKLIST}

## QA Status
Gate: {GATE_STATUS}
{QA_SUMMARY}

Closes #{ISSUE_NUMBER}

---
Generated with [Claude Code](https://claude.com/claude-code)"
```

**Update GitHub issue:**
```bash
gh issue edit {ISSUE_NUMBER} --remove-label "in-progress" --add-label "ready-for-review"
gh issue comment {ISSUE_NUMBER} --body "PR created: {PR_URL}"
```

---

## Phase 7: Summary

**Report to user:**
```
═══════════════════════════════════════════════════════
  Story Implementation Complete
═══════════════════════════════════════════════════════

Story:      {STORY_NUM} - {STORY_TITLE}
Mode:       {single|parallel}
Review:     {quick|deep|skip}

Results:
  Files changed:  {N}
  Tests added:    {N}
  Coverage:       {N}%

QA Status:  {PASS|CONCERNS|FAIL}
  - Tests:        {PASS|FAIL}
  - Types:        {PASS|FAIL}
  - Lint:         {PASS|FAIL}
  {If deep review:}
  - Security:     {N issues}
  - Performance:  {N issues}
  - Accessibility:{N issues}

Pull Request: {PR_URL}
GitHub Issue: #{ISSUE_NUMBER} (labeled: ready-for-review)

Next Steps:
  - Review PR at {PR_URL}
  - Merge when approved
  - Worktree at: tree/{BRANCH_NAME}
═══════════════════════════════════════════════════════
```

**Clear todos:**
```
TodoWrite([])
```

---

## Sub-Agent Architecture

```
Main Orchestrator (this skill)
    │
    ├─▶ Pre-Flight Checks (inline, no sub-agent)
    │
    ├─▶ Task(Explore, haiku) ─── Story discovery/validation
    │
    ├─▶ Task(general-purpose) ─── Implementation
    │       └── Includes CLAUDE.md guidelines
    │
    └─▶ Task(general-purpose, haiku) ─── QA Review
            ├── Quick: Single agent
            └── Deep: Parallel specialists
                 ├── Security
                 ├── Performance
                 └── Accessibility
```

**Model Selection:**
- `haiku` - Validation, quick checks, specialist reviews (fast, cheap)
- `sonnet` (default) - Implementation, complex fixes (balanced)
- `opus` - Only if explicitly requested or critical decision needed

---

## Error Handling

**Critical Failures (STOP immediately):**
- Pre-flight check failures (gh auth, git state)
- Story file not found
- Story already completed
- QA gate FAIL after 2 fix attempts

**Recoverable Issues (warn and continue):**
- Uncommitted changes (with user approval)
- Missing GitHub issue link
- Story status not Approved/Ready

**Resume on Failure:**
Work is preserved in worktree. User can:
1. Fix issues manually
2. Run `/implement {story} --resume` to continue

---

## When to Use Each Mode

### Default (Single-Agent)
- Simple UI changes
- Documentation updates
- Small bug fixes
- Single-file modifications

### --parallel (Auto-suggested when beneficial)
- Multi-component features
- Full-stack implementations
- 5+ tasks in story
- Changes spanning 3+ directories

### --deep-review
- Security-sensitive (auth, payments, data access)
- Public-facing features
- Performance-critical paths
- Accessibility requirements

### --quick-review
- Internal tools
- Low-risk changes
- Hotfixes (after manual review)

### --dry-run
- Preview before starting
- Verify story is ready
- Check environment setup

### --resume
- Continue interrupted work
- Re-run after manual fixes
