@inspiration @keyboard @accessibility
Feature: Inspiration Gallery Keyboard Navigation
  As a keyboard-only user
  I want to navigate the inspiration gallery using keyboard shortcuts
  So that I can efficiently manage my inspirations without a mouse

  Background:
    Given I am logged in as a test user
    And I navigate to the inspiration gallery
    And the inspiration gallery has loaded

  # ─────────────────────────────────────────────────────────────────────────────
  # Keyboard Shortcuts
  # ─────────────────────────────────────────────────────────────────────────────

  @shortcuts @smoke
  Scenario: U key opens upload modal
    When I press the "u" key
    Then a modal should be visible

  @shortcuts
  Scenario: N key opens new album modal
    When I press the "n" key
    Then a modal should be visible
    And I should see a heading containing "Album"

  @shortcuts
  Scenario: Escape closes modal
    Given a modal is open
    When I press Escape
    Then the modal should not be visible

  @shortcuts @selection
  Scenario: Ctrl+A selects all items
    Given I am in multi-select mode
    When I press Ctrl+A
    Then the bulk actions bar should be visible

  @shortcuts @selection
  Scenario: Escape clears selection
    Given I have items selected
    And the bulk actions bar is visible
    When I press Escape
    Then the bulk actions bar should not be visible

  # ─────────────────────────────────────────────────────────────────────────────
  # Tab Navigation
  # ─────────────────────────────────────────────────────────────────────────────

  @tab-navigation
  Scenario: Tab reaches main navigation elements
    When I press Tab repeatedly
    Then I should eventually reach action buttons like Select or Add Inspiration

  @tab-navigation @tabs
  Scenario: Arrow keys navigate tabs
    Given the tab list is focused
    When I press ArrowRight
    Then the Albums tab should be focused

  # ─────────────────────────────────────────────────────────────────────────────
  # Card Focus
  # ─────────────────────────────────────────────────────────────────────────────

  @card-focus
  Scenario: Inspiration cards are focusable
    Given the gallery has inspiration cards
    When I focus on the first card
    Then the first card should be focused

  @card-focus
  Scenario: Enter activates focused card
    Given the gallery has inspiration cards
    And the first card is focused
    When I press Enter
    Then a modal or detail view should open

  @card-focus
  Scenario: Space activates or selects focused card
    Given the gallery has inspiration cards
    And the first card is focused
    When I press Space
    Then either a dialog appears or the card is selected

  # ─────────────────────────────────────────────────────────────────────────────
  # Modal Focus Trap
  # ─────────────────────────────────────────────────────────────────────────────

  @modal @focus-trap
  Scenario: Modal traps focus
    Given the upload modal is open
    When I press Tab 20 times
    Then focus should remain within the modal

  @modal @focus-trap
  Scenario: Shift+Tab works within modal
    Given the upload modal is open
    When I press Tab twice
    And I press Shift+Tab
    Then focus should remain within the modal

  # ─────────────────────────────────────────────────────────────────────────────
  # Search Field
  # ─────────────────────────────────────────────────────────────────────────────

  @search @focus
  Scenario: Search field is focusable via Tab
    When I focus on the search input
    Then the search input should be focused

  @search @shortcuts
  Scenario: Typing in search does not trigger shortcuts
    Given the search input is focused
    When I type "u"
    Then no modal should open
    And the search input should contain "u"
