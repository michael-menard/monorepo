# /wt:prune - Prune Stale Worktree References

## Description
Quick command to clean up stale worktree administrative files and references.

## Usage
```
/wt:prune
```

## What It Does

This slash command:
1. Runs `git worktree prune` to remove stale worktree metadata
2. Cleans up references to worktrees that no longer exist on disk
3. Shows what was cleaned up

## When to Use

Use `/wt:prune` when:
- You manually deleted a worktree directory (without using git commands)
- Git shows worktrees that don't actually exist anymore
- You want to clean up orphaned worktree references
- After moving or renaming worktree directories

## Workflow

The command will:
1. **Check for stale references** - Find worktrees that don't exist on disk
2. **Show what will be pruned** - List stale references
3. **Run prune command** - Execute `git worktree prune`
4. **Confirm cleanup** - Show what was removed

## Example Flow

```
User: /wt:prune

Agent: Checking for stale worktree references...
       
       Found stale references:
       - tree/feature/old-feature (directory not found)
       - tree/bugfix/deleted-fix (directory not found)
       
       These worktrees no longer exist on disk but git still has references to them.
       
       Would you like to prune these references? (y/n)

User: y

Agent: [Executing]
       git worktree prune --verbose
       
       ✅ Pruned stale references:
       - Removed: tree/feature/old-feature
       - Removed: tree/bugfix/deleted-fix
       
       Summary:
       - 2 stale references removed
       - Worktree metadata cleaned up
       
       Current worktrees:
       1. /Users/user/Monorepo (main)
       2. /Users/user/Monorepo/tree/feature/active-feature
```

## Dry Run Option

You can also check what would be pruned without actually doing it:

```
User: /wt:prune --dry-run

Agent: [Executing]
       git worktree prune --dry-run --verbose
       
       Would prune:
       - tree/feature/old-feature
       - tree/bugfix/deleted-fix
       
       (No changes made - this was a dry run)
```

## Benefits

✅ **Clean Metadata** - Removes orphaned references  
✅ **Fix Inconsistencies** - Resolves git worktree list issues  
✅ **Safe Operation** - Only removes references, not actual files  
✅ **Quick Fix** - Solves common worktree problems  

## Notes

- This command is **safe** - it only removes metadata, not actual files
- If you manually deleted a worktree directory, this cleans up git's records
- Different from `/wt:cleanup` which removes actual worktrees
- Automatically run as part of `/wt:cleanup`

## Difference from /wt:cleanup

| Command | What It Does |
|---------|--------------|
| `/wt:prune` | Removes stale **references** to deleted worktrees |
| `/wt:cleanup` | Removes actual **worktrees** and their branches |

## Related Commands

- `/wt:cleanup` - Remove merged worktrees (includes pruning)
- `/wt:list` - List all worktrees
- `/wt:status` - Check worktree status

## Related Files

- **Git Worktree Skill**: `.augment/commands/git-worktree.md`

## Git Command Reference

This command runs:
```bash
git worktree prune [--dry-run] [--verbose]
```

Options:
- `--dry-run` - Show what would be pruned without doing it
- `--verbose` - Show detailed output

