# Playwright Test Suite for Lego MOC Instructions App

This directory contains comprehensive end-to-end tests for all pages in the Lego MOC Instructions application using Playwright.

## Test Structure

### Page-Specific Test Files

- **`home-page.spec.ts`** - Tests for the home page including navigation, hero section, and featured content
- **`moc-gallery.spec.ts`** - Tests for the MOC gallery page including filtering, searching, and pagination
- **`moc-detail.spec.ts`** - Tests for individual MOC detail pages including instructions, wishlist functionality, and sharing
- **`wishlist-gallery.spec.ts`** - Tests for the wishlist page including item management and bulk operations
- **`inspiration-gallery.spec.ts`** - Tests for the inspiration gallery including content browsing and interaction
- **`error-pages.spec.ts`** - Tests for error pages including 404, unauthorized, and server errors
- **`cache-demo.spec.ts`** - Tests for the cache demonstration page including performance metrics and configuration

### Comprehensive Test Runner

- **`index.spec.ts`** - Main test runner that imports all page tests and includes cross-page navigation, performance, and accessibility tests

## Test Categories

### 1. Page Loading and Navigation
- Page load success
- URL validation
- Navigation between pages
- Browser back/forward functionality
- Direct URL access

### 2. User Interface Elements
- Header and navigation components
- Page titles and content
- Responsive design across viewports
- Loading states and indicators
- Error states and messages

### 3. User Interactions
- Form submissions and validation
- Button clicks and state changes
- Search functionality
- Filtering and sorting
- Pagination controls

### 4. Authentication and Authorization
- Login/logout flows
- Protected route access
- Authentication state persistence
- Unauthorized access handling

### 5. Data Management
- CRUD operations
- Wishlist management
- Favorites and likes
- Comments and reviews
- File uploads

### 6. Performance and Caching
- Page load times
- Cache hit/miss scenarios
- API response times
- Concurrent user simulation

### 7. Accessibility
- Keyboard navigation
- Screen reader compatibility
- Focus management
- Alt text for images
- Heading structure

### 8. Error Handling
- Network errors
- API failures
- Form validation errors
- 404 and other HTTP errors

## Running the Tests

### Prerequisites
- Node.js and pnpm installed
- Application running on `http://localhost:3001`
- Database and backend services running

### Run All Page Tests
```bash
# From monorepo root
pnpm test:e2e:pages

# From playwright app directory
cd apps/web/playwright
pnpm test:pages
```

### Run Specific Page Tests
```bash
# From playwright app directory
cd apps/web/playwright

# Run only home page tests
pnpm test tests/pages/app-pages-native.spec.ts

# Run only specific page tests
pnpm test tests/pages/ --grep "homepage"

# Run only error page tests
pnpm test tests/pages/ --grep "error"
```

### Run Tests with UI
```bash
cd apps/web/playwright
pnpm test:ui
```

### Run Tests in Debug Mode
```bash
cd apps/e2e
pnpm test:debug
```

## Test Configuration

The tests use the following configuration from `playwright.config.ts`:

- **Base URL**: `http://localhost:3001`
- **Browser**: Chromium only
- **Timeout**: 15 seconds maximum (as per user preference)
- **Retries**: 0 (fail fast for debugging)
- **Workers**: 1 (sequential execution)
- **Headless**: true by default
- **Screenshots**: Only on failure
- **Videos**: Retained on failure
- **Traces**: On first retry

## Test Data and Mocking

### Test Users
```typescript
const testUser = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User',
  confirmPassword: 'TestPassword123!',
};
```

### Mock Data
- MOC items with various categories and difficulties
- User profiles and preferences
- Wishlist items
- Inspiration content
- Error scenarios

## Test Selectors Strategy

The tests use a flexible selector strategy that prioritizes:

1. **Data test IDs** (`data-testid`) - Most reliable
2. **Semantic selectors** (text content, ARIA labels)
3. **CSS classes** (as fallback)
4. **Element types** (as last resort)

### Example Selectors
```typescript
// Preferred: data-testid
await page.locator('[data-testid="moc-card"]').click();

// Fallback: text content
await page.locator('text=Sign In').click();

// Fallback: CSS classes
await page.locator('[class*="card"]').click();

// Last resort: element types
await page.locator('button[type="submit"]').click();
```

## Responsive Testing

All page tests include responsive design validation across three viewport sizes:

- **Mobile**: 375x667px
- **Tablet**: 768x1024px  
- **Desktop**: 1920x1080px

## Performance Testing

The test suite includes performance validation:

- Page load times under 5 seconds
- Concurrent user simulation
- Cache performance measurement
- API response time monitoring

## Accessibility Testing

Comprehensive accessibility testing includes:

- Keyboard navigation (Tab, Arrow keys)
- Focus management
- Screen reader compatibility
- Alt text validation
- Heading structure verification
- Color contrast (where applicable)

## Error Scenarios

The tests cover various error conditions:

- **Network errors**: Offline scenarios, API failures
- **Authentication errors**: Expired tokens, unauthorized access
- **Form validation**: Invalid inputs, required fields
- **HTTP errors**: 404, 500, 401, 403
- **Data errors**: Missing content, empty states

## Continuous Integration

The test suite is designed to run in CI/CD pipelines:

- **Parallel execution**: Tests can run in parallel when configured
- **Artifact collection**: Screenshots, videos, and traces on failure
- **Fast feedback**: Failures are reported immediately
- **Reliable**: Tests are deterministic and repeatable

## Maintenance

### Adding New Tests
1. Create a new `.spec.ts` file in the appropriate directory
2. Follow the existing naming conventions
3. Use the established selector strategy
4. Include responsive and accessibility tests
5. Add to the main test runner if needed

### Updating Existing Tests
1. Maintain backward compatibility
2. Update selectors if UI changes
3. Add new test cases for new features
4. Remove obsolete tests

### Test Data Management
1. Use consistent test data across tests
2. Clean up test data after tests
3. Use unique identifiers to avoid conflicts
4. Mock external dependencies appropriately

## Troubleshooting

### Common Issues

1. **Tests failing due to timing**: Increase timeouts or add explicit waits
2. **Selector not found**: Check if UI has changed and update selectors
3. **Authentication issues**: Ensure test user exists and credentials are correct
4. **Network errors**: Verify backend services are running

### Debug Tips

1. **Use `test:debug`**: Run tests with UI for step-by-step debugging
2. **Check screenshots**: Review failure screenshots for visual issues
3. **Enable traces**: Use `trace: 'on'` in config for detailed execution logs
4. **Add logging**: Use `console.log()` for debugging test flow

## Best Practices

1. **Test isolation**: Each test should be independent
2. **Descriptive names**: Use clear, descriptive test names
3. **Page Object Model**: Consider using POM for complex pages
4. **Data-driven tests**: Use test data arrays for similar scenarios
5. **Error handling**: Always test error scenarios
6. **Performance**: Monitor test execution time
7. **Maintainability**: Keep tests simple and readable

## Contributing

When contributing to the test suite:

1. Follow the existing patterns and conventions
2. Add tests for new features
3. Update tests when UI changes
4. Ensure all tests pass before submitting
5. Add documentation for new test patterns
6. Consider the impact on CI/CD pipeline performance 