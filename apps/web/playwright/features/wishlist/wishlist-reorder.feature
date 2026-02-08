@wishlist @reorder @drag-drop
Feature: Wishlist Reorder
  As a wishlist user
  I want to reorder items using drag-and-drop or keyboard
  So that I can prioritize my wishlist in a custom order

  Background:
    Given I am logged in as a test user
    And I navigate to the wishlist gallery
    And I select "Manual Order" sort option
    And the wishlist has at least 2 items

  # ─────────────────────────────────────────────────────────────────────────────
  # Mouse Drag-and-Drop
  # ─────────────────────────────────────────────────────────────────────────────

  @smoke @mouse
  Scenario: User can drag wishlist card using mouse
    Given I hover over the first wishlist card
    And the drag handle is visible
    When I drag the first card to the second card position
    Then the cards should be reordered
    And the first card should now be in the second position

  @mouse
  Scenario: Drag handle becomes visible on hover
    Given I am not hovering over any card
    When I hover over the first wishlist card
    Then the drag handle should become visible

  @mouse @visual-feedback
  Scenario: Dragging item shows visual feedback
    Given I hover over the first wishlist card
    When I start dragging the card
    Then the card opacity should be reduced
    And visual drag feedback should be shown

  # ─────────────────────────────────────────────────────────────────────────────
  # Keyboard Reordering
  # ─────────────────────────────────────────────────────────────────────────────

  @keyboard @accessibility
  Scenario: Keyboard reordering is accessible
    Given I hover over the first wishlist card
    And I focus the drag handle
    Then the drag handle should have an aria-label containing "Reorder"
    And keyboard instructions should be available

  @keyboard
  Scenario: Keyboard reorder can be cancelled with Escape
    Given I focus the drag handle on the first card
    When I press Space to start drag
    And I press ArrowDown
    And I press Escape
    Then the card should remain in its original position

  @keyboard @screen-reader
  Scenario: Screen reader announces drag operations
    Given there are ARIA live regions on the page
    When I focus the drag handle
    And I press Space to start drag
    Then an announcement should be made to screen readers

  # ─────────────────────────────────────────────────────────────────────────────
  # Accessibility Attributes
  # ─────────────────────────────────────────────────────────────────────────────

  @wcag @accessibility
  Scenario: Draggable cards have proper ARIA attributes
    Then the first wishlist card should have role "listitem"
    And the first wishlist card should have aria-setsize
    And the first wishlist card should have aria-posinset "1"
    And the drag handle should have an aria-label

  @wcag @accessibility
  Scenario: Gallery container has proper list semantics
    Then there should be a list container with role "list"
    And the list container should have aria-label containing "Wishlist"
    And the list should contain listitem elements

  @wcag @touch-target
  Scenario: Drag handle has proper touch target size
    Given I hover over the first wishlist card
    Then the drag handle should have width class "w-11"
    And the drag handle should have height class "h-11"
    And the drag handle should have touch-none class

  # ─────────────────────────────────────────────────────────────────────────────
  # Persistence
  # ─────────────────────────────────────────────────────────────────────────────

  @persistence @integration
  Scenario: Reorder persists after page reload
    Given I drag the first card to the second position
    And I wait for the API to complete
    When I navigate to the wishlist gallery
    And I select "Manual Order" sort option
    Then the reordered position should be preserved

  # ─────────────────────────────────────────────────────────────────────────────
  # Undo Functionality
  # ─────────────────────────────────────────────────────────────────────────────

  @undo
  Scenario: Undo button appears after reorder
    When I drag the first card to the second position
    Then an undo option should be available

  @undo
  Scenario: Undo restores original order
    Given I drag the first card to the second position
    And I remember the original order
    When I click the undo button
    Then the original order should be restored

  # ─────────────────────────────────────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────────────────────────────────────

  @edge-case
  Scenario: Single item does not show drag handles
    Given the wishlist has exactly 1 item
    Then drag handles should not be visible or enabled
