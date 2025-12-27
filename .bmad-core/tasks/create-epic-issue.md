<!-- Powered by BMAD™ Core -->

# Create Epic GitHub Issue Task

## Purpose

Create a GitHub issue for an epic to serve as the parent issue for all related story issues. This enables epic-level tracking, testing, and product owner/manager oversight.

## Prerequisites

- GitHub CLI (`gh`) installed and authenticated
- Epic number identified (e.g., Epic 3, Epic 7)
- Stories for the epic exist in the story location

## Task Steps

### Step 1: Load Configuration
Load `.bmad-core/core-config.yaml` to get:
- `devStoryLocation` - where story files are located

### Step 2: Identify Epic
Ask user which epic to create an issue for:
```
Which epic would you like to create a GitHub issue for?
Enter epic number (e.g., 3 for Epic 3): 
```

Store the epic number as `{epic_num}`.

### Step 3: Scan Stories for Epic
Scan `{devStoryLocation}` for all story files matching pattern `{epic_num}.*.md`:
```bash
find {devStoryLocation} -name "{epic_num}.*.md" -type f | sort
```

Count the stories found and display to user:
```
Found {count} stories for Epic {epic_num}
```

### Step 4: Extract Epic Information
From the first story file in the epic:
1. Extract the epic name/theme from the story title pattern
2. Look for common epic description in story files

Ask user to provide:
```
Epic Title: [e.g., "Epic 3: Gallery & Collections"]
Epic Description: [Brief description of the epic's goal]
```

### Step 5: Prepare Epic Issue Content
Format the GitHub issue body:
```markdown
## Epic Overview
{epic_description}

## Stories in this Epic
{count} stories total

## Epic Goals
- [ ] All stories completed
- [ ] Integration testing complete
- [ ] Product owner acceptance
- [ ] Documentation updated

## Story Issues
This epic tracks the following story issues:
<!-- Story issues will be linked here -->

## Testing Notes
- Epic-level testing should verify integration across all stories
- Product owner/manager should test complete user flows
- All acceptance criteria across stories must be met

---
*Epic issue created by BMAD SM agent*
```

### Step 6: Determine Epic Label
Map epic number to existing epic label:
- Epic 1 → `epic-1-shell`
- Epic 2 → `epic-2-dashboard`
- Epic 3 → `epic-3-gallery`
- Epic 6 → `epic-6-settings`
- Epic 7 → `epic-7-realtime` (create if doesn't exist)

If label doesn't exist, create it:
```bash
gh label create "epic-{epic_num}-{name}" --description "Epic {epic_num}: {description}" --color "5319e7"
```

### Step 7: Create GitHub Issue with Project Assignment
```bash
gh issue create \
  --title "Epic {epic_num}: {epic_title}" \
  --body "[Formatted content from Step 5]" \
  --label "epic" \
  --label "bmad" \
  --label "[epic label from Step 6]" \
  --project "LEGO MOC Instructions App"
```

**Note:** The project name "LEGO MOC Instructions App" will automatically link the issue to the project board.

Capture the issue URL and number.

### Step 8: Display Results
Show user:
```
✅ Epic GitHub Issue Created!

Epic: {epic_num}
Title: {epic_title}
Issue: #{issue_number}
URL: {issue_url}
Stories: {count}

Next Steps:
1. Link story issues to this epic using *link-stories-to-epic
2. Track epic progress in GitHub
3. Use epic issue for product owner testing and acceptance
```

## Error Handling

### GitHub CLI Not Installed
```
❌ GitHub CLI not found. Please install:
   brew install gh
```

### Not Authenticated
```
❌ Not authenticated with GitHub. Please run:
   gh auth login
```

### No Stories Found
```
❌ No stories found for Epic {epic_num}
   Please check the epic number and try again.
```

### Label Doesn't Exist
If "epic" label doesn't exist, create it:
```bash
gh label create "epic" --description "Epic tracking issue" --color "5319e7"
```

## Output
- Epic GitHub issue number
- Epic issue URL
- Count of stories in epic

## Success Criteria
- Epic GitHub issue created with proper labels
- Issue body contains epic overview and goals
- User receives confirmation with issue link

## Notes
- This task should be run once per epic
- After creating the epic issue, use `link-stories-to-epic` to connect story issues
- Epic issues enable product owner/manager to track and test at the epic level

