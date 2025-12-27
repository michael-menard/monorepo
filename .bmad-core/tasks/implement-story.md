<!-- Powered by BMAD™ Core -->

# Implement Story Task

## Purpose

Automate the complete story implementation workflow from creation to deployment, with support for both traditional single-agent and parallel sub-agent execution.

**NEW:** Now supports implementing entire epics! Pass an epic number and all stories in that epic will be discovered and implemented in parallel.

## Usage

```bash
# Traditional single-agent (simple stories)
*implement story=1.1

# Parallel sub-agent execution (complex stories)
*implement story=1.1 mode=parallel

# Multiple stories in parallel
*implement stories=[1.1,1.2,1.3] mode=parallel

# With automatic QA deep review
*implement story=1.1 mode=parallel review=deep

# Quick mode (skip deep review for simple changes)
*implement story=1.1 review=quick

# ✨ NEW: Implement entire epic
*implement epic=3 mode=parallel review=deep
```

## Parameters

- **story** - Single story number (e.g., `1.1`)
- **stories** - Multiple story numbers (e.g., `[1.1,1.2,1.3]`)
- **epic** - Epic number (e.g., `3` for Epic 3) - discovers and implements all stories in the epic
- **mode** - Execution mode:
  - `single` (default) - Traditional single-agent development
  - `parallel` - Parallel sub-agent development (**required for epics**)
- **review** - QA review type:
  - `deep` (default) - Multi-specialist comprehensive review
  - `quick` - Fast single-agent review
  - `skip` - Skip QA review (not recommended)

## Workflow

### Phase 0: Epic Discovery (if epic parameter provided) ✨ NEW

```bash
# If epic parameter is provided, discover all stories in that epic
if [ -n "$EPIC_NUM" ]; then
  echo "🔍 Discovering stories in Epic $EPIC_NUM..."

  # Load configuration to get story location
  STORY_LOCATION=$(yq '.devStoryLocation' .bmad-core/core-config.yaml)

  # Find all story files for this epic
  STORY_FILES=$(find "$STORY_LOCATION" -name "${EPIC_NUM}.*.md" -type f | sort)
  STORY_COUNT=$(echo "$STORY_FILES" | wc -l | tr -d ' ')

  if [ "$STORY_COUNT" -eq 0 ]; then
    echo "❌ No stories found for Epic $EPIC_NUM"
    echo "💡 Create stories first with: @sm *explode-epic epic=$EPIC_NUM"
    exit 1
  fi

  echo "✅ Found $STORY_COUNT stories in Epic $EPIC_NUM"

  # Extract story numbers from filenames
  STORY_NUMBERS=()
  while IFS= read -r file; then
    # Extract story number from filename (e.g., "3.1.35" from "3.1.35.edit-presign-endpoint.md")
    story_num=$(basename "$file" | grep -oE '^[0-9]+\.[0-9]+\.[0-9]+')
    STORY_NUMBERS+=("$story_num")
  done <<< "$STORY_FILES"

  echo "📋 Stories to implement:"
  for story in "${STORY_NUMBERS[@]}"; do
    echo "  - Story $story"
  done

  # Force parallel mode for epics
  if [ "$MODE" != "parallel" ]; then
    echo "⚠️  Epic implementation requires parallel mode"
    echo "🔄 Switching to parallel mode..."
    MODE="parallel"
  fi

  # Convert to stories array
  STORIES="${STORY_NUMBERS[@]}"
fi
```

### Pre-flight Checks (30 seconds)

Verify environment is ready before starting implementation:

