#!/bin/bash

# Script to create a GitHub Project with automation columns
# Usage: ./create-project.sh

set -e

PROJECT_NAME="Lego MOCS Database"
REPO_OWNER="michael-menard"
REPO_NAME="Monorepo"

echo "Creating GitHub Project: $PROJECT_NAME"

# Create the project using GitHub CLI
# Note: This requires project scope in your GitHub token
gh project create "$PROJECT_NAME" \
  --owner "$REPO_OWNER" \
  --title "$PROJECT_NAME" \
  --format json > /tmp/project-info.json

PROJECT_NUMBER=$(jq -r '.number' /tmp/project-info.json)
PROJECT_URL=$(jq -r '.url' /tmp/project-info.json)

echo "✅ Project created successfully!"
echo "   Project Number: $PROJECT_NUMBER"
echo "   Project URL: $PROJECT_URL"

# Add custom fields and columns
echo ""
echo "Next steps:"
echo "1. Visit your project: $PROJECT_URL"
echo "2. Add these columns (in order):"
echo "   - Backlog"
echo "   - Ready to Work"
echo "   - In Progress"
echo "   - QA"
echo "   - Done"
echo ""
echo "3. Set up project automation in each column:"
echo "   - Backlog: Item added to project"
echo "   - Ready to Work: Item labeled 'groomed'"
echo "   - In Progress: Item assigned"
echo "   - QA: Item labeled 'in-qa'"
echo "   - Done: Item closed OR Item labeled 'qa-passed'"
echo ""
echo "4. Add this PROJECT_URL to your repository variables:"
echo "   gh variable set PROJECT_URL --body \"$PROJECT_URL\""
echo ""
echo "5. Create a Personal Access Token with project permissions and add it:"
echo "   gh secret set PROJECT_TOKEN"

# Clean up
rm /tmp/project-info.json
