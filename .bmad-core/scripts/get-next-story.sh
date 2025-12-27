#!/bin/bash

# Get the next story to work on from the GitHub project board
# Returns the story file path

set -e

# Get all open issues with user-story label
ISSUES=$(gh issue list \
  --label user-story \
  --state open \
  --limit 50 \
  --json number,title \
  --jq '.[] | "\(.number)|\(.title)"' 2>/dev/null)

if [ -z "$ISSUES" ]; then
  echo "❌ No stories found in Todo status"
  echo "💡 All stories are either in progress or complete!"
  exit 1
fi

# Find the first issue with a valid story number format
NEXT_ISSUE=""
ISSUE_TITLE=""
STORY_NUM=""

while IFS='|' read -r issue_num issue_title; do
  # Extract story number from title (format: "Story X.Y.Z: Title" or "X.Y.Z: Title")
  story_num=$(echo "$issue_title" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)

  if [ -n "$story_num" ]; then
    NEXT_ISSUE="$issue_num"
    ISSUE_TITLE="$issue_title"
    STORY_NUM="$story_num"
    break
  fi
done <<< "$ISSUES"

if [ -z "$NEXT_ISSUE" ]; then
  echo "❌ No valid story issues found (issues must have X.Y.Z format in title)"
  exit 1
fi

# Get issue URL
ISSUE_URL=$(gh issue view $NEXT_ISSUE --json url --jq '.url')

# Find story file
STORY_FILE=$(find docs/stories -name "${STORY_NUM}*.md" -type f | head -1)

if [ -z "$STORY_FILE" ]; then
  echo "❌ Story file not found for issue #$NEXT_ISSUE (Story $STORY_NUM)"
  echo "💡 Check that the story file exists in docs/stories/"
  exit 1
fi

# Display story information
echo ""
echo "=== Next Story to Develop ==="
echo "Issue: #$NEXT_ISSUE"
echo "URL: $ISSUE_URL"
echo "Story: $STORY_NUM"
echo "File: $STORY_FILE"
echo ""

# Show story title
echo "--- Story ---"
grep -A 3 "## Story" "$STORY_FILE" | tail -3
echo ""

# Show acceptance criteria (first 5 items)
echo "--- Acceptance Criteria (preview) ---"
grep -A 7 "## Acceptance Criteria" "$STORY_FILE" | tail -7 | head -5
echo "..."
echo ""

# Output the story file path (for dev agent to use)
echo "$STORY_FILE"