```bash
echo "🔍 Running pre-flight checks..."

# Check 1: GitHub CLI authentication
if ! gh auth status &>/dev/null; then
  echo "❌ GitHub CLI not authenticated"
  echo "💡 Run: gh auth login"
  exit 1
fi
echo "✅ GitHub CLI authenticated"

# Check 2: Git working directory is clean (or warn)
if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️  Uncommitted changes detected in current directory"
  read -p "Continue anyway? (y/n): " CONFIRM
  if [ "$CONFIRM" != "y" ]; then
    exit 0
  fi
fi

# Check 3: Required tools available
for tool in yq jq; do
  if ! command -v $tool &>/dev/null; then
    echo "⚠️  Optional tool '$tool' not found - some features may be limited"
  fi
done

# Check 4: Verify GitHub labels exist (warn if missing)
REQUIRED_LABELS=("in-progress" "ready-for-review" "done" "blocked")
echo "📋 Checking GitHub labels..."
EXISTING_LABELS=$(gh label list --json name --jq '.[].name' 2>/dev/null || echo "")

for label in "${REQUIRED_LABELS[@]}"; do
  if ! echo "$EXISTING_LABELS" | grep -q "^${label}$"; then
    echo "⚠️  Label '$label' not found - will be skipped in issue updates"
    echo "💡 Create with: gh label create \"$label\" --color \"0E8A16\""
  fi
done

# Check 5: Verify we're on a git branch
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null)
if [ -z "$CURRENT_BRANCH" ]; then
  echo "❌ Not on a git branch (detached HEAD state)"
  echo "💡 Checkout a branch first: git checkout main"
  exit 1
fi
echo "✅ On branch: $CURRENT_BRANCH"

# Check 6: Verify remote is accessible
if ! git ls-remote --exit-code origin &>/dev/null; then
  echo "❌ Cannot reach remote 'origin'"
  echo "💡 Check your network connection or git remote configuration"
  exit 1
fi
echo "✅ Remote 'origin' accessible"

echo ""
echo "✅ All pre-flight checks passed!"
echo ""
```

### Phase 1: Story Validation (1 minute)

```bash
# Load story location from config
STORY_LOCATION=$(yq '.devStoryLocation // "docs/stories"' .bmad-core/core-config.yaml)

# Check if story file exists (supports both X.Y and X.Y.Z formats)
STORY_FILE=$(find "$STORY_LOCATION" -name "${STORY_NUM}*.md" -o -name "${STORY_NUM}.*md" 2>/dev/null | head -1)

if [ -z "$STORY_FILE" ] || [ ! -f "$STORY_FILE" ]; then
  echo "❌ Story file not found in $STORY_LOCATION for story ${STORY_NUM}"
  echo "💡 Create story first with: @sm *draft story=${STORY_NUM}"
  exit 1
fi

echo "📄 Found story file: $STORY_FILE"

# Extract GitHub issue number from story file
ISSUE_NUMBER=$(grep -E "^(GitHub Issue|Issue):" "$STORY_FILE" | grep -oE '#[0-9]+' | tr -d '#' | head -1)
if [ -z "$ISSUE_NUMBER" ]; then
  echo "⚠️  No GitHub issue number found in story file"
  echo "💡 Add 'GitHub Issue: #123' to the story file"
fi

# Check story status
STORY_STATUS=$(grep -E "^[Ss]tatus:" "$STORY_FILE" | awk '{print $2}')

if [ "$STORY_STATUS" != "Approved" ] && [ "$STORY_STATUS" != "Draft" ] && [ "$STORY_STATUS" != "Ready" ]; then
  echo "⚠️  Story status: $STORY_STATUS"
  echo "💡 Story should be 'Approved' or 'Ready' before implementation"
  read -p "Continue anyway? (y/n): " CONFIRM
  if [ "$CONFIRM" != "y" ]; then
    exit 0
  fi
fi

echo "✅ Story validated: $STORY_FILE"
echo "   Status: $STORY_STATUS"
if [ -n "$ISSUE_NUMBER" ]; then
  echo "   GitHub Issue: #$ISSUE_NUMBER"
fi
```

### Phase 2: Development Setup (1-2 minutes)

