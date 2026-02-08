@inspiration @accessibility @e2e @wcag
Feature: Inspiration Gallery Accessibility
  As a user with accessibility needs
  I want the inspiration gallery to be fully accessible
  So that I can use all features regardless of my abilities

  # ─────────────────────────────────────────────────────────────────────────────
  # ARIA Attributes
  # ─────────────────────────────────────────────────────────────────────────────

  @aria
  Scenario: Gallery has proper landmark roles
    Given I am logged in as a test user
    And I am on the inspiration gallery
    Then the page should have a main landmark
    And the gallery should have proper region roles

  @aria
  Scenario: Tabs have proper ARIA attributes
    Given I am logged in as a test user
    And I am on the inspiration gallery
    Then the tab list should have role "tablist"
    And each tab should have role "tab"
    And the active tab should have aria-selected "true"

  @aria
  Scenario: Cards have proper button role
    Given I am logged in as a test user
    And I am on the inspiration gallery
    And I have inspirations in my gallery
    Then inspiration cards should have role "button"
    And cards should have aria-pressed attribute

  @aria
  Scenario: Search input has accessible label
    Given I am logged in as a test user
    And I am on the inspiration gallery
    Then the search input should have an accessible name
    And the search input should have aria-label or label

  # ─────────────────────────────────────────────────────────────────────────────
  # Keyboard Navigation
  # ─────────────────────────────────────────────────────────────────────────────

  @keyboard
  Scenario: All interactive elements are focusable
    Given I am logged in as a test user
    And I am on the inspiration gallery
    When I tab through the page
    Then all buttons should be reachable via Tab
    And all form controls should be reachable via Tab

  @keyboard
  Scenario: Tab navigation moves through tabs
    Given I am logged in as a test user
    And I am on the inspiration gallery
    When I focus on the tab list
    And I press ArrowRight
    Then focus should move to the next tab

  @keyboard
  Scenario: Cards are keyboard activatable
    Given I am logged in as a test user
    And I am on the inspiration gallery
    And I have inspirations in my gallery
    When I focus on an inspiration card
    And I press Enter
    Then the card should be activated

  @keyboard
  Scenario: Space activates cards in multi-select mode
    Given I am logged in as a test user
    And I am on the inspiration gallery in multi-select mode
    When I focus on an inspiration card
    And I press Space
    Then the card should be selected

  @keyboard
  Scenario: Escape clears selection
    Given I am logged in as a test user
    And I am on the inspiration gallery with items selected
    When I press Escape
    Then no items should be selected

  # ─────────────────────────────────────────────────────────────────────────────
  # Modal Accessibility
  # ─────────────────────────────────────────────────────────────────────────────

  @modal
  Scenario: Modal has dialog role
    Given I am logged in as a test user
    And I am on the inspiration gallery
    When I open the upload modal
    Then the modal should have role "dialog"
    And the modal should have aria-modal "true"

  @modal
  Scenario: Modal has accessible title
    Given I am logged in as a test user
    And I am on the inspiration gallery
    When I open the upload modal
    Then the modal should have a visible heading
    And the modal should have aria-labelledby pointing to the heading

  @modal
  Scenario: Focus is trapped in modal
    Given I am logged in as a test user
    And I am on the inspiration gallery
    And the upload modal is open
    When I tab through all elements
    Then focus should remain within the modal
    And focus should cycle back to the first element

  @modal
  Scenario: Modal close button is accessible
    Given I am logged in as a test user
    And I am on the inspiration gallery
    And the upload modal is open
    Then the close button should have accessible name "Close"
    And the close button should be focusable

  # ─────────────────────────────────────────────────────────────────────────────
  # Focus Management
  # ─────────────────────────────────────────────────────────────────────────────

  @focus
  Scenario: Focus moves to modal when opened
    Given I am logged in as a test user
    And I am on the inspiration gallery
    When I click the "Add Inspiration" button
    Then focus should move into the modal

  @focus
  Scenario: Focus returns after modal closes
    Given I am logged in as a test user
    And I am on the inspiration gallery
    And I opened the modal via the "Add Inspiration" button
    When I close the modal
    Then focus should return to the "Add Inspiration" button

  @focus
  Scenario: Interactive elements have visible focus indicators
    Given I am logged in as a test user
    And I am on the inspiration gallery
    When I focus on a button
    Then the button should have a visible focus ring

  # ─────────────────────────────────────────────────────────────────────────────
  # Screen Reader Support
  # ─────────────────────────────────────────────────────────────────────────────

  @screen-reader
  Scenario: Selection state is announced
    Given I am logged in as a test user
    And I am on the inspiration gallery in multi-select mode
    When I select an inspiration
    Then the card should have aria-pressed "true"
    And screen readers should announce the selection

  @screen-reader
  Scenario: Bulk actions count is announced
    Given I am logged in as a test user
    And I am on the inspiration gallery with items selected
    Then the bulk actions bar should announce selection count
    And the count should be a live region

  @screen-reader
  Scenario: Loading state is announced
    Given I am logged in as a test user
    When I navigate to the inspiration gallery
    Then loading state should have aria-busy "true"
    And screen readers should announce when loading completes

  # ─────────────────────────────────────────────────────────────────────────────
  # Images
  # ─────────────────────────────────────────────────────────────────────────────

  @images
  Scenario: Inspiration images have alt text
    Given I am logged in as a test user
    And I am on the inspiration gallery
    And I have inspirations with images
    Then all inspiration images should have alt text
    And alt text should describe the image content

  @images
  Scenario: Album cover images have alt text
    Given I am logged in as a test user
    And I am on the inspiration gallery Albums tab
    And I have albums with cover images
    Then all album cover images should have alt text

  # ─────────────────────────────────────────────────────────────────────────────
  # Color and Contrast
  # ─────────────────────────────────────────────────────────────────────────────

  @contrast
  Scenario: Text meets WCAG AA contrast requirements
    Given I am logged in as a test user
    And I am on the inspiration gallery
    Then all text should meet 4.5:1 contrast ratio
    And large text should meet 3:1 contrast ratio

  @contrast
  Scenario: Focus indicators meet contrast requirements
    Given I am logged in as a test user
    And I am on the inspiration gallery
    When I focus on interactive elements
    Then focus indicators should meet 3:1 contrast ratio

  # ─────────────────────────────────────────────────────────────────────────────
  # WCAG Automated Checks
  # ─────────────────────────────────────────────────────────────────────────────

  @axe @automated
  Scenario: Gallery page has no critical accessibility violations
    Given I am logged in as a test user
    And I am on the inspiration gallery
    When I run automated accessibility checks
    Then there should be no critical violations
    And there should be no serious violations

  @axe @automated
  Scenario: Upload modal has no accessibility violations
    Given I am logged in as a test user
    And I am on the inspiration gallery
    And the upload modal is open
    When I run automated accessibility checks on the modal
    Then there should be no critical violations

  @axe @automated
  Scenario: Albums tab has no accessibility violations
    Given I am logged in as a test user
    And I am on the inspiration gallery Albums tab
    When I run automated accessibility checks
    Then there should be no critical violations
