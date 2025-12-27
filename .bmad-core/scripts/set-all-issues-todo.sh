#!/bin/bash

# Set all existing GitHub issues to "Todo" status
# This is a one-time script to initialize status for existing issues

STORY_DIR="docs/stories"
SUCCESS_COUNT=0
FAILURE_COUNT=0
SKIPPED_COUNT=0
FAILURES=()

echo "=== Setting All Existing Issues to 'Todo' Status ==="
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
      echo "⏭️  Skipping: $filename (no GitHub issue)"
      ((SKIPPED_COUNT++))
      continue
    fi
    
    # Extract issue number
    issue_num=$(grep -A 3 "## GitHub Issue" "$file" | grep "Issue:" | grep -oE '#[0-9]+' | tr -d '#')
    
    if [ -z "$issue_num" ]; then
      echo "⏭️  Skipping: $filename (no issue number found)"
      ((SKIPPED_COUNT++))
      continue
    fi
    
    # Check current status in story file
    current_status=$(grep -A 5 "## GitHub Issue" "$file" | grep "Status:" | sed 's/.*Status: //')
    
    if [[ "$current_status" == "Todo" ]]; then
      echo "⏭️  Skipping: $filename (already Todo) - Issue #$issue_num"
      ((SKIPPED_COUNT++))
      continue
    fi
    
    echo "📝 Processing: $filename - Issue #$issue_num"
    echo "   Current status: $current_status → Todo"
    
    # Set status to Todo using the helper script
    if bash .bmad-core/scripts/set-issue-status.sh "$issue_num" Todo 2>&1 | grep -q "✅"; then
      # Update story file status line
      sed -i.bak 's/- Status: .*/- Status: Todo/' "$file"
      rm "${file}.bak" 2>/dev/null
      
      echo "✅ Updated issue #$issue_num to Todo"
      ((SUCCESS_COUNT++))
    else
      echo "❌ Failed to update issue #$issue_num"
      FAILURES+=("$filename - Issue #$issue_num")
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
  echo "🎉 All existing issues have been set to 'Todo' status!"
  echo ""
  echo "Next steps:"
  echo "1. View your project board to see all issues in the Todo column"
  echo "2. When dev agent starts work, status will automatically change to 'In Progress'"
  echo "3. When PR is merged, status will automatically change to 'Done'"
fi