```bash
echo "🔧 Setting up development environment..."

# For each story, execute start-work task
# This creates worktree and branch (GitHub issue update handled separately)

if [ "$MODE" = "parallel" ]; then
  # For parallel mode, update all story issues to "in-progress"
  echo "📋 Updating GitHub issues to 'In Progress'..."
  for story in $STORIES; do
    # Extract issue number from each story file
    story_file=$(find "$STORY_LOCATION" -name "${story}*.md" | head -1)
    issue_num=$(grep -E "^(GitHub Issue|Issue):" "$story_file" | grep -oE '#[0-9]+' | tr -d '#' | head -1)
    if [ -n "$issue_num" ]; then
      *update-github-issue issue=$issue_num status=in-progress \
        context.branch="parallel-${story}" \
        context.mode="parallel"
    fi
  done
  echo "📋 Dev-coordinator will create worktrees for all stories..."
else
  # For single mode, execute start-work task directly
  echo "📋 Creating worktree for story $STORY_NUM..."

  # Execute start-worktree-from-story task
  # This task:
  # 1. Extracts GitHub issue number from story file
  # 2. Prompts for branch type (feature/bug/hotfix/etc)
  # 3. Prompts for scope (app/package name)
  # 4. Creates worktree in tree/{branch_name}
  # 5. Creates branch from main
  # 6. Updates story file with worktree info

  # Load and execute the task
  source .bmad-core/tasks/start-worktree-from-story.md

  # Update GitHub issue status to "In Progress"
  echo "📋 Updating GitHub issue status..."
  *update-github-issue issue={issue_number} status=in-progress \
    context.branch={branch_name} \
    context.worktree=tree/{branch_name}
fi
```

### Phase 3: Implementation (5-15 minutes)

**If mode=single (default):**

```bash
echo "🔨 Starting traditional single-agent development..."
echo ""

# Execute develop-story workflow
# This is the existing BMAD workflow that:
# - Reads story file and tasks
# - Implements each task
# - Writes tests for each task
# - Runs tests after each task
# - Updates story file task checkboxes
# - Commits changes regularly

# Activate dev agent and run develop-story
@dev
*develop-story

echo "✅ Development complete"
```

**If mode=parallel:**

```bash
echo "🚀 Starting parallel sub-agent development..."
echo ""

# Transform to dev-coordinator persona
echo "Loading dev-coordinator..."

# Execute parallel-develop workflow
# The dev-coordinator will:
# - Analyze dependencies between stories
# - Create execution plan with waves
# - Spawn dev-workers for each story
# - Each dev-worker executes develop-story task
# - Monitor progress across all workers
# - Handle conflicts and dependencies
# - Integrate results

# Activate dev-coordinator and run parallel-develop
@dev-coordinator
*parallel-develop stories=$STORIES

echo "✅ Parallel development complete"
```

### Phase 4: Create Pull Request (1 minute)

```bash
echo "📝 Creating pull request..."

if [ "$MODE" = "parallel" ]; then
  # For parallel mode, dev-coordinator handles PR creation for all stories
  echo "📋 Dev-coordinator will create PRs for all stories..."

  # Update all story issues to "ready-for-review"
  echo "📋 Updating GitHub issues to 'Ready for Review'..."
  for story in $STORIES; do
    story_file=$(find "$STORY_LOCATION" -name "${story}*.md" | head -1)
    issue_num=$(grep -E "^(GitHub Issue|Issue):" "$story_file" | grep -oE '#[0-9]+' | tr -d '#' | head -1)
    pr_num=$(grep -E "^(PR|Pull Request):" "$story_file" | grep -oE '#[0-9]+' | tr -d '#' | head -1)
    if [ -n "$issue_num" ]; then
      *update-github-issue issue=$issue_num status=ready-for-review \
        context.pr_number=$pr_num \
        context.mode="parallel"
    fi
  done
else
  # For single mode, execute finish-work task
  echo "📋 Creating PR for story $STORY_NUM..."

  # Execute finish-worktree-from-story task
  # This task:
  # 1. Commits all changes
  # 2. Pushes branch to origin
  # 3. Creates PR via gh CLI
  # 4. Links PR to GitHub issue
  # 5. Updates story file with PR info
  # 6. Keeps worktree active for potential QA fixes

  # Activate dev agent and run finish-work
  @dev
  *finish-work

  # Update GitHub issue status to "Ready for Review"
  echo "📋 Updating GitHub issue status..."
  *update-github-issue issue={issue_number} status=ready-for-review \
    context.pr_number={pr_number} \
    context.pr_url={pr_url} \
    context.target_branch={target_branch}
fi

echo "✅ Pull request created"
```

### Phase 5: Quality Assurance (3-10 minutes)

**If review=deep:**

