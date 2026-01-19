# Story 0.2.2: Playwright Tests - Reset Password Flow

## GitHub Issue
- Issue: #329
- URL: https://github.com/michael-menard/monorepo/issues/329
- Status: Todo

## Status

Approved

## Parent Story

- **0.2.0**: Auth E2E Test Suite - Validation & Completion

## Story

**As a** QA engineer,
**I want** comprehensive Playwright tests for the reset password flow,
**so that** we can ensure users can successfully reset their password with a verification code.

## Acceptance Criteria

1. ✅ Feature file created at `apps/web/playwright/features/auth/reset-password.feature`
2. ✅ UI element scenarios verify all form components are present
3. ✅ Validation scenarios test verification code and password validation
4. ✅ Password strength scenarios test password requirements
5. ✅ Happy path scenario tests successful password reset
6. ✅ Error handling scenarios test invalid codes and expired codes
7. ✅ Step definitions implemented for all scenarios
8. ✅ Tests pass in CI/CD pipeline

## Tasks / Subtasks

- [ ] **Task 1: Create Reset Password Feature File** (AC: 1)
  - [ ] Create `apps/web/playwright/features/auth/reset-password.feature`
  - [ ] Add feature description and background
  - [ ] Follow existing auth feature file patterns

- [ ] **Task 2: Write UI Element Scenarios** (AC: 2)
  - [ ] Scenario: Reset password page displays all required elements
  - [ ] Verify page title/heading
  - [ ] Verify verification code input field
  - [ ] Verify new password input field
  - [ ] Verify confirm password input field
  - [ ] Verify submit button
  - [ ] Verify password visibility toggles

- [ ] **Task 3: Write Validation Scenarios** (AC: 3)
  - [ ] Scenario: Form validation with empty fields
  - [ ] Scenario: Form validation with invalid verification code format
  - [ ] Scenario: Password mismatch validation
  - [ ] Scenario: Submit button disabled with invalid input

- [ ] **Task 4: Write Password Strength Scenarios** (AC: 4)
  - [ ] Scenario: Password must meet minimum length requirement
  - [ ] Scenario: Password must contain required character types
  - [ ] Scenario: Weak password rejected
  - [ ] Scenario: Strong password accepted

- [ ] **Task 5: Write Happy Path Scenarios** (AC: 5)
  - [ ] Scenario: Successful password reset with valid code and password
  - [ ] Verify success message displayed
  - [ ] Verify redirect to login page
  - [ ] Verify user can login with new password

- [ ] **Task 6: Write Error Handling Scenarios** (AC: 6)
  - [ ] Scenario: Invalid verification code shows error
  - [ ] Scenario: Expired verification code shows error
  - [ ] Scenario: Error message displayed appropriately

- [ ] **Task 7: Implement Step Definitions** (AC: 7)
  - [ ] Create or update step definition file in `apps/web/playwright/steps/`
  - [ ] Implement steps for reset password page interactions
  - [ ] Reuse common steps where applicable

- [ ] **Task 8: Verify Tests Pass** (AC: 8)
  - [ ] Run tests locally
  - [ ] Verify all scenarios pass
  - [ ] Ensure tests run in CI/CD pipeline

## Dev Notes

### Existing Auth Test Patterns

Reference these existing feature files for consistent patterns:
- `apps/web/playwright/features/auth/login.feature` - Password field patterns
- `apps/web/playwright/features/auth/signup.feature` - Password validation, visibility toggle patterns
- `apps/web/playwright/features/auth/email-verification.feature` - Verification code input patterns

### Step Definitions Location

Step definitions are located in:
- `apps/web/playwright/steps/` - Common and auth-specific steps
- Reuse existing steps from `common.steps.ts`, `signup.steps.ts`, `email-verification.steps.ts`

### Testing Standards

**Test File Location:**
- Feature file: `apps/web/playwright/features/auth/reset-password.feature`
- Step definitions: `apps/web/playwright/steps/reset-password.steps.ts` (if new steps needed)

**Test Standards:**
- Use Gherkin syntax (Given/When/Then)
- Tag scenarios appropriately: `@auth`, `@reset-password`, `@ui`, `@validation`, `@happy-path`, `@error-handling`
- Follow BDD best practices
- Use descriptive scenario names
- Keep scenarios focused and atomic

**Testing Frameworks:**
- Playwright for browser automation
- Cucumber/Gherkin for BDD syntax
- playwright-bdd for integration

**Specific Requirements:**
- All scenarios must use semantic selectors (getByRole, getByLabel, getByText)
- Avoid brittle selectors (CSS classes, IDs unless necessary)
- Test both success and failure paths
- Verify accessibility (ARIA labels, keyboard navigation)
- Test password visibility toggle functionality

### Expected Feature File Structure

```gherkin
@auth @reset-password
Feature: Reset Password
  As a user who requested a password reset
  I want to set a new password using my verification code
  So that I can regain access to my account

  Background:
    Given I am on the reset password page with a valid reset code

  @ui
  Scenario: Reset password page displays all required elements
    # UI verification scenarios

  @validation
  Scenario: Form validation scenarios
    # Validation scenarios

  @validation @password-strength
  Scenario: Password strength requirements
    # Password strength scenarios

  @happy-path
  Scenario: Successful password reset
    # Success flow scenarios

  @error-handling
  Scenario: Error handling scenarios
    # Error scenarios
```

## Change Log

| Date       | Version | Description   | Author   |
| ---------- | ------- | ------------- | -------- |
| 2025-12-21 | 0.1     | Initial draft | SM Agent |

