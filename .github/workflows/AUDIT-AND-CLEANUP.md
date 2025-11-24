# GitHub Workflows Audit & Cleanup Plan

**Date:** 2025-01-23
**Total Workflows:** 18 files
**Status:** Many redundant/deprecated workflows found

## Current Workflows

### ✅ Keep (Active & Necessary)

| File | Purpose | Status | Notes |
|------|---------|--------|-------|
| `ci.yml` | Main CI pipeline | ✅ Active | Runs tests, lint, type-check on PRs |
| `deploy-api-lambdas.yml` | Deploy Lambda functions | ✅ Active | **NEW** - Per-Lambda deployment with layers |
| `reusable-deploy-lambda.yml` | Reusable Lambda workflow | ✅ Active | **NEW** - Called by deploy-api-lambdas.yml |
| `security.yml` | Security scanning | ✅ Keep | CodeQL, dependency scanning |
| `dependencies.yml` | Dependency updates | ✅ Keep | Automated dependency PRs |
| `project-automation.yml` | GitHub project automation | ✅ Keep | Issue/PR automation |
| `release.yml` | Release management | ✅ Keep | Semantic versioning |
| `coderabbit-integration.yml` | AI code reviews | ⚠️ Optional | Keep if using CodeRabbit |
| `coderabbit-status.yml` | CodeRabbit status checks | ⚠️ Optional | Keep if using CodeRabbit |

**Total to Keep:** 7-9 files

### ❌ Remove (Redundant/Deprecated)

| File | Reason | Replacement |
|------|--------|-------------|
| `deploy.yml` | **Disabled/template** - Contains only commented code | None needed |
| `deploy-aws.yml` | **Deprecated** - Comment says "replaced by individual app workflows" | `deploy-api-lambdas.yml` |
| `deploy-changed.yml` | **Redundant** - Overlaps with `deploy-api-lambdas.yml` | `deploy-api-lambdas.yml` |
| `deploy-frontend.yml` | **Standalone frontend deploy** - May be needed separately | Keep only if deploying frontend independently |
| `deploy-production.yml` | **Redundant** - Overlaps with main deploy workflows | Covered by `deploy-api-lambdas.yml` |
| `rollback-production.yml` | **Incomplete** - Better to use git revert + redeploy | Use deployment workflow |
| `lego-moc-instructions-app.yml` | **App-specific CI** - Overlaps with main `ci.yml` | `ci.yml` handles this |
| `lego-projects-api.yml` | **App-specific CI** - Path doesn't exist (apps/api/lego-projects-api) | `ci.yml` + `deploy-api-lambdas.yml` |
| `setup-branch-protection.yml` | **One-time setup** - Not recurring | Run once, then delete |

**Total to Remove:** 7-9 files

### 🔍 Investigate

| File | Question | Action |
|------|----------|--------|
| `__tests__/workflow-validation.test.yml` | Is workflow testing being used? | If no tests exist, remove |
| `deploy-frontend.yml` | Is frontend deployed separately from API? | Keep if yes, remove if no |

## Cleanup Recommendations

### Phase 1: Immediate Removals (Safe)

These files are clearly deprecated or contain only comments:

```bash
cd .github/workflows

# Remove deprecated files
rm -f deploy.yml              # Disabled template
rm -f deploy-aws.yml          # Explicitly marked as replaced
rm -f setup-branch-protection.yml  # One-time setup script
```

### Phase 2: Consolidation (Requires Testing)

Remove app-specific workflows that duplicate `ci.yml`:

```bash
# Remove redundant API CI workflow (path doesn't exist)
rm -f lego-projects-api.yml

# Remove frontend CI if already covered by ci.yml
# FIRST: Verify ci.yml handles frontend testing
rm -f lego-moc-instructions-app.yml
```

### Phase 3: Deployment Cleanup

Remove old deployment workflows replaced by the new Lambda layers architecture:

```bash
# Remove old deployment workflows
rm -f deploy-changed.yml       # Replaced by deploy-api-lambdas.yml
rm -f deploy-production.yml    # Replaced by deploy-api-lambdas.yml
rm -f rollback-production.yml  # Use git revert instead

# Keep or remove frontend deployment
# Decision: Is frontend deployed independently?
# If YES: Keep deploy-frontend.yml
# If NO:  Remove it
# rm -f deploy-frontend.yml
```

### Phase 4: Optional Cleanup

If not using these services:

```bash
# Remove CodeRabbit workflows (if not using AI code review)
rm -f coderabbit-integration.yml
rm -f coderabbit-status.yml

# Remove workflow tests if not using
rm -rf __tests__/
```

## Recommended Final Structure

After cleanup, you should have:

```
.github/workflows/
├── ci.yml                          # Main CI: tests, lint, type-check
├── deploy-api-lambdas.yml          # Lambda deployment orchestration
├── reusable-deploy-lambda.yml      # Reusable Lambda deploy workflow
├── deploy-frontend.yml             # (Optional) Frontend-only deploys
├── security.yml                    # Security scanning
├── dependencies.yml                # Dependency updates
├── project-automation.yml          # GitHub automation
├── release.yml                     # Release management
├── coderabbit-integration.yml      # (Optional) AI code review
└── coderabbit-status.yml          # (Optional) AI code review status
```

