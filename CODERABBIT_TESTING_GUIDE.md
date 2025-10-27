# CodeRabbit Testing Guide

## 🧪 How to Test CodeRabbit Integration

This guide provides multiple ways to test your CodeRabbit integration, from quick verification to comprehensive scenario testing.

## 🚀 Quick Test (Recommended)

**Time**: 5-10 minutes  
**Purpose**: Verify basic CodeRabbit functionality

### Step 1: Run the Quick Test Script

```bash
# Create a test PR with intentional issues
./scripts/quick-coderabbit-test.sh
```

This script will:
- ✅ Create a test branch with a React component
- ✅ Add intentional code issues for CodeRabbit to find
- ✅ Create a pull request automatically
- ✅ Provide you with commands to monitor the results

### Step 2: Monitor the Results

After running the script, wait **2-5 minutes** then check:

```bash
# View the PR (replace with actual PR number from script output)
gh pr view <PR_NUMBER>

# Check for CodeRabbit comments
gh pr view <PR_NUMBER> --comments

# Check status checks
gh pr checks <PR_NUMBER>

# Open in browser
gh pr view <PR_NUMBER> --web
```

### Step 3: Verify Expected Behavior

**✅ CodeRabbit Should Identify:**
- Missing `useCallback` hooks (performance)
- Expensive calculation in render (should use `useMemo`)
- Hardcoded API key (security issue)
- Missing accessibility attributes
- Unused variables

**✅ Status Checks Should Show:**
- "CodeRabbit AI Review" - ✅ or ⏳
- "Quality Gates" - ✅ or ⏳

**✅ Branch Protection Should:**
- Block merge until checks pass
- Show "Required status checks" message

## 🎯 Comprehensive Testing

**Time**: 15-30 minutes  
**Purpose**: Test multiple scenarios and edge cases

### Run All Test Scenarios

```bash
# Create 5 different test PRs covering various scenarios
./scripts/test-coderabbit-scenarios.sh
```

This creates PRs testing:

1. **Frontend Component** - React best practices
2. **Security Issues** - Vulnerability detection
3. **Monorepo Dependencies** - Package structure
4. **Performance Issues** - Optimization suggestions
5. **Missing Tests** - Test coverage analysis

### Monitor Each Scenario

```bash
# List all test PRs
gh pr list --author @me | grep "test-coderabbit"

# Check each PR individually
gh pr view <PR_NUMBER> --comments
```

## 🔍 Manual Testing Scenarios

If you prefer to create test cases manually:

### Scenario 1: React Component Issues

Create a file with React anti-patterns:

```typescript
// test-react-issues.tsx
import React from 'react';

export const BadComponent = ({ items }: { items: string[] }) => {
  const [count, setCount] = React.useState(0);
  
  // Missing useCallback - CodeRabbit should flag
  const handleClick = () => setCount(count + 1);
  
  // Expensive operation in render - CodeRabbit should flag
  const sortedItems = items.sort().reverse();
  
  return (
    <div>
      {/* Missing accessibility - CodeRabbit should flag */}
      <button onClick={handleClick}>Click me</button>
      <span>{count}</span>
      {sortedItems.map((item, index) => (
        <div key={index}>{item}</div> // Bad key usage
      ))}
    </div>
  );
};
```

### Scenario 2: Security Vulnerabilities

Create a file with security issues:

```typescript
// test-security-issues.ts
export class SecurityTest {
  // Hardcoded secret - CodeRabbit should flag
  private apiKey = "sk-1234567890abcdef";
  
  // SQL injection vulnerability - CodeRabbit should flag
  getUserData(userId: string) {
    return `SELECT * FROM users WHERE id = '${userId}'`;
  }
  
  // Weak password validation - CodeRabbit should flag
  isValidPassword(password: string): boolean {
    return password.length > 3;
  }
}
```

### Scenario 3: Monorepo Import Issues

Create a file with incorrect imports:

