@wishlist @accessibility @keyboard
Feature: Wishlist Keyboard Navigation
  As a keyboard-only user
  I want to navigate the wishlist gallery using arrow keys
  So that I can browse items without using a mouse

  Background:
    Given I am logged in as a test user
    And I navigate to the wishlist gallery
    And the wishlist has items loaded

  # ─────────────────────────────────────────────────────────────────────────────
  # Arrow Key Navigation (2D Grid)
  # ─────────────────────────────────────────────────────────────────────────────

  @smoke @grid-nav
  Scenario: Arrow Down moves focus to item below in grid
    Given I focus on the gallery container
    And the first wishlist card is focused
    When I press ArrowDown
    Then a wishlist card below should be focused
    And the focus index should be greater than before

  @grid-nav
  Scenario: Arrow Up moves focus to item above in grid
    Given I focus on the gallery container
    And the first wishlist card is focused
    When I press ArrowDown twice
    And I press ArrowUp
    Then the focused index should be less than before ArrowUp

  @grid-nav
  Scenario: Arrow Right moves focus to next item
    Given I focus on the gallery container
    And the first wishlist card is focused
    When I press ArrowRight
    Then the focused index should increase by 1

  @grid-nav
  Scenario: Arrow Left moves focus to previous item
    Given I focus on the gallery container
    And the first wishlist card is focused
    When I press ArrowRight twice
    And I press ArrowLeft
    Then the focused index should decrease by 1

  # ─────────────────────────────────────────────────────────────────────────────
  # Home/End Keys
  # ─────────────────────────────────────────────────────────────────────────────

  @home-end
  Scenario: Home key jumps to first item
    Given I focus on the gallery container
    And the first wishlist card is focused
    When I press ArrowRight 3 times
    And I press Home
    Then the first wishlist card should be focused

  @home-end
  Scenario: End key jumps to last item
    Given I focus on the gallery container
    And the first wishlist card is focused
    When I press End
    Then the last navigable wishlist card should be focused

  # ─────────────────────────────────────────────────────────────────────────────
  # Roving Tabindex
  # ─────────────────────────────────────────────────────────────────────────────

  @roving-tabindex @wcag
  Scenario: Only one item has tabindex="0" at a time
    Given I focus on the gallery container
    And the first wishlist card is focused
    Then only one wishlist card should have tabindex "0"
    When I press ArrowRight
    Then only one wishlist card should have tabindex "0"

  # ─────────────────────────────────────────────────────────────────────────────
  # Focus Indicator
  # ─────────────────────────────────────────────────────────────────────────────

  @focus-visible @wcag
  Scenario: Visible focus indicator is present on focused item
    Given I focus on the gallery container
    And the first wishlist card is focused
    Then the focused card should have focus-visible ring classes

  @focus-visible
  Scenario: Focus ring has sufficient contrast
    Given I focus on the gallery container
    And the first wishlist card is focused
    Then the focused card should have a visible focus ring

  # ─────────────────────────────────────────────────────────────────────────────
  # Sort Mode Compatibility
  # ─────────────────────────────────────────────────────────────────────────────

  @manual-sort
  Scenario: Keyboard navigation works in Manual Order mode
    Given I select "Manual Order" sort option
    And I focus on the gallery container
    When I press ArrowRight
    Then a wishlist card should be focused
    And the focused card should have a visible focus ring

  # ─────────────────────────────────────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────────────────────────────────────

  @edge-case
  Scenario: Keyboard navigation with single item does not crash
    Given I focus on the gallery container
    And the wishlist has exactly 1 item
    When I press ArrowDown
    And I press ArrowUp
    And I press ArrowLeft
    And I press ArrowRight
    Then the single wishlist card should remain focused
    And no console errors should occur

  @edge-case
  Scenario: Empty gallery keyboard navigation does not crash
    Given the wishlist is empty
    When I press ArrowDown
    And I press ArrowUp
    Then I should see the empty state message
    And no console errors should occur

  # ─────────────────────────────────────────────────────────────────────────────
  # Responsive Layouts
  # ─────────────────────────────────────────────────────────────────────────────

  @responsive @mobile
  Scenario: Keyboard navigation works with 1 column mobile layout
    Given I am using a mobile viewport
    And I focus on the gallery container
    When I press ArrowDown
    Then the focused index should increase by 1

  @responsive @desktop
  Scenario: Keyboard navigation works with 3 columns desktop layout
    Given I am using a desktop viewport
    And I focus on the gallery container
    When I press ArrowDown
    Then the focused index should increase by approximately 3
