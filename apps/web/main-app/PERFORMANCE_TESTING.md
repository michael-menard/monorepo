# Performance Testing & Coverage Guide

This document outlines the comprehensive performance testing and code coverage setup for the main-app.

## 🎯 Overview

Our performance testing strategy includes:
- **Test Coverage Reporting** with thresholds and enforcement
- **Bundle Analysis** for optimizing application size
- **Runtime Performance Monitoring** with Web Vitals
- **Component Performance Tracking** for React components
- **CI/CD Integration** with automated performance budgets

## 📊 Test Coverage

### Coverage Configuration

Coverage is configured in `vitest.config.ts` with the following thresholds:

```typescript
coverage: {
  thresholds: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // Per-file thresholds for critical files
    'src/store/slices/*.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  }
}
```

### Running Coverage Tests

```bash
# Run tests with coverage
pnpm test:coverage

# Run tests with coverage and open report
pnpm test:coverage:open

# Run tests with coverage in UI mode
pnpm test:coverage:ui
```

### Coverage Reports

Coverage reports are generated in multiple formats:
- **HTML Report**: `coverage/index.html` - Interactive web interface
- **LCOV Report**: `coverage/lcov.info` - For CI/CD integration
- **JSON Report**: `coverage/coverage-final.json` - Machine-readable format
- **Text Summary**: Console output with summary statistics

## 🚀 Performance Testing

### Bundle Analysis

Analyze your application bundle to identify optimization opportunities:

```bash
# Build and analyze bundle
pnpm build:analyze

# Run performance test suite
pnpm perf:test
```

This generates:
- **Bundle Report**: `dist/bundle-report.html` - Visual bundle analyzer
- **Bundle Stats**: `dist/bundle-stats.json` - Detailed bundle statistics

### Performance Monitoring

The app includes runtime performance monitoring with Web Vitals:

```typescript
import { performanceMonitor } from './lib/performance'

// Get current metrics
const metrics = performanceMonitor.getMetrics()

// Track component performance
performanceMonitor.trackComponentRender('MyComponent', renderTime)
```

### Performance Budgets

| Metric | Budget | Description |
|--------|--------|-------------|
| Main JS Bundle | 500KB | Maximum JavaScript bundle size |
| Main CSS Bundle | 100KB | Maximum CSS bundle size |
| Component Render | 16ms | Maximum render time for 60fps |
| First Contentful Paint | 2s | Time to first meaningful content |
| Largest Contentful Paint | 3s | Time to largest content element |
| Cumulative Layout Shift | 0.1 | Visual stability score |

## 🧪 Performance Tests

### Component Performance Tests

Located in `src/__tests__/Performance.integration.test.tsx`:

```typescript
it('should render Gallery module within performance budget', async () => {
  const startTime = performance.now()
  renderWithStore(<GalleryModule />)
  const endTime = performance.now()
  
  expect(endTime - startTime).toBeLessThan(50) // 50ms budget
})
```

### Web Vitals Testing

Performance monitoring tests in `src/test/performance.test.ts`:

```typescript
it('should collect and store web vitals metrics', () => {
  const metrics = performanceMonitor.getMetrics()
  
  expect(metrics.cls).toBeLessThan(0.1) // Good CLS score
  expect(metrics.fcp).toBeLessThan(2000) // Good FCP score
})
```

## 🔄 CI/CD Integration

### GitHub Actions Workflow

The `.github/workflows/test-coverage.yml` workflow includes:

1. **Test Coverage Job**
   - Runs all tests with coverage
   - Uploads coverage to Codecov
   - Comments on PRs with coverage summary

2. **Performance Analysis Job**
   - Builds production bundle
   - Analyzes bundle size
   - Enforces performance budgets

3. **Lighthouse Audit Job**
   - Runs Lighthouse performance audit
   - Checks Core Web Vitals
   - Uploads performance reports

### Performance Budget Enforcement

The CI pipeline will fail if:
- Test coverage falls below thresholds
- Bundle sizes exceed budgets
- Lighthouse scores fall below minimums
- Core Web Vitals exceed limits

## 📈 Monitoring & Reporting

### Local Development

```bash
# Start development with performance monitoring
VITE_ENABLE_PERFORMANCE_MONITORING=true pnpm dev

# View performance metrics in console
# Metrics are logged every 2 seconds
```

### Production Monitoring

In production, performance metrics are:
- Collected automatically via Web Vitals
- Logged to console (can be sent to analytics)
- Available via `performanceMonitor.getMetrics()`

### Coverage Badges

Add coverage badges to your README:

```markdown
[![Coverage](https://codecov.io/gh/your-org/your-repo/branch/main/graph/badge.svg)](https://codecov.io/gh/your-org/your-repo)
```

## 🛠️ Tools & Dependencies

### Testing & Coverage
- **Vitest**: Test runner with built-in coverage
- **@vitest/coverage-v8**: V8-based coverage provider
- **@vitest/ui**: Interactive test UI

### Performance Analysis
- **vite-bundle-analyzer**: Bundle size analysis
- **web-vitals**: Core Web Vitals collection
- **Lighthouse CI**: Automated performance audits

### CI/CD
- **Codecov**: Coverage reporting service
- **GitHub Actions**: Automated testing and deployment

## 🎯 Best Practices

### Writing Performance Tests

1. **Set Realistic Budgets**: Base budgets on user experience requirements
2. **Test Real Scenarios**: Use actual data and user interactions
3. **Monitor Trends**: Track performance over time, not just point-in-time
4. **Test on CI**: Ensure consistent environment for performance testing

### Optimizing Performance

1. **Code Splitting**: Use dynamic imports for route-based splitting
2. **Bundle Analysis**: Regularly analyze and optimize bundle size
3. **Image Optimization**: Use modern formats and responsive images
4. **Caching**: Implement proper caching strategies
5. **Lazy Loading**: Load components and resources on demand

## 🚨 Troubleshooting

### Coverage Issues

```bash
# Clear coverage cache
rm -rf coverage/

# Run tests with verbose coverage
pnpm test:coverage --reporter=verbose
```

### Performance Issues

```bash
# Analyze bundle with detailed output
pnpm build:analyze --analyze-mode=server

# Profile component performance
VITE_ENABLE_PERFORMANCE_MONITORING=true pnpm dev
```

### CI/CD Issues

- Check GitHub Actions logs for detailed error messages
- Verify environment variables are set correctly
- Ensure all dependencies are installed in CI environment