**Total:** 7-10 files (down from 18)

## Migration Path

### Step 1: Verify New Workflows Work

Before deleting old workflows, ensure the new ones work:

1. Test `deploy-api-lambdas.yml`:
   ```bash
   # Make a small change to trigger deployment
   git commit --allow-empty -m "test: trigger deployment workflow"
   git push
   ```

2. Check GitHub Actions tab:
   - ✅ CI runs successfully
   - ✅ Lambda deployment detects changes
   - ✅ Individual Lambdas deploy correctly

### Step 2: Create Backup Branch

```bash
git checkout -b backup/old-workflows
git push origin backup/old-workflows
```

### Step 3: Remove Deprecated Workflows

```bash
git checkout main
cd .github/workflows

# Phase 1: Safe removals
rm deploy.yml deploy-aws.yml setup-branch-protection.yml

# Phase 2: Redundant workflows
rm lego-projects-api.yml deploy-changed.yml deploy-production.yml rollback-production.yml

# Commit
git add .
git commit -m "chore: remove deprecated GitHub workflows

- Remove disabled/template workflows
- Remove redundant deployment workflows
- Consolidate to new Lambda layers deployment architecture

Old workflows backed up in backup/old-workflows branch"
git push
```

### Step 4: Update Documentation

Update any documentation that references old workflows:

- README.md
- CONTRIBUTING.md
- Deployment docs

## Comparison: Before vs After

### Before (18 files)
```
Total workflows: 18
Active workflows: ~6-8
Deprecated/redundant: ~10-12
Maintenance burden: High (many overlapping responsibilities)
Deploy time: Slow (full stack deployments)
```

### After (7-10 files)
```
Total workflows: 7-10
Active workflows: 7-10 (all active)
Deprecated/redundant: 0
Maintenance burden: Low (clear responsibilities)
Deploy time: Fast (per-Lambda deployment)
```

## Benefits of Cleanup

✅ **Faster CI/CD** - Fewer workflows = less confusion
✅ **Easier maintenance** - Clear purpose for each workflow
✅ **Cost savings** - Fewer redundant runs
✅ **Better onboarding** - New developers understand workflows faster
✅ **Reduced errors** - No conflicting deployment workflows

## Workflow Responsibilities (After Cleanup)

### Development Workflows
- **ci.yml** - Run on every PR/push
  - Type checking
  - Linting
  - Unit tests
  - Integration tests

### Deployment Workflows
- **deploy-api-lambdas.yml** - Deploy Lambda functions
  - Detect changed functions
  - Run tests
  - Deploy layers if changed
  - Deploy affected Lambda functions
  - Runs on: Push to main, PR to main

- **reusable-deploy-lambda.yml** - Deploy single Lambda
  - Can be called by other workflows
  - Can be triggered manually
  - Handles individual function deployment

- **deploy-frontend.yml** (Optional)
  - Deploy Next.js frontend
  - Deploy to Vercel/Amplify/S3
  - Runs on: Push to main (frontend changes)

### Automation Workflows
- **security.yml** - Weekly security scans
- **dependencies.yml** - Automated dependency updates
- **project-automation.yml** - Issue/PR automation
- **release.yml** - Semantic release on version tags

## Questions to Answer

Before finalizing cleanup:

1. **Frontend Deployment:**
   - Q: Is frontend deployed separately from API?
   - A: [YES/NO]
   - Action: If NO, remove `deploy-frontend.yml`

2. **CodeRabbit:**
   - Q: Are you using CodeRabbit for AI code reviews?
   - A: [YES/NO]
   - Action: If NO, remove both CodeRabbit workflows

3. **Workflow Tests:**
   - Q: Are there tests in `__tests__/workflow-validation.test.yml`?
   - A: [YES/NO]
   - Action: If NO or empty, remove `__tests__/` directory

4. **Old API Path:**
   - Q: Does `apps/api/lego-projects-api/` exist?
   - A: [NO - only apps/api exists]
   - Action: Remove `lego-projects-api.yml` (already uses old path)

## Rollback Plan

If something breaks after cleanup:

```bash
# Restore old workflows from backup branch
git checkout backup/old-workflows -- .github/workflows/
git commit -m "rollback: restore old workflows"
git push
```

Or restore individual files:

```bash
git checkout backup/old-workflows -- .github/workflows/deploy-changed.yml
git commit -m "restore: deploy-changed.yml"
git push
```

## Implementation Checklist

- [ ] Verify new Lambda deployment workflows work
- [ ] Create backup branch with old workflows
- [ ] Answer questions above about frontend/CodeRabbit
- [ ] Remove Phase 1 files (safe removals)
- [ ] Test that CI still works
- [ ] Remove Phase 2 files (consolidation)
- [ ] Test that CI still works
- [ ] Remove Phase 3 files (deployment cleanup)
- [ ] Test deployments work
- [ ] Remove Phase 4 files (optional)
- [ ] Update documentation
- [ ] Monitor for 1 week
- [ ] Delete backup branch if all good

## Next Steps

1. **Review this audit** with the team
2. **Test new workflows** before removing old ones
3. **Answer the questions** in the "Questions to Answer" section
4. **Execute cleanup** in phases (don't rush)
5. **Monitor** for issues after each phase
6. **Update docs** to reference new workflows only