```bash
echo "🔍 Starting deep multi-specialist review..."
echo ""

# Transform to qa-coordinator persona
echo "Loading qa-coordinator..."

# Execute deep-review workflow
# The qa-coordinator will:
# - Identify target scope (all changed files)
# - **Perform package duplication check** (CRITICAL)
#   * Verifies no reimplementation of @repo/ui, @repo/gallery, @repo/upload-client, etc.
#   * Auto-FAIL if duplication found
# - Spawn specialist sub-agents:
#   * security-specialist (vulnerability analysis)
#   * performance-specialist (optimization analysis)
#   * accessibility-specialist (WCAG compliance)
# - Each specialist analyzes independently
# - Monitor analysis progress
# - Aggregate findings from all specialists
# - Categorize by severity
# - Generate comprehensive quality gate decision
# - Update story file with QA results
# - Create gate YAML file with duplication_check section

# Activate qa-coordinator and run deep-review
@qa-coordinator
*deep-review target=$STORY_NUM

echo "✅ Deep review complete"
```

**If review=quick:**

```bash
echo "⚡ Starting quick review..."
echo ""

# Use traditional QA agent
echo "Loading qa agent..."

# Execute review-story task
# This task:
# - Runs full test suite
# - Checks code coverage
# - Validates acceptance criteria
# - Runs CodeRabbit analysis (if available)
# - **Performs package duplication check** (CRITICAL)
#   * Verifies no reimplementation of @repo/ui, @repo/gallery, @repo/upload-client, etc.
#   * Auto-FAIL if duplication found
# - Creates quality gate decision
# - Updates story file QA Results section
# - Creates gate YAML file with duplication_check section

# Activate qa agent and run review
@qa
*review story=$STORY_NUM

echo "✅ Quick review complete"
```

**If review=skip:**

```bash
echo "⚠️  Skipping QA review (not recommended)"
echo ""
```

### Phase 6: Issue Resolution (0-10 minutes)

```bash
# Check QA results (if review was not skipped)
if [ "$REVIEW_TYPE" != "skip" ]; then
  QA_GATE_FILE=$(find .bmad-qa/gates -name "${STORY_NUM}-*.yml" | head -1)

  if [ ! -f "$QA_GATE_FILE" ]; then
    echo "⚠️  No QA gate file found - skipping issue resolution"
  else
    QA_GATE=$(grep "gate:" "$QA_GATE_FILE" | awk '{print $2}')

    if [ "$QA_GATE" = "PASS" ]; then
      echo "✅ QA gate: PASS - No issues to fix"

    elif [ "$QA_GATE" = "CONCERNS" ]; then
      echo "⚠️  QA gate: CONCERNS - Reviewing issues..."

      # Display issues
      echo ""
      echo "Issues found:"
      grep -A 10 "top_issues:" "$QA_GATE_FILE"

      # Ask user if they want to auto-fix
      read -p "Auto-fix issues? (y/n): " AUTO_FIX

      if [ "$AUTO_FIX" = "y" ]; then
        echo "🔧 Applying fixes..."

        # Execute apply-qa-fixes task
        # This task:
        # - Reads QA gate YAML file
        # - Reads QA assessment markdowns
        # - Creates prioritized fix plan
        # - Applies code and test changes
        # - Re-runs tests
        # - Updates story file

        # Activate dev agent and run apply-qa-fixes
        @dev
        *apply-qa-fixes story=$STORY_NUM

        # Re-run QA review
        echo "🔍 Re-running QA review..."
        @qa
        *review story=$STORY_NUM
      else
        echo "💡 Manual fixes required"
        echo "Run: @dev *apply-qa-fixes story=$STORY_NUM"
      fi

    elif [ "$QA_GATE" = "FAIL" ]; then
      echo "❌ QA gate: FAIL - Critical issues found"

      # Display issues
      echo ""
      echo "Critical issues:"
      grep -A 10 "top_issues:" "$QA_GATE_FILE"

      echo ""
      echo "💡 Fix issues manually or run: @dev *apply-qa-fixes story=$STORY_NUM"
      exit 1
    fi
  fi
fi
```

### Phase 7: Merge & Cleanup (1 minute)

