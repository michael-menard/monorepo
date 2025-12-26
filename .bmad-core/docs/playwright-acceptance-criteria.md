# Playwright Test Acceptance Criteria

## Overview

All user stories MUST include Playwright end-to-end (E2E) tests as part of their acceptance criteria. This document defines the standard acceptance criteria for Playwright tests.

## Standard Acceptance Criteria

Every story should include the following acceptance criterion (or a variation appropriate to the story):

### For Feature Stories

```
Playwright E2E tests written and passing:
- Happy path user flow tested with Gherkin `.feature` file
- Error/edge cases covered (if applicable)
- Tests use semantic selectors (role, label, test-id)
- All tests pass in CI/CD pipeline
```

### For UI Component Stories

```
Playwright E2E tests written and passing:
- Component renders correctly in isolation
- User interactions work as expected (clicks, inputs, etc.)
- Accessibility requirements verified (keyboard nav, screen reader)
- Tests use Gherkin `.feature` file syntax
- All tests pass in CI/CD pipeline
```

### For API/Backend Stories

```
Playwright E2E tests written and passing:
- API integration tested through UI flow
- Success and error responses handled correctly
- Loading states and error messages displayed properly
- Tests use Gherkin `.feature` file syntax
- All tests pass in CI/CD pipeline
```

## Gherkin Syntax Requirement

**CRITICAL:** ALL Playwright tests MUST use Gherkin syntax with `.feature` files.

### Example Feature File

```gherkin
# apps/web/playwright/features/instructions/upload-instructions.feature
Feature: Upload MOC Instructions

  Scenario: Successfully upload new MOC instructions
    Given I am logged in as a user
    And I am on the Instructions Gallery page
    When I click the "Upload Instructions" button
    And I fill in the MOC title "My Awesome MOC"
    And I upload a PDF file "instructions.pdf"
    And I click the "Submit" button
    Then I should see "Upload successful"
    And I should see "My Awesome MOC" in the gallery

  Scenario: Handle upload error for invalid file type
    Given I am logged in as a user
    And I am on the Upload Instructions page
    When I upload a file "document.txt"
    Then I should see an error "Only PDF files are allowed"
    And the submit button should be disabled
```

### Example Step Definitions

```typescript
// apps/web/playwright/step-definitions/instructions-steps.ts
import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'

Given('I am on the Instructions Gallery page', async function () {
  await this.page.goto('/instructions')
})

When('I click the {string} button', async function (buttonText: string) {
  await this.page.getByRole('button', { name: buttonText }).click()
})

Then('I should see {string} in the gallery', async function (text: string) {
  await expect(this.page.getByText(text)).toBeVisible()
})
```

## Test Location

- **Feature files:** `apps/web/playwright/features/{domain}/{feature-name}.feature`
- **Step definitions:** `apps/web/playwright/step-definitions/{domain}-steps.ts`
- **Page objects (if needed):** `apps/web/playwright/page-objects/{page-name}.ts`

## Test Coverage Requirements

1. **Happy Path:** Primary user flow must be tested
2. **Error Handling:** Common error scenarios must be tested
3. **Accessibility:** Keyboard navigation and screen reader compatibility
4. **Edge Cases:** Boundary conditions and unusual inputs (where applicable)

## CI/CD Integration

All Playwright tests must:
- Run automatically in GitHub Actions on PR creation
- Pass before PR can be merged
- Run on all supported browsers (Chromium, Firefox, WebKit)
- Generate test reports and screenshots on failure

## Adding to Story Acceptance Criteria

When creating or updating a story, add one of the standard acceptance criteria above to the "Acceptance Criteria" section. Customize as needed for the specific story.

### Example Story Update

```markdown
## Acceptance Criteria

1. ✅ Route module created in `apps/web/main-app/src/routes/modules/InstructionsModule.tsx`
2. ✅ InstructionsGalleryPage component renders (via `@repo/app-instructions-gallery`)
3. ✅ Route `/instructions` configured in router
4. ✅ Lazy loading configured for route
5. **Playwright E2E tests written and passing:**
   - Happy path: User navigates to `/instructions` and sees gallery
   - Gallery loads and displays instruction cards
   - Tests use Gherkin `.feature` file syntax
   - All tests pass in CI/CD pipeline
```

## References

- [Coding Standards - E2E Tests with Playwright](../../docs/architecture/coding-standards.md#e2e-tests-with-playwright)
- [Story Template](../.bmad-core/templates/story-tmpl.yaml)
- [Definition of Done](../../docs/stories/README.md#definition-of-done)

