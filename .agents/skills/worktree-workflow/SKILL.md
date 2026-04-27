---
name: worktree-workflow
description: Use when starting any new feature, bugfix, or story work — creates an isolated worktree via Worktrunk. Use when work is complete and ready to merge back to main. Use when user says "start work", "new feature", "new branch", or "merge and clean up".
---

# Worktree Workflow

All work happens in isolated git worktrees managed by Worktrunk (`wt`). Never work directly on `main`.

## Starting Work

### 1. Create worktree

```bash
wt switch --create <branch-name>
```

Branch naming conventions:
- Feature: `story/STORY-ID` or `feat/<description>`
- Bugfix: `fix/<description>` or `fix/STORY-ID-<description>`
- Refactor: `refactor/<description>`

### 2. Verify clean baseline

```bash
pnpm install        # install dependencies (worktrees share node_modules but not dist/)
pnpm build          # build packages (dist/ is not shared between worktrees)
pnpm test           # verify tests pass before making changes
```

If tests fail before you've changed anything, report to user — don't proceed.

### 3. Begin implementation

You're now in an isolated workspace. Make changes, commit frequently.

## During Work

### Committing

Use conventional commits:

```bash
git add <specific-files>
git commit -m "feat(STORY-ID): description"
```

Worktrunk can generate commit messages if configured:

```bash
wt step commit
```

### Checking status

```bash
wt list              # show all worktrees and their status
git status           # current worktree changes
```

### Switching between worktrees

```bash
wt switch <branch-name>    # switch to existing worktree
wt list                    # see what's available
```

## Finishing Work

### 1. Verify everything passes

```bash
pnpm check-types     # type check
pnpm test            # run tests
pnpm build           # build succeeds
```

**Do not proceed to merge if any of these fail.**

### 2. Push and create PR

```bash
git push -u origin <branch-name>
gh pr create --title "feat(STORY-ID): title" --body "## Summary\n- what changed\n\n## Test Plan\n- how to verify"
```

### 3. Merge via Worktrunk

```bash
wt merge
```

This handles:
- Merging current branch into main (squash merge)
- Cleaning up the worktree
- Deleting the branch

### 4. If merge has conflicts

```bash
wt merge    # will report conflicts
# resolve conflicts manually
git add <resolved-files>
git rebase --continue
wt merge    # retry
```

### 5. Manual cleanup (if needed)

```bash
wt remove              # remove current worktree
wt remove <branch>     # remove specific worktree
```

## Quick Reference

| Task | Command |
|------|---------|
| Start new work | `wt switch --create <branch>` |
| List worktrees | `wt list` |
| Switch worktree | `wt switch <branch>` |
| Merge to main | `wt merge` |
| Remove worktree | `wt remove` |
| Generate commit msg | `wt step commit` |

## Rules

- **Never work on main directly** — always create a worktree
- **Verify tests before merge** — broken code doesn't get merged
- **One worktree per feature** — don't mix unrelated work
- **Commit frequently** — small, focused commits
- **Clean up after merge** — `wt merge` handles this automatically

## Integration

This skill replaces `superpowers:using-git-worktrees` and `superpowers:finishing-a-development-branch`. When other skills reference those, use this skill instead.

**Used by:**
- `brainstorming` — after design approval, create worktree for implementation
- `executing-plans` — create worktree before executing plan tasks
- `subagent-driven-development` — create worktree before dispatching subagents

**Pairs with:**
- `/done` (Claude Code) — full wrap-up including KB story updates
