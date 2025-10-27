# GitHub Actions CI/CD Setup

This directory contains comprehensive GitHub Actions workflows for the LEGO MOC Platform monorepo.

## 🚀 Workflows Overview

### Core Workflows

#### 1. **CI (`ci.yml`)**

- **Triggers**: Push/PR to `main` or `develop`
- **Purpose**: Main continuous integration pipeline
- **Features**:
  - Smart change detection using `dorny/paths-filter`
  - Parallel execution for different components
  - Lint, type-check, test, and build packages
  - Only runs jobs for changed components

#### 2. **Auth Service (`auth-service.yml`)**

- **Triggers**: Changes to `apps/api/auth-service/**` or `packages/**`
- **Features**:
  - PostgreSQL service for testing
  - Unit tests with coverage reporting
  - Security scanning with Trivy
  - Build artifact generation
  - Codecov integration

#### 3. **LEGO Projects API (`lego-projects-api.yml`)**

- **Triggers**: Changes to `apps/api/lego-projects-api/**` or `packages/**`
- **Features**:
  - PostgreSQL service for testing
  - Jest testing framework
  - TypeScript compilation
  - Security scanning

#### 4. **LEGO MOC Instructions App (`lego-moc-instructions-app.yml`)**

- **Triggers**: Changes to `apps/web/lego-moc-instructions-app/**` or `packages/**`
- **Features**:
  - Unit tests with Vitest
  - E2E tests with Playwright
  - Lighthouse CI for performance monitoring
  - Build optimization
  - Coverage reporting

### Deployment & Maintenance

#### 5. **Deploy (`deploy.yml`)** - _Currently Disabled_

- **Status**: Template ready, but disabled until deployment is configured
- **Features** (when enabled):
  - Environment-specific deployments (staging/production)
  - Smart deployment based on changes
  - Support for multiple deployment platforms
  - Environment protection rules

#### 6. **Dependencies (`dependencies.yml`)**

- **Triggers**: Weekly schedule or manual dispatch
- **Features**:
  - Security auditing with `pnpm audit`
  - Dependency updates with automated PRs
  - CodeQL security analysis
  - Dependency review for PRs

## 🔧 Configuration

### Required Secrets

Add these secrets to your GitHub repository:

```bash
# Optional: For enhanced features
CODECOV_TOKEN=your_codecov_token
LHCI_GITHUB_APP_TOKEN=your_lighthouse_token

# Deployment (choose your platform)
VERCEL_TOKEN=your_vercel_token
NETLIFY_AUTH_TOKEN=your_netlify_token
RAILWAY_TOKEN=your_railway_token

# Database (for production deployments)
DATABASE_URL=your_production_database_url
```

### Environment Variables

The workflows use these environment variables:

- `NODE_ENV=test` for testing
- `NODE_OPTIONS=--max-old-space-size=4096` for memory optimization
- `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `CSRF_SECRET` for auth service testing

## 📊 Features

### Smart Change Detection

- Uses `dorny/paths-filter` to detect which apps/packages changed
- Only runs relevant workflows to save CI time
- Supports monorepo-aware dependency tracking

### Parallel Execution

- Jobs run in parallel when possible
- Separate workflows for each app
- Independent deployment pipelines

### Quality Gates

- **Linting**: ESLint with strict rules
- **Type Checking**: TypeScript compilation
- **Testing**: Unit, integration, and E2E tests
- **Security**: Trivy vulnerability scanning, CodeQL analysis
- **Performance**: Lighthouse CI monitoring
- **Coverage**: Codecov integration

### Deployment Strategy

- **Staging**: Automatic deployment on develop branch
- **Production**: Manual approval required
- **Rollback**: Tagged releases for easy rollback
- **Multi-platform**: Support for Vercel, Netlify, Railway, AWS

## 🛠️ Customization

### Adding New Apps

1. Create a new workflow file: `.github/workflows/your-app.yml`
2. Copy structure from existing app workflows
3. Update paths in the `paths` filter
4. Customize build/test/deploy steps

### Deployment Platforms

#### Vercel

```yaml
- name: Deploy to Vercel
  run: vercel --prod --token ${{ secrets.VERCEL_TOKEN }}
```

#### Netlify

```yaml
- name: Deploy to Netlify
  run: netlify deploy --prod --auth ${{ secrets.NETLIFY_AUTH_TOKEN }}
```

#### Railway

```yaml
- name: Deploy to Railway
  run: railway deploy --service your-service
```

### Custom Test Commands

Update the test steps in each workflow:

```yaml
- name: Run tests
  run: pnpm turbo test --filter="your-package"
```

## 📈 Monitoring

### Build Status

- Check the Actions tab for build status
- Failed builds block deployments
- Notifications via GitHub/Slack/email

### Performance

- Lighthouse CI reports in PR comments
- Performance budgets enforced
- Core Web Vitals tracking

### Security

- Weekly dependency audits
- Automated security updates
- Vulnerability scanning on every push

## 🚨 Troubleshooting

### Common Issues

1. **Tests failing**: Check test logs in Actions tab
2. **Build timeouts**: Increase `timeout-minutes` in workflow
3. **Memory issues**: Adjust `NODE_OPTIONS` memory settings
4. **Dependency conflicts**: Review dependency update PRs

### Debug Mode

Enable debug logging:

```yaml
env:
  ACTIONS_STEP_DEBUG: true
  ACTIONS_RUNNER_DEBUG: true
```

## 📚 Best Practices

1. **Keep workflows focused**: One workflow per app/concern
2. **Use caching**: Cache dependencies and build artifacts
3. **Fail fast**: Run quick checks (lint, type) before expensive tests
4. **Secure secrets**: Use GitHub secrets, never commit credentials
5. **Monitor costs**: Use change detection to avoid unnecessary runs

## 🔄 Maintenance

- Review and update workflows monthly
- Monitor CI performance and optimize slow jobs
- Keep actions versions updated
- Review security scan results weekly
