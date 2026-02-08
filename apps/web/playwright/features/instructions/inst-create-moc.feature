@instructions @create-moc @form
Feature: Create MOC
  As a MOC builder
  I want to create new MOC entries
  So that I can track my custom LEGO builds

  Background:
    Given I am logged in as a test user
    And test MOCs have been cleaned up
    And I navigate to the create MOC page

  # ─────────────────────────────────────────────────────────────────────────────
  # Form Rendering
  # ─────────────────────────────────────────────────────────────────────────────

  @form @smoke
  Scenario: Create form displays required fields
    Then I should see the title input
    And I should see the submit button

  @form @focus
  Scenario: Title field is focused on mount
    Then the title input should be focused

  # ─────────────────────────────────────────────────────────────────────────────
  # Happy Path: MOC Creation
  # ─────────────────────────────────────────────────────────────────────────────

  @submission @smoke
  Scenario: User can create a MOC with valid data
    Given I fill in the title with a unique test title
    And I fill in optional fields if available
    Then the submit button should be enabled
    When I click the submit button
    Then I should see a success toast with "MOC created"
    And I should be redirected to the gallery

  # ─────────────────────────────────────────────────────────────────────────────
  # Form Validation
  # ─────────────────────────────────────────────────────────────────────────────

  @validation
  Scenario: Empty form disables submit button
    Then the submit button should be disabled

  @validation
  Scenario: Title minimum length validation
    Given I enter a title shorter than 3 characters
    Then the submit button should be disabled
    When I enter a valid title of 3 or more characters
    Then the submit button should be enabled

  @validation @trigger
  Scenario: Validation errors appear on blur
    When I click the title input
    And I blur the title input without entering text
    Then a validation error may appear

  # ─────────────────────────────────────────────────────────────────────────────
  # Keyboard Navigation
  # ─────────────────────────────────────────────────────────────────────────────

  @keyboard
  Scenario: Escape key navigates back to gallery
    When I press Escape
    Then I should be redirected to the gallery

  # ─────────────────────────────────────────────────────────────────────────────
  # Accessibility
  # ─────────────────────────────────────────────────────────────────────────────

  @accessibility @labels
  Scenario: Form fields have proper labels
    Then the title input should have an associated label
    And required fields should be marked with asterisk

  # ─────────────────────────────────────────────────────────────────────────────
  # Backend Integration
  # ─────────────────────────────────────────────────────────────────────────────

  @api @integration
  Scenario: Successful creation returns 201 with complete data
    Given I fill in the title with a unique test title
    And I fill in optional fields if available
    When I click the submit button
    Then the API should return 201 Created
    And the response should contain id, title, createdAt, and slug
