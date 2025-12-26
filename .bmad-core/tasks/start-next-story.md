# Task: Start Next Story

## Purpose
Automatically select and start work on the next available story from the GitHub project board's "Todo" column.

## Prerequisites
- GitHub CLI (`gh`) installed and authenticated
- Stories exist in the "LEGO MOC Instructions App" project
- Stories are in "Todo" status

## Selection Criteria

The task selects the next story based on priority:

1. **Epic Order:** Lower epic numbers first (Epic 1 → Epic 2 → Epic 3, etc.)
2. **Story Order:** Within an epic, lower story numbers first (3.1.1 → 3.1.2 → 3.1.3)
3. **Status:** Only stories in "Todo" status
4. **Type Priority:** 
   - `type:infrastructure` first (foundational work)
   - `type:feature` second (main features)
   - `type:validation` last (testing/validation)

## Steps

### Step 1: Query GitHub Project for Todo Stories

```bash
# Get all issues in Todo status from the project
gh project item-list 4 \
  --owner michael-menard \
  --format json \
  --limit 200 | \
  jq -r '.items[] | select(.status == "Todo") | .content.number' | \
  sort -n | \
  head -1
```

**Alternative using issue list:**
```bash
# Get all open issues with groomed label, sorted by number
gh issue list \
  --label groomed \
  --state open \
  --limit 200 \
  --json number,labels,projectItems \
  --jq '[.[] | select(.projectItems[].status == "Todo")] | sort_by(.number) | .[0].number'
```

**Simpler approach (recommended):**
```bash
# Get lowest numbered open issue with groomed label
NEXT_ISSUE=$(gh issue list \
  --label groomed \
  --state open \
  --limit 1 \
  --json number \
  --jq '.[0].number')

echo "Next issue: #$NEXT_ISSUE"
```

### Step 2: Find Corresponding Story File

```bash
# Get issue details
ISSUE_TITLE=$(gh issue view $NEXT_ISSUE --json title --jq '.title')

# Extract story number from title (format: "Story X.Y.Z: Title")
STORY_NUM=$(echo "$ISSUE_TITLE" | grep -oE 'Story [0-9]+\.[0-9]+\.[0-9]+' | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')

# Find story file
STORY_FILE=$(find docs/stories -name "${STORY_NUM}*.md" -type f | head -1)

if [ -z "$STORY_FILE" ]; then
  echo "❌ Story file not found for issue #$NEXT_ISSUE (Story $STORY_NUM)"
  exit 1
fi

echo "📝 Found story file: $STORY_FILE"
```

### Step 3: Display Story Information

```bash
# Show story details to user
echo ""
echo "=== Next Story to Develop ==="
echo "Issue: #$NEXT_ISSUE"
echo "Story: $STORY_NUM"
echo "File: $STORY_FILE"
echo ""

# Show story title and acceptance criteria
echo "--- Story Details ---"
grep -A 3 "## Story" "$STORY_FILE" | tail -3
echo ""
echo "--- Acceptance Criteria ---"
grep -A 10 "## Acceptance Criteria" "$STORY_FILE" | tail -10
echo ""
```

### Step 4: Confirm with User

```bash
# Ask user to confirm
read -p "Start development on this story? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "❌ Cancelled by user"
  exit 0
fi
```

### Step 5: Start Development

```bash
# Execute develop-story workflow with the selected story file
echo "🚀 Starting development on $STORY_FILE..."
echo ""

# The dev agent will automatically:
# 1. Set issue status to "In Progress"
# 2. Read tasks from story file
# 3. Begin implementation
# 4. Write tests
# 5. Run validations
# 6. Update story file

# Return the story file path for the dev agent to use
echo "$STORY_FILE"
```

## Output

The task outputs the story file path, which the dev agent uses to start the `develop-story` workflow.

## Error Handling

**No stories in Todo:**
```
❌ No stories found in Todo status
💡 All stories are either in progress or complete!
```

**Story file not found:**
```
❌ Story file not found for issue #228 (Story 3.1.1)
💡 Check that the story file exists in docs/stories/
```

**GitHub API error:**
```
❌ Failed to query GitHub project
💡 Check GitHub CLI authentication: gh auth status
```

## Usage by Dev Agent

When the dev agent receives the `*next` command:

1. Execute this task to get the next story file path
2. Automatically proceed to `develop-story` workflow
3. No additional user input required

## Example Output

```
=== Next Story to Develop ===
Issue: #228
Story: 3.1.1
File: docs/stories/3.1.1.instructions-gallery-scaffolding.md

--- Story Details ---
**As a** developer,
**I want** the Instructions Gallery page scaffolded,
**so that** users can browse their MOC instruction collection.

--- Acceptance Criteria ---
1. ✅ Route module created in `apps/web/main-app/src/routes/modules/InstructionsModule.tsx`
2. ✅ InstructionsGalleryPage component renders (via `@repo/app-instructions-gallery`)
3. ✅ Route `/instructions` configured in router
4. ✅ Lazy loading configured for route

Start development on this story? (y/n): y
🚀 Starting development on docs/stories/3.1.1.instructions-gallery-scaffolding.md...
```

