# ResetPasswordPage Test Suite

This directory contains a comprehensive test suite for the ResetPasswordPage component, covering unit tests, UX tests, performance tests, security tests, and end-to-end tests.

## Test Files Overview

### 1. Unit Tests (`ResetPasswordPage.test.tsx`)

**Purpose**: Test individual component functionality, API integration, form validation, and error handling.

**Coverage**:

- API integration tests (success, failure, network errors)
- Form validation (password length, confirmation matching)
- Error handling and recovery
- Success state management
- Token extraction from URL

**Key Features**:

- Uses MSW for API mocking
- Tests all error scenarios
- Validates form state transitions
- Tests loading states and user feedback

### 2. UX Tests (`ResetPasswordPage.ux.test.tsx`)

**Purpose**: Test user experience, accessibility, and interaction patterns.

**Coverage**:

- Accessibility (ARIA labels, keyboard navigation, screen reader support)
- User interactions (typing, form submission, error recovery)
- Visual feedback (loading states, error states, success states)
- Responsive design
- Error recovery scenarios
- Performance UX (immediate feedback, slow network handling)

**Key Features**:

- Comprehensive accessibility testing
- Real user interaction patterns
- Visual state validation
- Mobile responsiveness testing

### 3. Performance Tests (`ResetPasswordPage.performance.test.tsx`)

**Purpose**: Test component performance, memory usage, and optimization.

**Coverage**:

- Render performance (initial render, re-renders, consistency)
- Memory usage and leak detection
- Interaction performance (typing, form submission)
- Network performance (slow responses, error handling)
- Animation performance
- Bundle size impact
- Stress testing

**Key Features**:

- Performance measurement utilities
- Memory leak detection
- Stress testing scenarios
- Performance benchmarking

### 4. Security Tests (`ResetPasswordPage.security.test.tsx`)

**Purpose**: Test security vulnerabilities and attack prevention.

**Coverage**:

- XSS prevention (input sanitization, HTML escaping)
- Input validation security (SQL injection, NoSQL injection, command injection)
- Token security (malformed tokens, path traversal)
- CSRF protection
- Information disclosure prevention
- Session security
- Content Security Policy compliance
- Authentication bypass prevention

**Key Features**:

- Comprehensive security vulnerability testing
- Attack vector simulation
- Security best practices validation

### 5. E2E Tests (`ResetPasswordPage.e2e.test.ts`)

**Purpose**: Test complete user journeys in real browser environments.

**Coverage**:

- Complete password reset flow
- Form validation in browser
- Accessibility in real browsers
- Mobile responsiveness
- Cross-browser compatibility
- Error recovery scenarios
- Performance in real environments
- Security in browser context
- Navigation and routing
- Token handling

**Key Features**:

- Real browser testing with Playwright
- Cross-browser compatibility testing
- Mobile device simulation
- Network condition simulation

## Setup and Configuration

### Prerequisites

- Node.js and pnpm
- Vitest for unit/UX/performance/security tests
- Playwright for E2E tests
- MSW for API mocking

### Test Configuration

The tests use the following configuration:

```typescript
const testConfig = {
  baseUrl: 'http://localhost:5173', // Vite dev server
  authServiceUrl: 'http://localhost:9000', // Auth service
  testUsers: {
    valid: {
      email: 'test-e2e@example.com',
      password: 'TestPassword123!',
    },
  },
}
```

### Environment Setup

1. **Unit/UX/Performance/Security Tests**: No additional setup required
2. **E2E Tests**: Requires running the development server and auth service

## Running Tests

### Unit, UX, Performance, and Security Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test ResetPasswordPage.test.tsx
pnpm test ResetPasswordPage.ux.test.tsx
pnpm test ResetPasswordPage.performance.test.tsx
pnpm test ResetPasswordPage.security.test.tsx

# Run with coverage
pnpm test --coverage
```

### E2E Tests

```bash
# Start development servers first
pnpm dev

# Run E2E tests
pnpm test:e2e ResetPasswordPage.e2e.test.ts

