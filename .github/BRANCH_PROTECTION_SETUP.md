# Branch Protection Setup Guide

This guide will help you set up branch protection rules on GitHub to prevent direct pushes to `main` and enforce Pull Request workflows.

## Quick Setup (Recommended)

### Option 1: GitHub Web UI (5 minutes)

1. **Navigate to your repository settings:**
   ```
   https://github.com/michael-menard/monorepo/settings/branches
   ```

2. **Click "Add branch protection rule"**

3. **Configure the rule:**
   - **Branch name pattern:** `main`
   
   - **✅ Check these boxes:**
     - ✅ Require a pull request before merging
       - ✅ Require approvals: `1`
       - ✅ Dismiss stale pull request approvals when new commits are pushed
     - ✅ Require status checks to pass before merging
       - ✅ Require branches to be up to date before merging
       - Select these status checks:
         - `Lint & Type Check`
         - `Unit Tests`
         - `Build All Packages`
         - `Security Audit`
     - ✅ Require conversation resolution before merging
     - ✅ Require linear history
     - ✅ Do not allow bypassing the above settings (optional - prevents admin bypass)
   
   - **❌ Leave unchecked:**
     - ❌ Allow force pushes
     - ❌ Allow deletions

4. **Click "Create" or "Save changes"**

### Option 2: GitHub CLI (1 minute)

If you have [GitHub CLI](https://cli.github.com/) installed:

```bash
# Install GitHub CLI if needed
brew install gh  # macOS
# or visit https://cli.github.com/

# Login to GitHub
gh auth login

# Run the setup script
./.github/scripts/setup-branch-protection.sh
```

## What This Achieves

### 🛡️ Protection Rules

- ❌ **No direct pushes to main** - All changes must go through Pull Requests
- ✅ **Required code review** - At least 1 approval needed before merge
- ✅ **CI/CD checks** - All tests, linting, and builds must pass
- ✅ **Linear history** - Keeps git history clean (no merge commits)
- ❌ **No force pushes** - Prevents history rewriting
- ❌ **No branch deletion** - Protects main branch from accidental deletion

### 🔄 Workflow After Setup

```bash
# 1. Create a feature branch
git checkout -b feature/my-awesome-feature

# 2. Make changes
# ... edit files ...

# 3. Commit with conventional commit format
git add .
git commit -m "feat(component): add new feature"

# 4. Push to your feature branch
git push origin feature/my-awesome-feature

# 5. Create Pull Request on GitHub
# Visit: https://github.com/michael-menard/monorepo/compare

# 6. Wait for CI checks to pass and get approval

# 7. Merge via GitHub UI (Squash and merge recommended)

# 8. Pull latest main and delete feature branch
git checkout main
git pull origin main
git branch -d feature/my-awesome-feature
```

## Local Git Hooks

Your repository already has Git hooks configured to help enforce quality:

### Pre-commit Hook
- ✅ Builds changed packages
- ✅ Runs linter with auto-fix
- ✅ Formats code with Prettier

### Commit-msg Hook
- ✅ Enforces conventional commit format
- ✅ Validates commit message structure

### Pre-push Hook
- ✅ Prevents direct pushes to main
- ✅ Runs build on changed packages
- ✅ Runs linting
- ✅ Runs type checking
- ✅ Runs tests
- ✅ Runs security audit
- ✅ Validates conventional commits

## Testing Your Setup

### Test 1: Try to push to main (should fail)

```bash
git checkout main
echo "test" >> test.txt
git add test.txt
git commit -m "test: trying to push to main"
git push origin main
# ❌ Should fail with error message
```

### Test 2: Feature branch workflow (should succeed)

```bash
git checkout -b test/branch-protection
echo "test" >> test.txt
git add test.txt
git commit -m "test: verify branch protection"
git push origin test/branch-protection
# ✅ Should succeed
# Then create PR on GitHub
```

## Troubleshooting

### "Status checks not found"

If GitHub says status checks aren't found:
1. Push a commit to trigger CI workflows first
2. Wait for workflows to complete
3. Then add them to branch protection

### "I need to bypass protection for emergency fix"

If you're a repository admin and need to bypass:
1. Temporarily disable "Do not allow bypassing" setting
2. Make your emergency fix
3. Re-enable the setting immediately after

### "Pre-push hook is too slow"

You can skip hooks in emergencies (not recommended):
```bash
git push --no-verify
```

But remember: CI will still run on GitHub and may block your PR!

## Additional Resources

- [GitHub Branch Protection Docs](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Husky Documentation](https://typicode.github.io/husky/)

## Status Check

Run this to verify your local hooks are working:

```bash
# Test pre-push checks
pnpm run pre-push-check

# Test commit message format
git log -1 --pretty=%B | grep -E "^(feat|fix|docs|style|refactor|perf|test|chore|ci|build|revert)(\(.+\))?: .+"
```