```bash
echo "🎯 Finalizing story..."

# Only proceed if QA passed or was skipped
if [ "$QA_GATE" = "PASS" ] || [ "$REVIEW_TYPE" = "skip" ]; then

  if [ "$MODE" = "parallel" ]; then
    # For parallel mode, merge all PRs and update all issues
    echo "📋 Merging PRs for all stories..."
    for story in $STORIES; do
      @qa
      *approve-and-merge story=$story

      # Update GitHub issue to done
      story_file=$(find "$STORY_LOCATION" -name "${story}*.md" | head -1)
      issue_num=$(grep -E "^(GitHub Issue|Issue):" "$story_file" | grep -oE '#[0-9]+' | tr -d '#' | head -1)
      pr_num=$(grep -E "^(PR|Pull Request):" "$story_file" | grep -oE '#[0-9]+' | tr -d '#' | head -1)
      merge_commit=$(git log -1 --format="%H" 2>/dev/null || echo "unknown")
      if [ -n "$issue_num" ]; then
        *update-github-issue issue=$issue_num status=done \
          context.pr_number=$pr_num \
          context.merge_commit=$merge_commit
      fi
    done
    echo "✅ All stories merged and closed!"
  else
    # Execute qa-approve-and-merge task
    # This task:
    # - Merges the PR
    # - Cleans up the worktree
    # - Updates story file with completion info
    # (GitHub issue update handled separately below)

    # Activate qa agent and run approve-and-merge
    @qa
    *approve-and-merge story=$STORY_NUM

    # Update GitHub issue status to "Done" and close issue
    echo "📋 Updating GitHub issue status..."
    *update-github-issue issue=$ISSUE_NUMBER status=done \
      context.pr_number=$PR_NUMBER \
      context.merge_commit=$MERGE_COMMIT

    echo "✅ Story merged and closed!"
  fi
else
  echo "⚠️  Story not merged - QA gate did not pass"
  echo "💡 Fix issues and re-run /implement $STORY_NUM"

  # Mark issues as blocked if critical issues found
  if [ "$QA_GATE" = "FAIL" ]; then
    if [ "$MODE" = "parallel" ]; then
      for story in $STORIES; do
        story_file=$(find "$STORY_LOCATION" -name "${story}*.md" | head -1)
        issue_num=$(grep -E "^(GitHub Issue|Issue):" "$story_file" | grep -oE '#[0-9]+' | tr -d '#' | head -1)
        if [ -n "$issue_num" ]; then
          *update-github-issue issue=$issue_num status=blocked \
            context.reason="QA gate failed - critical issues found"
        fi
      done
    else
      *update-github-issue issue=$ISSUE_NUMBER status=blocked \
        context.reason="QA gate failed - critical issues found"
    fi
  fi
fi
```

### Phase 8: Summary Report

```bash
echo ""
echo "═══════════════════════════════════════════════════════"
echo "✨ Story Implementation Complete!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Story: $STORY_NUM"
echo "Mode: $MODE"
echo "Review: $REVIEW_TYPE"
echo ""
echo "📊 Results:"
echo "  - Files changed: $(git diff --stat main | tail -1)"
echo "  - Tests added: $(grep -r "test\|spec" --include="*.test.*" --include="*.spec.*" | wc -l)"
echo "  - Coverage: $(cat coverage/coverage-summary.json | jq .total.lines.pct)%"
echo ""
echo "🔍 QA Status: $QA_GATE"
echo ""
if [ -n "$PR_URL" ]; then
  echo "📝 Pull Request: $PR_URL"
  echo "✅ Status: Merged"
fi
echo ""
echo "═══════════════════════════════════════════════════════"
echo ""
```

## Time Estimates

### Single-Agent Mode (Traditional)

| Phase | Time |
|-------|------|
| Validation | 1 min |
| Development | 15 min |
| QA Review | 10 min |
| Fix Issues | 10 min |
| Final Validation | 2 min |
| Create PR | 1 min |
| **TOTAL** | **39 min** |

### Parallel Mode (Sub-Agents)

