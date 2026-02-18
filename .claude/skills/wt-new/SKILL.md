---
name: wt-new
description: Create a new git worktree and branch for feature development. Use when starting a new feature or story that needs isolated development. Creates worktree in tree/ directory with proper branch setup.
---

# /wt:new - Create New Worktree and Branch

## Description
Quick command to create a new git worktree with a new branch. Supports both interactive and automated modes.

## Usage
```
/wt:new                                  # fully interactive
/wt:new [BRANCH_NAME]                    # skip branch name prompt
/wt:new [BRANCH_NAME] [BASE_BRANCH]     # fully non-interactive
```

### Examples
```
/wt:new                                  # prompts for both base branch and feature branch
/wt:new story/WINT-1012                  # uses main as base, prompts skipped
/wt:new story/WINT-1012 main            # fully automated, no prompts
```

## Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `BRANCH_NAME` | No | _(prompted)_ | Feature branch name (e.g., `story/WINT-1012`) |
| `BASE_BRANCH` | No | _(prompted)_ | Branch to base off (e.g., `main`, `develop`) |

When parameters are provided, the corresponding interactive prompts are skipped.

## What It Does

This slash command:
1. Verifies the git repository state
2. Determines base branch (from parameter or interactive prompt)
3. Determines feature branch name (from parameter or interactive prompt)
4. Fetches latest from remote (`git fetch origin`) to ensure base is up-to-date
5. Creates `tree/` directory if it doesn't exist
6. Creates the worktree at `tree/{branch-name}` based on `origin/{base-branch}`
7. Reports the result: path to the new worktree, branch name

## Workflow

### Interactive mode (`/wt:new`)
1. **Verify git repository** - Ensure you're in a valid git repo
2. **Ask for base branch** - Which branch to start from (e.g., `main`, `develop`)
3. **Ask for feature branch name** - Name for your new branch (e.g., `story/WISH-001`)
4. **Fetch latest from remote** - `git fetch origin` to get latest commits without changing current checkout
5. **Create worktree directory** - Create `tree/` if it doesn't exist
6. **Create worktree** - `git worktree add -b {branch-name} tree/{branch-name} origin/{base-branch}`
7. **Confirm success** - Show you the path to your new worktree

### Automated mode (`/wt:new story/WINT-1012 main`)
1. **Verify git repository** - Ensure you're in a valid git repo
2. **Use provided base branch** - Skip prompt, use `main`
3. **Use provided branch name** - Skip prompt, use `story/WINT-1012`
4. **Fetch latest from remote** - `git fetch origin` to get latest commits without changing current checkout
5. **Create worktree directory** - Create `tree/` if it doesn't exist
6. **Create worktree** - `git worktree add -b story/WINT-1012 tree/story/WINT-1012 origin/main`
7. **Report result** - Output path and branch name for caller to use

## Output

After completion, always report:
```
WORKTREE CREATED
  branch: {branch-name}
  path:   tree/{branch-name}
```

This structured output allows the calling orchestrator (e.g., `dev-implement-story`) to capture
the branch name and path for `worktree_register()`.

## Benefits

✅ **Quick Start** - One command to create a new worktree
✅ **Automated** - Can be called non-interactively from workflow orchestrators
✅ **Safe** - Verifies git state before making changes
✅ **Organized** - Keeps all worktrees in `tree/` directory
