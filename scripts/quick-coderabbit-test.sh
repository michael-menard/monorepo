#!/bin/bash

# Quick CodeRabbit Test
# Creates a simple test PR to verify CodeRabbit is working

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Quick CodeRabbit Test${NC}"
echo "========================"
echo ""

# Check prerequisites
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ Not in a git repository${NC}"
    exit 1
fi

if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI required${NC}"
    echo "Install with: brew install gh && gh auth login"
    exit 1
fi

if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI not authenticated${NC}"
    echo "Run: gh auth login"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites met${NC}"
echo ""

# Create test branch
BRANCH_NAME="test-coderabbit-$(date +%s)"
echo -e "${YELLOW}📝 Creating test branch: $BRANCH_NAME${NC}"

git checkout -b "$BRANCH_NAME"

# Create a simple test file with issues CodeRabbit should catch
echo -e "${BLUE}📄 Creating test file with intentional issues...${NC}"

cat > test-coderabbit-review.tsx << 'EOF'
import React from 'react';

// CodeRabbit should suggest improvements to this component
export const TestCodeRabbitComponent = () => {
  const [count, setCount] = React.useState(0);
  
  // Issue 1: Missing useCallback - CodeRabbit should suggest this
  const handleIncrement = () => {
    setCount(count + 1);
  };
  
  // Issue 2: Missing useCallback - CodeRabbit should suggest this  
  const handleDecrement = () => {
    setCount(prev => prev - 1);
  };
  
  // Issue 3: Expensive calculation in render - CodeRabbit should flag this
  const expensiveValue = Array.from({length: 1000}, (_, i) => i).reduce((a, b) => a + b, 0);
  
  return (
    <div>
      {/* Issue 4: Missing accessibility - CodeRabbit should suggest aria-label */}
      <button onClick={handleIncrement}>+</button>
      <span>Count: {count}</span>
      <button onClick={handleDecrement}>-</button>
      <p>Expensive calculation result: {expensiveValue}</p>
    </div>
  );
};

// Issue 5: Hardcoded API key - CodeRabbit should flag this security issue
const API_KEY = "sk-1234567890abcdef";

// Issue 6: Unused variable - CodeRabbit should suggest removal
const unusedVariable = "this is not used anywhere";

export default TestCodeRabbitComponent;
EOF

# Add the file
git add test-coderabbit-review.tsx

# Commit the changes (bypass pre-commit hooks for this test)
git commit --no-verify -m "test: Add component for CodeRabbit review

This commit adds a test component with several intentional issues:
- Missing useCallback hooks
- Expensive calculation in render
- Missing accessibility attributes  
- Hardcoded API key (security issue)
- Unused variables

CodeRabbit should identify and suggest fixes for these issues."

# Push the branch
echo -e "${YELLOW}📤 Pushing branch to GitHub...${NC}"
git push origin "$BRANCH_NAME"

# Create PR
echo -e "${BLUE}🔗 Creating pull request...${NC}"
PR_URL=$(gh pr create \
  --title "🧪 Test: CodeRabbit Integration" \
  --body "## 🤖 CodeRabbit Integration Test

This PR is designed to test CodeRabbit's AI review capabilities.

### 🎯 Expected CodeRabbit Feedback

CodeRabbit should identify and suggest fixes for:

1. **Performance Issues:**
   - Missing \`useCallback\` for event handlers
   - Expensive calculation in render (should use \`useMemo\`)

2. **Accessibility Issues:**
   - Missing \`aria-label\` attributes on buttons
   - Suggest semantic HTML improvements

3. **Security Issues:**
   - Hardcoded API key (should use environment variables)

4. **Code Quality:**
   - Unused variables that should be removed
   - React best practices

5. **TypeScript:**
   - Missing type annotations
   - Suggest interface definitions

### 🔍 Testing Checklist

- [ ] CodeRabbit bot comments appear within 2-5 minutes
- [ ] Status check \"CodeRabbit AI Review\" appears
- [ ] Status check \"Quality Gates\" appears  
- [ ] Merge is blocked until checks pass
- [ ] CodeRabbit provides actionable suggestions

### 📊 Success Criteria

✅ CodeRabbit identifies at least 3 of the intentional issues
✅ Status checks prevent merge until review is complete
✅ Suggestions are relevant and actionable

---

**Note:** This is a test PR and will be closed after verification." \
  --head "$BRANCH_NAME" \
  --base main)

echo -e "${GREEN}✅ Pull request created!${NC}"
echo ""

# Extract PR number from URL
PR_NUMBER=$(echo "$PR_URL" | grep -o '[0-9]*$')

echo -e "${BLUE}📋 Test Summary${NC}"
echo "==============="
echo ""
echo -e "${YELLOW}PR Details:${NC}"
echo "  URL: $PR_URL"
echo "  Number: #$PR_NUMBER"
echo "  Branch: $BRANCH_NAME"
echo ""

echo -e "${YELLOW}🔍 What to Check:${NC}"
echo ""
echo "1. **CodeRabbit Review (2-5 minutes):**"
echo "   - Look for CodeRabbit bot comments"
echo "   - Check for AI-generated review summary"
echo "   - Verify suggestions are relevant"
echo ""
echo "2. **Status Checks:**"
echo "   - 'CodeRabbit AI Review' should appear"
echo "   - 'Quality Gates' should appear"
echo "   - Both should be required for merge"
echo ""
echo "3. **Branch Protection:**"
echo "   - Merge button should be disabled"
echo "   - 'Required status checks' message should show"
echo ""

echo -e "${BLUE}💻 Quick Commands:${NC}"
echo ""
echo "# View the PR:"
echo "gh pr view $PR_NUMBER"
echo ""
echo "# Check PR comments:"
echo "gh pr view $PR_NUMBER --comments"
echo ""
echo "# Check status checks:"
echo "gh pr checks $PR_NUMBER"
echo ""
echo "# View PR in browser:"
echo "gh pr view $PR_NUMBER --web"
echo ""

echo -e "${YELLOW}⏳ Next Steps:${NC}"
echo ""
echo "1. Wait 2-5 minutes for CodeRabbit to analyze the PR"
echo "2. Check the PR for CodeRabbit comments and status checks"
echo "3. Verify that merge is blocked until checks pass"
echo "4. Review CodeRabbit's suggestions for accuracy"
echo ""

echo -e "${GREEN}🎯 Expected Results:${NC}"
echo ""
echo "✅ CodeRabbit should identify:"
echo "   - Missing useCallback hooks"
echo "   - Expensive render calculation"  
echo "   - Security issue (hardcoded API key)"
echo "   - Accessibility improvements"
echo "   - Unused variables"
echo ""

echo -e "${BLUE}🧹 Cleanup (run after testing):${NC}"
echo ""
echo "# Close the test PR:"
echo "gh pr close $PR_NUMBER"
echo ""
echo "# Delete the test branch:"
echo "git checkout main"
echo "git branch -D $BRANCH_NAME"
echo "git push origin --delete $BRANCH_NAME"
echo ""
echo "# Remove test file:"
echo "rm -f test-coderabbit-review.tsx"
echo ""

echo -e "${GREEN}✅ CodeRabbit test PR created successfully!${NC}"
echo -e "${YELLOW}🔗 View it now: $PR_URL${NC}"
