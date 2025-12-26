# /wt:switch - Switch to Another Worktree

## Description
Quick command to switch development context to a different worktree.

## Usage
```
/wt:switch
```

## What It Does

This slash command:
1. Activates the Git Worktree Manager skill (`@git-worktree`)
2. Automatically runs the `*switch` command
3. Shows available worktrees and helps you switch

## Workflow

The command will:
1. **List available worktrees** - Show all worktrees with numbers
2. **Ask which to switch to** - Interactive selection
3. **Provide cd command** - Give you the command to switch
4. **Show branch status** - Display current branch and status of target worktree

## Example Flow

```
User: /wt:switch

Agent: 🌳 Git Worktree Manager activated!
       
       Available worktrees:
       
       1. /Users/user/Monorepo (main) ← current
       2. /Users/user/Monorepo/tree/feature/gallery-123
       3. /Users/user/Monorepo/tree/bugfix/main-app-456
       
       Which worktree would you like to switch to? (1-3)

User: 2

Agent: ✅ To switch to feature/gallery-123:
       
       cd tree/feature/gallery-123
       
       Branch: feature/gallery-123
       Status: 3 files modified
       Last commit: WIP: gallery component
       
       Or use this to switch and open in new terminal:
       cd tree/feature/gallery-123 && exec $SHELL
```

## Benefits

✅ **Quick Navigation** - See all worktrees and switch easily  
✅ **Context Aware** - Shows current worktree  
✅ **Status Preview** - See what's in the target worktree before switching  

## Notes

- The command provides the `cd` command for you to run
- It cannot actually change your terminal's directory (shell limitation)
- Copy and paste the provided command to switch

## Related Commands

- `/wt:new` - Create new worktree
- `/wt:list` - List all worktrees
- `/wt:status` - Show detailed status
- `/switch-feature` - Switch with commit/stash handling

## Related Files

- **Git Worktree Skill**: `.augment/commands/git-worktree.md`
- **Switch Feature Command**: `.augment/slash-commands/switch-feature.md`

