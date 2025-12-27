#!/bin/bash

# Set GitHub Project status for an issue
# Usage: ./set-issue-status.sh <issue-number> <status>
# Status options: Todo, "In Progress", Done

ISSUE_NUM=$1
STATUS=$2
PROJECT_ID="PVT_kwHOABuWLs4BJVcx"  # LEGO MOC Instructions App
OWNER="michael-menard"
REPO="monorepo"
STATUS_FIELD_ID="PVTSSF_lAHOABuWLs4BJVcxzg6xJ64"

# Status option IDs (updated for new Workflow Status field)
BACKLOG_ID="a4b1940b"
TODO_ID="c797a1c0"
BLOCKED_ID="49c1c5df"
IN_PROGRESS_ID="64a1d5f8"
QA_ID="cf53236a"
UAT_ID="2e51dabd"
DONE_ID="d5c27e2f"

if [ -z "$ISSUE_NUM" ] || [ -z "$STATUS" ]; then
  echo "Usage: $0 <issue-number> <status>"
  echo "Status options: Backlog, Todo, Blocked, InProgress, QA, UAT, Done"
  exit 1
fi

# Map status name to ID
case "$STATUS" in
  "Backlog"|"backlog"|"BACKLOG")
    STATUS_ID="$BACKLOG_ID"
    STATUS_NAME="Backlog"
    ;;
  "Todo"|"todo"|"TODO")
    STATUS_ID="$TODO_ID"
    STATUS_NAME="Todo"
    ;;
  "Blocked"|"blocked"|"BLOCKED")
    STATUS_ID="$BLOCKED_ID"
    STATUS_NAME="Blocked"
    ;;
  "InProgress"|"in-progress"|"In Progress"|"IN_PROGRESS")
    STATUS_ID="$IN_PROGRESS_ID"
    STATUS_NAME="In Progress"
    ;;
  "QA"|"qa")
    STATUS_ID="$QA_ID"
    STATUS_NAME="QA"
    ;;
  "UAT"|"uat")
    STATUS_ID="$UAT_ID"
    STATUS_NAME="UAT"
    ;;
  "Done"|"done"|"DONE")
    STATUS_ID="$DONE_ID"
    STATUS_NAME="Done"
    ;;
  *)
    echo "❌ Invalid status: $STATUS"
    echo "Valid options: Backlog, Todo, Blocked, InProgress, QA, UAT, Done"
    exit 1
    ;;
esac

echo "Setting issue #$ISSUE_NUM status to '$STATUS_NAME'..."

# Get the issue's project item ID
ITEM_ID=$(gh api graphql -f query="
  query {
    repository(owner: \"$OWNER\", name: \"$REPO\") {
      issue(number: $ISSUE_NUM) {
        projectItems(first: 10) {
          nodes {
            id
            project {
              id
            }
          }
        }
      }
    }
  }
" --jq ".data.repository.issue.projectItems.nodes[] | select(.project.id == \"$PROJECT_ID\") | .id")

if [ -z "$ITEM_ID" ]; then
  echo "❌ Issue #$ISSUE_NUM not found in project or not added to project yet"
  exit 1
fi

# Update the status field
gh api graphql -f query="
  mutation {
    updateProjectV2ItemFieldValue(
      input: {
        projectId: \"$PROJECT_ID\"
        itemId: \"$ITEM_ID\"
        fieldId: \"$STATUS_FIELD_ID\"
        value: { 
          singleSelectOptionId: \"$STATUS_ID\"
        }
      }
    ) {
      projectV2Item {
        id
      }
    }
  }
" > /dev/null

if [ $? -eq 0 ]; then
  echo "✅ Issue #$ISSUE_NUM status set to '$STATUS_NAME'"
else
  echo "❌ Failed to set status"
  exit 1
fi