```typescript
// test-monorepo-imports.tsx
import React from 'react';
// Bad: relative import across packages - CodeRabbit should flag
import { Button } from '../../../ui/src/Button';
// Good: workspace import - CodeRabbit should suggest
// import { Button } from '@repo/ui';

export const ImportTest = () => {
  return <Button>Test</Button>;
};
```

## 📊 What to Look For

### ✅ Successful CodeRabbit Integration

**CodeRabbit Comments Should Include:**
- 📝 **Summary** of changes and issues found
- 🎯 **Specific suggestions** with code examples
- 🏷️ **Categories** (security, performance, maintainability)
- 📋 **Line-by-line** comments on problematic code
- ⭐ **Overall assessment** and recommendations

**Status Checks Should:**
- ✅ Appear within 2-5 minutes of PR creation
- ✅ Show "CodeRabbit AI Review" status
- ✅ Show "Quality Gates" status
- ✅ Block merge until both pass

**Branch Protection Should:**
- 🚫 Disable merge button until checks pass
- 📋 Show required status checks list
- ⚠️ Display warning about missing reviews

### ❌ Issues to Watch For

**If CodeRabbit Doesn't Appear:**
- Check if CodeRabbit app is installed on your repository
- Verify `.coderabbit.yaml` configuration is valid
- Ensure PR is not in draft mode
- Check if files match the include/exclude patterns

**If Status Checks Don't Appear:**
- Verify GitHub Actions workflows are enabled
- Check workflow permissions in repository settings
- Ensure branch protection rules are configured correctly

**If Reviews Are Too Generic:**
- Update `.coderabbit.yaml` with more specific rules
- Add custom patterns for your codebase
- Configure focus areas for different file types

## 🧹 Cleanup After Testing

### Quick Cleanup

```bash
# Close test PRs
gh pr list --author @me | grep "test-coderabbit" | awk '{print $1}' | xargs -I {} gh pr close {}

# Delete test branches
git branch | grep "test-coderabbit" | xargs git branch -D

# Remove test files
rm -f test-coderabbit-*.tsx test-coderabbit-*.ts
```

### Thorough Cleanup

```bash
# Delete remote branches
git branch -r | grep "test-coderabbit" | sed 's/origin\///' | xargs -I {} git push origin --delete {}

# Clean up any remaining test files
find . -name "*test-coderabbit*" -type f -delete
```

## 🎯 Success Criteria

Your CodeRabbit integration is working correctly if:

- ✅ **CodeRabbit bot comments** appear on PRs within 5 minutes
- ✅ **Status checks** are created and required for merge
- ✅ **Branch protection** blocks merge until checks pass
- ✅ **Reviews are relevant** and provide actionable suggestions
- ✅ **Monorepo awareness** - understands package dependencies
- ✅ **Security scanning** - identifies vulnerabilities
- ✅ **Performance suggestions** - recommends optimizations

## 🔧 Troubleshooting

### CodeRabbit Not Responding

1. **Check App Installation:**
   ```bash
   # Visit your repository settings
   open "https://github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner)/settings/installations"
   ```

2. **Verify Configuration:**
   ```bash
   # Test YAML syntax
   python3 -c "import yaml; yaml.safe_load(open('.coderabbit.yaml'))"
   ```

3. **Check Workflow Status:**
   ```bash
   # View recent workflow runs
   gh run list --workflow=coderabbit-integration.yml
   ```

### Status Checks Not Appearing

1. **Check Workflow Permissions:**
   - Go to repository Settings → Actions → General
   - Ensure "Read and write permissions" is enabled

2. **Verify Branch Protection:**
   ```bash
   # Run branch protection setup
   ./scripts/setup-branch-protection.sh
   ```

## 📚 Additional Resources

- [CodeRabbit Documentation](https://docs.coderabbit.ai/)
- [GitHub Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches)
- [Turborepo CI Integration](./TURBOREPO_CI_INTEGRATION.md)

---

**Ready to test?** Start with the quick test:

```bash
./scripts/quick-coderabbit-test.sh
```

Then monitor the results and verify CodeRabbit is working as expected! 🚀
