# E2E Testing App

This app contains all end-to-end (E2E) tests for the monorepo using Playwright.

## Overview

All Playwright tests have been centralized in this dedicated e2e app to:

- Provide a single location for all E2E tests
- Simplify test organization and maintenance
- Enable better test isolation and configuration
- Support testing multiple apps from one location

## Directory Structure

```
apps/e2e/
├── tests/
│   ├── auth/           # Authentication flow tests
│   ├── navigation/     # Navigation and routing tests
│   ├── pages/          # Page-specific tests
│   ├── profile/        # Profile functionality tests
│   ├── fixtures/       # Test fixtures and data
│   └── helpers/        # Test utilities and helpers
├── playwright.config.ts
├── package.json
└── README.md
```

## Running Tests

### Prerequisites

- Ensure the web application is running on `http://localhost:3002`
- Database and backend services should be running

### Basic Commands

```bash
# Run all tests
pnpm test

# Run tests with UI
pnpm test:ui

# Run tests in headed mode (see browser)
pnpm test:headed

# Run tests in debug mode
pnpm test:debug
```

### Test Categories

```bash
# Authentication tests
pnpm test:auth

# Navigation tests
pnpm test:navigation

# Page tests
pnpm test:pages

# Profile tests
pnpm test:profile
```

### Specific Auth Tests

```bash
# Complete auth flow
pnpm test:auth:signin

# Profile routing
pnpm test:auth:profile

# Password reset
pnpm test:auth:password-reset

# Session management
pnpm test:auth:session

# Security tests
pnpm test:auth:security

# Role-based access control
pnpm test:auth:rbac

# Email verification
pnpm test:auth:email

# Accessibility and mobile
pnpm test:auth:accessibility

# Performance tests
pnpm test:auth:performance

# Privacy compliance
pnpm test:auth:privacy
```

## Configuration

The Playwright configuration is optimized for:

- Sequential test execution (workers: 1)
- Comprehensive error reporting
- Screenshot and video capture on failures
- Automatic web server startup

## Test Organization

Tests are organized by functionality:

- **auth/**: Complete authentication workflows
- **navigation/**: App navigation and routing
- **pages/**: Page-specific functionality
- **profile/**: User profile features

## Development

When adding new tests:

1. Place them in the appropriate category directory
2. Follow existing naming conventions (\*.spec.ts)
3. Use the shared utilities in helpers/
4. Add appropriate test data to fixtures/

## Integration

This e2e app integrates with:

- The main web application at `apps/web/lego-moc-instructions-app`
- Backend services for authentication and data
- The monorepo's turbo configuration for coordinated testing
