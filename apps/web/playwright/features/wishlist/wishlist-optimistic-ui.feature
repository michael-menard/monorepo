@WISH-2032 @optimistic-ui @wishlist
Feature: Optimistic UI for Form Submission
  As a wishlist user
  I want immediate feedback when adding items
  So that I can continue browsing without waiting for the server

  Background:
    Given I am logged in as a test user
    When I open the add wishlist item page
    Then I should be on the "Add to Wishlist" page

  # ─────────────────────────────────────────────────────────────────────────────
  # AC1: Immediate Success Toast on Form Submit
  # ─────────────────────────────────────────────────────────────────────────────

  @AC1 @smoke @optimistic-toast
  Scenario: Success toast appears immediately on submit
    Given I fill in the add item form with valid required and optional data
    When I submit the add item form
    Then I should see a success toast with title "Item added!"
    And I should see a success toast with description "has been added to your wishlist"

  # ─────────────────────────────────────────────────────────────────────────────
  # AC2: Immediate Navigation to Gallery on Form Submit
  # ─────────────────────────────────────────────────────────────────────────────

  @AC2 @smoke @optimistic-navigation
  Scenario: Navigation to gallery happens immediately on submit
    Given I fill in the add item form with valid required and optional data
    When I submit the add item form
    Then I should be redirected to the gallery page within 2 seconds
    And the URL should be "/"

  # ─────────────────────────────────────────────────────────────────────────────
  # AC3: Submit Button Disabled During Submission
  # ─────────────────────────────────────────────────────────────────────────────

  @AC3 @button-state
  Scenario: Submit button is disabled during form submission
    Given I fill in the add item form with valid required and optional data
    When I click the submit button
    Then the submit button should be disabled immediately

  # ─────────────────────────────────────────────────────────────────────────────
  # AC4: Error Toast with Retry Button on API Failure
  # ─────────────────────────────────────────────────────────────────────────────

  @AC4 @error-handling
  Scenario: Error toast with retry button appears on API error
    Given the add-to-wishlist API is mocked to return an error
    And I fill in the add item form with valid required and optional data
    When I submit the add item form
    And I wait 2 seconds for the API error
    Then I should be on the "Add to Wishlist" page
    And I should see an error toast with title "Failed to add item"
    And I should see a "Retry" button in the error toast

  # ─────────────────────────────────────────────────────────────────────────────
  # AC5: Retry Button Functionality
  # ─────────────────────────────────────────────────────────────────────────────

  @AC5 @error-handling @retry
  Scenario: Retry button resubmits the form with preserved data
    Given the add-to-wishlist API is mocked to return an error
    And I fill in the add item form with valid required and optional data
    When I submit the add item form
    And I wait 2 seconds for the API error
    Then I should see a "Retry" button in the error toast
    When I click the "Retry" button in the error toast
    Then I should see a success toast with title "Item added!"
    And I should be redirected to the gallery page within 2 seconds

  # ─────────────────────────────────────────────────────────────────────────────
  # AC6: Form Data Preserved After Error Rollback
  # ─────────────────────────────────────────────────────────────────────────────

  @AC6 @error-handling @form-recovery
  Scenario: Form data is preserved via localStorage after API error
    Given the add-to-wishlist API is mocked to return an error
    And I fill in the title with "My Test Item"
    And I fill in the set number with "12345"
    When I submit the add item form
    And I wait 2 seconds for the API error
    Then I should be on the "Add to Wishlist" page
    And the title field should contain "My Test Item"
    And the set number field should contain "12345"

  # ─────────────────────────────────────────────────────────────────────────────
  # AC7: Optimistic Item Appears in Gallery Cache
  # ─────────────────────────────────────────────────────────────────────────────

  @AC7 @cache-update
  Scenario: Submitted item appears in gallery immediately via optimistic cache update
    Given I fill in the title with "Optimistic Test Item"
    And I fill in the set number with "99999"
    When I submit the add item form
    Then I should be redirected to the gallery page within 2 seconds
    And I should eventually see a wishlist card with title "Optimistic Test Item"
