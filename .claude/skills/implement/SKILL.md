---
name: implement
description: Complete story implementation workflow from start to finish. Use when implementing user stories, features, or epics. Handles validation, development (with optional parallel execution), QA review, issue resolution, and PR creation. Can implement single stories, multiple stories, or entire epics in parallel.
---

# /implement - Complete Story Implementation Workflow

## Description

One-command story implementation from start to finish. Uses Claude Code's Task tool to spawn sub-agents for context-efficient parallel execution.

**Key Feature:** Heavy phases (development, QA) are delegated to sub-agents via the Task tool, minimizing context load on the main orchestrator.

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
```

## Parameters

- **story number(s)** - Single story (e.g., `1.1`) or multiple stories (e.g., `1.1,1.2,1.3`)
- **epic:{number}** - Implement all stories in an epic (e.g., `epic:3` for Epic 3)
- **--epic** - Treat the number as an epic number (e.g., `/implement 3 --epic`)
- **--parallel** - Use parallel sub-agent execution (faster for complex stories, **required for epics**)
- **--deep-review** - Use multi-specialist QA review (security, performance, accessibility)
- **--quick-review** - Use fast single-agent QA review
- **--skip-review** - Skip QA review (not recommended)

---

## EXECUTION INSTRUCTIONS

**CRITICAL: This skill uses Claude Code's Task tool to spawn sub-agents for heavy phases. This minimizes context load and enables true parallel execution.**

### Phase 0: Parse Arguments

Parse the provided arguments to determine:
- Story number(s) or epic reference
- Execution mode (single vs parallel)
- Review type (deep, quick, skip)

### Phase 1: Story Discovery & Validation

**For single story:**
Use the Explore sub-agent to find and validate the story file:

```
Task(
  subagent_type: "Explore",
  description: "Find and validate story file",
  prompt: "Find the story file for story {STORY_NUM} in docs/stories/ directory.
           Verify the file exists and extract:
           1. Story file path
           2. Story status (should be Approved, Ready, or Draft)
           3. GitHub issue number (if present)
           4. List of tasks from the story
           Return these details in a structured format."
)
```

**For epic:**
Use Explore to discover all stories in the epic:

```
Task(
  subagent_type: "Explore",
  description: "Discover epic stories",
  prompt: "Find all story files in docs/stories/ that match pattern '{EPIC_NUM}.*.md'.
           For each story, extract: file path, status, dependencies.
           Analyze dependencies and create execution waves.
           Return the ordered list of stories to implement."
)
```

### Phase 2: Development Setup

Create worktree for the story using git worktree commands:

1. Generate branch name from story (e.g., `feature/story-{STORY_NUM}-{slug}`)
2. Create worktree: `git worktree add tree/{branch_name} -b {branch_name}`
3. Navigate to worktree for implementation

### Phase 3: Implementation

**CRITICAL: Spawn sub-agent(s) for implementation to minimize context load.**

**Single-agent mode (default):**
```
Task(
  subagent_type: "general-purpose",
  description: "Implement story {STORY_NUM}",
  prompt: "You are implementing story {STORY_NUM}.

           Story file: {STORY_FILE_PATH}
           Working directory: tree/{branch_name}

           Read the story file and implement ALL tasks listed.
           For each task:
           1. Read and understand the requirement
           2. Implement the code changes
           3. Write tests for the changes
           4. Run tests to verify
           5. Commit changes with descriptive message

           Follow these guidelines:
           - Use @repo/ui for UI components
           - Use @repo/logger instead of console.log
           - Use Zod schemas for types
           - No barrel files
           - Minimum 45% test coverage

           Report completion status for each task."
)
```

**Parallel mode (--parallel):**
When multiple stories or tasks can be parallelized, spawn multiple sub-agents:

```
# Spawn sub-agents in parallel (single Task call with run_in_background: true)
Task(
  subagent_type: "general-purpose",
  description: "Implement story {STORY_1}",
  run_in_background: true,
  prompt: "..."  # Same as above for story 1
)

Task(
  subagent_type: "general-purpose",
  description: "Implement story {STORY_2}",
  run_in_background: true,
  prompt: "..."  # Same as above for story 2
)

