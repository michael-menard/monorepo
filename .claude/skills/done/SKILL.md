---
name: done
description: Complete the current work — commit, push, create/merge PR, update KB story status, and clean up worktree. One command to wrap up everything when you're finished.
delegates_to:
  - wt-commit-and-pr
  - wt-merge-pr
  - story-state
---

# /done - I'm Finished

## Description

Wraps the entire "I'm done" workflow into one command. Delegates to existing skills for the heavy lifting:

- **`/wt-commit-and-pr`** — stage, commit, push, create/find PR
- **`/wt-merge-pr`** — squash-merge PR, delete branches, remove worktree, pull main
- **`/story-state`** — update KB story status to `completed`

The `/done` skill adds: story ID detection from branch name, rebase on main before merge, main-branch flow, and orchestration.

## Usage

```
/done              # auto-detect story ID from branch name
/done STORY-ID     # explicit story ID override
```

## Parameters

| Parameter  | Required | Default                | Description                          |
| ---------- | -------- | ---------------------- | ------------------------------------ |
| `STORY-ID` | No       | _(parsed from branch)_ | Story identifier (e.g., `WINT-1012`) |

## Flow (Feature Branch)

When on a branch other than `main`:

### 1. Detect context

Parse the current branch name for a story ID:

- `story/WINT-1012` → `WINT-1012`
- `fix/APIP-0010-align-tests` → `APIP-0010`
- `feat/RDEP-0020-deps` → `RDEP-0020`
- Pattern: first segment matching `[A-Z]+-\d+`

If no ID found in branch name, use the explicit `STORY-ID` argument. If neither exists, proceed without story ID (skip KB steps).

### 2. Resolve story title

If story ID was detected:

- Call `kb_get_story({ story_id })` to get the title
- If story not found in KB: use branch name slug as title, warn about KB miss

### 3. Stage, commit, push, and create/find PR

**Delegate to `/wt-commit-and-pr`:**

```
/wt-commit-and-pr {STORY_ID} "{STORY_TITLE}"
```

This handles:

- `git add -A` (safe in worktrees)
- Skip if no changes
- Conventional commit: `feat(STORY_ID): title`
- `git push -u origin <branch>`
- `gh pr list` / `gh pr create`

If no story ID: perform these steps manually with `feat: <branch-slug>` format.

### 4. Rebase on main

This step is NOT covered by the delegated skills — `/done` handles it directly:

```bash
git fetch origin main
git rebase origin/main
```

**If conflicts arise:**

1. List conflicted files: `git diff --name-only --diff-filter=U`
2. Show each conflict to the user
3. Help resolve interactively — read both sides, apply correct resolution
4. Stage resolved files: `git add <file>`
5. Continue: `git rebase --continue`
6. Repeat until rebase completes

After successful rebase:

```bash
git push --force-with-lease origin <branch>
```

### 5. Merge PR and clean up worktree

**Delegate to `/wt-merge-pr`:**

```
/wt-merge-pr {STORY_ID}
```

This handles:

- `gh pr merge <number> --squash --delete-branch`
- `git worktree remove <path>` (with `--force` retry)
- `git branch -D <branch>`
- `git worktree prune`
- `git pull origin main`

### 6. Mark story complete

If a story ID was detected/provided:

**Delegate to `/story-state`:**

```
/story-state {STORY_ID} --state=completed
```

This handles:

- Verify story exists in KB
- Update state via `kb_update_story_status`
- Report result

If no story ID: skip this step.

## Flow (Main Branch)

When on `main`, changes must still go through a PR — never push directly to main. The challenge is isolating story-specific changes when multiple stories are interleaved.

### 1. Require story ID

A story ID is **required** on main (either explicit arg or prompt the user). Without it, there's no way to isolate changes or name the branch.

### 2. Inventory uncommitted changes

```bash
git status --porcelain
```

- If no changes: skip to step 6 (mark story complete only).
- If changes exist: proceed to file selection.

### 3. Isolate story-related files

Show the user all changed files (staged + unstaged + untracked) and ask which belong to this story:

1. List all changes grouped by type (modified, added, untracked)
2. If KB has implementation artifacts for the story, cross-reference file paths as a hint
3. Present the list and ask the user to confirm which files belong to `STORY-ID`
4. If user says "all" — take everything. Otherwise, take only the confirmed subset.

### 4. Create branch and commit

```bash
git stash --include-untracked            # stash everything
git checkout -b done/{STORY-ID}          # create fresh branch from main
git stash pop                            # restore all changes
git add <selected-files-only>            # stage only story files
git commit -m "feat(STORY-ID): <title>"
git stash                                # re-stash remaining non-story changes (if any)
git checkout main                        # return to main
git stash pop                            # restore non-story changes on main
git checkout done/{STORY-ID}             # switch back to the PR branch
```

**Simpler path when all files are selected:**

```bash
git checkout -b done/{STORY-ID}
git add -A
git commit -m "feat(STORY-ID): <title>"
```

### 5. Push, PR, rebase, merge, cleanup

From here, rejoin the **feature branch flow at step 3** — delegate to:

- `/wt-commit-and-pr` (push + create PR) — note: commit already done, so it will skip commit and just push + create PR
- Rebase on main (step 4 of feature flow)
- `/wt-merge-pr` (merge + cleanup)

After merge, return to main:

```bash
git checkout main
git pull origin main
```

### 6. Mark story complete

Delegate to `/story-state`:

```
/story-state {STORY_ID} --state=completed
```

## Error Handling

All steps are **non-blocking** except conflict resolution (requires user interaction).

| Scenario                   | Action                                                      |
| -------------------------- | ----------------------------------------------------------- |
| No changes to commit       | Skip commit, continue to PR/merge                           |
| `gh` CLI unavailable       | WARNING, skip PR steps, still do local cleanup              |
| `gh` not authenticated     | WARNING, skip PR steps                                      |
| Push rejected              | Attempt `git pull --rebase` then retry push once            |
| PR merge fails             | WARNING, log error, continue to cleanup                     |
| Rebase conflicts           | Pause, resolve interactively with user, then continue       |
| Story not found in KB      | WARNING, skip story update                                  |
| Worktree removal fails     | Handled by `/wt-merge-pr` (retries with `--force`)          |
| Branch delete fails        | Handled by `/wt-merge-pr` (ignores, likely already deleted) |
| On main with no story ID   | ERROR: story ID required on main to isolate changes         |
| On main with mixed changes | Prompt user to select which files belong to the story       |
| Not in a git repo          | ERROR: abort entirely                                       |

## Output

After completion, report:

```
DONE
  story_id: {STORY_ID | none}
  branch: {branch}
  commit: {short_sha | skipped}
  pr_number: {number | none}
  pr_url: {url | none}
  pr_merged: true | false | skipped
  story_updated: true | false | skipped
  worktree_removed: true | false | skipped
```

## Notes

- **Never pushes directly to main** — both flows go through PRs
- Delegates to proven skills rather than reimplementing git/PR/KB logic
- The rebase step and main-branch file isolation are the only operations `/done` handles directly
- On main, the user is always consulted about which files belong to the story (no guessing)
- Non-story changes are preserved on main via stash/unstash — nothing gets lost
- If a delegated skill fails, `/done` captures the warning and continues
