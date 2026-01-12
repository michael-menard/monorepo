# Testing Strategy

## Overview

This document describes the testing strategy across the monorepo: unit, integration, and end-to-end tests.

## Goals

- Fast feedback on regressions
- High confidence in core flows
- Clear separation between test types

## Tooling

- **Vitest** — unit and integration tests
- **React Testing Library** — testing React components
- **Playwright** — end-to-end browser tests
- **MSW (Mock Service Worker)** — mocking HTTP requests in unit/integration tests

## Unit & Integration Tests

- Located alongside source files in `__tests__` directories
- Use Vitest for test runner and assertions
- Use MSW to mock external HTTP calls where needed

### Conventions

- BDD-style test names that read like user flows
- Prefer `it.each` for covering multiple input/output cases
- Use semantic queries (`getByRole`, `getByLabelText`) for DOM interaction

## End-to-End Tests

- Implemented with Playwright under `apps/web/playwright`
- Target real or fully integrated services — avoid mocks in E2E

### Scenarios

- Focus on core user journeys (sign-in, key flows, critical actions)
- Keep E2E suite lean but representative

## Coverage

- Minimum global coverage target: 45%
- Aim for thorough coverage on core logic and edge cases

## Best Practices

- Keep tests deterministic and isolated
- Prefer testing behavior over implementation details
- Add tests with every significant feature or bugfix
