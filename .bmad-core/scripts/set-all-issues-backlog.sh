#!/bin/bash

# Set all GitHub Project items to "Backlog" status unless they are
# currently "Done" or "In Progress"

PROJECT_ID="PVT_kwHOABuWLs4BJVcx"
OWNER="michael-menard"
REPO="monorepo"
STATUS_FIELD_ID="PVTSSF_lAHOABuWLs4BJVcxzg5h6gk"  # Status field (not Workflow Status)

# Backlog option ID from Status field
BACKLOG_ID="8de3521d"

SUCCESS_COUNT=0
FAILURE_COUNT=0
SKIPPED_COUNT=0
FAILURES=()

echo "=== Setting All Issues to 'Backlog' Status ==="
echo ""

# Check if BACKLOG_ID is set
if [ -z "$BACKLOG_ID" ]; then
  echo "❌ ERROR: BACKLOG_ID not set!"
  echo ""
  echo "Please follow these steps:"
  echo "1. Go to: https://github.com/users/michael-menard/projects/4"
  echo "2. Click ⋮ (three dots) → Settings"
  echo "3. Find 'Workflow Status' field → Edit"
  echo "4. Add new option: 'Backlog'"
  echo "5. Drag it to be the first option (before 'Todo')"
  echo "6. Save"
  echo ""
  echo "7. Run this command to get the Backlog ID:"
  echo "   gh project field-list 4 --owner michael-menard --format json | jq '.fields[] | select(.name == \"Workflow Status\")'"
  echo ""
  echo "8. Update BACKLOG_ID in this script with the ID for 'Backlog'"
  exit 1
fi

echo "Fetching all project items..."
echo ""

# Get all items in the project with pagination
ALL_ITEMS=""
HAS_NEXT_PAGE=true
END_CURSOR=""

while [ "$HAS_NEXT_PAGE" = "true" ]; do
  if [ -z "$END_CURSOR" ]; then
    CURSOR_PARAM=""
  else
    CURSOR_PARAM=", after: \"$END_CURSOR\""
  fi

  RESPONSE=$(gh api graphql -f query="
    query {
      node(id: \"$PROJECT_ID\") {
        ... on ProjectV2 {
          items(first: 100$CURSOR_PARAM) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              content {
                ... on Issue {
                  number
                  title
                }
              }
              fieldValues(first: 20) {
                nodes {
                  ... on ProjectV2ItemFieldSingleSelectValue {
                    field {
                      ... on ProjectV2SingleSelectField {
                        id
                        name
                      }
                    }
                    name
                  }
                }
              }
            }
          }
        }
      }
    }
  ")

  ITEMS=$(echo "$RESPONSE" | jq -r '.data.node.items.nodes[]')
  ALL_ITEMS="${ALL_ITEMS}${ITEMS}"$'\n'

  HAS_NEXT_PAGE=$(echo "$RESPONSE" | jq -r '.data.node.items.pageInfo.hasNextPage')
  END_CURSOR=$(echo "$RESPONSE" | jq -r '.data.node.items.pageInfo.endCursor')

  if [ "$HAS_NEXT_PAGE" = "true" ]; then
    echo "Fetched batch, getting more..."
  fi
done

echo "Total items fetched. Processing..."
echo ""

# Process each item
echo "$ALL_ITEMS" | jq -c '.' | while read -r item; do
  ITEM_ID=$(echo "$item" | jq -r '.id')
  ISSUE_NUM=$(echo "$item" | jq -r '.content.number // empty')
  ISSUE_TITLE=$(echo "$item" | jq -r '.content.title // "Unknown"')
  
  # Get current Status
  CURRENT_STATUS=$(echo "$item" | jq -r '.fieldValues.nodes[] | select(.field.name == "Status") | .name // empty')

  # Skip if already Done or In Progress
  if [ "$CURRENT_STATUS" == "Done" ] || [ "$CURRENT_STATUS" == "In Progress" ]; then
    echo "⏭️  Skipping #$ISSUE_NUM - Already in '$CURRENT_STATUS'"
    ((SKIPPED_COUNT++))
    continue
  fi

  # Skip if already Backlog
  if [ "$CURRENT_STATUS" == "Backlog" ]; then
    echo "⏭️  Skipping #$ISSUE_NUM - Already in 'Backlog'"
    ((SKIPPED_COUNT++))
    continue
  fi

  if [ -z "$CURRENT_STATUS" ]; then
    echo "📝 Processing #$ISSUE_NUM: $ISSUE_TITLE"
    echo "   No status → Backlog"
  else
    echo "📝 Processing #$ISSUE_NUM: $ISSUE_TITLE"
    echo "   $CURRENT_STATUS → Backlog"
  fi
  
  # Update to Backlog
  gh api graphql -f query="
    mutation {
      updateProjectV2ItemFieldValue(
        input: {
          projectId: \"$PROJECT_ID\"
          itemId: \"$ITEM_ID\"
          fieldId: \"$STATUS_FIELD_ID\"
          value: { 
            singleSelectOptionId: \"$BACKLOG_ID\"
          }
        }
      ) {
        projectV2Item {
          id
        }
      }
    }
  " > /dev/null 2>&1
  
  if [ $? -eq 0 ]; then
    echo "   ✅ Updated to Backlog"
    ((SUCCESS_COUNT++))
  else
    echo "   ❌ Failed to update"
    FAILURES+=("#$ISSUE_NUM - $ISSUE_TITLE")
    ((FAILURE_COUNT++))
  fi
  
  # Small delay to avoid rate limiting
  sleep 0.3
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

