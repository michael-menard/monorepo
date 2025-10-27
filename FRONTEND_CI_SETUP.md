# Frontend CI/CD Setup Guide

This guide explains how to ensure tests and linting run before merges on your frontend application.

## 🎯 Overview

Your frontend now has comprehensive CI/CD protection with:

✅ **Automated Testing** - Unit tests run on every PR  
✅ **Code Quality** - ESLint and TypeScript checks  
✅ **Format Validation** - Prettier formatting checks  
✅ **Build Verification** - Ensures code compiles successfully  
✅ **Branch Protection** - Prevents merging without passing checks  
✅ **Pre-commit Hooks** - Catch issues locally before pushing  

## 🔧 What's Been Set Up

### 1. Enhanced CI Workflows

**File**: `.github/workflows/lego-moc-instructions-app.yml`

**Runs on**:
- Every push to `main` or `develop`
- Every pull request to `main` or `develop`
- Changes to frontend code or packages

**Jobs**:
- **Unit Tests** - Runs Vitest tests with coverage
- **Lint & Type Check** - ESLint, TypeScript, and Prettier checks
- **Build App** - Verifies the app builds successfully
- **E2E Tests** - Playwright end-to-end tests
- **Lighthouse CI** - Performance and accessibility audits

### 2. Branch Protection Rules

**File**: `.github/branch-protection.yml` (documentation)
**Script**: `scripts/setup-branch-protection.sh` (automated setup)

**Protection includes**:
- ✅ Pull requests required
- ✅ At least 1 approving review
- ✅ Status checks must pass before merge
- ✅ Linear history required (no merge commits)
- ✅ Force pushes disabled

### 3. Pre-commit Hooks

**File**: `.pre-commit-config.yaml`

**Local checks before commit**:
- ESLint validation
- TypeScript type checking
- Prettier formatting
- General file validation
- Security scanning

## 🚀 Setup Instructions

### Step 1: Configure Branch Protection (Required)

Run the automated setup script:

```bash
# Make sure you have GitHub CLI installed and authenticated
gh auth login

# Run the branch protection setup
./scripts/setup-branch-protection.sh
```

**Or manually configure in GitHub**:
1. Go to your repository → Settings → Branches
2. Add rule for `main` branch
3. Enable:
   - "Require pull request reviews before merging"
   - "Require status checks to pass before merging"
   - Select these status checks:
     - `Unit Tests`
     - `Lint & Type Check`
     - `Build App`
     - `Security Audit`
   - "Require linear history"

### Step 2: Install Pre-commit Hooks (Optional but Recommended)

```bash
# Install pre-commit (if not already installed)
pip install pre-commit

# Install the hooks
pre-commit install

# Test the hooks
pre-commit run --all-files
```

### Step 3: Test the Setup

1. **Create a test branch**:
   ```bash
   git checkout -b test-ci-setup
   ```

2. **Make a small change** to trigger CI:
   ```bash
   echo "// Test change" >> apps/web/lego-moc-instructions-app/src/main.tsx
   git add .
   git commit -m "test: trigger CI checks"
   git push origin test-ci-setup
   ```

3. **Create a pull request** and verify:
   - CI checks run automatically
   - All checks must pass before merge is allowed
   - Merge button is disabled until checks pass

## 📋 Status Checks Explained

### Required Checks (Must Pass)

1. **Unit Tests**
   - Runs all Vitest unit tests
   - Generates coverage report
   - Uploads coverage to Codecov

2. **Lint & Type Check**
   - ESLint code quality checks
   - TypeScript type validation
   - Prettier formatting verification

3. **Build App**
   - Verifies the app builds successfully
   - Catches build-time errors
   - Uploads build artifacts

4. **Security Audit**
   - Scans for security vulnerabilities
   - Checks dependencies for known issues

### Optional Checks (Run but Don't Block)

1. **E2E Tests**
   - Playwright end-to-end tests
   - May be flaky, so doesn't block merges

2. **Lighthouse CI**
   - Performance audits
   - Accessibility checks
   - SEO validation

## 🛠️ Local Development Workflow

### Before Committing

```bash
# Run tests locally
cd apps/web/lego-moc-instructions-app
pnpm test

# Run linting and fix issues
pnpm lint

# Check TypeScript types
pnpm type-check

# Format code
pnpm format

# Run all checks together
pnpm check
```

### With Pre-commit Hooks

```bash
# Hooks run automatically on commit
git add .
git commit -m "feat: add new feature"
# ↑ Hooks run here automatically

# Run hooks manually
pre-commit run --all-files

# Skip hooks (not recommended)
git commit -m "feat: add feature" --no-verify
```

## 🔍 Troubleshooting

### CI Checks Failing

1. **Unit Tests Failing**:
   ```bash
   cd apps/web/lego-moc-instructions-app
   pnpm test
   # Fix failing tests
   ```

2. **Lint Errors**:
   ```bash
   cd apps/web/lego-moc-instructions-app
   pnpm lint
   # Most issues auto-fix, manual fixes for others
   ```

3. **Type Errors**:
   ```bash
   cd apps/web/lego-moc-instructions-app
   pnpm type-check
   # Fix TypeScript errors
   ```

4. **Build Failures**:
   ```bash
   cd apps/web/lego-moc-instructions-app
   pnpm build
   # Fix build errors
   ```

### Branch Protection Issues

- **Can't merge PR**: Check that all required status checks are passing
- **Missing status checks**: Verify the workflow names match the protection rules
- **Admin bypass**: Admins can bypass rules if needed (not recommended)

### Pre-commit Hook Issues

```bash
# Update hooks
pre-commit autoupdate

# Reinstall hooks
pre-commit uninstall
pre-commit install

# Skip specific hooks
SKIP=eslint-frontend git commit -m "message"
```

## 📊 Monitoring & Metrics

### Coverage Reports
- View coverage in GitHub Actions artifacts
- Codecov integration provides detailed reports
- Aim for >80% test coverage

### Performance Monitoring
- Lighthouse CI runs on every build
- Performance budgets enforced
- Accessibility scores tracked

### Security Scanning
- Weekly security audits
- Dependency vulnerability scanning
- Secret detection in commits

## 🎯 Best Practices

### Writing Tests
- Write tests for new features
- Maintain >80% coverage
- Use descriptive test names
- Mock external dependencies

### Code Quality
- Follow ESLint rules
- Use TypeScript strictly
- Format with Prettier
- Write meaningful commit messages

### Pull Request Process
1. Create feature branch from `main`
2. Make changes and commit
3. Push and create PR
4. Wait for CI checks to pass
5. Request review
6. Merge after approval and passing checks

## 🔗 Related Documentation

- [GitHub Deployment Setup](./GITHUB_DEPLOYMENT_SETUP.md)
- [Testing Guide](./apps/web/lego-moc-instructions-app/README.md)
- [Contributing Guidelines](./CONTRIBUTING.md)

Your frontend is now protected with comprehensive CI/CD checks! 🚀
