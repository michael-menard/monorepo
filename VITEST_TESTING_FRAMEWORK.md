# Vitest Testing Framework Setup

This document describes the comprehensive Vitest testing framework setup implemented for the monorepo, including React Testing Library, accessibility testing, and MSW for API mocking.

## Overview

The testing framework has been configured to support:
- **Vitest** as the test runner with fast execution
- **React Testing Library** for component testing
- **Accessibility testing** with vitest-axe and @axe-core/react
- **MSW (Mock Service Worker)** for API mocking
- **Coverage reporting** with Istanbul
- **Custom test utilities** for common testing patterns

## Configuration Files

### Root Configuration (`vitest.config.ts`)

The root Vitest configuration provides shared settings for all packages:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.config.*',
        '**/test/**',
        '**/__tests__/**',
        '**/*.d.ts',
        '**/coverage/**'
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@packages/ui': path.resolve(__dirname, './packages/ui/src'),
      '@packages/auth': path.resolve(__dirname, './packages/auth/src'),
      '@packages/shared': path.resolve(__dirname, './packages/shared/src'),
    },
  },
});
```

### Test Setup (`src/test/setup.ts`)

The test setup file configures the testing environment:

- **React Testing Library** with jest-dom matchers
- **MSW server** setup for API mocking
- **Accessibility testing** with vitest-axe
- **Browser API mocks** (IntersectionObserver, ResizeObserver, matchMedia)
- **Console error/warning filtering** for cleaner test output

### Test Utilities (`src/test/utils.tsx`)

Custom test utilities provide:

- **Custom render function** with Redux and Router providers
- **Accessibility testing utility** (`testA11y`)
- **Mock store creation** for Redux testing
- **Mock API responses** for common endpoints
- **Mock user data** for consistent testing

## Dependencies

### Core Testing Dependencies

```json
{
  "vitest": "^3.2.4",
  "@testing-library/react": "^16.3.0",
  "@testing-library/jest-dom": "^6.6.3",
  "@testing-library/user-event": "^14.6.1",
  "vitest-axe": "^0.1.0",
  "@axe-core/react": "^4.10.2",
  "msw": "^2.10.4",
  "canvas": "^3.1.2"
}
```

### Provider Dependencies

```json
{
  "@reduxjs/toolkit": "^2.8.2",
  "react-redux": "^9.2.0",
  "react-router-dom": "^6.30.1"
}
```

## Usage Examples

### Basic Component Test

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/utils';

const MyComponent = () => (
  <div>
    <h1>Hello World</h1>
    <button>Click me</button>
  </div>
);

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
```

### Accessibility Testing

```typescript
import { testA11y } from '../test/utils';

it('has no accessibility violations', async () => {
  await testA11y(<MyComponent />);
});
```

### Testing with Redux

```typescript
import { render } from '../test/utils';

it('works with Redux store', () => {
  render(<MyComponent />, { 
    withRedux: true,
    preloadedState: { auth: { user: mockUser } }
  });
  expect(screen.getByText('Hello World')).toBeInTheDocument();
});
```

### Testing with Router

```typescript
import { render } from '../test/utils';

it('works with Router', () => {
  render(<MyComponent />, { withRouter: true });
  expect(screen.getByText('Hello World')).toBeInTheDocument();
});
```

## MSW API Mocking

### Default Handlers

The framework includes default MSW handlers for common API endpoints:

- **Auth endpoints**: `/api/auth/me`, `/api/auth/login`, `/api/auth/signup`
- **Gallery endpoints**: `/api/gallery/images`, `/api/gallery/albums`
- **Wishlist endpoints**: `/api/wishlist`
- **Profile endpoints**: `/api/profile`
- **MOC endpoints**: `/api/moc/instructions`

### Custom Handlers

```typescript
import { http, HttpResponse } from 'msw';

export const customHandlers = [
  http.get('/api/custom-endpoint', () => {
    return HttpResponse.json({
      data: 'custom response'
    });
  }),
];
```

## Package-Specific Configuration

Each package can have its own Vitest configuration that extends the root setup:

```typescript
// packages/shared/vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['../../src/test/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

## Test Scripts

### Root Package Scripts

```json
{
  "test": "turbo run test",
  "test:coverage": "turbo run test:coverage"
}
```

### Package Scripts

```json
{
  "test": "vitest run",
  "test:coverage": "vitest run --coverage",
  "test:ui": "vitest --ui"
}
```

## Coverage Configuration

Coverage is configured with Istanbul provider and includes:

- **Text reporter** for console output
- **HTML reporter** for detailed coverage reports
- **LCOV reporter** for CI integration

Coverage excludes:
- `node_modules`
- `dist` directories
- Configuration files
- Test files
- Type definition files

## Best Practices

### 1. Use Custom Render Function

Always use the custom render function from `src/test/utils.tsx` instead of the default React Testing Library render:

```typescript
// ✅ Good
import { render } from '../test/utils';

// ❌ Avoid
import { render } from '@testing-library/react';
```

### 2. Test Accessibility

Include accessibility tests for all components:

```typescript
it('has no accessibility violations', async () => {
  await testA11y(<MyComponent />);
});
```

### 3. Mock External Dependencies

All external dependencies should be mocked in tests:

```typescript
// Mock external components
vi.mock('@packages/ui/Button', () => ({
  default: ({ children, ...props }) => <button {...props}>{children}</button>
}));
```

### 4. Use Descriptive Test Names

```typescript
// ✅ Good
it('displays user name when user is logged in', () => {});

// ❌ Avoid
it('works', () => {});
```

### 5. Test User Interactions

Use `@testing-library/user-event` for testing user interactions:

```typescript
import userEvent from '@testing-library/user-event';

it('handles button click', async () => {
  const user = userEvent.setup();
  render(<MyComponent />);
  
  await user.click(screen.getByRole('button'));
  expect(screen.getByText('Clicked!')).toBeInTheDocument();
});
```

## Running Tests

### Run All Tests

```bash
pnpm test
```

### Run Tests with Coverage

```bash
pnpm test:coverage
```

### Run Tests in Watch Mode

```bash
pnpm test:watch
```

### Run Tests for Specific Package

```bash
pnpm test --filter=@packages/ui
```

## Troubleshooting

### Canvas Error in Accessibility Tests

If you encounter canvas-related errors in accessibility tests, ensure the `canvas` package is installed:

```bash
pnpm add -D canvas
```

### MSW Server Issues

If MSW handlers are not working, check that the server is properly set up in the test setup file and that handlers are correctly defined.

### TypeScript Errors

Ensure that all test files have proper TypeScript imports and that the test environment is configured for React components.

## Integration with CI/CD

The testing framework is designed to work seamlessly with CI/CD pipelines:

- Tests run once and exit (no watch mode in CI)
- Coverage reports are generated for analysis
- LCOV format is supported for coverage integration
- All tests must pass before deployment

This comprehensive testing setup ensures high-quality, accessible, and well-tested React components throughout the monorepo. 