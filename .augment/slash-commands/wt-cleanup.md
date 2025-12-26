# /wt:cleanup - Clean Up Merged Worktrees

## Description
Quick command to identify and remove merged or stale worktrees.

## Usage
```
/wt:cleanup
```

## What It Does

This slash command:
1. Activates the Git Worktree Manager skill (`@git-worktree`)
2. Automatically runs the `*cleanup` command
3. Helps you clean up old worktrees

## Workflow

The command will:
1. **List all worktrees** - Show all active worktrees
2. **Identify merged branches** - Find branches already merged to main/develop
3. **Ask which to remove** - Interactive selection
4. **Remove selected worktrees** - Safely delete worktrees
5. **Prune worktree references** - Clean up git metadata

## Example Flow

```
User: /wt:cleanup

Agent: 🌳 Git Worktree Manager activated!
       
       Scanning for merged worktrees...
       
       Found worktrees that can be cleaned up:
       
       ✓ Merged to main:
       1. tree/feature/gallery-123 (merged 2 days ago)
       2. tree/bugfix/main-app-456 (merged 1 week ago)
       
       ⚠️  Not merged:
       3. tree/feature/new-auth (active development)
       
       Which worktrees would you like to remove?
       (Enter numbers separated by commas, or 'all' for all merged)

User: 1,2

Agent: [Executing]
       Removing tree/feature/gallery-123...
       ✓ Worktree removed
       ✓ Branch feature/gallery-123 deleted locally
       
       Removing tree/bugfix/main-app-456...
       ✓ Worktree removed
       ✓ Branch bugfix/main-app-456 deleted locally
       
       Pruning worktree references...
       git worktree prune
       
       ✅ Cleanup complete!
       
       Summary:
       - 2 worktrees removed
       - 2 branches deleted
       - Disk space freed: ~45 MB
       
       Remaining worktrees: 2
```

## Benefits

✅ **Smart Detection** - Identifies merged branches automatically  
✅ **Safe Cleanup** - Only suggests merged branches  
✅ **Selective Removal** - Choose which to remove  
✅ **Complete Cleanup** - Removes worktrees and branches  

## Notes

- Only suggests worktrees with merged branches
- You can choose which ones to remove
- Warns about unmerged branches
- Prunes git metadata after cleanup

## Related Commands

- `/wt:list` - List all worktrees
- `/wt:finish` - Finish and merge a single feature
- `/wt:status` - Check worktree status

## Related Files

- **Git Worktree Skill**: `.augment/commands/git-worktree.md`

