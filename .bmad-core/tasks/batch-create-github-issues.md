# Task: Batch Create GitHub Issues from Stories

## Purpose
Create GitHub issues for multiple existing story files that don't already have GitHub issues linked.

## Prerequisites
- GitHub CLI (`gh`) must be installed and authenticated
- Story files exist in the configured `devStoryLocation` directory
- Stories must have titles and descriptions

## Inputs Required
- Optional: Specific story file paths or patterns (e.g., `docs/stories/7.*.md`)
- If not provided, scan all stories in `devStoryLocation`

## Process

### Step 1: Load Configuration
- Read `.bmad-core/core-config.yaml` to get `devStoryLocation`
- Default to `docs/stories` if not configured

### Step 2: Verify GitHub CLI
```bash
gh auth status
```
If not authenticated, instruct user to run: `gh auth login`

### Step 3: Scan for Stories Without GitHub Issues
- List all `.md` files in `devStoryLocation`
- For each file:
  - Read the file content
  - Check if it contains a "## GitHub Issue" section
  - If NO GitHub Issue section found, add to processing list
- Display count of stories found without GitHub issues
- Ask user to confirm before proceeding

### Step 4: Process Each Story
For each story file in the processing list:

#### 4.1: Extract Story Information
- Extract story title (first H1 heading)
- Extract story statement (under "## Story" section)
- Extract acceptance criteria (under "## Acceptance Criteria" section)
- Note the story file path for linking

#### 4.2: Prepare Issue Content
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

#### 4.3: Determine Labels
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

#### 4.4: Create GitHub Issue with Project Assignment
```bash
gh issue create \
  --title "[Story Title]" \
  --body "[Formatted content from Step 4.2]" \
  --label "story" \
  --label "bmad" \
  --label "groomed" \
  --label "[epic label from Step 4.3]" \
  --label "[type label from Step 4.3]" \
  --project "LEGO MOC Instructions App"
```

**Note:** The project name "LEGO MOC Instructions App" will automatically link the issue to the project board.

#### 4.5: Capture Issue Number
- Parse the output to get the issue number (e.g., #123)
- Store this for the next step

#### 4.6: Set Project Status to "Backlog"
```bash
bash .bmad-core/scripts/set-issue-status.sh [issue_number] Backlog
```

**Note:** Sets the issue status to "Backlog" in the project board.

#### 4.7: Update Story File
Add a new section after the title and before the Status section:
```markdown
## GitHub Issue
- Issue: #[number]
- URL: https://github.com/[owner]/[repo]/issues/[number]
- Status: Open
```

#### 4.8: Log Progress
Display progress for each story:
```
✅ [n/total] Created issue #[number] for [story-file-name]
```

### Step 5: Summary Report
Display final summary:
```
🎉 Batch GitHub Issue Creation Complete!

Total Stories Processed: [count]
Issues Created: [success-count]
Failures: [failure-count]

Created Issues:
- Issue #[number]: [title] ([story-file])
- Issue #[number]: [title] ([story-file])
...

Failed Stories (if any):
- [story-file]: [error-message]
...
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

### Issue Creation Failed for Individual Story
- Log the error
- Continue processing remaining stories
- Include in failure list in final summary

### No Stories Found
```
ℹ️  No stories found without GitHub issues.
All stories in [devStoryLocation] already have GitHub issues linked.
```

## Output
- Count of issues created
- List of created issue numbers and URLs
- Updated story files with issue references
- Summary report with any failures

## Success Criteria
- All stories without GitHub issues are processed
- GitHub issues created with proper labels
- Story files updated with issue references
- User receives detailed summary report
- Failures are logged and reported

## Notes
- This task can be run by any agent with access to the task
- Useful for backfilling GitHub issues for existing stories
- Safe to run multiple times (skips stories that already have issues)
- Consider running in batches if you have many stories to avoid rate limits

