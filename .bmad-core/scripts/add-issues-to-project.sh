#!/bin/bash

# Add all existing GitHub issues to the "LEGO MOC Instructions App" project
# and set their status to "Backlog"

PROJECT_ID="PVT_kwHOABuWLs4BJVcx"
STORY_DIR="docs/stories"
SUCCESS_COUNT=0
FAILURE_COUNT=0
SKIPPED_COUNT=0
FAILURES=()

echo "=== Adding All Issues to Project and Setting Status to 'Backlog' ==="
echo ""
echo "Scanning story files for GitHub issues..."
echo ""

# Process each story file
for file in "$STORY_DIR"/*.md; do
  if [ -f "$file" ]; then
    filename=$(basename "$file")
    
    # Skip special files
    if [[ "$filename" == _* ]] || \
       [[ "$filename" == "README.md" ]] || \
       [[ "$filename" == "design-handoff-stories.md" ]] || \
       [[ "$filename" == "ui-package-reorganization.md" ]]; then
      continue
    fi
    
    # Check if file has GitHub issue
    if ! grep -q "## GitHub Issue" "$file"; then
      ((SKIPPED_COUNT++))
      continue
    fi
    
    # Extract issue number
    issue_num=$(grep -A 3 "## GitHub Issue" "$file" | grep "Issue:" | grep -oE '#[0-9]+' | tr -d '#')
    
    if [ -z "$issue_num" ]; then
      ((SKIPPED_COUNT++))
      continue
    fi
    
    echo "📝 Processing: $filename - Issue #$issue_num"

    # Get issue node ID
    ISSUE_NODE_ID=$(gh issue view "$issue_num" --json id --jq '.id')

    if [ -z "$ISSUE_NODE_ID" ]; then
      echo "   ❌ Failed to get issue node ID"
      FAILURES+=("$filename - Issue #$issue_num (node ID not found)")
      ((FAILURE_COUNT++))
      continue
    fi

    # Check if already in project
    ALREADY_IN_PROJECT=$(gh issue view "$issue_num" --json projectItems --jq ".projectItems[] | select(.project.id == \"$PROJECT_ID\") | .id")

    if [ -n "$ALREADY_IN_PROJECT" ]; then
      echo "   ⏭️  Already in project, setting status..."
    else
      # Add issue to project using GraphQL
      echo "   Adding to project..."
      ADD_RESULT=$(gh api graphql -f query="
        mutation {
          addProjectV2ItemById(input: {
            projectId: \"$PROJECT_ID\"
            contentId: \"$ISSUE_NODE_ID\"
          }) {
            item {
              id
            }
          }
        }
      " --jq '.data.addProjectV2ItemById.item.id' 2>&1)

      if [ -n "$ADD_RESULT" ] && [[ "$ADD_RESULT" != *"error"* ]]; then
        echo "   ✅ Added to project"
        sleep 0.5  # Small delay to ensure project item is created
      else
        echo "   ❌ Failed to add to project: $ADD_RESULT"
        FAILURES+=("$filename - Issue #$issue_num (project add failed)")
        ((FAILURE_COUNT++))
        continue
      fi
    fi

    # Set status to Backlog
    echo "   Setting status to Backlog..."
    if bash .bmad-core/scripts/set-issue-status.sh "$issue_num" Backlog 2>&1 | grep -q "✅"; then
      # Update story file status line
      sed -i.bak 's/- Status: .*/- Status: Backlog/' "$file"
      rm "${file}.bak" 2>/dev/null

      echo "   ✅ Status set to Backlog"
      ((SUCCESS_COUNT++))
    else
      echo "   ❌ Failed to set status"
      FAILURES+=("$filename - Issue #$issue_num (status update failed)")
      ((FAILURE_COUNT++))
    fi
    
    # Small delay to avoid rate limiting
    sleep 0.3
  fi
done

echo ""
echo "=== SUMMARY ==="
echo "✅ Success: $SUCCESS_COUNT"
echo "❌ Failed: $FAILURE_COUNT"
echo "⏭️  Skipped: $SKIPPED_COUNT"
echo ""

if [ ${#FAILURES[@]} -gt 0 ]; then
  echo "Failed items:"
  for failure in "${FAILURES[@]}"; do
    echo "  - $failure"
  done
  echo ""
fi

if [ $SUCCESS_COUNT -gt 0 ]; then
  echo "🎉 Issues have been added to project and set to 'Todo' status!"
  echo ""
  echo "View your project board:"
  echo "https://github.com/users/michael-menard/projects/4"
fi

