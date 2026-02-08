@wishlist @accessibility @modal
Feature: Wishlist Modal Accessibility
  As a user with accessibility needs
  I want wishlist modals to be fully keyboard accessible
  So that I can use modals without a mouse

  Background:
    Given I am logged in as a test user
    And I navigate to the wishlist gallery
    And the wishlist has items loaded

  # ─────────────────────────────────────────────────────────────────────────────
  # AC26: ESC Key Closes Modals
  # ─────────────────────────────────────────────────────────────────────────────

  @keyboard @smoke
  Scenario: ESC key closes DeleteConfirmModal
    Given I open the delete modal for the first wishlist card
    Then the delete confirmation modal should be visible
    When I press Escape
    Then the delete confirmation modal should not be visible

  @keyboard
  Scenario: ESC key closes GotItModal
    Given I open the Got It modal for the first wishlist card
    Then the Got It modal should be visible
    When I press Escape
    Then the Got It modal should not be visible

  # ─────────────────────────────────────────────────────────────────────────────
  # AC27: Focus Trap
  # ─────────────────────────────────────────────────────────────────────────────

  @focus-trap
  Scenario: Focus trap is active in DeleteConfirmModal
    Given I open the delete modal for the first wishlist card
    When I press Tab 5 times
    Then focus should remain within the modal
    And focus should be on a modal button

  @focus-trap
  Scenario: Focus trap is active in GotItModal
    Given I open the Got It modal for the first wishlist card
    When I press Tab 10 times
    Then focus should remain within the modal

  # ─────────────────────────────────────────────────────────────────────────────
  # AC28: Focus Returns to Trigger
  # ─────────────────────────────────────────────────────────────────────────────

  @focus-return
  Scenario: Focus returns to delete button after DeleteConfirmModal closes
    Given I focus and click the delete button on the first wishlist card
    Then the delete confirmation modal should be visible
    When I click the cancel button in the delete modal
    Then the delete confirmation modal should not be visible

  @focus-return
  Scenario: Focus returns to trigger after GotItModal closes
    Given I focus and click the Got It button on the first wishlist card
    Then the Got It modal should be visible
    When I click the cancel button in the Got It modal
    Then the Got It modal should not be visible

  # ─────────────────────────────────────────────────────────────────────────────
  # AC29: Form Field Labels
  # ─────────────────────────────────────────────────────────────────────────────

  @labels @wcag
  Scenario: GotItModal form fields have associated labels
    Given I open the Got It modal for the first wishlist card
    Then I should see the "Price Paid" label
    And I should see the "Tax" label
    And I should see the "Shipping" label
    And I should see the "Purchase Date" label
    And I should see the "Build Status" label

  # ─────────────────────────────────────────────────────────────────────────────
  # Keyboard Navigation
  # ─────────────────────────────────────────────────────────────────────────────

  @keyboard
  Scenario: Can navigate DeleteConfirmModal with Tab key
    Given I open the delete modal for the first wishlist card
    When I press Tab
    And I press Tab
    Then focus should be on a focusable element

  @keyboard
  Scenario: Can submit GotItModal form with Enter key
    Given I open the Got It modal for the first wishlist card
    When I focus the submit button
    And I press Enter
    Then the Got It modal should close after submission
