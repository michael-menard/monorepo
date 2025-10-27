#!/bin/bash

# Test CodeRabbit with Different Scenarios
# This script creates various test scenarios to verify CodeRabbit behavior

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 CodeRabbit Testing Scenarios${NC}"
echo "================================"
echo ""

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ Not in a git repository${NC}"
    exit 1
fi

# Check if GitHub CLI is available
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI required for testing${NC}"
    echo "Install with: brew install gh && gh auth login"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI not authenticated${NC}"
    echo "Run: gh auth login"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites met${NC}"
echo ""

# Function to create test branch and PR
create_test_pr() {
    local branch_name=$1
    local pr_title=$2
    local pr_body=$3
    
    echo -e "${YELLOW}📝 Creating test branch: $branch_name${NC}"
    
    # Create and switch to test branch
    git checkout -b "$branch_name" 2>/dev/null || git checkout "$branch_name"
    
    # Make the test changes (done by caller)
    
    # Commit changes
    git add .
    git commit -m "test: $pr_title" || echo "No changes to commit"
    
    # Push branch
    git push origin "$branch_name" --force
    
    # Create PR
    echo -e "${BLUE}🔗 Creating PR: $pr_title${NC}"
    gh pr create --title "$pr_title" --body "$pr_body" --head "$branch_name" --base main || echo "PR may already exist"
    
    echo -e "${GREEN}✅ PR created: $pr_title${NC}"
    echo ""
}

# Function to wait for CodeRabbit
wait_for_coderabbit() {
    local pr_number=$1
    local max_wait=${2:-300}  # 5 minutes default
    local wait_time=0
    
    echo -e "${YELLOW}⏳ Waiting for CodeRabbit review (max ${max_wait}s)...${NC}"
    
    while [ $wait_time -lt $max_wait ]; do
        # Check for CodeRabbit comments
        local comments=$(gh pr view "$pr_number" --json comments --jq '.comments[] | select(.author.login | test("coderabbit")) | .body' 2>/dev/null || echo "")
        
        if [ -n "$comments" ]; then
            echo -e "${GREEN}✅ CodeRabbit review found!${NC}"
            echo -e "${BLUE}📝 Review excerpt:${NC}"
            echo "$comments" | head -n 5 | sed 's/^/  /'
            echo ""
            return 0
        fi
        
        echo -n "."
        sleep 10
        wait_time=$((wait_time + 10))
    done
    
    echo -e "${YELLOW}⚠️  CodeRabbit review not found within ${max_wait}s${NC}"
    return 1
}

# Test Scenario 1: Simple Frontend Change
echo -e "${PURPLE}🎯 Test 1: Simple Frontend Change${NC}"
echo "This tests basic CodeRabbit functionality with a React component change"
echo ""

# Create test file change
cat > apps/web/lego-moc-instructions-app/src/test-component.tsx << 'EOF'
import React from 'react';

// This is a test component to trigger CodeRabbit review
export const TestComponent: React.FC = () => {
  const [count, setCount] = React.useState(0);
  
  // CodeRabbit should suggest useCallback here
  const handleClick = () => {
    setCount(count + 1);
  };
  
  return (
    <div>
      <h1>Test Component</h1>
      <p>Count: {count}</p>
      <button onClick={handleClick}>Increment</button>
    </div>
  );
};
EOF

create_test_pr "test-coderabbit-frontend" "Test: Frontend Component for CodeRabbit" "
This PR tests CodeRabbit's ability to review React components.

**Expected CodeRabbit feedback:**
- Suggest useCallback for handleClick
- Recommend accessibility improvements
- Check for React best practices

**Test Areas:**
- React hooks usage
- Component patterns
- Accessibility
"

# Test Scenario 2: Security Issue
echo -e "${PURPLE}🎯 Test 2: Security Vulnerability${NC}"
echo "This tests CodeRabbit's security scanning capabilities"
echo ""

git checkout main
cat > apps/api/auth-service/src/test-security.ts << 'EOF'
// This file contains intentional security issues for CodeRabbit testing

export class TestSecurity {
  // CodeRabbit should flag this hardcoded secret
  private apiKey = "sk-1234567890abcdef";
  
  // CodeRabbit should flag this SQL injection vulnerability
  getUserById(id: string) {
    const query = `SELECT * FROM users WHERE id = '${id}'`;
    return query;
  }
  
  // CodeRabbit should flag this weak password validation
  validatePassword(password: string): boolean {
    return password.length > 3;
  }
  
  // CodeRabbit should flag this insecure random generation
  generateToken(): string {
    return Math.random().toString(36);
  }
}
EOF

create_test_pr "test-coderabbit-security" "Test: Security Issues for CodeRabbit" "
This PR contains intentional security vulnerabilities to test CodeRabbit's security scanning.

**Expected CodeRabbit feedback:**
- Flag hardcoded API key
- Identify SQL injection vulnerability
- Suggest stronger password validation
- Recommend secure random generation

**Test Areas:**
- Security vulnerabilities
- Code quality
- Best practices
"

# Test Scenario 3: Monorepo Dependencies
echo -e "${PURPLE}🎯 Test 3: Monorepo Dependency Issues${NC}"
echo "This tests CodeRabbit's monorepo awareness"
echo ""

git checkout main
cat > packages/core/ui/src/test-dependency.tsx << 'EOF'
import React from 'react';
// CodeRabbit should flag this relative import across packages
import { AuthButton } from '../../../auth/src/components/AuthButton';
// CodeRabbit should suggest this workspace import instead
// import { AuthButton } from '@repo/auth';

export const TestDependency: React.FC = () => {
  return (
    <div>
      <h2>Testing Dependencies</h2>
      <AuthButton />
    </div>
  );
};
EOF

