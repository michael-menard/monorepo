@uploader @a11y @accessibility
Feature: MOC Instructions Uploader - Accessibility
  As a user with disabilities
  I want the uploader to be fully accessible
  So that I can use it with assistive technologies

  Background:
    Given I am logged in as a test user
    And I am on the instructions upload page

  @axe @smoke
  Scenario: Upload page passes axe-core accessibility checks
    Then the page should have no critical accessibility violations
    And the page should have no serious accessibility violations

  @keyboard
  Scenario: Form can be navigated with keyboard only
    When I focus on the title input
    And I press Tab
    Then the description field should be focused
    When I press Tab repeatedly
    Then I should be able to reach all form controls
    And I should be able to reach all buttons

  @keyboard
  Scenario: Upload buttons are keyboard accessible
    When I navigate to the "Instructions" upload button using keyboard
    And I press Enter
    Then the file input dialog should open

  @aria
  Scenario: Form fields have proper ARIA labels
    Then the title input should have an accessible name
    And the description textarea should have an accessible name
    And all upload buttons should have accessible names
    And the "Finalize & Publish" button should have an accessible name

  @aria
  Scenario: Error messages are announced to screen readers
    When I click the "Finalize & Publish" button without filling required fields
    Then the error alert should have role "alert"
    And the error alert should have aria-live "polite"
    And individual field errors should have role "alert"

  @aria
  Scenario: Progress restoration is announced
    Given I have a previous session to restore
    When I visit the upload page
    Then the restoration message should have role "status"
    And the restoration message should have aria-live "polite"

  @aria
  Scenario: Upload progress is accessible
    When I upload a PDF instruction file
    Then the upload progress should be visible
    And the progress indicator should have appropriate ARIA attributes

  @focus
  Scenario: Focus management on error
    When I fill in invalid data
    And I click the "Finalize & Publish" button
    Then focus should move to the first error or error summary

  @focus
  Scenario: Focus management on modal open
    Given the API will return a 409 conflict error
    When I trigger a conflict error
    Then the conflict modal should open
    And focus should move to the modal
    And focus should be trapped within the modal

  @contrast
  Scenario: Color contrast meets WCAG AA standards
    Then all text should meet WCAG AA contrast requirements
    And all interactive elements should meet contrast requirements
    And error states should be distinguishable without color alone
