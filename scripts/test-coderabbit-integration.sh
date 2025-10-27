#!/bin/bash

# Test CodeRabbit Integration
# This script helps you test the CodeRabbit integration with your CI/CD pipeline

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🤖 Testing CodeRabbit Integration${NC}"
echo "=================================="
echo ""

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ Not in a git repository${NC}"
    exit 1
fi

# Check if GitHub CLI is available
if ! command -v gh &> /dev/null; then
    echo -e "${YELLOW}⚠️  GitHub CLI not found. Some tests will be skipped.${NC}"
    echo "Install with: brew install gh"
    GH_AVAILABLE=false
else
    GH_AVAILABLE=true
fi

echo -e "${GREEN}✅ Repository check passed${NC}"
echo ""

# Test CodeRabbit configuration
echo -e "${YELLOW}📋 Testing CodeRabbit Configuration${NC}"
echo "-----------------------------------"

if [ -f ".coderabbit.yaml" ]; then
    echo -e "${GREEN}✅ CodeRabbit configuration found${NC}"
    
    # Validate YAML syntax
    if command -v python3 &> /dev/null; then
        if python3 -c "import yaml; yaml.safe_load(open('.coderabbit.yaml'))" 2>/dev/null; then
            echo -e "${GREEN}✅ Configuration syntax is valid${NC}"
        else
            echo -e "${RED}❌ Configuration syntax error${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Cannot validate YAML syntax (python3 not found)${NC}"
    fi
    
    # Check key configuration sections
    echo ""
    echo "Configuration sections:"
    grep -E "^[a-zA-Z_]+:" .coderabbit.yaml | sed 's/^/  - /'
    
else
    echo -e "${RED}❌ CodeRabbit configuration not found${NC}"
    echo "Expected: .coderabbit.yaml"
fi

echo ""

# Test GitHub workflow integration
echo -e "${YELLOW}🔄 Testing GitHub Workflow Integration${NC}"
echo "-------------------------------------"

WORKFLOWS=(
    ".github/workflows/coderabbit-integration.yml"
    ".github/workflows/coderabbit-status.yml"
)

for workflow in "${WORKFLOWS[@]}"; do
    if [ -f "$workflow" ]; then
        echo -e "${GREEN}✅ Found: $(basename "$workflow")${NC}"
    else
        echo -e "${YELLOW}⚠️  Missing: $(basename "$workflow")${NC}"
    fi
done

echo ""

# Test branch protection integration
echo -e "${YELLOW}🛡️  Testing Branch Protection Integration${NC}"
echo "----------------------------------------"

if [ -f "scripts/setup-branch-protection.sh" ]; then
    echo -e "${GREEN}✅ Branch protection setup script found${NC}"
    
    # Check if CodeRabbit checks are included
    if grep -q "CodeRabbit" scripts/setup-branch-protection.sh; then
        echo -e "${GREEN}✅ CodeRabbit checks included in branch protection${NC}"
    else
        echo -e "${YELLOW}⚠️  CodeRabbit checks not found in branch protection${NC}"
    fi
else
    echo -e "${RED}❌ Branch protection setup script not found${NC}"
fi

echo ""

# Test with GitHub CLI (if available)
if [ "$GH_AVAILABLE" = true ]; then
    echo -e "${YELLOW}🔗 Testing GitHub Integration${NC}"
    echo "-----------------------------"
    
    # Check if authenticated
    if gh auth status &> /dev/null; then
        echo -e "${GREEN}✅ GitHub CLI authenticated${NC}"
        
        # Get repository info
        REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "unknown")
        echo "Repository: $REPO"
        
        # Check if CodeRabbit app is installed (this would require API access)
        echo -e "${BLUE}💡 To verify CodeRabbit app installation:${NC}"
        echo "  1. Go to: https://github.com/$REPO/settings/installations"
        echo "  2. Check if CodeRabbit is listed and active"
        
    else
        echo -e "${YELLOW}⚠️  GitHub CLI not authenticated${NC}"
        echo "Run: gh auth login"
    fi
else
    echo -e "${YELLOW}⚠️  GitHub CLI not available, skipping integration tests${NC}"
fi

echo ""

# Test Turborepo integration
echo -e "${YELLOW}🚀 Testing Turborepo Integration${NC}"
echo "-------------------------------"

if grep -q "turborepo" .coderabbit.yaml; then
    echo -e "${GREEN}✅ Turborepo integration configured in CodeRabbit${NC}"
else
    echo -e "${YELLOW}⚠️  Turborepo integration not explicitly configured${NC}"
fi

# Check for monorepo-specific rules
if grep -q "monorepo" .coderabbit.yaml; then
    echo -e "${GREEN}✅ Monorepo-specific rules configured${NC}"
else
    echo -e "${YELLOW}⚠️  Monorepo-specific rules not found${NC}"
fi

