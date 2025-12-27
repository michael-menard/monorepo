# Task: Start Worktree from Story

## Purpose
Create a git worktree for implementing a user story, linked to its GitHub issue.

## Prerequisites
- Git repository with worktree support
- Story file with GitHub issue number
- Clean working directory (or ability to stash)

## Inputs Required
- Story file path (e.g., `docs/stories/epic-1.1-user-authentication.md`)

## Process

### Step 1: Read Story File
- Extract GitHub issue number from story file
- Extract story title for branch naming
- Verify issue number exists

### Step 2: Determine Branch Type
Ask user:
```
What type of work is this?
1. feature - New feature or enhancement
2. bug - Bug fix
3. hotfix - Urgent production fix
4. refactor - Code refactoring
5. docs - Documentation only
6. test - Test additions/changes
```

### Step 3: Determine App/Package Scope
Ask user:
```
Which app or package does this affect?

Examples:
- main-app
- app-dashboard
- api
- ui (for @repo/ui)
- logger (for @repo/logger)
- gallery
- auth
- payments

Enter app/package name:
```

### Step 4: Generate Branch Name
Create semantic branch name:
```
Format: {type}/{app-or-package}-{issue-number}
Examples:
  - feature/gallery-123
  - bug/main-app-456
  - hotfix/api-789
  - refactor/ui-234
```

Build the branch name:
```
Branch: {type}/{scope}-{issue_number}
```

Ask user to confirm or modify:
```
Proposed branch name: feature/gallery-123
Press Enter to accept, or type a new name:
```

### Step 5: Determine Base Branch
Ask user:
```
What base branch should I use?
1. main
2. develop
3. Other (specify)
```

### Step 6: Verify Git State
```bash
# Check if we're in a git repo
git rev-parse --git-dir

# Check for uncommitted changes
git status --porcelain
```

If uncommitted changes exist, ask user:
```
⚠️  Uncommitted changes detected.
1. Stash changes and continue
2. Commit changes first
3. Abort
```

### Step 7: Checkout and Update Base Branch
```bash
# Checkout base branch
git checkout {base_branch}

# Pull latest changes
git pull origin {base_branch}
```

### Step 8: Create Worktree Directory
```bash
# Create tree directory if it doesn't exist
mkdir -p tree
```

### Step 9: Create Worktree
```bash
# Create worktree with new branch
# Example: git worktree add tree/feature/gallery-123 -b feature/gallery-123
git worktree add tree/{branch_name} -b {branch_name}
```

### Step 10: Link to GitHub Issue (Optional)
If GitHub CLI is available:
```bash
# Link the branch to the issue
gh issue develop {issue_number} --checkout --name {branch_name}
```

### Step 11: Update Story File
Add worktree information to story file:
```markdown
## Development Environment
- Worktree: `tree/{branch_name}`
- Branch: `{branch_name}` ({type}/{scope}-{issue_number})
- Branch Type: `{type}`
- Scope: `{scope}`
- Base Branch: `{base_branch}`
- Created: {timestamp}
```

### Step 12: Provide Next Steps
Display to user:
```
✅ Worktree Created Successfully!

Worktree Location: tree/{branch_name}
Branch: {branch_name}
Branch Type: {type}
Scope: {scope}
GitHub Issue: #{issue_number}

Next Steps:
1. cd tree/{branch_name}
2. Start implementing the story
3. Commit changes regularly
4. When done, use finish-worktree-from-story task

To switch to this worktree:
  cd tree/{branch_name}
```

## Error Handling

### No GitHub Issue in Story
```
❌ No GitHub issue found in story file.
   Please run create-github-issue task first.
```

### Worktree Already Exists
```
⚠️  Worktree already exists at tree/{branch_name}
1. Use existing worktree
2. Remove and recreate
3. Choose different name
```

### Branch Already Exists
```
⚠️  Branch {branch_name} already exists
1. Use existing branch
2. Choose different name
3. Delete and recreate (dangerous!)
```

### Base Branch Not Found
```
❌ Base branch '{base_branch}' not found
   Available branches:
   [list branches]
```

## Output
- Worktree created in `tree/{branch_name}`
- New branch created and checked out in worktree
- Story file updated with worktree info
- User provided with next steps

## Success Criteria
- Worktree exists and is functional
- Branch is created from latest base branch
- Story file contains worktree information
- User knows how to access the worktree

## Notes
- This task should be run by the Dev agent before starting implementation
- The worktree keeps work isolated from main working directory
- Multiple worktrees can exist simultaneously for parallel work
- Use finish-worktree-from-story task when implementation is complete

## Branch Naming Convention

### Format
```
{type}/{scope}-{issue-number}
```

### Types
- `feature` - New features or enhancements
- `bug` - Bug fixes
- `hotfix` - Urgent production fixes
- `refactor` - Code refactoring
- `docs` - Documentation changes
- `test` - Test additions/changes

### Scope (App/Package)
The scope should match the primary app or package being modified:

**Apps:**
- `main-app` - Main user-facing application
- `app-dashboard` - Dashboard application
- `api` - API/backend services

**Packages:**
- `ui` - Component library (@repo/ui)
- `logger` - Logging utility (@repo/logger)
- `design-system` - Design tokens
- `accessibility` - A11y utilities

**Feature-specific:**
- `gallery` - Gallery feature
- `auth` - Authentication
- `payments` - Payment processing
- `search` - Search functionality

### Examples
```
feature/gallery-123        - New gallery feature (issue #123)
bug/main-app-456          - Bug fix in main app (issue #456)
hotfix/api-789            - Urgent API fix (issue #789)
refactor/ui-234           - Refactor UI components (issue #234)
feature/auth-567          - New auth feature (issue #567)
bug/payments-890          - Payment bug fix (issue #890)
```

### Benefits
- **Clear intent** - Type indicates what kind of work
- **Easy filtering** - Can filter branches by type or scope
- **Scope visibility** - Immediately see which part of codebase is affected
- **Concise** - Short but informative
- **Issue tracking** - Issue number links to GitHub

