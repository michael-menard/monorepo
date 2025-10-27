# ProfilePage Test Suite

This directory contains a comprehensive test suite for the ProfilePage component, covering all aspects of functionality, user experience, performance, security, and accessibility.

## Test Structure

### Unit Tests (`ProfilePage.unit.test.tsx`)

- **Purpose**: Test individual component functionality in isolation
- **Coverage**: Component rendering, state management, event handling, form validation
- **Dependencies**: Mocked external dependencies
- **Execution**: Fast, focused on specific functionality

### UX Tests (`ProfilePage.ux.test.tsx`)

- **Purpose**: Test user experience and interaction patterns
- **Coverage**: Visual design, user interactions, responsive design, form experience
- **Dependencies**: Realistic component behavior simulation
- **Execution**: Medium speed, focused on user experience

### Performance Tests (`ProfilePage.performance.test.tsx`)

- **Purpose**: Test component performance and efficiency
- **Coverage**: Render performance, memory usage, interaction performance, load times
- **Dependencies**: Performance measurement utilities
- **Execution**: Variable speed, includes performance metrics

### Security Tests (`ProfilePage.security.test.tsx`)

- **Purpose**: Test security vulnerabilities and data protection
- **Coverage**: XSS prevention, input validation, file upload security, CSRF protection
- **Dependencies**: Security testing scenarios
- **Execution**: Medium speed, focused on security aspects

### Accessibility Tests (`ProfilePage.accessibility.test.tsx`)

- **Purpose**: Test accessibility compliance and screen reader support
- **Coverage**: WCAG compliance, ARIA labels, keyboard navigation, screen reader support
- **Dependencies**: jest-axe for accessibility testing
- **Execution**: Medium speed, focused on accessibility

### E2E Tests (`profile-page.spec.ts`)

- **Purpose**: Test complete user workflows in a real browser environment
- **Coverage**: Full user journeys, API integration, cross-browser compatibility
- **Dependencies**: Playwright, real browser environment
- **Execution**: Slower, comprehensive end-to-end testing

## Test Scenarios Covered

### 1. New User Profile Creation

- Empty profile form display
- Profile creation with valid data
- Form validation for required fields
- Email and URL format validation
- Error handling during creation

### 2. Existing Profile Data Loading

- Profile data retrieval and display
- Edit form population with existing data
- Loading error handling
- Network timeout handling
- Data refresh and synchronization

### 3. Profile Editing

- Edit modal functionality
- Form field updates
- Save and cancel operations
- Form validation during editing
- Error handling during updates

### 4. Avatar Upload

- Image file upload functionality
- File type validation
- File size validation
- Upload progress indication
- Error handling for upload failures

### 5. Social Links Management

- Social link display
- Social link editing
- URL validation for social links
- Social link removal

### 6. Profile Preferences

- Preference display
- Preference updates
- Theme selection
- Notification settings
- Privacy settings

### 7. Security Features

- Password change functionality
- Account deletion with confirmation
- Session management
- Authentication validation

### 8. Navigation and Layout

- Responsive design testing
- Keyboard navigation
- Screen reader compatibility
- Cross-browser compatibility

## Running the Tests

### Prerequisites

```bash
# Install dependencies
pnpm install

# Install testing dependencies
pnpm add -D @testing-library/user-event jest-axe
```

### Running Unit Tests

```bash
# Run all unit tests
pnpm test ProfilePage.unit.test.tsx

# Run with coverage
pnpm test ProfilePage.unit.test.tsx --coverage

# Run in watch mode
pnpm test ProfilePage.unit.test.tsx --watch
```

### Running UX Tests

```bash
# Run UX tests
pnpm test ProfilePage.ux.test.tsx

# Run with verbose output
pnpm test ProfilePage.ux.test.tsx --verbose
```

### Running Performance Tests

```bash
# Run performance tests
pnpm test ProfilePage.performance.test.tsx

# Run with performance metrics
pnpm test ProfilePage.performance.test.tsx --reporter=verbose
```

### Running Security Tests

```bash
# Run security tests
pnpm test ProfilePage.security.test.tsx

# Run with security reporting
pnpm test ProfilePage.security.test.tsx --reporter=verbose
```

### Running Accessibility Tests

```bash
# Run accessibility tests
pnpm test ProfilePage.accessibility.test.tsx

# Run with accessibility reporting
pnpm test ProfilePage.accessibility.test.tsx --reporter=verbose
```

### Running E2E Tests

```bash
# Run all E2E tests
pnpm test:e2e profile-page.spec.ts

# Run specific test scenarios
pnpm test:e2e profile-page.spec.ts --grep "New User Profile Creation"

# Run with headed browser
pnpm test:e2e profile-page.spec.ts --headed

# Run with specific browser
pnpm test:e2e profile-page.spec.ts --project=chromium
```

### Running All Tests

```bash
# Run all test types
pnpm test:all

# Run with parallel execution
pnpm test:all --maxWorkers=4
```

## Test Configuration

### Unit Test Configuration

