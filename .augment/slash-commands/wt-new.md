# /wt:new - Create New Worktree and Branch

## Description
Quick command to activate the Git Worktree Manager skill and start a new feature worktree.

## Usage
```
/wt:new
```

## What It Does

This slash command:
1. Activates the Git Worktree Manager skill (`@git-worktree`)
2. Automatically runs the `*start-feature` command
3. Guides you through creating a new worktree with a new branch

## Workflow

The command will:
1. **Verify git repository** - Ensure you're in a valid git repo
2. **Ask for base branch** - Which branch to start from (e.g., `main`, `develop`)
3. **Ask for feature branch name** - Name for your new branch (e.g., `feature/gallery-123`)
4. **Checkout base branch** - Switch to the base branch
5. **Pull latest changes** - Ensure base is up-to-date
6. **Create worktree directory** - Create `tree/` if it doesn't exist
7. **Create worktree** - Create the new worktree at `tree/{branch-name}`
8. **Confirm success** - Show you the path to your new worktree

## Example Flow

```
User: /wt:new

Agent: 🌳 Git Worktree Manager activated!
       
       Starting new feature worktree...
       
       What base branch would you like to start from?
       (e.g., main, develop)

User: main

Agent: What would you like to name your feature branch?
       Suggested prefixes: feature/, bugfix/, hotfix/, experiment/

User: feature/gallery-123

Agent: [Executing]
       ✓ Verified git repository
       ✓ Checked out main
       ✓ Pulled latest changes
       ✓ Created tree/ directory
       ✓ Created worktree at tree/feature/gallery-123
       
       ✅ Worktree created successfully!
       
       To start working:
       cd tree/feature/gallery-123
```

## Benefits

✅ **Quick Start** - One command to create a new worktree  
✅ **Guided Process** - Interactive prompts for all inputs  
✅ **Safe** - Verifies git state before making changes  
✅ **Organized** - Keeps all worktrees in `tree/` directory  

## Related Commands

- `/wt:list` - List all worktrees
- `/wt:switch` - Switch to another worktree
- `/wt:finish` - Finish and merge feature
- `/wt:cleanup` - Clean up merged worktrees

## Related Files

- **Git Worktree Skill**: `.augment/commands/git-worktree.md`
- **Workflow Guide**: `.bmad-core/data/github-worktree-workflow.md`

