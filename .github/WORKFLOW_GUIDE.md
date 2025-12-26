# Git Workflow & Branch Protection Guide

Quick reference for working with branch protection and Pull Request workflows.

## 🚀 Quick Start

### First Time Setup

1. **Set up branch protection on GitHub:**
   ```bash
   pnpm run branch-protection:setup
   ```
   Or manually: https://github.com/michael-menard/monorepo/settings/branches

2. **Verify protection is active:**
   ```bash
   pnpm run branch-protection:check
   ```

### Daily Workflow

```bash
# 1. Start a new feature
git checkout main
git pull origin main
git checkout -b feature/my-feature

# 2. Make changes
# ... edit files ...

# 3. Commit (conventional format required)
git add .
git commit -m "feat(component): add new feature"

# 4. Push to remote
git push origin feature/my-feature

# 5. Create Pull Request on GitHub
# Visit: https://github.com/michael-menard/monorepo/compare

# 6. After PR is merged, clean up
git checkout main
git pull origin main
git branch -d feature/my-feature
```

## 📋 Conventional Commit Format

**Required format:** `type(scope): description`

### Valid Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(auth): add OAuth login` |
| `fix` | Bug fix | `fix(api): resolve timeout issue` |
| `docs` | Documentation | `docs: update README` |
| `style` | Code style/formatting | `style(ui): fix button spacing` |
| `refactor` | Code refactoring | `refactor(utils): simplify helper` |
| `perf` | Performance improvement | `perf(api): optimize query` |
| `test` | Add/update tests | `test(auth): add login tests` |
| `chore` | Maintenance | `chore: update dependencies` |
| `ci` | CI/CD changes | `ci: add deployment workflow` |
| `build` | Build system | `build: update webpack config` |
| `revert` | Revert commit | `revert: undo feature X` |

### Examples

✅ **Good:**
```
feat(gallery): add image upload functionality
fix(auth): resolve token expiration bug
docs(api): update endpoint documentation
refactor(ui): simplify button component logic
test(profile): add user profile tests
```

❌ **Bad:**
```
added new feature
Fixed bug
Update README
WIP
asdf
```

## 🛡️ Git Hooks

Your repository has three Git hooks that run automatically:

### 1. Pre-commit Hook
Runs when you commit:
- ✅ Builds changed packages
- ✅ Lints and auto-fixes code
- ✅ Formats with Prettier

### 2. Commit-msg Hook
Validates commit message:
- ✅ Enforces conventional commit format
- ✅ Checks message length

### 3. Pre-push Hook
Runs before pushing:
- ✅ **Blocks direct pushes to main**
- ✅ Builds changed packages
- ✅ Runs linting
- ✅ Runs type checking
- ✅ Runs tests
- ✅ Runs security audit
- ✅ Validates commit format

## 🚫 What's Blocked

### Direct Pushes to Main

```bash
git checkout main
git push origin main
# ❌ ERROR: Direct pushes to 'main' branch are not allowed!
```

### Force Pushes to Main

```bash
git push --force origin main
# ❌ Blocked by GitHub branch protection
```

### Merging Without Approval

- ❌ Can't merge PR without at least 1 approval
- ❌ Can't merge if CI checks fail
- ❌ Can't merge if branch is out of date

## ✅ What's Required

### For Every Pull Request

1. **All CI checks must pass:**
   - Lint & Type Check
   - Unit Tests
   - Build All Packages
   - Security Audit

2. **At least 1 approval** from a team member

3. **Branch must be up-to-date** with main

4. **All conversations resolved**

5. **Linear history** (use Squash and merge)

## 🔧 Useful Commands

```bash
# Check branch protection status
pnpm run branch-protection:check

# Test pre-push checks without pushing
pnpm run pre-push-check

# Run all quality checks locally
pnpm run lint:all
pnpm run check-types:all
pnpm run test:all
pnpm run security:check

# Run checks on changed files only (faster)
pnpm run lint
pnpm run check-types
pnpm run test

# View current branch
git branch --show-current

# List all branches
git branch -a

# Delete merged branches
git branch --merged | grep -v "main" | xargs git branch -d
```

## 🆘 Troubleshooting

### "Pre-push hook is too slow"

The pre-push hook runs comprehensive checks. To speed up:
```bash
# Only run checks on changed files (default)
pnpm run lint
pnpm run check-types
pnpm run test
```

### "I need to bypass hooks for emergency"

⚠️ **Not recommended**, but possible:
```bash
git push --no-verify
```

**Note:** GitHub CI will still run and may block your PR!

### "Status checks are failing"

1. Run checks locally first:
   ```bash
   pnpm run lint:all
   pnpm run check-types:all
   pnpm run test:all
   ```

2. Fix any errors

3. Commit and push again

### "My branch is out of date"

```bash
git checkout main
git pull origin main
git checkout feature/my-feature
git rebase main
git push --force-with-lease origin feature/my-feature
```

## 📚 Additional Resources

- [Branch Protection Setup](.github/BRANCH_PROTECTION_SETUP.md)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [Husky Documentation](https://typicode.github.io/husky/)

