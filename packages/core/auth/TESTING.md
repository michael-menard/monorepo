# Auth Package Testing Guide

This document provides comprehensive information about testing the consolidated auth package, including unit tests, integration tests, and end-to-end tests.

## Overview

The auth package includes multiple layers of testing to ensure reliability and security:

- **Unit Tests**: Test individual functions and utilities
- **Integration Tests**: Test complete auth flows and component interactions
- **Component Tests**: Test React components with user interactions
- **E2E Tests**: Test the complete user journey in a real browser environment

## Test Structure

```
packages/auth/
├── src/
│   ├── __tests__/
│   │   ├── integration/           # Integration tests
│   │   └── setup/                 # Test configuration and utilities
│   ├── components/__tests__/      # Component tests
│   ├── hooks/__tests__/           # Hook tests
│   ├── store/__tests__/           # Redux store tests
│   └── utils/__tests__/           # Utility function tests
├── scripts/
│   └── test-runner.ts             # Custom test runner
└── vitest.config.ts               # Vitest configuration
```

## Running Tests

### Quick Start

```bash
# Run all tests
pnpm test:all

# Run specific test types
pnpm test:unit          # Unit tests only
pnpm test:integration   # Integration tests only
pnpm test:components    # Component tests only

# Development
pnpm test:watch         # Watch mode
pnpm test:coverage      # With coverage report
pnpm test:verbose       # Detailed output
```

### Test Commands

| Command | Description |
|---------|-------------|
| `pnpm test` | Run all tests once |
| `pnpm test:all` | Run comprehensive test suite |
| `pnpm test:unit` | Run unit tests for utilities and core logic |
| `pnpm test:integration` | Run integration tests for complete flows |
| `pnpm test:components` | Run component tests with React Testing Library |
| `pnpm test:watch` | Run tests in watch mode for development |
| `pnpm test:coverage` | Generate coverage report |
| `pnpm test:verbose` | Run with detailed output |
| `pnpm test:ci` | Run tests optimized for CI environment |

## Test Categories

### 1. Unit Tests

**Location**: `src/**/*.test.ts`

Test individual functions, utilities, and core logic:

- CSRF token management
- Authentication API endpoints
- Form validation schemas
- Error handling utilities
- Token management

**Example**:
```typescript
// src/utils/__tests__/csrf.test.ts
describe('CSRF Utilities', () => {
  it('should fetch CSRF token successfully', async () => {
    // Test implementation
  });
});
```

### 2. Integration Tests

**Location**: `src/__tests__/integration/*.integration.test.tsx`

Test complete authentication flows:

- Login flow with CSRF protection
- Signup flow with validation
- Password reset flow
- Redux store integration
- API retry logic

**Example**:
```typescript
// src/__tests__/integration/authFlow.integration.test.tsx
describe('Auth Flow Integration Tests', () => {
  it('should complete successful login flow with CSRF protection', async () => {
    // Test complete login flow
  });
});
```

### 3. Component Tests

**Location**: `src/components/**/*.test.tsx`

Test React components with user interactions:

- Form rendering and validation
- User input handling
- Error state display
- Loading states
- Accessibility features

**Example**:
```typescript
// src/components/__tests__/LoginForm.test.tsx
describe('LoginForm Component', () => {
  it('should render login form with email and password fields', () => {
    // Test component rendering
  });
});
```

### 4. End-to-End Tests

**Location**: `apps/web/lego-moc-instructions-app/tests/auth/`

Test complete user journeys in a real browser:

- Full authentication flows
- CSRF protection in real environment
- Navigation between auth pages
- Error handling and recovery
- Cross-browser compatibility

## Test Configuration

### Vitest Configuration

The auth package uses Vitest for unit and integration testing:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup/testSetup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['**/*.test.ts', '**/*.test.tsx'],
    },
  },
});
```

### Test Setup

Common test utilities and mocks are provided in `src/__tests__/setup/testSetup.ts`:

- Mock Redux store creation
- Mock API responses
- CSRF utilities mocking
- Test data and fixtures
- Assertion helpers

## Testing Best Practices

### 1. Test Organization

- Group related tests in describe blocks
- Use descriptive test names that explain the expected behavior
- Follow the AAA pattern: Arrange, Act, Assert

### 2. Mocking Strategy

- Mock external dependencies (fetch, CSRF utilities)
- Use real Redux store for integration tests
- Mock navigation for component tests
- Provide realistic test data

### 3. Error Testing

- Test both success and failure scenarios
- Verify error messages are displayed correctly
- Test network failures and retries
- Validate form validation errors

### 4. Accessibility Testing

- Test keyboard navigation
- Verify ARIA labels and roles
- Test screen reader compatibility
- Validate focus management

## Coverage Requirements

The auth package maintains high test coverage:

- **Statements**: > 90%
- **Branches**: > 85%
- **Functions**: > 90%
- **Lines**: > 90%

### Viewing Coverage

```bash
# Generate coverage report
pnpm test:coverage

# Open HTML report
open coverage/index.html
```

## Continuous Integration

### GitHub Actions

Tests run automatically on:
- Pull requests
- Pushes to main branch
- Release branches

### CI Configuration

```yaml
# .github/workflows/test.yml
- name: Run Auth Package Tests
  run: |
    cd packages/auth
    pnpm test:ci
```

## Debugging Tests

### Common Issues

1. **Mock not working**: Ensure mocks are set up before imports
2. **Async test failures**: Use proper async/await patterns
3. **Component not rendering**: Check test environment setup
4. **CSRF test failures**: Verify mock CSRF utilities

### Debug Commands

```bash
# Run specific test file
pnpm test src/utils/__tests__/csrf.test.ts

# Run with debug output
pnpm test:verbose

# Run single test
pnpm test -t "should fetch CSRF token"
```

## Writing New Tests

### 1. Unit Test Template

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { functionToTest } from '../functionToTest';

describe('FunctionToTest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle success case', () => {
    // Arrange
    const input = 'test-input';
    
    // Act
    const result = functionToTest(input);
    
    // Assert
    expect(result).toBe('expected-output');
  });
});
```

### 2. Component Test Template

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { ComponentToTest } from '../ComponentToTest';
import { createTestStore } from '../../__tests__/setup/testSetup';

describe('ComponentToTest', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  it('should render correctly', () => {
    render(
      <Provider store={store}>
        <ComponentToTest />
      </Provider>
    );

    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
```

## Performance Testing

Monitor test performance and component rendering:

```typescript
import { performanceUtils } from '../__tests__/setup/testSetup';

it('should render quickly', async () => {
  const renderTime = await performanceUtils.measureRenderTime(() => {
    render(<LoginForm />);
  });
  
  performanceUtils.expectFastRender(renderTime, 100);
});
```

## Security Testing

Verify security features are working correctly:

- CSRF token inclusion in requests
- Proper error handling for security failures
- Input sanitization and validation
- Secure token storage and management

## Maintenance

### Regular Tasks

1. **Update test data**: Keep test fixtures current
2. **Review coverage**: Ensure new code is tested
3. **Update mocks**: Keep mocks in sync with real APIs
4. **Performance monitoring**: Watch for test performance regressions

### Dependencies

Keep testing dependencies up to date:
- Vitest
- Testing Library
- Playwright (for E2E tests)
- Mock service worker (if used)

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Documentation](https://testing-library.com/)
- [Playwright Documentation](https://playwright.dev/)
- [React Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
