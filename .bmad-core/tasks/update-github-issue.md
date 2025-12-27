# Task: Update GitHub Issue Status

## Purpose

Centralized task for updating GitHub issue status throughout the development workflow. Called by the implement-story orchestrator at key phase transitions.

## Prerequisites

- GitHub CLI (`gh`) installed and authenticated
- Issue number exists in GitHub

## Inputs Required

- **issue_number** - GitHub issue number (required)
- **status** - Target status (required): `in-progress`, `ready-for-review`, `done`, `blocked`
- **context** - Optional context object with additional info:
  - `branch` - Branch name
  - `worktree` - Worktree path
  - `pr_number` - Pull request number
  - `pr_url` - Pull request URL
  - `target_branch` - PR target branch
  - `merge_commit` - Merge commit hash
  - `reason` - Reason for status change (for blocked status)

## Status Transitions

```
┌──────────┐    ┌─────────────┐    ┌───────────────────┐    ┌──────┐
│ backlog  │───▶│ in-progress │───▶│ ready-for-review  │───▶│ done │
│ ready    │    │             │    │                   │    │      │
│ todo     │    │             │    │                   │    │      │
└──────────┘    └─────────────┘    └───────────────────┘    └──────┘
                      │                     │
                      │    ┌─────────┐      │
                      └───▶│ blocked │◀─────┘
                           └─────────┘
```

## Process

### Step 1: Validate Inputs

```bash
# Verify issue exists
gh issue view {issue_number} --json number,title,state >/dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "❌ Issue #{issue_number} not found or not accessible"
  exit 1
fi
```

### Step 2: Determine Label Changes

Based on the target status, determine which labels to add/remove:

| Target Status | Add Label | Remove Labels |
|---------------|-----------|---------------|
| `in-progress` | `in-progress` | `backlog`, `ready`, `todo`, `blocked` |
| `ready-for-review` | `ready-for-review` | `in-progress`, `blocked` |
| `done` | `done` | `in-progress`, `ready-for-review`, `blocked` |
| `blocked` | `blocked` | `in-progress`, `ready-for-review` |

### Step 3: Update Labels

```bash
# Status: in-progress
if [ "$STATUS" = "in-progress" ]; then
  gh issue edit {issue_number} \
    --add-label "in-progress" \
    --remove-label "backlog" \
    --remove-label "ready" \
    --remove-label "todo" \
    --remove-label "blocked" \
    2>/dev/null || true
fi

# Status: ready-for-review
if [ "$STATUS" = "ready-for-review" ]; then
  gh issue edit {issue_number} \
    --add-label "ready-for-review" \
    --remove-label "in-progress" \
    --remove-label "blocked" \
    2>/dev/null || true
fi

# Status: done
if [ "$STATUS" = "done" ]; then
  gh issue edit {issue_number} \
    --add-label "done" \
    --remove-label "in-progress" \
    --remove-label "ready-for-review" \
    --remove-label "blocked" \
    2>/dev/null || true
fi

# Status: blocked
if [ "$STATUS" = "blocked" ]; then
  gh issue edit {issue_number} \
    --add-label "blocked" \
    --remove-label "in-progress" \
    --remove-label "ready-for-review" \
    2>/dev/null || true
fi
```

**Note:** The `2>/dev/null || true` ensures the command doesn't fail if labels don't exist.

### Step 4: Add Status Comment

Generate and post an appropriate comment based on status:

#### Status: in-progress

```bash
gh issue comment {issue_number} --body "$(cat <<EOF
## :rocket: Development Started

| Field | Value |
|-------|-------|
| **Branch** | \`{branch}\` |
| **Worktree** | \`{worktree}\` |
| **Developer** | @$(gh api user --jq '.login') |
| **Started** | $(date -u +%Y-%m-%dT%H:%M:%SZ) |

Development is now in progress.
EOF
)"
```

#### Status: ready-for-review

```bash
gh issue comment {issue_number} --body "$(cat <<EOF
## :memo: Ready for Review

| Field | Value |
|-------|-------|
| **Pull Request** | #{pr_number} |
| **PR URL** | {pr_url} |
| **Target Branch** | \`{target_branch}\` |
| **Submitted** | $(date -u +%Y-%m-%dT%H:%M:%SZ) |

Implementation is complete and ready for QA review.
EOF
)"
```

#### Status: done

