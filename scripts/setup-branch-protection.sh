#!/bin/bash

# Setup Branch Protection Rules
# This script helps configure GitHub branch protection rules via GitHub CLI

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed${NC}"
    echo "Install it from: https://cli.github.com/"
    exit 1
fi

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ Not authenticated with GitHub CLI${NC}"
    echo "Run: gh auth login"
    exit 1
fi

# Get repository information
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
echo -e "${BLUE}🔧 Setting up branch protection for: $REPO${NC}"
echo ""

# Function to setup branch protection
setup_branch_protection() {
    local branch=$1
    local required_checks=$2
    
    echo -e "${YELLOW}📋 Setting up protection for branch: $branch${NC}"
    
    # Create the branch protection rule
    gh api \
        --method PUT \
        -H "Accept: application/vnd.github+json" \
        "/repos/$REPO/branches/$branch/protection" \
        --field required_status_checks='{
            "strict": true,
            "checks": ['"$required_checks"']
        }' \
        --field enforce_admins=false \
        --field required_pull_request_reviews='{
            "required_approving_review_count": 1,
            "dismiss_stale_reviews": true,
            "require_code_owner_reviews": false,
            "require_last_push_approval": false
        }' \
        --field restrictions=null \
        --field allow_force_pushes=false \
        --field allow_deletions=false \
        --field required_linear_history=true
    
    echo -e "${GREEN}✅ Branch protection configured for: $branch${NC}"
}

# Required status checks for main branch
MAIN_CHECKS='
{"context": "Unit Tests", "app_id": null},
{"context": "Lint & Type Check", "app_id": null},
{"context": "Build App", "app_id": null},
{"context": "Security Audit", "app_id": null},
{"context": "Auggie + CodeRabbit Collaborative Review", "app_id": null},
{"context": "Quality Gates", "app_id": null}
'

# Required status checks for develop branch (if it exists)
DEVELOP_CHECKS='
{"context": "Unit Tests", "app_id": null},
{"context": "Lint & Type Check", "app_id": null},
{"context": "Build App", "app_id": null},
{"context": "Auggie + CodeRabbit Collaborative Review", "app_id": null},
{"context": "Quality Gates", "app_id": null}
'

echo -e "${BLUE}🚀 Configuring Branch Protection Rules${NC}"
echo "=================================="
echo ""

# Setup main branch protection
echo "Setting up main branch protection..."
setup_branch_protection "main" "$MAIN_CHECKS"
echo ""

# Check if develop branch exists and set it up
if gh api "/repos/$REPO/branches/develop" &> /dev/null; then
    echo "Setting up develop branch protection..."
    setup_branch_protection "develop" "$DEVELOP_CHECKS"
    echo ""
else
    echo -e "${YELLOW}⚠️  Develop branch not found, skipping...${NC}"
    echo ""
fi

echo -e "${GREEN}🎉 Branch protection setup complete!${NC}"
echo ""
echo -e "${BLUE}📋 What's now protected:${NC}"
echo "• Pull requests required before merging"
echo "• At least 1 approving review required"
echo "• Status checks must pass:"
echo "  - Unit Tests"
echo "  - Lint & Type Check"
echo "  - Build App"
echo "  - Security Audit (main branch only)"
echo "  - CodeRabbit AI Review"
echo "  - Quality Gates"
echo "• Linear history required (no merge commits)"
echo "• Force pushes disabled"
echo "• Branch deletion disabled"
echo ""
echo -e "${YELLOW}💡 Next steps:${NC}"
echo "1. Create a pull request to test the protection"
echo "2. Verify that status checks are required"
echo "3. Check that merging is blocked until checks pass"
echo ""
echo -e "${BLUE}🔗 View protection rules:${NC}"
echo "https://github.com/$REPO/settings/branches"