echo ""

# Test quality gates
echo -e "${YELLOW}🎯 Testing Quality Gates${NC}"
echo "------------------------"

# Check if quality gates workflow exists
if [ -f ".github/workflows/coderabbit-status.yml" ]; then
    echo -e "${GREEN}✅ Quality gates workflow found${NC}"
    
    # Check for key quality checks
    if grep -q "Quality Gates" .github/workflows/coderabbit-status.yml; then
        echo -e "${GREEN}✅ Quality gates job configured${NC}"
    else
        echo -e "${YELLOW}⚠️  Quality gates job not found${NC}"
    fi
else
    echo -e "${RED}❌ Quality gates workflow not found${NC}"
fi

echo ""

# Provide testing recommendations
echo -e "${BLUE}🧪 Testing Recommendations${NC}"
echo "---------------------------"
echo ""
echo "To fully test CodeRabbit integration:"
echo ""
echo "1. **Create a test PR**:"
echo "   git checkout -b test-coderabbit-integration"
echo "   echo '// Test CodeRabbit integration' >> apps/web/lego-moc-instructions-app/src/main.tsx"
echo "   git add . && git commit -m 'test: CodeRabbit integration'"
echo "   git push origin test-coderabbit-integration"
echo ""
echo "2. **Create PR via GitHub CLI** (if available):"
if [ "$GH_AVAILABLE" = true ]; then
    echo "   gh pr create --title 'Test: CodeRabbit Integration' --body 'Testing CodeRabbit AI review integration'"
else
    echo "   # Install GitHub CLI first: brew install gh && gh auth login"
    echo "   gh pr create --title 'Test: CodeRabbit Integration' --body 'Testing CodeRabbit AI review integration'"
fi
echo ""
echo "3. **Verify CodeRabbit behavior**:"
echo "   - Check if CodeRabbit bot comments on the PR"
echo "   - Verify status checks appear (CodeRabbit AI Review, Quality Gates)"
echo "   - Confirm branch protection blocks merge until checks pass"
echo ""
echo "4. **Test quality gates**:"
echo "   - Make changes without tests to trigger quality gate failures"
echo "   - Add tests to see quality gates pass"
echo "   - Test with different types of changes (docs, code, config)"
echo ""

# Summary
echo -e "${BLUE}📊 Integration Status Summary${NC}"
echo "-----------------------------"

CHECKS_PASSED=0
TOTAL_CHECKS=6

# Configuration file
if [ -f ".coderabbit.yaml" ]; then
    echo -e "${GREEN}✅ CodeRabbit configuration${NC}"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    echo -e "${RED}❌ CodeRabbit configuration${NC}"
fi

# Workflow files
if [ -f ".github/workflows/coderabbit-integration.yml" ]; then
    echo -e "${GREEN}✅ CodeRabbit workflow${NC}"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    echo -e "${RED}❌ CodeRabbit workflow${NC}"
fi

# Status check workflow
if [ -f ".github/workflows/coderabbit-status.yml" ]; then
    echo -e "${GREEN}✅ Status check workflow${NC}"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    echo -e "${RED}❌ Status check workflow${NC}"
fi

# Branch protection
if [ -f "scripts/setup-branch-protection.sh" ] && grep -q "CodeRabbit" scripts/setup-branch-protection.sh; then
    echo -e "${GREEN}✅ Branch protection integration${NC}"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    echo -e "${RED}❌ Branch protection integration${NC}"
fi

# Turborepo integration
if grep -q "turborepo\|monorepo" .coderabbit.yaml; then
    echo -e "${GREEN}✅ Turborepo integration${NC}"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    echo -e "${RED}❌ Turborepo integration${NC}"
fi

# GitHub CLI
if [ "$GH_AVAILABLE" = true ] && gh auth status &> /dev/null; then
    echo -e "${GREEN}✅ GitHub CLI ready${NC}"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    echo -e "${YELLOW}⚠️  GitHub CLI setup needed${NC}"
fi

echo ""
echo -e "${BLUE}Score: $CHECKS_PASSED/$TOTAL_CHECKS checks passed${NC}"

if [ $CHECKS_PASSED -eq $TOTAL_CHECKS ]; then
    echo -e "${GREEN}🎉 CodeRabbit integration is fully configured!${NC}"
elif [ $CHECKS_PASSED -ge 4 ]; then
    echo -e "${YELLOW}⚠️  CodeRabbit integration is mostly ready. Address remaining items.${NC}"
else
    echo -e "${RED}❌ CodeRabbit integration needs attention. Please fix the issues above.${NC}"
fi

echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Run: ./scripts/setup-branch-protection.sh"
echo "2. Create a test PR to verify the integration"
echo "3. Check that CodeRabbit reviews appear and status checks work"
echo ""
echo -e "${GREEN}✅ CodeRabbit integration test complete!${NC}"
