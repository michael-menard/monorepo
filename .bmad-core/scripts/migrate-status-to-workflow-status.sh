#!/bin/bash

# Script to migrate items from old "Status" field to "Workflow Status" field
# Maps: "Ready to Work" -> "Backlog" in Workflow Status

set -e

PROJECT_ID="PVT_kwHOABuWLs4BJVcx"

# Old "Status" field
OLD_STATUS_FIELD_ID="PVTSSF_lAHOABuWLs4BJVcxzg5h6gk"
READY_TO_WORK_OPTION_ID="f75ad846"  # "Ready to Work" in old Status field

# New "Workflow Status" field
WORKFLOW_STATUS_FIELD_ID="PVTSSF_lAHOABuWLs4BJVcxzg6xJ64"
BACKLOG_OPTION_ID="a4b1940b"  # "Backlog" in Workflow Status field

echo "🔍 Finding all items with 'Ready to Work' status..."

# Query to get all items with "Ready to Work" status
ITEMS=$(gh api graphql -f query='
query($projectId: ID!) {
  node(id: $projectId) {
    ... on ProjectV2 {
      items(first: 100) {
        nodes {
          id
          fieldValueByName(name: "Status") {
            ... on ProjectV2ItemFieldSingleSelectValue {
              optionId
            }
          }
          content {
            ... on Issue {
              number
              title
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
}' -f projectId="$PROJECT_ID")

# Extract item IDs that have "Ready to Work" status
ITEM_IDS=$(echo "$ITEMS" | jq -r '.data.node.items.nodes[] | select(.fieldValueByName.optionId == "'"$READY_TO_WORK_OPTION_ID"'") | .id')

if [ -z "$ITEM_IDS" ]; then
  echo "✅ No items found with 'Ready to Work' status"
  exit 0
fi

ITEM_COUNT=$(echo "$ITEM_IDS" | wc -l | tr -d ' ')
echo "📊 Found $ITEM_COUNT items with 'Ready to Work' status"

# Update each item to set Workflow Status to "Backlog"
COUNTER=0
for ITEM_ID in $ITEM_IDS; do
  COUNTER=$((COUNTER + 1))
  
  echo "[$COUNTER/$ITEM_COUNT] Updating item $ITEM_ID to Workflow Status: Backlog..."
  
  gh api graphql -f query='
    mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $projectId
        itemId: $itemId
        fieldId: $fieldId
        value: {
          singleSelectOptionId: $optionId
        }
      }) {
        projectV2Item {
          id
        }
      }
    }' \
    -f projectId="$PROJECT_ID" \
    -f itemId="$ITEM_ID" \
    -f fieldId="$WORKFLOW_STATUS_FIELD_ID" \
    -f optionId="$BACKLOG_OPTION_ID" > /dev/null
  
  echo "  ✅ Updated"
done

echo ""
echo "✅ Migration complete! Updated $COUNTER items from 'Ready to Work' to 'Backlog'"
echo ""
echo "Next steps:"
echo "1. Go to: https://github.com/users/michael-menard/projects/4/settings"
echo "2. Delete the old 'Status' field"
echo "3. Rename 'Workflow Status' to 'Status'"

