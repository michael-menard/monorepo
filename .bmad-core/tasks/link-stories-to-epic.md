<!-- Powered by BMAD™ Core -->

# Link Story Issues to Epic Issue Task

## Purpose

Link all story GitHub issues for a specific epic to the epic's parent GitHub issue. This creates a parent-child relationship that enables epic-level tracking and testing.

## Prerequisites

- GitHub CLI (`gh`) installed and authenticated
- Epic GitHub issue already created (via `create-epic-issue` task)
- Story GitHub issues already created (via `batch-create-issues` or `create-issue` tasks)

## Task Steps

### Step 1: Load Configuration
Load `.bmad-core/core-config.yaml` to get:
- `devStoryLocation` - where story files are located

### Step 2: Identify Epic and Epic Issue
Ask user:
```
Which epic would you like to link stories for?
Enter epic number (e.g., 3 for Epic 3): 
```

Store as `{epic_num}`.

Ask user:
```
What is the epic issue number?
Enter issue number (e.g., 328): 
```

Store as `{epic_issue_num}`.

### Step 3: Scan Story Files for Epic
Find all story files for the epic:
```bash
find {devStoryLocation} -name "{epic_num}.*.md" -type f | sort
```

### Step 4: Extract Story Issue Numbers
For each story file found:
1. Read the file
2. Look for the "## GitHub Issue" section
3. Extract the issue number from the line "- Issue: #XXX"
4. Store in a list

Display to user:
```
Found {count} stories with GitHub issues for Epic {epic_num}:
- Story {epic_num}.1: Issue #{issue_num}
- Story {epic_num}.2: Issue #{issue_num}
...
```

### Step 5: Confirm Linking
Ask user:
```
Ready to link {count} story issues to Epic Issue #{epic_issue_num}?
This will add the epic issue as a parent to each story issue.
Continue? (y/n): 
```

If user says no, exit task.

### Step 6: Link Each Story Issue to Epic
For each story issue number:
```bash
# Add comment to story issue linking to epic
gh issue comment {story_issue_num} --body "Part of Epic #{epic_issue_num}"

# Add epic label to story issue (optional, for filtering)
gh issue edit {story_issue_num} --add-label "epic:{epic_num}"
```

Track success/failure for each story.

### Step 7: Update Epic Issue
Update the epic issue with links to all story issues:
```bash
# Build the story list
story_list="## Story Issues\n"
for each story:
  story_list += "- #{story_issue_num} - {story_title}\n"

# Add comment to epic issue
gh issue comment {epic_issue_num} --body "{story_list}"
```

### Step 8: Display Results
Show user:
```
✅ Story Issues Linked to Epic!

Epic Issue: #{epic_issue_num}
Stories Linked: {success_count}
Failures: {failure_count}

Epic URL: https://github.com/{owner}/{repo}/issues/{epic_issue_num}

Next Steps:
1. View epic issue to see all linked stories
2. Track epic progress in GitHub
3. Use epic issue for product owner testing
```

If there were failures, list them:
```
Failed to link:
- Story {epic_num}.X: Issue #{issue_num} - {error}
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

### Epic Issue Not Found
```
❌ Epic issue #{epic_issue_num} not found.
   Please create the epic issue first using *create-epic
```

### No Stories Found
```
❌ No stories with GitHub issues found for Epic {epic_num}
   Please create story issues first using *batch-issues
```

### Label Creation
If epic-specific label doesn't exist, create it:
```bash
gh label create "epic:{epic_num}" --description "Stories for Epic {epic_num}" --color "1d76db"
```

## Output
- Count of stories linked
- Epic issue URL
- List of any failures

## Success Criteria
- All story issues linked to epic issue
- Epic issue updated with story list
- Story issues have epic label
- User receives confirmation

## Notes
- This task should be run after creating both epic and story issues
- Creates bidirectional linking (epic → stories, stories → epic)
- Enables GitHub's issue hierarchy features
- Product owners can track epic progress by viewing the epic issue

