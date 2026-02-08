@wishlist @modal
Feature: Wishlist Modals
  As a wishlist user
  I want to delete items and mark items as purchased
  So that I can manage my wishlist effectively

  Background:
    Given I am logged in as a test user
    And I navigate to the wishlist gallery
    And the wishlist has items loaded

  # ─────────────────────────────────────────────────────────────────────────────
  # Delete Modal - Opening and Preview
  # ─────────────────────────────────────────────────────────────────────────────

  @delete @smoke
  Scenario: DeleteConfirmModal opens when user triggers delete action
    When I hover over the first wishlist card
    And I click the delete button
    Then the delete confirmation modal should be visible
    And I should see the text "Delete Item?"

  @delete @preview
  Scenario: Delete modal displays item preview
    When I open the delete modal for the first wishlist card
    Then the item preview should be visible
    And the item title should be displayed

  @delete @cancel
  Scenario: Cancel button closes delete modal without deleting
    Given I remember the first card title
    When I open the delete modal for the first wishlist card
    And I click the cancel button in the delete modal
    Then the delete confirmation modal should not be visible
    And the remembered card should still be in the gallery

  # ─────────────────────────────────────────────────────────────────────────────
  # Delete Modal - Confirmation
  # ─────────────────────────────────────────────────────────────────────────────

  @delete @api
  Scenario: Confirm button triggers DELETE API request
    Given I intercept DELETE requests to wishlist API
    When I open the delete modal for the first wishlist card
    And I click the confirm delete button
    Then a DELETE request should have been made

  @delete @api @smoke
  Scenario: Successful delete removes item from gallery
    Given I remember the first card title
    When I open the delete modal for the first wishlist card
    And I click the confirm delete button
    And I wait for the API response
    Then the delete confirmation modal should not be visible
    And the remembered card should not be in the gallery

  # ─────────────────────────────────────────────────────────────────────────────
  # Delete Modal - Error Handling
  # ─────────────────────────────────────────────────────────────────────────────

  @delete @error
  Scenario: 403 response shows forbidden error
    Given I mock DELETE to return 403 Forbidden
    When I open the delete modal for the first wishlist card
    And I click the confirm delete button
    Then I should see a permission error message

  @delete @error
  Scenario: 404 response shows not found error
    Given I mock DELETE to return 404 Not Found
    When I open the delete modal for the first wishlist card
    And I click the confirm delete button
    Then I should see a not found error message

  @delete @toast
  Scenario: Success shows toast notification
    Given I mock DELETE to return 204 No Content
    When I open the delete modal for the first wishlist card
    And I click the confirm delete button
    Then I should see a success toast with "deleted" or "removed"

  # ─────────────────────────────────────────────────────────────────────────────
  # Got It Modal - Opening and Defaults
  # ─────────────────────────────────────────────────────────────────────────────

  @got-it @smoke
  Scenario: GotItModal opens when user triggers Got It action
    When I hover over the first wishlist card
    And I click the Got It button
    Then the Got It modal should be visible
    And I should see the text "Got It!"

  @got-it @title
  Scenario: Got It modal displays item title
    Given I remember the first card title
    When I open the Got It modal for the first wishlist card
    Then the modal should contain the remembered title

  @got-it @defaults
  Scenario: Price field is pre-filled from wishlist item
    When I open the Got It modal for the first wishlist card
    Then the price paid input should be visible
    And the price paid input should have a value

  @got-it @defaults
  Scenario: Purchase date defaults to today
    When I open the Got It modal for the first wishlist card
    Then the purchase date input should have today's date

  # ─────────────────────────────────────────────────────────────────────────────
  # Got It Modal - Form Validation
  # ─────────────────────────────────────────────────────────────────────────────

  @got-it @validation
  Scenario: Form validates price format as decimal only
    When I open the Got It modal for the first wishlist card
    And I enter "abc" in the price paid field
    And I click the submit button
    Then I should see a price validation error

  # ─────────────────────────────────────────────────────────────────────────────
  # Got It Modal - Submission
  # ─────────────────────────────────────────────────────────────────────────────

  @got-it @api
  Scenario: Submit triggers PATCH API request
    When I open the Got It modal for the first wishlist card
    And I fill in price paid as "99.99"
    And I wait for the PATCH response
    Then a PATCH request should have been made
    And the response should be 200 OK

  @got-it @toast
  Scenario: Success shows marked as owned toast
    Given I mock PATCH to return 200 with purchased true
    When I open the Got It modal for the first wishlist card
    And I click the submit button
    Then I should see a success toast with "marked as owned"

  # ─────────────────────────────────────────────────────────────────────────────
  # Got It Modal - Loading States
  # ─────────────────────────────────────────────────────────────────────────────

  @got-it @loading
  Scenario: Submit and cancel buttons are present
    When I open the Got It modal for the first wishlist card
    Then the submit button should be visible
    And the cancel button should be visible
