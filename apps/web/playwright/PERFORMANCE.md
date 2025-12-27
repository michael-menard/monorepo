# Performance Budgets - Uploader Route

This document defines the performance budgets for the MOC Instructions Uploader feature.

## Core Web Vitals Budgets

| Metric | Budget | Description |
|--------|--------|-------------|
| **TTI** (Time to Interactive) | ≤ 2500ms | Time until the title input is visible and interactable |
| **LCP** (Largest Contentful Paint) | ≤ 2500ms | Time until the largest content element is painted |
| **CLS** (Cumulative Layout Shift) | ≤ 0.1 | Total layout shift score during page load |
| **FCP** (First Contentful Paint) | ≤ 1800ms | Time until first content is painted |

## Bundle Size Budgets

The uploader route is lazy-loaded to minimize initial bundle size.

| Asset | Budget | Notes |
|-------|--------|-------|
| Initial Bundle | ≤ 200KB gzipped | Core framework + routing |
| Uploader Chunk | ≤ 100KB gzipped | Lazy-loaded on navigation |
| Total (with deps) | ≤ 350KB gzipped | Including shared deps |

## Measurement Methodology

### Automated Testing
Performance is tested automatically via Playwright E2E tests:

```bash
# Run performance tests
pnpm --filter @repo/playwright test:bdd:uploader:perf
```

### Manual Verification
1. Open Chrome DevTools → Performance tab
2. Navigate to `/instructions/new`
3. Check TTI in the Summary panel
4. Use Lighthouse for comprehensive audit

## Lazy Loading Strategy

The uploader uses the following lazy loading approach:

1. **Route-level splitting**: `InstructionsNewPage` is imported dynamically
2. **Component splitting**: Heavy components (e.g., rich text editor) are split
3. **Deferred loading**: Non-critical JS is deferred until after TTI

```typescript
// Route definition with lazy loading
const instructionsNewRoute = createRoute({
  path: '/instructions/new',
  component: lazy(() => import('./pages/InstructionsNewPage')),
  pendingComponent: LoadingPage,
})
```

## Optimization Techniques

### 1. Code Splitting
- Route-based splitting via TanStack Router
- Dynamic imports for large dependencies

### 2. Asset Optimization
- Images compressed via build pipeline
- Fonts preloaded in `<head>`
- Critical CSS inlined

### 3. Network Optimization
- Service worker caching (future)
- CDN delivery for static assets
- Compression enabled (gzip/brotli)

## Monitoring

### CI Pipeline
Performance tests run on every PR and block merge if budgets are exceeded.

### Production Monitoring
- Real User Monitoring (RUM) via [tool TBD]
- Synthetic monitoring via Lighthouse CI

## Related Documents

- [E2E Test Guide](./README.md)
- [Accessibility Testing](./ACCESSIBILITY.md)
- [Story 3.1.26](../../docs/stories/3.1.26.e2e-a11y-perf.md)
