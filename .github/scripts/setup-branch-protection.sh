#!/bin/bash
# Setup Branch Protection Rules for GitHub Repository
# Requires: GitHub CLI (gh) - https://cli.github.com/

set -e

echo "🔒 Branch Protection Setup Script"
echo "=================================="
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed!"
    echo ""
    echo "📦 Install it with:"
    echo "   macOS:   brew install gh"
    echo "   Linux:   See https://github.com/cli/cli/blob/trunk/docs/install_linux.md"
    echo "   Windows: See https://github.com/cli/cli#windows"
    echo ""
    echo "Or configure branch protection manually:"
    echo "   https://github.com/michael-menard/monorepo/settings/branches"
    exit 1
fi

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    echo "🔐 Not authenticated with GitHub. Running login..."
    gh auth login
fi

echo "✅ GitHub CLI is ready"
echo ""

# Get repository info
REPO="michael-menard/monorepo"
BRANCH="main"

echo "📋 Repository: $REPO"
echo "🌿 Branch: $BRANCH"
echo ""

# Confirm with user
read -p "Do you want to set up branch protection for '$BRANCH'? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Setup cancelled"
    exit 0
fi

echo ""
echo "🚀 Setting up branch protection rules..."
echo ""

# Create branch protection rule using GitHub API
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  "/repos/$REPO/branches/$BRANCH/protection" \
  -f required_status_checks='{"strict":true,"checks":[{"context":"Lint & Type Check"},{"context":"Unit Tests"},{"context":"Build All Packages"},{"context":"Security Audit"}]}' \
  -f enforce_admins=false \
  -f required_pull_request_reviews='{"dismiss_stale_reviews":true,"require_code_owner_reviews":false,"required_approving_review_count":1}' \
  -f restrictions=null \
  -f required_linear_history=true \
  -f allow_force_pushes=false \
  -f allow_deletions=false \
  -f block_creations=false \
  -f required_conversation_resolution=true \
  && echo "✅ Branch protection rules applied successfully!" \
  || {
    echo "❌ Failed to apply branch protection rules"
    echo ""
    echo "This might happen if:"
    echo "  • You don't have admin access to the repository"
    echo "  • The status checks don't exist yet (push a commit first)"
    echo "  • There's a network issue"
    echo ""
    echo "Try setting up manually instead:"
    echo "  https://github.com/$REPO/settings/branches"
    exit 1
  }

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "📋 What's protected:"
echo "   ✅ No direct pushes to main"
echo "   ✅ Pull requests required"
echo "   ✅ 1 approval required"
echo "   ✅ Status checks must pass"
echo "   ✅ Linear history enforced"
echo "   ❌ Force pushes blocked"
echo "   ❌ Branch deletion blocked"
echo ""
echo "🔗 View settings: https://github.com/$REPO/settings/branches"
echo ""
echo "📖 Next steps:"
echo "   1. Test the protection by trying to push to main (should fail)"
echo "   2. Create a feature branch: git checkout -b feature/test"
echo "   3. Make changes and push: git push origin feature/test"
echo "   4. Create a Pull Request on GitHub"
echo ""