```bash
gh issue comment {issue_number} --body "$(cat <<EOF
## :white_check_mark: Complete

| Field | Value |
|-------|-------|
| **Pull Request** | #{pr_number} (Merged) |
| **Merge Commit** | \`{merge_commit}\` |
| **Completed** | $(date -u +%Y-%m-%dT%H:%M:%SZ) |

This issue has been resolved and merged.
EOF
)"
```

#### Status: blocked

```bash
gh issue comment {issue_number} --body "$(cat <<EOF
## :warning: Blocked

| Field | Value |
|-------|-------|
| **Blocked At** | $(date -u +%Y-%m-%dT%H:%M:%SZ) |
| **Reason** | {reason} |

This issue is currently blocked and requires attention.
EOF
)"
```

### Step 5: Close Issue (if done)

```bash
if [ "$STATUS" = "done" ]; then
  # Check if issue is still open
  ISSUE_STATE=$(gh issue view {issue_number} --json state --jq '.state')

  if [ "$ISSUE_STATE" = "OPEN" ]; then
    gh issue close {issue_number}
    echo "✅ Issue #{issue_number} closed"
  else
    echo "ℹ️  Issue #{issue_number} already closed"
  fi
fi
```

### Step 6: Confirm Success

```bash
echo ""
echo "✅ GitHub Issue #{issue_number} Updated"
echo "   Status: {status}"
echo "   Labels: Updated"
echo "   Comment: Added"
if [ "$STATUS" = "done" ]; then
  echo "   State: Closed"
fi
```

## Usage Examples

### From implement-story.md

```bash
# Phase 2: Development started
*update-github-issue issue={issue_number} status=in-progress context.branch={branch_name} context.worktree=tree/{branch_name}

# Phase 4: PR created
*update-github-issue issue={issue_number} status=ready-for-review context.pr_number={pr_number} context.pr_url={pr_url} context.target_branch={target_branch}

# Phase 7: Merged
*update-github-issue issue={issue_number} status=done context.pr_number={pr_number} context.merge_commit={merge_commit}

# If blocked
*update-github-issue issue={issue_number} status=blocked context.reason="Waiting for dependency"
```

### Standalone Usage

```bash
# Mark issue as in progress
@dev
*update-github-issue issue=123 status=in-progress context.branch=feature/auth-123

# Mark issue as blocked
@dev
*update-github-issue issue=123 status=blocked context.reason="Waiting for API specification"
```

## Error Handling

### Issue Not Found

```
❌ Issue #123 not found or not accessible

   Possible causes:
   - Issue does not exist
   - Issue is in a different repository
   - You don't have access to this repository

   Verify with: gh issue view 123
```

### Label Update Failed

```
⚠️  Some labels could not be updated (labels may not exist)
   This is non-fatal - issue status comment was still added.

   To create missing labels:
   gh label create "in-progress" --color "FFA500"
   gh label create "ready-for-review" --color "0E8A16"
   gh label create "done" --color "6F42C1"
   gh label create "blocked" --color "D93F0B"
```

### Comment Failed

```
❌ Failed to add status comment to issue #123

   Error: [error message]

   Try manually:
   gh issue comment 123 --body "Status updated to: in-progress"
```

## Output

- Issue labels updated to reflect new status
- Status comment added with context details
- Issue closed (if status is `done`)

## Success Criteria

- Labels correctly reflect the status
- Comment added with relevant context
- Issue closed when status is `done`
- No orphaned status labels

## Notes

- This task should be called by the implement-story orchestrator, not directly by sub-tasks
- Label names are configurable - adjust based on your repository's label scheme
- Comments use GitHub-flavored markdown with tables for clean formatting
- All label operations are fault-tolerant (won't fail if label doesn't exist)
- The `done` status will close the issue if it's still open

## Label Setup

If your repository doesn't have the required labels, create them:

```bash
gh label create "in-progress" --description "Work is actively being done" --color "FFA500"
gh label create "ready-for-review" --description "Ready for QA review" --color "0E8A16"
gh label create "done" --description "Work completed and merged" --color "6F42C1"
gh label create "blocked" --description "Blocked by external dependency" --color "D93F0B"
```

## Related Tasks

- **implement-story.md** - Orchestrator that calls this task at phase transitions
- **start-worktree-from-story.md** - Creates worktree (does NOT update issue)
- **finish-worktree-from-story.md** - Creates PR (does NOT update issue)
- **qa-approve-and-merge.md** - Merges PR (does NOT update issue)