| Phase | Time |
|-------|------|
| Validation | 1 min |
| Parallel Development | 6 min |
| Deep Review (parallel) | 8 min |
| Parallel Fixes | 5 min |
| Final Validation | 2 min |
| Create PR | 1 min |
| **TOTAL** | **23 min** |

**Speedup: 1.7x faster with parallel mode!**

## Examples

### Example 1: Simple Feature (Single-Agent)

```bash
@dev
*implement story=1.2

# Output:
# ✅ Story validated: .bmad-stories/1.2-forgot-password-link.md
# 🔨 Starting traditional single-agent development...
# ... (15 minutes later)
# ✅ Story approved for deployment!
# 📝 Creating pull request...
# ✅ Pull request created!
# 🔗 https://github.com/org/repo/pull/42
```

### Example 2: Complex Feature (Parallel)

```bash
@dev
*implement story=1.1 mode=parallel review=deep

# Output:
# ✅ Story validated: .bmad-stories/1.1-user-login.md
# 🚀 Starting parallel sub-agent development...
# 📊 Spawning 3 workers...
# [Worker 1] Frontend Component - Progress: 50%
# [Worker 2] Backend API - Progress: 75%
# [Worker 3] Tests - Progress: 100%
# ✨ Integration complete in 6 minutes!
# 🔍 Starting deep multi-specialist review...
# 📊 Spawning 3 specialists...
# [Security] Found 2 issues (1 high, 1 medium)
# [Performance] Found 1 issue (1 medium)
# [Accessibility] All checks passed ✅
# 🚨 Found 0 critical and 1 high-priority issues
# 🔧 Starting parallel auto-fix...
# ✅ All issues fixed!
# ✅ Story approved for deployment!
# 📝 Creating pull request...
# ✅ Pull request created!
```

### Example 3: Multiple Stories (Epic)

```bash
@dev
*implement stories=[1.1,1.2,1.3] mode=parallel review=deep

# Output:
# ✅ Validated 3 stories
# 🚀 Starting parallel development for 3 stories...
# 📊 Spawning 9 workers (3 per story)...
# ... (20 minutes later)
# ✅ All 3 stories approved for deployment!
# 📝 Creating 3 pull requests...
# ✅ Pull requests created!
```

## Error Handling

### Story Not Found

```
❌ Story file not found: .bmad-stories/1.1-*.md
💡 Create story first with: @sm *draft story=1.1
```

### Story Not Approved

```
⚠️  Story status: Draft
💡 Story should be 'Approved' before implementation
Continue anyway? (y/n):
```

### Critical Issues Found

```
🚨 Found 2 critical and 3 high-priority issues

[CRITICAL-001] SQL injection vulnerability in login endpoint
[CRITICAL-002] Missing authentication on admin routes
[HIGH-001] Rate limiting not implemented
[HIGH-002] Passwords stored in plain text
[HIGH-003] CORS misconfiguration

Auto-fix issues in parallel? (y/n):
```

### Quality Gates Failed

```
❌ Story blocked: QUALITY_GATES_FAILED

Failed gates:
  - Test coverage: 32% (minimum: 45%)
  - Lint errors: 5 (maximum: 0)
  - Type errors: 12 (maximum: 0)

💡 Fix quality gate failures before deployment
```

## Benefits

✅ **One Command** - Complete workflow from start to finish
✅ **Flexible** - Choose single-agent or parallel execution
✅ **Automated** - No need to remember all the steps
✅ **Safe** - Quality gates and validation at every phase
✅ **Fast** - Parallel mode is 1.7x faster
✅ **Comprehensive** - Includes QA review and issue resolution
✅ **Transparent** - Shows progress at every step

## Related Tasks

- **create-next-story.md** - Create story before implementation
- **develop-story.md** - Traditional single-agent development
- **parallel-develop.md** - Parallel sub-agent development
- **deep-review.md** - Multi-specialist QA review
- **auto-fix.md** - Parallel issue resolution
- **update-github-issue.md** - Centralized GitHub issue status updates (called at each phase)

## Notes

- This task is designed to be the **primary entry point** for story implementation
- It automatically selects the best workflow based on parameters
- It handles all phases from validation to PR creation
- It provides clear feedback and error messages
- It supports both simple and complex stories
- It integrates seamlessly with existing BMAD workflows

