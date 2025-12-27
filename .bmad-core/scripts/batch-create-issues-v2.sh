#!/bin/bash

# Batch create GitHub issues for stories with improved labels and project assignment
# Version 2.0 - Includes epic labels, type labels, and project assignment

STORY_DIR="docs/stories"
SUCCESS_COUNT=0
FAILURE_COUNT=0
SKIPPED_COUNT=0
FAILURES=()

echo "=== Batch GitHub Issue Creation v2.0 ==="
echo ""
echo "Scanning for stories without GitHub issues..."
echo ""

# Function to determine epic label from filename
get_epic_label() {
  local filename="$1"
  local epic_num=$(echo "$filename" | sed 's/\..*$//')
  
  case "$epic_num" in
    1*) echo "epic-1-shell" ;;
    2*) echo "epic-2-dashboard" ;;
    3*) echo "epic-3-gallery" ;;
    6*) echo "epic-6-settings" ;;
    7*) echo "epic-7-realtime" ;;
    *) echo "story" ;;
  esac
}

# Function to determine type label from story content
get_type_label() {
  local file="$1"
  local content=$(cat "$file")
  
  if echo "$content" | grep -qi "test\|testing\|validation"; then
    echo "type:validation"
  elif echo "$content" | grep -qi "infrastructure\|setup\|config\|deployment"; then
    echo "type:infrastructure"
  elif echo "$content" | grep -qi "API\|endpoint\|backend\|component\|UI\|page"; then
    echo "type:feature"
  else
    echo "type:feature"
  fi
}

# Process each story file
for file in "$STORY_DIR"/*.md; do
  if [ -f "$file" ]; then
    filename=$(basename "$file")
    
    # Skip special files
    if [[ "$filename" == _* ]] || \
       [[ "$filename" == "README.md" ]] || \
       [[ "$filename" == "design-handoff-stories.md" ]] || \
       [[ "$filename" == "ui-package-reorganization.md" ]]; then
      echo "⏭️  Skipping: $filename (special file)"
      ((SKIPPED_COUNT++))
      continue
    fi
    
    # Skip if already has GitHub issue
    if grep -q "## GitHub Issue" "$file"; then
      echo "⏭️  Skipping: $filename (already has issue)"
      ((SKIPPED_COUNT++))
      continue
    fi
    
    # Extract title (first line starting with #)
    title=$(grep -m 1 "^# " "$file" | sed 's/^# //')
    
    if [ -z "$title" ]; then
      echo "❌ Failed: $filename (no title found)"
      FAILURES+=("$filename - no title found")
      ((FAILURE_COUNT++))
      continue
    fi
    
    # Extract story statement
    story=$(sed -n '/^## Story$/,/^## /p' "$file" | sed '1d;$d' | sed '/^$/d')
    
    # Extract acceptance criteria
    acceptance=$(sed -n '/^## Acceptance Criteria$/,/^## /p' "$file" | sed '1d;$d')
    
    # Determine labels
    epic_label=$(get_epic_label "$filename")
    type_label=$(get_type_label "$file")
    
    # Create issue body
    body="## Story
$story

## Acceptance Criteria
$acceptance

## Story File
\`$file\`

## Tasks
- [ ] Implementation
- [ ] Tests
- [ ] Documentation
- [ ] Code Review

---
*Created from story file: $file*"
    
    # Create GitHub issue with project assignment
    echo "📝 Creating issue for: $filename"
    echo "   Epic: $epic_label | Type: $type_label"
    
    issue_url=$(gh issue create \
      --title "$title" \
      --body "$body" \
      --label "story" \
      --label "bmad" \
      --label "groomed" \
      --label "$epic_label" \
      --label "$type_label" \
      --project "LEGO MOC Instructions App" 2>&1)
    
    if [ $? -eq 0 ]; then
      # Extract issue number from URL
      issue_num=$(echo "$issue_url" | grep -o '[0-9]*$')

      # Set project status to Backlog
      echo "   Setting status to Backlog..."
      bash .bmad-core/scripts/set-issue-status.sh "$issue_num" Backlog 2>&1 | grep -v "^Setting issue"

      # Update story file with GitHub issue section
      # Insert after the title (first line)
      temp_file=$(mktemp)
      head -n 1 "$file" > "$temp_file"
      echo "" >> "$temp_file"
      echo "## GitHub Issue" >> "$temp_file"
      echo "- Issue: #$issue_num" >> "$temp_file"
      echo "- URL: $issue_url" >> "$temp_file"
      echo "- Status: Backlog" >> "$temp_file"
      tail -n +2 "$file" >> "$temp_file"
      mv "$temp_file" "$file"

      echo "✅ Created issue #$issue_num (Status: Todo)"
      ((SUCCESS_COUNT++))
    else
      echo "❌ Failed to create issue: $issue_url"
      FAILURES+=("$filename - $issue_url")
      ((FAILURE_COUNT++))
    fi
    
    # Small delay to avoid rate limiting
    sleep 0.5
  fi
done

echo ""
echo "=== SUMMARY ==="
echo "✅ Success: $SUCCESS_COUNT"
echo "❌ Failed: $FAILURE_COUNT"
echo "⏭️  Skipped: $SKIPPED_COUNT"

if [ ${#FAILURES[@]} -gt 0 ]; then
  echo ""
  echo "Failed items:"
  for failure in "${FAILURES[@]}"; do
    echo "  - $failure"
  done
fi

