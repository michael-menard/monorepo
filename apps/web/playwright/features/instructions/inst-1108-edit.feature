@instructions @edit @e2e
Feature: Edit MOC Metadata (INST-1108)
  As a LEGO MOC builder
  I want to edit metadata for my existing MOC entries
  So that I can update and improve my build documentation

  Background:
    Given I am logged in as a test user
    And I have MOCs in my collection

  # ─────────────────────────────────────────────────────────────────────────────
  # AC50: Navigate to Edit Page
  # ─────────────────────────────────────────────────────────────────────────────

  @smoke @happy-path
  Scenario: Navigate to edit page and see pre-populated form
    Given I navigate to a MOC detail page
    When I click the edit button
    Then I should be on the edit MOC page
    And the form should be pre-populated with current MOC data

  # ─────────────────────────────────────────────────────────────────────────────
  # AC51: Edit Title and Save Successfully
  # ─────────────────────────────────────────────────────────────────────────────

  @smoke @happy-path
  Scenario: Edit MOC title and save successfully
    Given I navigate to the edit page for a MOC
    When I change the MOC title to "Updated Castle MOC"
    And I click the save button
    Then I should see a success message "MOC updated"
    And I should be redirected to the detail page
    And the detail page should show the updated title "Updated Castle MOC"

  # ─────────────────────────────────────────────────────────────────────────────
  # AC52: Edit Description and Save
  # ─────────────────────────────────────────────────────────────────────────────

  @happy-path
  Scenario: Edit MOC description successfully
    Given I navigate to the edit page for a MOC
    When I change the description to "This is my updated description"
    And I click the save button
    Then I should see a success message "MOC updated"
    And the detail page should show the updated description

  # ─────────────────────────────────────────────────────────────────────────────
  # AC53: Edit Multiple Fields
  # ─────────────────────────────────────────────────────────────────────────────

  @happy-path
  Scenario: Edit multiple fields at once
    Given I navigate to the edit page for a MOC
    When I change the MOC title to "Epic Space Station"
    And I change the theme to "Space"
    And I update the MOC tags to "space, station, modular"
    And I click the save button
    Then I should see a success message "MOC updated"
    And the detail page should reflect all changes

  # ─────────────────────────────────────────────────────────────────────────────
  # AC54: Cancel Edit Returns to Detail
  # ─────────────────────────────────────────────────────────────────────────────

  @navigation
  Scenario: Cancel button returns to detail page without saving
    Given I navigate to the edit page for a MOC
    When I change the MOC title to "This Should Not Save"
    And I click the cancel button
    Then I should be redirected to the detail page
    And the title should not be changed

  # ─────────────────────────────────────────────────────────────────────────────
  # AC55: Validation Error Prevents Submission
  # ─────────────────────────────────────────────────────────────────────────────

  @validation @error-handling
  Scenario: Title too short shows validation error
    Given I navigate to the edit page for a MOC
    When I clear the MOC title field
    And I enter a title with only 2 characters
    And I click the save button
    Then I should see a validation error "Title must be at least 3 characters"
    And I should remain on the edit page

  @validation @error-handling
  Scenario: Empty title prevents submission
    Given I navigate to the edit page for a MOC
    When I clear the MOC title field
    And I click the save button
    Then I should see a validation error "Title is required"
    And the save button should be disabled

  # ─────────────────────────────────────────────────────────────────────────────
  # AC56: Escape Key Cancels and Returns
  # ─────────────────────────────────────────────────────────────────────────────

  @keyboard @navigation
  Scenario: Escape key cancels edit and returns to detail
    Given I navigate to the edit page for a MOC
    When I change the MOC title to "This Should Not Save"
    And I press the Escape key
    Then I should be redirected to the detail page
    And the title should not be changed

  @keyboard
  Scenario: Escape key disabled during save operation
    Given I navigate to the edit page for a MOC
    When I change the MOC title to "Updated Title"
    And I click the save button
    And I press the Escape key during save
    Then I should remain on the edit page
    And the save operation should complete

  # ─────────────────────────────────────────────────────────────────────────────
  # AC57: Loading State During Save
  # ─────────────────────────────────────────────────────────────────────────────

  @loading @ui-state
  Scenario: Show loading state during save
    Given I navigate to the edit page for a MOC
    When I change the MOC title to "New Title"
    And I click the save button
    Then I should see a loading indicator
    And the save button should be disabled during save
    And the form fields should be disabled during save

  # ─────────────────────────────────────────────────────────────────────────────
  # AC58: Error Handling with Retry
  # ─────────────────────────────────────────────────────────────────────────────

  @error-handling @retry
  Scenario: API failure shows error with retry option
    Given I navigate to the edit page for a MOC
    And the API will fail on save
    When I change the MOC title to "New Title"
    And I click the save button
    Then I should see an error message with retry button
    And my changes should be saved to localStorage
    When I click the retry button
    Then the form should submit again

  # ─────────────────────────────────────────────────────────────────────────────
  # AC59: Form Recovery After Error
  # ─────────────────────────────────────────────────────────────────────────────

  @recovery @localStorage
  Scenario: Recover form data after error and page reload
    Given I navigate to the edit page for a MOC
    And I change the MOC title to "Recovered Title"
    And the API fails on save
    When I reload the page
    Then the form should be pre-populated with "Recovered Title"
    And I should be able to save successfully

  # ─────────────────────────────────────────────────────────────────────────────
  # AC60: Back Button Navigation
  # ─────────────────────────────────────────────────────────────────────────────

  @navigation
  Scenario: Back button returns to detail page
    Given I navigate to the edit page for a MOC
    When I click the back button
    Then I should be redirected to the detail page

  # ─────────────────────────────────────────────────────────────────────────────
  # Accessibility
  # ─────────────────────────────────────────────────────────────────────────────

  @accessibility
  Scenario: Edit page has proper page title and heading
    Given I navigate to the edit page for a MOC
    Then I should see the page heading "Edit MOC"
    And the page should have proper semantic structure

  @accessibility
  Scenario: Form fields have proper labels
    Given I navigate to the edit page for a MOC
    Then all form fields should have accessible labels
    And validation errors should be announced to screen readers
