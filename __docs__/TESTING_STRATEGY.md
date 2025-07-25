# Testing Strategy

## Overview

This project uses a layered testing approach to ensure reliability and maintainability.

## Types of Tests
- **Unit Tests:** Test individual functions/components in isolation
- **Integration Tests:** Test interactions between modules (e.g., API + DB)
- **End-to-End (E2E) Tests:** Test user flows through the entire stack

## Tools
- **Backend:** Jest (API), Vitest (general)
- **Frontend:** Vitest, React Testing Library
- **Coverage:** Aim for 80%+ coverage on critical modules

## How to Run Tests
```sh
pnpm test:run
```

## Adding New Tests
- Place tests in `__tests__` directories near the code they test
- Mock external dependencies
- Cover edge cases and error handling

## Continuous Integration
- All PRs must pass tests and coverage checks before merging 