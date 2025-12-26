# Task: Create GitHub Issue from Story

## Purpose
Create a GitHub issue from a user story file and link them together for tracking.

## Prerequisites
- GitHub CLI (`gh`) must be installed and authenticated
- Story file must exist in `docs/stories/` directory
- Story must have a title and description

## Inputs Required
- Story file path (e.g., `docs/stories/epic-1.1-user-authentication.md`)

## Process

### Step 1: Verify GitHub CLI
```bash
gh auth status
```
If not authenticated, instruct user to run: `gh auth login`

### Step 2: Read Story File
- Extract story title from the file
- Extract story description/summary
- Extract acceptance criteria
- Note the story file path for linking

### Step 3: Prepare Issue Content
Format the GitHub issue body:
```markdown
## Story
[Copy the story statement from the story file]

## Acceptance Criteria
[Copy acceptance criteria from the story file]

## Story File
`[relative path to story file]`

## Tasks
- [ ] Implementation
- [ ] Tests
- [ ] Documentation
- [ ] Code Review

---
*Created from story file: [story-file-path]*
```

### Step 4: Determine Labels
Based on the story file path and content, determine appropriate labels:

**Epic Label:**
- Extract epic number from filename (e.g., `3.1.1` → epic `3`)
- Map to epic label:
  - Epic 1 → `epic-1-shell`
  - Epic 2 → `epic-2-dashboard`
  - Epic 3 → `epic-3-gallery`
  - Epic 6 → `epic-6-settings`
  - Epic 7 → `epic-7-realtime` (or create if needed)

**Type Label:**
- If story mentions "API", "endpoint", "backend" → `type:feature`
- If story mentions "component", "UI", "page" → `type:feature`
- If story mentions "test", "testing" → `type:validation`
- If story mentions "infrastructure", "setup", "config" → `type:infrastructure`
- Default: `type:feature`

**Status Label:**
- New stories: `groomed` (ready to work)

**Always Include:**
- `story` (user story marker)
- `bmad` (BMAD workflow marker)

### Step 5: Create GitHub Issue with Project Assignment
```bash
gh issue create \
  --title "[Story Title]" \
  --body "[Formatted content from Step 3]" \
  --label "story" \
  --label "bmad" \
  --label "groomed" \
  --label "[epic label from Step 4]" \
  --label "[type label from Step 4]" \
  --project "LEGO MOC Instructions App"
```

**Note:** The project name "LEGO MOC Instructions App" will automatically link the issue to the project board.

### Step 6: Set Project Status to "Backlog"
After creating the issue, set its status in the project:
```bash
# Use the helper script to set status
bash .bmad-core/scripts/set-issue-status.sh [issue_number] Backlog
```

**Note:** The status will be set to "Backlog" indicating the story is in the backlog and not yet pulled into active work.

**Status Workflow:**
- **Backlog** - Story is in the backlog (set when issue is created)
- **Todo** - Story is ready to be worked on (manually moved from Backlog)
- **In Progress** - Dev agent sets this when starting work
- **QA** - Story is in review/testing
- **Done** - Automatically set when PR is merged (auto-archived after 2 weeks)

### Step 7: Capture Issue Number
- Parse the output to get the issue number (e.g., #123)
- Store this for the next step

### Step 7: Update Story File
Add a new section at the top of the story file (after the title):
```markdown
## GitHub Issue
- Issue: #[number]
- URL: https://github.com/[owner]/[repo]/issues/[number]
- Status: Open
```

### Step 8: Confirm Success
Display to user:
```
✅ GitHub Issue Created Successfully!

Issue #[number]: [title]
URL: [issue-url]
Story File: [story-file-path]

The story file has been updated with the GitHub issue link.
```

## Error Handling

### GitHub CLI Not Installed
```
❌ GitHub CLI not found. Please install it:
   brew install gh
   or visit: https://cli.github.com/
```

### Not Authenticated
```
❌ Not authenticated with GitHub. Please run:
   gh auth login
```

### Issue Creation Failed
```
❌ Failed to create GitHub issue.
   Error: [error message]
   
   Please check:
   - Repository permissions
   - Network connection
   - GitHub API status
```

## Output
- GitHub issue number
- Issue URL
- Updated story file with issue link

## Success Criteria
- GitHub issue created with proper labels
- Story file updated with issue reference
- Issue body contains all story information
- User receives confirmation with issue link

## Notes
- This task should be run by the SM agent after creating a story
- The issue serves as the central tracking point for the story
- Dev agent will reference this issue when creating worktrees

