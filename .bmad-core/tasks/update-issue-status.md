<!-- Powered by BMAD™ Core -->

# Update GitHub Issue Status Task

## Purpose

Update the GitHub project status for an issue based on development workflow stage.

## Prerequisites

- GitHub CLI (`gh`) installed and authenticated
- Issue exists and is added to "LEGO MOC Instructions App" project
- Story file contains GitHub Issue section with issue number

## Task Steps

### Step 1: Load Story File
Read the current story file to extract the GitHub issue number.

Look for the "## GitHub Issue" section:
```markdown
## GitHub Issue
- Issue: #123
- URL: https://github.com/...
- Status: [current status]
```

Extract the issue number (e.g., 123).

### Step 2: Determine Target Status
Based on the workflow stage:

**When starting development:**
- Status: "In Progress"
- Trigger: Dev agent begins `develop-story` command
- Indicates: Developer is actively working on the story

**When PR is merged:**
- Status: "Done"
- Trigger: PR merge event
- Indicates: Story is complete and merged to main

**When creating issue:**
- Status: "Backlog"
- Trigger: Issue creation (SM agent)
- Indicates: Story is in the backlog, not yet pulled into active work

### Step 3: Update Project Status
Use the helper script to update the status:
```bash
bash .bmad-core/scripts/set-issue-status.sh [issue_number] [status]
```

Where `[status]` is one of:
- `Backlog` - In the backlog, not yet pulled into active work
- `Todo` - Ready to work
- `Blocked` - Waiting on something
- `InProgress` - Currently being worked on
- `QA` - In review/testing
- `UAT` - User acceptance testing
- `Done` - Completed and merged

### Step 4: Update Story File Status Line
Update the status line in the story file's GitHub Issue section:
```markdown
## GitHub Issue
- Issue: #123
- URL: https://github.com/...
- Status: [new status]
```

Replace `[new status]` with the updated status.

### Step 5: Confirm Success
Display to user:
```
✅ Issue #[number] status updated to '[status]'
```

## Error Handling

### Issue Not in Project
```
❌ Issue #[number] not found in project
   The issue may not have been added to the project yet.
```

### Invalid Status
```
❌ Invalid status: [status]
   Valid options: Backlog, Todo, Blocked, InProgress, QA, UAT, Done
```

### GitHub CLI Not Available
```
❌ GitHub CLI not found. Please install:
   brew install gh
```

## Usage Examples

### Dev Agent Starting Work
```bash
# At the beginning of develop-story command
bash .bmad-core/scripts/set-issue-status.sh 328 InProgress
```

### PR Merged (Automated)
```bash
# In GitHub Actions workflow or PR merge hook
bash .bmad-core/scripts/set-issue-status.sh 328 Done
```

### SM Agent Creating Issue
```bash
# After creating the issue
bash .bmad-core/scripts/set-issue-status.sh 328 Backlog
```

## Output
- Confirmation message
- Updated story file with new status

## Success Criteria
- Project status updated in GitHub
- Story file status line updated
- User receives confirmation

## Notes
- This task is called automatically by other tasks (develop-story, create-issue, etc.)
- Status changes are tracked in GitHub project board
- Product owners can filter by status to see progress
- The status field is separate from GitHub issue state (open/closed)

