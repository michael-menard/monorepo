# GitHub Actions Setup Guide

## 🎯 Quick Start

Your GitHub Actions workflows are now set up! Here's what you need to do to get them running:

### 1. Update Repository URLs

Replace `yourusername/yourrepo` in `README.md` with your actual GitHub repository:

```bash
# Find and replace in README.md
yourusername/yourrepo → your-github-username/your-repo-name
```

### 2. Configure Secrets (Optional)

Add these secrets in GitHub Settings > Secrets and variables > Actions:

#### For Enhanced Features:
- `CODECOV_TOKEN` - For coverage reporting
- `LHCI_GITHUB_APP_TOKEN` - For Lighthouse CI

#### For Future Deployment (when ready):
- `VERCEL_TOKEN` - For Vercel deployments
- `NETLIFY_AUTH_TOKEN` - For Netlify deployments
- `RAILWAY_TOKEN` - For Railway deployments

### 3. Enable Workflows

The workflows will automatically run when you:
- Push to `main` or `develop` branches
- Create pull requests
- Push tags (for releases)

## 📋 What's Included

### ✅ Workflows Created:

1. **`ci.yml`** - Main CI pipeline
   - Runs on every push/PR
   - Smart change detection
   - Parallel execution

2. **`auth-service.yml`** - Auth Service CI/CD
   - PostgreSQL testing
   - Security scanning
   - Coverage reporting

3. **`lego-projects-api.yml`** - LEGO Projects API CI/CD
   - Jest testing
   - TypeScript compilation
   - Build artifacts

4. **`lego-moc-instructions-app.yml`** - Web App CI/CD
   - Vitest unit tests
   - Playwright E2E tests
   - Lighthouse performance

5. **`deploy.yml`** - Production deployment (disabled)
   - Template ready for when you want to deploy
   - Environment protection
   - Multi-app deployment support

6. **`dependencies.yml`** - Security & maintenance
   - Weekly dependency updates
   - Security audits
   - CodeQL analysis

### ✅ Features:

- **Smart Execution**: Only runs workflows for changed apps
- **Parallel Jobs**: Faster CI with parallel execution
- **Quality Gates**: Lint, test, type-check, security scan
- **Performance Monitoring**: Lighthouse CI integration
- **Security**: Trivy scanning, CodeQL analysis
- **Coverage**: Codecov integration
- **Deployment Ready**: Templates prepared for when you're ready

## 🔧 Customization

### Adding Deployment Platforms

#### Vercel (Recommended for Web Apps)
```yaml
- name: Deploy to Vercel
  run: |
    npm i -g vercel
    vercel --prod --token ${{ secrets.VERCEL_TOKEN }}
```

#### Netlify
```yaml
- name: Deploy to Netlify
  run: |
    npm i -g netlify-cli
    netlify deploy --prod --auth ${{ secrets.NETLIFY_AUTH_TOKEN }}
```

#### Railway (Recommended for APIs)
```yaml
- name: Deploy to Railway
  run: |
    npm i -g @railway/cli
    railway deploy --service auth-service
```

### Environment Variables

Add these to your deployment platform:

#### Auth Service:
- `JWT_SECRET`
- `REFRESH_TOKEN_SECRET`
- `CSRF_SECRET`
- `DATABASE_URL`
- `NODE_ENV=production`

#### Web App:
- `VITE_API_URL`
- `VITE_AUTH_SERVICE_URL`
- `NODE_ENV=production`

## 🚀 Deployment Strategy

### Automatic Deployments:
- **Staging**: Deploys on push to `develop` branch
- **Production**: Deploys on push to `main` branch (with approval)

### Manual Deployments:
- Go to Actions tab
- Select "Deploy to Production" workflow
- Click "Run workflow"
- Choose environment (staging/production)

## 📊 Monitoring

### Build Status:
- Check Actions tab for real-time status
- Status badges in README show current state
- Email notifications on failures

### Performance:
- Lighthouse reports in PR comments
- Performance budgets enforced
- Core Web Vitals tracking

### Security:
- Weekly dependency audits
- Automated security updates
- Vulnerability scanning

## 🛠️ Troubleshooting

### Common Issues:

1. **Workflow not running**:
   - Check if paths match your changes
   - Verify workflow syntax with GitHub Actions validator

2. **Tests failing**:
   - Check test logs in Actions tab
   - Run tests locally first: `pnpm turbo test`

3. **Build timeouts**:
   - Increase `timeout-minutes` in workflow
   - Optimize build process

4. **Deployment failures**:
   - Check secrets are configured
   - Verify deployment platform credentials

### Debug Mode:
Add to workflow for detailed logging:
```yaml
env:
  ACTIONS_STEP_DEBUG: true
  ACTIONS_RUNNER_DEBUG: true
```

## 📈 Next Steps

1. **Test the workflows**: Make a small change and push to see them run
2. **Configure deployment**: Set up your preferred deployment platform
3. **Add secrets**: Configure tokens for enhanced features
4. **Monitor performance**: Review Lighthouse reports
5. **Security**: Review weekly security audit results

## 🎉 You're All Set!

Your monorepo now has enterprise-grade CI/CD with:
- ✅ Automated testing for all apps
- ✅ Security scanning and audits
- ✅ Performance monitoring
- ✅ Smart deployment pipelines
- ✅ Quality gates and coverage
- ✅ Dependency management

The workflows will help maintain code quality and catch issues early!
