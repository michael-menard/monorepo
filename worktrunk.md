# Worktrunk Quickstart

Git worktree manager for parallel development. Worktrees are stored in `.worktrees/` inside the repo.

## Core Commands

```bash
wt switch -c feature-name          # Create worktree + branch, run hooks
wt switch feature-name             # Switch to existing worktree
wt switch                          # Interactive picker (fuzzy search)
wt list                            # List all worktrees with status
wt merge                           # Squash-merge current branch to main, cleanup
wt remove                          # Delete current worktree + branch
```

## With Claude Code

```bash
wt switch -c fix-bug -x claude                    # Create worktree, launch Claude
wt switch -c fix-bug -x claude -- 'Fix GH #322'   # Pass a task directly to Claude
```

## Aliases (project shortcuts)

```bash
wt step dev              # Start dev server on a per-branch port
wt step test-changed     # Run tests only for packages changed vs main
wt step types-changed    # Type-check only changed packages
```

## Hooks (automatic)

| When | What happens |
|---|---|
| **Create worktree** | Copies `.env`, `node_modules`, caches from main worktree |
| **Create worktree** | Runs `pnpm install --frozen-lockfile` |
| **Create worktree** | Builds shared packages in background |
| **Switch worktree** | Renames tmux window to branch name |
| **Merge** | Runs ESLint + Prettier before commit |
| **Merge** | Runs typecheck + tests + build before merge (failures abort) |
| **Remove worktree** | Kills orphaned Vite dev servers |

## Merge Workflow

`wt merge` does everything in one command:

1. Commits uncommitted changes (LLM-generated message via Haiku)
2. Rebases onto main
3. Runs pre-commit hooks (lint, format)
4. Squashes all commits into one (LLM-generated message)
5. Runs pre-merge hooks (typecheck, test, build)
6. Merges to main
7. Removes the worktree

Use `--no-verify` to skip hooks, `--no-squash` to keep individual commits.

## Stacked Branches

```bash
wt switch -c part-2 --base=@       # Branch from current HEAD, not main
```

## Parallel Agents (tmux)

```bash
tmux new-session -d -s auth "wt switch -c fix-auth -x claude -- 'Fix auth bug'"
tmux new-session -d -s perf "wt switch -c fix-perf -x claude -- 'Optimize queries'"
```

## Useful Flags

```bash
wt list --full              # Show CI status, diffstat, summaries
wt list --format=json       # JSON output for scripting
wt merge --no-remove        # Merge but keep the worktree
wt switch -c name --no-cd   # Create without switching directory
wt hook pre-merge           # Manually run pre-merge hooks
```

## Config Files

| File | Purpose | Committed |
|---|---|---|
| `.config/wt.toml` | Project hooks + aliases | Yes |
| `~/.config/worktrunk/config.toml` | User prefs (worktree path, LLM config) | No |
