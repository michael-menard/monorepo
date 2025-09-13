# Playwright Timeout Configuration

This document explains the timeout configuration for Playwright tests to prevent tests from hanging indefinitely and ensure reliable test execution.

## Global Timeout Settings

### Test Timeout (playwright.config.ts)
```typescript
timeout: 60000, // 60 seconds per test (global default)
```

### Expect Timeout
```typescript
expect: {
  timeout: 10000, // 10 seconds for expect assertions
}
```

### Action Timeouts
```typescript
actionTimeout: 15000,        // 15 seconds for actions (click, fill, etc.)
navigationTimeout: 30000,    // 30 seconds for page navigation
timeout: 10000,              // 10 seconds for element waits
```

## Test-Specific Timeouts

### Setting Timeout for Individual Tests
```typescript
test('my test', async ({ page }) => {
  test.setTimeout(30000); // 30 seconds for this specific test
  // test code here
});
```

### Setting Timeout for Test Suites
```typescript
test.describe('Auth Tests', () => {
  test.describe.configure({ timeout: 45000 }); // 45 seconds per test in this suite
  
  test('login test', async ({ page }) => {
    // This test will use the 45-second timeout
  });
});
```

## Operation-Specific Timeouts

### Page Navigation
```typescript
await page.goto('/auth/login', { 
  waitUntil: 'networkidle', 
  timeout: 15000 
});
```

### Element Interactions
```typescript
await page.click('button[type="submit"]', { timeout: 5000 });
await page.fill('input[type="email"]', 'test@example.com', { timeout: 5000 });
```

### Waiting for Elements
```typescript
await page.locator('input[type="email"]').waitFor({ timeout: 8000 });
await expect(page.locator('button')).toBeVisible({ timeout: 8000 });
```

### Network Requests
```typescript
await page.waitForResponse(
  response => response.url().includes('/api/auth/login'),
  { timeout: 10000 }
);
```

## Timeout Hierarchy

Timeouts are applied in the following order (most specific wins):

1. **Operation-specific timeout** (e.g., `{ timeout: 5000 }`)
2. **Test-specific timeout** (`test.setTimeout()`)
3. **Test suite timeout** (`test.describe.configure()`)
4. **Global test timeout** (`timeout` in config)
5. **Default Playwright timeout** (30 seconds)

## Recommended Timeout Values

### By Test Type

| Test Type | Recommended Timeout | Reason |
|-----------|-------------------|---------|
| Unit-like tests | 15-30 seconds | Fast, focused tests |
| Integration tests | 45-60 seconds | Multiple components |
| E2E auth flows | 60-90 seconds | Complex user journeys |
| Performance tests | 120+ seconds | May include slow operations |

### By Operation Type

| Operation | Recommended Timeout | Reason |
|-----------|-------------------|---------|
| Page navigation | 15-30 seconds | Network + rendering time |
| Form submission | 10-15 seconds | API call + response |
| Element visibility | 5-10 seconds | DOM updates |
| Network requests | 10-20 seconds | API response time |
| File uploads | 30-60 seconds | Large file processing |

## Best Practices

### 1. Use Appropriate Timeouts
```typescript
// ❌ Too short - may cause flaky tests
await expect(page.locator('button')).toBeVisible({ timeout: 1000 });

// ✅ Reasonable timeout
await expect(page.locator('button')).toBeVisible({ timeout: 8000 });

// ❌ Too long - slows down test suite
await expect(page.locator('button')).toBeVisible({ timeout: 60000 });
```

### 2. Use waitUntil for Navigation
```typescript
// ❌ May not wait for all resources
await page.goto('/auth/login');

// ✅ Wait for network to be idle
await page.goto('/auth/login', { waitUntil: 'networkidle' });
```

### 3. Handle Async Operations
```typescript
// ❌ Fixed timeout may be too short or too long
await page.waitForTimeout(5000);

// ✅ Wait for specific condition
await page.waitForSelector('[data-testid="loading"]', { state: 'hidden' });
```

### 4. Use Promise.race for Multiple Conditions
```typescript
// Wait for either success or error state
await Promise.race([
  page.locator('[data-testid="success"]').waitFor({ timeout: 10000 }),
  page.locator('[data-testid="error"]').waitFor({ timeout: 10000 })
]);
```

## Debugging Timeout Issues

### 1. Check Browser DevTools
- Network tab for slow requests
- Console for JavaScript errors
- Performance tab for rendering issues

### 2. Add Debug Information
```typescript
test('debug timeout', async ({ page }) => {
  console.log('Starting test at:', new Date().toISOString());
  
  try {
    await page.goto('/auth/login', { timeout: 15000 });
    console.log('Page loaded successfully');
  } catch (error) {
    console.log('Page load failed:', error.message);
    // Take screenshot for debugging
    await page.screenshot({ path: 'debug-timeout.png' });
    throw error;
  }
});
```

### 3. Use Playwright Trace
```typescript
// In playwright.config.ts
use: {
  trace: 'on-first-retry', // Capture trace on timeout/failure
}
```

## Environment-Specific Timeouts

### CI/CD Environments
```typescript
const isCI = !!process.env.CI;
const baseTimeout = isCI ? 90000 : 60000; // Longer timeouts in CI

test.describe.configure({ timeout: baseTimeout });
```

### Development vs Production
```typescript
const isDev = process.env.NODE_ENV === 'development';
const navigationTimeout = isDev ? 45000 : 30000; // Longer in dev (hot reload)
```

## Common Timeout Scenarios

### Auth Flow Tests
```typescript
test('login flow', async ({ page }) => {
  test.setTimeout(60000); // Auth flows can be complex
  
  await page.goto('/auth/login', { timeout: 15000 });
  await page.fill('input[type="email"]', 'test@example.com', { timeout: 5000 });
  await page.fill('input[type="password"]', 'password', { timeout: 5000 });
  await page.click('button[type="submit"]', { timeout: 5000 });
  
  // Wait for redirect or success message
  await Promise.race([
    page.waitForURL('**/dashboard', { timeout: 20000 }),
    page.locator('[data-testid="success"]').waitFor({ timeout: 20000 })
  ]);
});
```

### API Integration Tests
```typescript
test('API integration', async ({ page }) => {
  test.setTimeout(45000);
  
  // Track API requests
  const apiResponse = page.waitForResponse(
    response => response.url().includes('/api/auth/login'),
    { timeout: 15000 }
  );
  
  await page.goto('/auth/login');
  await page.click('button[type="submit"]');
  
  const response = await apiResponse;
  expect(response.status()).toBe(200);
});
```

## Monitoring and Alerts

### Test Duration Tracking
```typescript
test('track duration', async ({ page }) => {
  const startTime = Date.now();
  
  // Test code here
  
  const duration = Date.now() - startTime;
  console.log(`Test completed in ${duration}ms`);
  
  // Alert if test is taking too long
  if (duration > 30000) {
    console.warn('⚠️  Test is running slower than expected');
  }
});
```

This timeout configuration ensures that tests fail fast when something goes wrong, rather than hanging indefinitely and blocking the test suite.
