# Git Operations: Canonical Conventions

Single source of truth for git conventions across all skills and agents. All `wt-*` skills and the `git-ops` agent enforce these conventions.

---

## Branch Naming

| Type | Pattern | Example |
|------|---------|---------|
| Story branch | `story/{STORY_ID}` | `story/WINT-1012` |
| Base branch | `main` | — |

## Worktree Path Convention

Worktrees live under `tree/` relative to the repo root:

```
{repo_root}/tree/story/{STORY_ID}/
```

Example: `/Users/michaelmenard/Development/monorepo/tree/story/WINT-1012/`

## Commit Message Format

Conventional commit format — always lower-case prefix:

```
feat({STORY_ID}): {STORY_TITLE}
fix({STORY_ID}): {STORY_TITLE}
chore({STORY_ID}): {STORY_TITLE}
```

Default to `feat` unless the story is a bugfix (`fix`) or housekeeping (`chore`).

## PR Conventions

| Setting | Value |
|---------|-------|
| Base branch | `main` |
| PR title format | `{STORY_ID}: {STORY_TITLE}` |
| Merge strategy | Squash merge (`--squash`) |
| Remote branch | Deleted on merge (`--delete-branch`) |
| Draft PRs | Created upfront by `/wt:new`; promoted to ready on QA pass |

## Safe Operations Inside Worktrees

Each worktree is isolated per-story. These are safe within a story worktree:

- `git add -A` — stages all changes (no cross-story contamination risk)
- `git commit` — commits only to the story branch
- `git push -u origin story/{STORY_ID}` — pushes to story branch only

Never run these from main repo root without explicit scoping.

---

## Worktree Resolution Algorithm

Use this to find the worktree root for a given `STORY_ID`:

```bash
worktree_line=$(git worktree list | grep "story/{STORY_ID}")
if [ -n "$worktree_line" ]; then
    worktree_root=$(echo "$worktree_line" | awk '{print $1}')
else
    repo_root=$(git rev-parse --show-toplevel)
    conventional_path="${repo_root}/tree/story/${STORY_ID}"
    if [ -d "$conventional_path" ]; then
        worktree_root="$conventional_path"
    else
        worktree_root=null
    fi
fi
```

## PR Discovery Algorithm

```bash
# Find open PR for a story branch (returns JSON)
gh pr list --head story/{STORY_ID} --state open --json number,url

# Extract PR number
pr_number=$(gh pr list --head story/{STORY_ID} --state open --json number --jq '.[0].number')
```

---

## Common Command Reference

### Create Worktree

```bash
git fetch origin
mkdir -p tree
git worktree add -b story/{STORY_ID} tree/story/{STORY_ID} origin/main
```

### Commit and Push

```bash
cd {worktree_root}
git add -A
git status --porcelain   # check if there's anything to commit
git commit -m "feat({STORY_ID}): {STORY_TITLE}"
git push -u origin story/{STORY_ID}
```

### Create Draft PR

```bash
gh pr create \
  --title "{STORY_ID}: {STORY_TITLE}" \
  --body "## Summary\n\n_Implementation in progress._" \
  --base main \
  --draft
```

### Promote Draft to Ready

```bash
gh pr ready {PR_NUMBER}
```

### Squash Merge and Delete Branch

```bash
gh pr merge {PR_NUMBER} --squash --delete-branch
```

### Cleanup Worktree

```bash
git worktree remove tree/story/{STORY_ID} || git worktree remove tree/story/{STORY_ID} --force
git branch -D story/{STORY_ID}
git worktree prune
```

---

## Error Handling Principles

1. **Non-blocking** — worktree cleanup steps never abort the overall workflow on failure
2. **Graceful degradation** — if PR merge fails, still clean up local worktree
3. **Warn, don't fail** — emit `WARNING` instead of `ERROR` for recoverable operations
4. **Retry before force** — on `git worktree remove` failure, retry with `--force` before giving up
5. **Continue on cleanup** — even if one cleanup step fails, run remaining steps

---

## Structured Output Format

All git operations (skills and the `git-ops` agent) emit structured output for orchestrator parsing:

```
GIT OPS COMPLETE
  action:         {ACTION}
  story_id:       {STORY_ID}
  branch:         story/{STORY_ID}
  worktree_path:  {PATH}
  pr_number:      {NUMBER | none}
  pr_url:         {URL | none}
  result:         success | skipped | warning
  notes:          {optional human-readable detail}
```

On unrecoverable error:

```
GIT OPS ERROR
  action:       {ACTION}
  story_id:     {STORY_ID}
  error:        {message}
  recoverable:  false
```
