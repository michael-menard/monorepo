#\!/bin/bash

CLOSED_COUNT=0
FAILED_COUNT=0
FAILURES=()

echo "🔒 Closing all GitHub issues created before 2025-12-21..."
echo ""

# Get all issue numbers created before today
issue_numbers=$(gh issue list --state all --limit 1000 --json number,createdAt --jq '.[] | select(.createdAt | startswith("2025-12-21") | not) | .number')

total=$(echo "$issue_numbers" | wc -l | tr -d ' ')
echo "Found $total issues to close"
echo ""

for issue_num in $issue_numbers; do
  echo "Closing issue #$issue_num..."
  
  result=$(gh issue close "$issue_num" --reason "not planned" 2>&1)
  
  if [ $? -eq 0 ]; then
    echo "✅ Closed issue #$issue_num"
    ((CLOSED_COUNT++))
  else
    echo "❌ Failed to close issue #$issue_num: $result"
    FAILURES+=("$issue_num: $result")
    ((FAILED_COUNT++))
  fi
  
  # Small delay to avoid rate limiting
  sleep 0.2
done

echo ""
echo "🎉 Batch Issue Closing Complete\!"
echo ""
echo "Total Issues: $total"
echo "Closed: $CLOSED_COUNT"
echo "Failures: $FAILED_COUNT"

if [ $FAILED_COUNT -gt 0 ]; then
  echo ""
  echo "Failed Issues:"
  for failure in "${FAILURES[@]}"; do
    echo "  - $failure"
  done
fi
