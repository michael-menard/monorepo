# Branch Protection Setup Guide

This repository is configured with strict branch protection rules to ensure code quality and prevent direct pushes to the main branch.

## 🔒 Protection Rules

### Main Branch (`main`)
- **No direct pushes allowed** - All changes must go through pull requests
- **Require 1 approval** before merging
- **Dismiss stale reviews** when new commits are pushed
- **Require status checks** to pass before merging
- **Require up-to-date branches** before merging
- **Block force pushes** and branch deletions
- **Require linear history** (no merge commits)

### Required Status Checks
All of these CI checks must pass before a PR can be merged:
- ✅ Unit Tests
- ✅ Lint & Type Check
- ✅ Build App
- ✅ Security Audit
- ✅ Auggie + CodeRabbit Collaborative Review
- ✅ Quality Gates

## 🚀 Setup Instructions

### Option 1: Automatic Setup (Recommended)
1. Go to **Actions** tab in GitHub
2. Find the **"Setup Branch Protection Rules"** workflow
3. Click **"Run workflow"**
4. Select the branch to protect (default: `main`)
5. Click **"Run workflow"**

### Option 2: Manual Setup
1. Go to **Settings** > **Branches** in GitHub
2. Click **"Add rule"** or edit existing rule for `main`
3. Configure the following settings:

#### Branch name pattern: `main`

#### Protect matching branches:
- ☑️ Require a pull request before merging
  - ☑️ Require approvals: `1`
  - ☑️ Dismiss stale pull request approvals when new commits are pushed
  - ☐ Require review from code owners
  - ☐ Require approval of the most recent reviewable push

- ☑️ Require status checks to pass before merging
  - ☑️ Require branches to be up to date before merging
  - Add these status checks:
    - `Unit Tests`
    - `Lint & Type Check`
    - `Build App`
    - `Security Audit`
    - `Auggie + CodeRabbit Collaborative Review`
    - `Quality Gates`

- ☑️ Require linear history
- ☐ Require deployments to succeed before merging
- ☑️ Lock branch (prevent force pushes and deletions)
- ☐ Do not allow bypassing the above settings (keep unchecked to allow admin override)

## 📋 Developer Workflow

With branch protection enabled, here's the required workflow:

### 1. Create Feature Branch
```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

### 2. Make Changes and Commit
```bash
# Make your changes
git add .
git commit -m "feat: add your feature description"
git push origin feature/your-feature-name
```

### 3. Create Pull Request
1. Go to GitHub and create a Pull Request
2. Fill out the PR template
3. Wait for CI checks to pass
4. Request review from team members

### 4. Merge Process
1. ✅ All status checks must pass
2. ✅ At least 1 approval required
3. ✅ Branch must be up-to-date with main
4. ✅ Use "Squash and merge" or "Rebase and merge" (no merge commits)

## 🛠️ Troubleshooting

### "Required status checks are failing"
- Check the **Actions** tab for failed CI runs
- Fix any linting, testing, or build issues
- Push new commits to update the PR

### "Branch is out of date"
```bash
git checkout main
git pull origin main
git checkout your-feature-branch
git rebase main  # or git merge main
git push --force-with-lease origin your-feature-branch
```

### "No reviewers available"
- Add team members as collaborators with write access
- Configure CODEOWNERS file for automatic review requests
- Temporarily disable review requirements (admin only)

## 🔧 Configuration Files

- **`.github/branch-protection.yml`** - Documents the protection rules
- **`.github/workflows/setup-branch-protection.yml`** - Automated setup workflow
- **`.github/workflows/ci.yml`** - Main CI pipeline that provides required status checks

## 📚 Additional Resources

- [GitHub Branch Protection Documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Conventional Commits](https://www.conventionalcommits.org/) - Recommended commit message format