# Later, collect results with TaskOutput
TaskOutput(task_id: "{agent_id_1}")
TaskOutput(task_id: "{agent_id_2}")
```

### Phase 4: Quality Assurance

**CRITICAL: Spawn QA sub-agent(s) to review implementation.**

**Quick review (--quick-review or default):**
```
Task(
  subagent_type: "general-purpose",
  description: "QA review for story {STORY_NUM}",
  prompt: "Review the implementation for story {STORY_NUM}.

           Working directory: tree/{branch_name}

           Perform these checks:
           1. Run full test suite: pnpm test
           2. Run type check: pnpm check-types
           3. Run linter: pnpm lint
           4. Check test coverage meets 45% minimum
           5. Verify all acceptance criteria from story are met
           6. Check for package duplication (no reimplementing @repo/ui, etc.)

           Report:
           - PASS/FAIL status for each check
           - List of issues found with severity (Critical, High, Medium, Low)
           - Overall gate decision (PASS, CONCERNS, FAIL)"
)
```

**Deep review (--deep-review):**
Spawn multiple specialist sub-agents in parallel:

```
# Security review
Task(
  subagent_type: "general-purpose",
  description: "Security review",
  run_in_background: true,
  prompt: "You are a security specialist. Review the changes in tree/{branch_name}.
           Check for: auth issues, injection vulnerabilities, data exposure,
           OWASP Top 10, CWE Top 25. Report findings with severity."
)

# Performance review
Task(
  subagent_type: "general-purpose",
  description: "Performance review",
  run_in_background: true,
  prompt: "You are a performance specialist. Review the changes in tree/{branch_name}.
           Check for: N+1 queries, missing indexes, bundle size impact,
           unnecessary re-renders. Report findings with estimated impact."
)

# Accessibility review
Task(
  subagent_type: "general-purpose",
  description: "Accessibility review",
  run_in_background: true,
  prompt: "You are an accessibility specialist. Review the changes in tree/{branch_name}.
           Check for: WCAG 2.1 AA compliance, keyboard navigation,
           screen reader support, ARIA labels. Report findings."
)

# Collect all results
TaskOutput(task_id: "{security_agent_id}")
TaskOutput(task_id: "{performance_agent_id}")
TaskOutput(task_id: "{accessibility_agent_id}")
```

### Phase 5: Issue Resolution

If QA found issues:

1. Display issues to user with severity
2. Ask if user wants auto-fix
3. If yes, spawn fix sub-agent:

```
Task(
  subagent_type: "general-purpose",
  description: "Fix QA issues for {STORY_NUM}",
  prompt: "Fix the following issues found during QA review:
           {ISSUES_LIST}

           Working directory: tree/{branch_name}

           For each issue:
           1. Understand the issue
           2. Implement the fix
           3. Write/update tests
           4. Verify fix works
           5. Commit with message referencing issue"
)
```

4. Re-run QA review after fixes

### Phase 6: Create Pull Request

After QA passes:

1. Push branch to remote: `git push -u origin {branch_name}`
2. Create PR using gh CLI:
   ```bash
   gh pr create --title "feat: {story_title}" --body "..."
   ```
3. Link PR to GitHub issue if present

### Phase 7: Summary

Report to user:
- Story number and title
- Execution mode used
- Time taken
- QA status
- PR URL
- Next steps

---

## Sub-Agent Architecture

This workflow uses Claude Code's Task tool to spawn sub-agents:

```
Main Orchestrator (this skill)
    │
    ├── Explore Sub-Agent
    │   └── Story discovery and validation
    │
    ├── Implementation Sub-Agent(s)
    │   └── Code implementation per story
    │
    └── QA Sub-Agent(s)
        ├── Quick review (single agent)
        └── Deep review (parallel specialists)
```

**Benefits of this architecture:**
- **Reduced context load**: Heavy implementation and QA phases run in isolated contexts
- **True parallelism**: Multiple stories/reviews can run concurrently
- **Focused expertise**: Each sub-agent receives only relevant context
- **Scalability**: Can handle epics with many stories without context overflow

## When to Use Each Mode

### Use Default (Single-Agent)
- Simple UI changes
- Documentation updates
- Small bug fixes
- Configuration changes
- Single-file modifications

### Use --parallel
- Multi-component features
- Full-stack implementations
- Complex business logic
- Multiple related changes
- Performance-critical features

### Use --deep-review
- Security-sensitive features (auth, payments, data access)
- Public-facing features
- Performance-critical paths
- Accessibility-required features
- Production deployments

### Use --quick-review
- Internal tools
- Development/staging only
- Low-risk changes
- Hotfixes (after manual review)