# Run with specific browser
pnpm test:e2e --project=chromium ResetPasswordPage.e2e.test.ts
```

## Test Patterns and Best Practices

### 1. Component Testing Patterns

- **Setup/Teardown**: Each test file has proper setup and cleanup
- **Mocking**: Comprehensive mocking of external dependencies
- **User Interactions**: Realistic user interaction simulation
- **State Management**: Testing all component states

### 2. API Testing Patterns

- **MSW Integration**: Mock Service Worker for API simulation
- **Error Scenarios**: All possible API error states
- **Loading States**: Proper loading state management
- **Success/Failure**: Complete success and failure flows

### 3. Accessibility Testing Patterns

- **ARIA Compliance**: Proper ARIA labels and roles
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader Support**: Screen reader compatibility
- **Focus Management**: Proper focus handling

### 4. Security Testing Patterns

- **Input Validation**: Comprehensive input sanitization
- **XSS Prevention**: Script injection prevention
- **Token Security**: Secure token handling
- **Information Disclosure**: Sensitive data protection

### 5. Performance Testing Patterns

- **Measurement**: Performance benchmarking
- **Memory Management**: Memory leak detection
- **Stress Testing**: High-load scenarios
- **Optimization**: Performance optimization validation

## Test Data and Fixtures

### Valid Test Data

```typescript
const validPassword = 'TestPassword123!'
const validToken = 'valid-token-123'
```

### Invalid Test Data

```typescript
const invalidPasswords = [
  'short', // Too short
  'DifferentPassword123!', // Mismatch
  '<script>alert("xss")</script>', // XSS attempt
  "'; DROP TABLE users; --", // SQL injection
  '{"$gt": ""}', // NoSQL injection
  '$(rm -rf /)', // Command injection
]
```

## Common Test Scenarios

### 1. Happy Path

1. User enters valid password and confirmation
2. Form submits successfully
3. Success state is displayed
4. User can navigate to login

### 2. Validation Errors

1. User enters invalid password (too short)
2. Validation error is displayed
3. User corrects the error
4. Form submits successfully

### 3. API Errors

1. User submits form with invalid token
2. API returns error
3. Error message is displayed
4. User can retry

### 4. Network Issues

1. Network connection fails
2. Loading state is shown
3. Error message is displayed
4. User can retry

### 5. Security Attacks

1. Malicious input is entered
2. Input is properly sanitized
3. No security vulnerabilities are exploited
4. Application remains secure

## Performance Benchmarks

### Expected Performance Metrics

- **Initial Render**: < 100ms
- **Re-renders**: < 10ms
- **Form Submission**: < 2000ms
- **Memory Usage**: < 1MB increase
- **Page Load**: < 3000ms

### Performance Testing Tools

- `performance.now()` for timing measurements
- `performance.memory` for memory usage
- Custom performance measurement utilities

## Security Testing Checklist

### Input Validation

- [ ] SQL injection prevention
- [ ] NoSQL injection prevention
- [ ] Command injection prevention
- [ ] XSS prevention
- [ ] Path traversal prevention
- [ ] Null byte injection prevention

### Token Security

- [ ] Valid token validation
- [ ] Expired token handling
- [ ] Malformed token handling
- [ ] Token length limits
- [ ] Token format validation

### Information Disclosure

- [ ] No sensitive data in error messages
- [ ] No internal paths exposed
- [ ] No stack traces exposed
- [ ] No sensitive data in DOM
- [ ] No sensitive data in storage

## Maintenance and Updates

### Adding New Tests

1. Follow existing test patterns
2. Add appropriate test categories
3. Update documentation
4. Ensure proper coverage

### Updating Tests

1. Update test data when component changes
2. Maintain test isolation
3. Keep tests focused and specific
4. Regular performance benchmark updates

### Test Maintenance

1. Regular test execution
2. Performance monitoring
3. Security vulnerability updates
4. Documentation updates

## Troubleshooting

### Common Issues

1. **MSW Not Working**: Check server setup and handlers
2. **Performance Tests Failing**: Check system resources and timing
3. **E2E Tests Failing**: Ensure dev servers are running
4. **Security Tests Failing**: Check component security implementation

### Debug Tips

1. Use `console.log` for debugging (tests will capture output)
2. Check test isolation (each test should be independent)
3. Verify mock setup and teardown
4. Check browser console for E2E test issues

## Contributing

When adding new tests:

1. Follow existing patterns and conventions
2. Add comprehensive documentation
3. Ensure proper test isolation
4. Include both positive and negative test cases
5. Update this README with new test information
