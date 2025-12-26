# /wt:list - List All Worktrees

## Description
Quick command to show all active git worktrees in your repository.

## Usage
```
/wt:list
```

## What It Does

This slash command:
1. Activates the Git Worktree Manager skill (`@git-worktree`)
2. Automatically runs the `*list` command
3. Shows all active worktrees with their status

## Output

The command will display:
- **Worktree path** - Full path to each worktree
- **Branch name** - The branch checked out in that worktree
- **Commit** - Current commit hash
- **Status** - Clean, modified, or other git status

## Example Output

```
User: /wt:list

Agent: 🌳 Git Worktree Manager activated!
       
       Active Worktrees:
       
       1. /Users/user/Monorepo
          Branch: main
          Commit: abc1234 (Latest commit message)
          Status: Clean
       
       2. /Users/user/Monorepo/tree/feature/gallery-123
          Branch: feature/gallery-123
          Commit: def5678 (WIP: gallery component)
          Status: Modified (3 files changed)
       
       3. /Users/user/Monorepo/tree/bugfix/main-app-456
          Branch: bugfix/main-app-456
          Commit: ghi9012 (Fix: button styling)
          Status: Clean
       
       Total: 3 worktrees
```

## Benefits

✅ **Quick Overview** - See all worktrees at a glance  
✅ **Status Check** - Know which worktrees have uncommitted changes  
✅ **Easy Navigation** - See paths to switch to  

## Related Commands

- `/wt:new` - Create new worktree
- `/wt:switch` - Switch to another worktree
- `/wt:status` - Detailed status of current worktree
- `/wt:cleanup` - Clean up merged worktrees

## Related Files

- **Git Worktree Skill**: `.augment/commands/git-worktree.md`

