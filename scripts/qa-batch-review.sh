#!/bin/bash
# QA Batch Review Script
# Lists all stories in "Ready for Review" status

echo "=========================================="
echo "  QA Batch Review - Stories Ready for Review"
echo "=========================================="
echo ""

count=0
while IFS= read -r file; do
  if [ -n "$file" ]; then
    story_id=$(basename "$file" .md | cut -d'.' -f1-2)
    title=$(head -1 "$file" | sed 's/^# //')
    
    # Check if gate file exists
    slug=$(basename "$file" .md | sed 's/^[0-9.]*\.//')
    gate_file="docs/qa/gates/${story_id}-${slug}.yml"
    gate_status="NO GATE"
    if [ -f "$gate_file" ]; then
      gate_status=$(grep "^gate:" "$gate_file" | cut -d':' -f2 | tr -d ' ')
    fi
    
    count=$((count + 1))
    printf "%2d. %-50s [%s]\n" "$count" "$title" "$gate_status"
    echo "    File: $file"
    echo ""
  fi
done < <(grep -l "Ready for Review" docs/stories/*.md 2>/dev/null | sort -V)

echo "=========================================="
echo "  Total: $count stories ready for review"
echo "=========================================="

