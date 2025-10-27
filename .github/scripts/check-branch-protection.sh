#!/bin/bash

# Check Branch Protection Status
# This script verifies if branch protection rules are properly configured

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BRANCH=${1:-main}
REPO_URL=$(git config --get remote.origin.url)

echo -e "${BLUE}🔍 Checking Branch Protection for '${BRANCH}' branch...${NC}"
echo ""

# Extract owner/repo from URL
if [[ $REPO_URL == *"github.com"* ]]; then
    if [[ $REPO_URL == *".git" ]]; then
        REPO_PATH=$(echo $REPO_URL | sed 's/.*github\.com[:/]\(.*\)\.git/\1/')
    else
        REPO_PATH=$(echo $REPO_URL | sed 's/.*github\.com[:/]\(.*\)/\1/')
    fi
    
    OWNER=$(echo $REPO_PATH | cut -d'/' -f1)
    REPO=$(echo $REPO_PATH | cut -d'/' -f2)
    
    echo -e "${BLUE}Repository: ${OWNER}/${REPO}${NC}"
    echo -e "${BLUE}Branch: ${BRANCH}${NC}"
    echo ""
else
    echo -e "${RED}❌ Not a GitHub repository or unable to parse repository URL${NC}"
    exit 1
fi

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${YELLOW}⚠️  GitHub CLI (gh) is not installed${NC}"
    echo -e "${YELLOW}   Install it from: https://cli.github.com/${NC}"
    echo -e "${YELLOW}   Or check manually at: https://github.com/${OWNER}/${REPO}/settings/branches${NC}"
    echo ""
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not authenticated with GitHub CLI${NC}"
    echo -e "${YELLOW}   Run: gh auth login${NC}"
    echo ""
    exit 1
fi

# Fetch branch protection status
echo -e "${BLUE}Fetching branch protection rules...${NC}"

PROTECTION_DATA=$(gh api repos/${OWNER}/${REPO}/branches/${BRANCH}/protection 2>/dev/null || echo "null")

if [[ "$PROTECTION_DATA" == "null" ]] || [[ "$PROTECTION_DATA" == *"Branch not protected"* ]]; then
    echo -e "${RED}❌ Branch '${BRANCH}' is NOT protected${NC}"
    echo ""
    echo -e "${YELLOW}To set up branch protection:${NC}"
    echo -e "${YELLOW}1. Go to: https://github.com/${OWNER}/${REPO}/settings/branches${NC}"
    echo -e "${YELLOW}2. Or run the automated workflow in GitHub Actions${NC}"
    echo -e "${YELLOW}3. See .github/BRANCH_PROTECTION_SETUP.md for detailed instructions${NC}"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Branch '${BRANCH}' is protected!${NC}"
echo ""

# Parse and display protection details
echo -e "${BLUE}Protection Rules:${NC}"

# Check PR requirements
if echo "$PROTECTION_DATA" | jq -e '.required_pull_request_reviews' > /dev/null 2>&1; then
    REQUIRED_REVIEWS=$(echo "$PROTECTION_DATA" | jq -r '.required_pull_request_reviews.required_approving_review_count // 0')
    DISMISS_STALE=$(echo "$PROTECTION_DATA" | jq -r '.required_pull_request_reviews.dismiss_stale_reviews // false')
    
    echo -e "${GREEN}✅ Pull Request Reviews Required: ${REQUIRED_REVIEWS} approval(s)${NC}"
    if [[ "$DISMISS_STALE" == "true" ]]; then
        echo -e "${GREEN}✅ Dismiss stale reviews: Enabled${NC}"
    else
        echo -e "${YELLOW}⚠️  Dismiss stale reviews: Disabled${NC}"
    fi
else
    echo -e "${RED}❌ Pull Request Reviews: Not required${NC}"
fi

# Check status checks
if echo "$PROTECTION_DATA" | jq -e '.required_status_checks' > /dev/null 2>&1; then
    STRICT_MODE=$(echo "$PROTECTION_DATA" | jq -r '.required_status_checks.strict // false')
    STATUS_CHECKS=$(echo "$PROTECTION_DATA" | jq -r '.required_status_checks.checks[]?.context // empty' | wc -l)
    
    echo -e "${GREEN}✅ Status Checks Required: ${STATUS_CHECKS} check(s)${NC}"
    if [[ "$STRICT_MODE" == "true" ]]; then
        echo -e "${GREEN}✅ Strict mode: Enabled (branches must be up-to-date)${NC}"
    else
        echo -e "${YELLOW}⚠️  Strict mode: Disabled${NC}"
    fi
    
    # List required checks
    echo -e "${BLUE}   Required Checks:${NC}"
    echo "$PROTECTION_DATA" | jq -r '.required_status_checks.checks[]?.context // empty' | while read -r check; do
        if [[ -n "$check" ]]; then
            echo -e "   • $check"
        fi
    done
else
    echo -e "${RED}❌ Status Checks: Not required${NC}"
fi

# Check other protections
FORCE_PUSH=$(echo "$PROTECTION_DATA" | jq -r '.allow_force_pushes.enabled // true')
DELETIONS=$(echo "$PROTECTION_DATA" | jq -r '.allow_deletions.enabled // true')
LINEAR_HISTORY=$(echo "$PROTECTION_DATA" | jq -r '.required_linear_history.enabled // false')

if [[ "$FORCE_PUSH" == "false" ]]; then
    echo -e "${GREEN}✅ Force pushes: Blocked${NC}"
else
    echo -e "${RED}❌ Force pushes: Allowed${NC}"
fi

if [[ "$DELETIONS" == "false" ]]; then
    echo -e "${GREEN}✅ Branch deletion: Blocked${NC}"
else
    echo -e "${RED}❌ Branch deletion: Allowed${NC}"
fi

if [[ "$LINEAR_HISTORY" == "true" ]]; then
    echo -e "${GREEN}✅ Linear history: Required${NC}"
else
    echo -e "${YELLOW}⚠️  Linear history: Not required${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Branch protection is properly configured!${NC}"
echo -e "${BLUE}All changes to '${BRANCH}' must go through Pull Requests.${NC}"