- **Framework**: Vitest
- **Testing Library**: React Testing Library
- **Mocking**: Vi (Vitest mocking)
- **Coverage**: V8 coverage provider

### E2E Test Configuration

- **Framework**: Playwright
- **Browsers**: Chromium, Firefox, WebKit
- **Timeout**: 15 seconds per test
- **Retries**: 0 (fail fast for debugging)

### Performance Test Configuration

- **Metrics**: Render time, memory usage, interaction time
- **Thresholds**: Configurable performance limits
- **Reporting**: Console and file output

### Security Test Configuration

- **Vulnerabilities**: XSS, CSRF, injection attacks
- **Validation**: Input sanitization, file upload security
- **Reporting**: Security violation detection

### Accessibility Test Configuration

- **Framework**: jest-axe
- **Standards**: WCAG 2.1 AA
- **Reporting**: Accessibility violation detection

## Test Data and Fixtures

### Mock Data

- Profile data for different scenarios
- API response mocks
- Error condition simulations
- Network condition simulations

### Test Files

- `tests/fixtures/test-avatar.jpg` - Valid avatar image
- `tests/fixtures/invalid-file.txt` - Invalid file type
- `tests/fixtures/large-image.jpg` - Oversized image file

### Environment Setup

- Test environment variables
- Mock service workers
- Database fixtures
- API endpoint mocks

## Continuous Integration

### GitHub Actions

```yaml
name: ProfilePage Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: pnpm install
      - run: pnpm test:all
      - run: pnpm test:e2e
```

### Pre-commit Hooks

```bash
# Run tests before commit
pnpm test:unit
pnpm test:accessibility
pnpm lint
```

## Debugging Tests

### Unit Test Debugging

```bash
# Run with debug output
pnpm test ProfilePage.unit.test.tsx --verbose

# Run specific test
pnpm test ProfilePage.unit.test.tsx --grep "should render profile"

# Run with coverage
pnpm test ProfilePage.unit.test.tsx --coverage
```

### E2E Test Debugging

```bash
# Run with headed browser
pnpm test:e2e profile-page.spec.ts --headed

# Run with slow motion
pnpm test:e2e profile-page.spec.ts --headed --slowmo=1000

# Run with trace
pnpm test:e2e profile-page.spec.ts --trace=on
```

### Performance Test Debugging

```bash
# Run with detailed metrics
pnpm test ProfilePage.performance.test.tsx --reporter=verbose

# Run with memory profiling
pnpm test ProfilePage.performance.test.tsx --inspect
```

## Best Practices

### Test Organization

- Group related tests in describe blocks
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Keep tests independent and isolated

### Mocking Strategy

- Mock external dependencies
- Use realistic mock data
- Avoid over-mocking
- Test integration points

### Performance Testing

- Set realistic performance thresholds
- Test under different conditions
- Monitor memory usage
- Test with large datasets

### Security Testing

- Test all input validation
- Verify XSS prevention
- Test file upload security
- Validate authentication

### Accessibility Testing

- Test with screen readers
- Verify keyboard navigation
- Check color contrast
- Validate ARIA attributes

## Troubleshooting

### Common Issues

#### Tests Failing Due to Timing

```bash
# Increase timeout
pnpm test --timeout=10000

# Use waitFor for async operations
await waitFor(() => {
  expect(element).toBeInTheDocument();
});
```

#### Mock Issues

```bash
# Clear mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});

# Reset modules
vi.resetModules();
```

#### E2E Test Failures

```bash
# Check browser compatibility
pnpm test:e2e --project=chromium

# Run with debug mode
pnpm test:e2e --debug

# Check network conditions
pnpm test:e2e --slowmo=1000
```

#### Performance Test Failures

```bash
# Adjust performance thresholds
# Update test expectations for slower environments
# Check for memory leaks
```

## Contributing

### Adding New Tests

1. Identify the test type (unit, UX, performance, security, accessibility, E2E)
2. Create test file following naming convention
3. Write tests following established patterns
4. Add test documentation
5. Update this README if needed

### Test Maintenance

- Keep tests up to date with component changes
- Review and update test data regularly
- Monitor test performance and reliability
- Update dependencies as needed

### Code Review

- Ensure all new features have corresponding tests
- Verify test coverage is adequate
- Check that tests are maintainable
- Validate test performance impact

## Resources

### Documentation

- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Vitest](https://vitest.dev/)
- [Playwright](https://playwright.dev/)
- [jest-axe](https://github.com/nickcolley/jest-axe)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

### Tools

- [Testing Library](https://testing-library.com/)
- [User Event](https://testing-library.com/docs/user-event/intro/)
- [jest-axe](https://github.com/nickcolley/jest-axe)
- [Playwright](https://playwright.dev/)
- [Vitest](https://vitest.dev/)

### Examples

- [React Testing Examples](https://github.com/testing-library/react-testing-library#examples)
- [Playwright Examples](https://github.com/microsoft/playwright/tree/main/examples)
- [Accessibility Testing Examples](https://github.com/nickcolley/jest-axe#examples)