# Add to package.json without declaring dependency (CodeRabbit should catch this)
cat > packages/core/ui/package.json << 'EOF'
{
  "name": "@repo/ui",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.0.0"
  }
}
EOF

create_test_pr "test-coderabbit-monorepo" "Test: Monorepo Dependencies for CodeRabbit" "
This PR tests CodeRabbit's monorepo dependency analysis.

**Expected CodeRabbit feedback:**
- Flag relative imports across packages
- Suggest workspace imports (@repo/*)
- Identify missing package.json dependencies
- Recommend proper monorepo patterns

**Test Areas:**
- Monorepo structure
- Package dependencies
- Import patterns
"

# Test Scenario 4: Performance Issues
echo -e "${PURPLE}🎯 Test 4: Performance Issues${NC}"
echo "This tests CodeRabbit's performance analysis"
echo ""

git checkout main
cat > apps/web/lego-moc-instructions-app/src/test-performance.tsx << 'EOF'
import React from 'react';

interface Props {
  items: string[];
}

// CodeRabbit should suggest performance improvements here
export const TestPerformance: React.FC<Props> = ({ items }) => {
  // CodeRabbit should suggest useMemo here
  const expensiveCalculation = () => {
    return items.map(item => item.toUpperCase()).filter(item => item.length > 5);
  };
  
  // CodeRabbit should suggest useCallback here
  const handleClick = (item: string) => {
    console.log(item);
  };
  
  return (
    <div>
      {/* CodeRabbit should flag this expensive operation in render */}
      {expensiveCalculation().map((item, index) => (
        <div key={index} onClick={() => handleClick(item)}>
          {item}
        </div>
      ))}
    </div>
  );
};
EOF

create_test_pr "test-coderabbit-performance" "Test: Performance Issues for CodeRabbit" "
This PR contains performance anti-patterns to test CodeRabbit's optimization suggestions.

**Expected CodeRabbit feedback:**
- Suggest useMemo for expensive calculations
- Recommend useCallback for event handlers
- Flag expensive operations in render
- Suggest React performance best practices

**Test Areas:**
- React performance
- Memory optimization
- Render optimization
"

# Test Scenario 5: Missing Tests
echo -e "${PURPLE}🎯 Test 5: Missing Test Coverage${NC}"
echo "This tests CodeRabbit's test coverage analysis"
echo ""

git checkout main
cat > packages/core/ui/src/complex-component.tsx << 'EOF'
import React, { useState, useEffect } from 'react';

interface ComplexComponentProps {
  data: any[];
  onUpdate: (data: any) => void;
}

// This is a complex component without tests - CodeRabbit should flag this
export const ComplexComponent: React.FC<ComplexComponentProps> = ({ data, onUpdate }) => {
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    setLoading(true);
    // Complex logic that should be tested
    const filtered = data.filter(item => item.active)
                        .sort((a, b) => a.priority - b.priority)
                        .slice(0, 10);
    setFilteredData(filtered);
    setLoading(false);
  }, [data]);
  
  const handleItemClick = (item: any) => {
    // Complex business logic that needs testing
    const updatedItem = {
      ...item,
      lastClicked: new Date(),
      clickCount: (item.clickCount || 0) + 1
    };
    onUpdate(updatedItem);
  };
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      {filteredData.map(item => (
        <div key={item.id} onClick={() => handleItemClick(item)}>
          {item.name} (Priority: {item.priority})
        </div>
      ))}
    </div>
  );
};
EOF

create_test_pr "test-coderabbit-testing" "Test: Missing Tests for CodeRabbit" "
This PR adds a complex component without tests to verify CodeRabbit's test coverage analysis.

**Expected CodeRabbit feedback:**
- Flag missing test files
- Suggest test cases for complex logic
- Recommend testing patterns
- Identify untested business logic

**Test Areas:**
- Test coverage
- Testing best practices
- Complex logic testing
"

# Summary and next steps
echo -e "${BLUE}📊 Test Summary${NC}"
echo "==============="
echo ""
echo "Created 5 test PRs to verify CodeRabbit functionality:"
echo ""
echo -e "${GREEN}1. Frontend Component${NC} - React best practices"
echo -e "${RED}2. Security Issues${NC} - Vulnerability detection"  
echo -e "${YELLOW}3. Monorepo Dependencies${NC} - Package structure"
echo -e "${PURPLE}4. Performance Issues${NC} - Optimization suggestions"
echo -e "${BLUE}5. Missing Tests${NC} - Test coverage analysis"
echo ""

echo -e "${YELLOW}🔍 Next Steps:${NC}"
echo "1. Check each PR for CodeRabbit comments"
echo "2. Verify status checks appear and function correctly"
echo "3. Test that merge is blocked until reviews complete"
echo "4. Review CodeRabbit's suggestions for accuracy"
echo ""

echo -e "${BLUE}💡 Manual Testing Commands:${NC}"
echo ""
echo "# View all test PRs:"
echo "gh pr list --author @me --label test"
echo ""
echo "# Check specific PR for CodeRabbit activity:"
echo "gh pr view <PR_NUMBER> --comments"
echo ""
echo "# Check status checks:"
echo "gh pr checks <PR_NUMBER>"
echo ""
echo "# Clean up test branches when done:"
echo "git branch | grep 'test-coderabbit' | xargs git branch -D"
echo "gh pr list --state all --author @me | grep 'test-coderabbit' | awk '{print \$1}' | xargs -I {} gh pr close {}"
echo ""

echo -e "${GREEN}✅ CodeRabbit test scenarios created!${NC}"
echo ""
echo -e "${YELLOW}⏳ Wait 2-5 minutes for CodeRabbit to analyze the PRs${NC}"
echo -e "${BLUE}🔗 View PRs: https://github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner)/pulls${NC}"
