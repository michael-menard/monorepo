# Playwright Testing Guide

This document describes how to run Playwright tests in the monorepo using the custom test runner script.

## Quick Start

### Run All Tests
```bash
pnpm playwright
```

### Run Tests with Filters
```bash
# Run only auth flow tests
pnpm playwright --grep "Auth Flow"

# Run only login tests
pnpm playwright --grep "Login"

# Run only signup tests
pnpm playwright --grep "Signup"
```

### Run Tests in Different Modes
```bash
# Run tests in headed mode (see browser) - tests run headless by default
pnpm playwright --headed

# Run tests in debug mode
pnpm playwright --debug

# Run tests with Playwright UI
pnpm playwright --ui
```

## Available Scripts

### Root Level Scripts (package.json)
- `pnpm test:e2e` - Run all e2e tests via turbo
- `pnpm test:e2e:all` - Run all Playwright tests for the lego app
- `pnpm test:e2e:auth` - Run auth flow tests
- `pnpm test:e2e:login` - Run login tests
- `pnpm test:e2e:signup` - Run signup tests
- `pnpm test:e2e:headed` - Run tests in headed mode
- `pnpm test:e2e:debug` - Run tests in debug mode
- `pnpm test:e2e:ui` - Run tests with Playwright UI
- `pnpm playwright` - Use the custom test runner script

### Custom Test Runner Script
The `scripts/run-playwright.js` script provides flexible options for running Playwright tests.

## Custom Test Runner Options

### Basic Usage
```bash
node scripts/run-playwright.js [options]
```

### Available Options

| Option | Description | Example |
|--------|-------------|---------|
| `--app <app-name>` | Run tests for specific app (default: lego-moc-instructions-app) | `--app my-app` |
| `--grep <pattern>` | Filter tests by pattern | `--grep "Auth Flow"` |
| `--headed` | Run tests in headed mode | `--headed` |
| `--debug` | Run tests in debug mode | `--debug` |
| `--ui` | Run tests with Playwright UI | `--ui` |
| `--browser <browser>` | Run tests in specific browser (chromium, firefox, webkit) | `--browser chromium` |
| `--workers <number>` | Number of workers (default: 1) | `--workers 4` |
| `--timeout <ms>` | Test timeout in milliseconds | `--timeout 10000` |
| `--retries <number>` | Number of retries for failed tests | `--retries 2` |
| `--project <project>` | Run specific project configuration | `--project mobile` |
| `--list` | List all available tests | `--list` |
| `--help` | Show help message | `--help` |

### Examples

```bash
# Run auth flow tests in headed mode with Chrome
node scripts/run-playwright.js --grep "Auth Flow" --headed --browser chromium

# Run all tests with 4 workers and 10 second timeout
node scripts/run-playwright.js --workers 4 --timeout 10000

# List all available tests
node scripts/run-playwright.js --list

# Run tests with Playwright UI
node scripts/run-playwright.js --ui

# Run tests in debug mode
node scripts/run-playwright.js --debug

# Run tests with retries
node scripts/run-playwright.js --retries 3
```

## Test Structure

### Test Files Location
```
apps/web/lego-moc-instructions-app/tests/
├── auth/
│   ├── auth-flow.spec.ts
│   ├── auth-flow-simple.spec.ts
│   └── utils.ts
└── README.md
```

### Test Categories
- **Auth Flow Tests**: Complete authentication workflows
- **Login Tests**: Login-specific functionality
- **Signup Tests**: Registration functionality
- **Navigation Tests**: Page navigation and routing

## Configuration

### Playwright Config
Located at: `apps/web/lego-moc-instructions-app/playwright.config.ts`

Key settings:
- Test timeout: 30 seconds
- Retries: 0 (configurable via command line)
- Workers: 1 (configurable via command line)
- Headless: true (tests run headless by default)
- Browsers: Chromium, Mobile Chrome

### Environment Setup
The tests run against the development server on port 3000. Make sure the app is running:

```bash
# Start the development server
pnpm dev

# In another terminal, run tests
pnpm playwright
```

## Troubleshooting

### Common Issues

1. **Tests fail with import errors**
   - Ensure all dependencies are installed: `pnpm install`
   - Check that the app builds successfully: `pnpm build`

2. **Tests timeout**
   - Increase timeout: `--timeout 60000`
   - Check if the dev server is running on port 3000

3. **Browser not found**
   - Install Playwright browsers: `npx playwright install`

4. **Permission denied on script**
   - Make script executable: `chmod +x scripts/run-playwright.js`

### Debug Mode
Use debug mode to step through tests:
```bash
pnpm playwright --debug
```

This will:
- Run tests in headed mode
- Pause execution on failures
- Allow manual inspection

### UI Mode
Use Playwright UI for interactive testing:
```bash
pnpm playwright --ui
```

This opens a web interface where you can:
- View test results
- Re-run failed tests
- Debug test execution
- View screenshots and videos

## Best Practices

1. **Use descriptive test names** that clearly indicate what is being tested
2. **Group related tests** using test.describe() blocks
3. **Use page object model** for better test maintainability
4. **Add proper assertions** to verify expected behavior
5. **Use test fixtures** for common setup and teardown
6. **Keep tests independent** - each test should be able to run in isolation

## Continuous Integration

The Playwright tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Playwright Tests
  run: |
    pnpm install
    pnpm playwright --workers 4
```

## Performance Tips

1. **Use multiple workers** for faster execution: `--workers 4`
2. **Run tests in parallel** when possible
3. **Use headless mode** for CI environments
4. **Optimize test data** to minimize setup time
5. **Use test sharding** for large test suites 