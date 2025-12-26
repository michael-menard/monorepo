#\!/bin/bash

SUCCESS_COUNT=0
FAILURE_COUNT=0
SKIPPED_COUNT=0
FAILURES=()

echo "🚀 Starting batch GitHub issue creation..."
echo ""

for file in docs/stories/*.md; do
  if [ -f "$file" ] && [ "$(basename "$file")" \!= "README.md" ]; then
    basename=$(basename "$file")
    
    # Skip files starting with _ or special files
    if [[ "$basename" =~ ^_ ]] || [[ "$basename" == "design-handoff-stories.md" ]] || [[ "$basename" == "ui-package-reorganization.md" ]]; then
      continue
    fi
    
    # Skip if already has GitHub issue
    if grep -q "## GitHub Issue" "$file"; then
      ((SKIPPED_COUNT++))
      continue
    fi
    
    # Extract title (first H1 heading)
    title=$(grep -m 1 "^# " "$file" | sed 's/^# //')
    
    if [ -z "$title" ]; then
      echo "⚠️  Skipping $basename - no title found"
      ((SKIPPED_COUNT++))
      continue
    fi
    
    # Extract story statement
    story=$(sed -n '/^## Story$/,/^## /p' "$file" | sed '1d;$d' | sed '/^$/d')
    
    # Extract acceptance criteria
    ac=$(sed -n '/^## Acceptance Criteria$/,/^## /p' "$file" | sed '1d;$d')
    
    # Create issue body
    body="## Story
$story

## Acceptance Criteria
$ac

## Story File
\`$file\`

## Tasks
- [ ] Implementation
- [ ] Tests
- [ ] Documentation
- [ ] Code Review

---
*Created from story file: $file*"
    
    # Create GitHub issue
    echo "Creating issue for: $basename"
    issue_url=$(gh issue create \
      --title "$title" \
      --body "$body" \
      --label "user-story" \
      --label "bmad" 2>&1)
    
    if [ $? -eq 0 ]; then
      # Extract issue number from URL
      issue_number=$(echo "$issue_url" | grep -oE '[0-9]+$')
      
      # Update story file with GitHub issue section
      # Create temp file with new content
      temp_file=$(mktemp)
      
      # Get the first line (title)
      head -n 1 "$file" > "$temp_file"
      
      # Add GitHub Issue section
      echo "" >> "$temp_file"
      echo "## GitHub Issue" >> "$temp_file"
      echo "- Issue: #$issue_number" >> "$temp_file"
      echo "- URL: $issue_url" >> "$temp_file"
      echo "- Status: Open" >> "$temp_file"
      
      # Add rest of file (skip first line)
      tail -n +2 "$file" >> "$temp_file"
      
      # Replace original file
      mv "$temp_file" "$file"
      
      echo "✅ Created issue #$issue_number for $basename"
      ((SUCCESS_COUNT++))
    else
      echo "❌ Failed to create issue for $basename: $issue_url"
      FAILURES+=("$basename: $issue_url")
      ((FAILURE_COUNT++))
    fi
    
    # Small delay to avoid rate limiting
    sleep 0.5
  fi
done

echo ""
echo "🎉 Batch GitHub Issue Creation Complete\!"
echo ""
echo "Total Stories Processed: $((SUCCESS_COUNT + FAILURE_COUNT))"
echo "Issues Created: $SUCCESS_COUNT"
echo "Skipped (already have issues): $SKIPPED_COUNT"
echo "Failures: $FAILURE_COUNT"

if [ $FAILURE_COUNT -gt 0 ]; then
  echo ""
  echo "Failed Stories:"
  for failure in "${FAILURES[@]}"; do
    echo "  - $failure"
  done
fi
