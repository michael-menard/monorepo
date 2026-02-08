@wishlist @accessibility @wcag
Feature: Wishlist Accessibility Scan
  As a user with accessibility needs
  I want the wishlist gallery to be WCAG AA compliant
  So that I can use the app with assistive technologies

  Background:
    Given I am logged in as a test user
    And I navigate to the wishlist gallery
    And the wishlist has items loaded

  # ─────────────────────────────────────────────────────────────────────────────
  # WCAG AA Compliance
  # ─────────────────────────────────────────────────────────────────────────────

  @smoke @axe
  Scenario: axe-core scan reports zero WCAG AA violations on gallery page
    Then the page should have no WCAG AA violations

  @axe @color-contrast
  Scenario: Color contrast meets 4.5:1 ratio for normal text
    Then there should be no color contrast violations

  @axe @focus
  Scenario: Focus ring contrast meets requirements
    When I press Tab to focus on a wishlist card
    Then the focused card should have a visible focus indicator
    And the focus ring should use design system colors

  # ─────────────────────────────────────────────────────────────────────────────
  # Interactive Elements
  # ─────────────────────────────────────────────────────────────────────────────

  @axe @accessible-names
  Scenario: All interactive elements have accessible names
    Then all buttons should have accessible names
    And all links should have accessible names

  @axe @images
  Scenario: All images have alt text
    Then there should be no image-alt violations

  @axe @critical
  Scenario: No critical accessibility violations
    Then there should be no critical or serious violations

  # ─────────────────────────────────────────────────────────────────────────────
  # ARIA Attributes
  # ─────────────────────────────────────────────────────────────────────────────

  @aria
  Scenario: ARIA attributes are valid
    Then all ARIA attributes should be valid
    And required ARIA attributes should be present

  @aria @keyboard
  Scenario: Keyboard accessibility rules pass
    Then focus-order-semantics rules should pass
    And tabindex rules should pass

  # ─────────────────────────────────────────────────────────────────────────────
  # Form Accessibility
  # ─────────────────────────────────────────────────────────────────────────────

  @forms
  Scenario: Form elements have labels
    When I navigate to the add item page
    Then all form inputs should have associated labels

  # ─────────────────────────────────────────────────────────────────────────────
  # Modal Accessibility
  # ─────────────────────────────────────────────────────────────────────────────

  @modal @axe
  Scenario: Got It modal is accessible
    Given I open the Got It modal for the first wishlist card
    Then the Got It modal should have no accessibility violations

  @modal @axe
  Scenario: Delete modal is accessible
    Given I open the delete modal for the first wishlist card
    Then the delete modal should have no accessibility violations

  # ─────────────────────────────────────────────────────────────────────────────
  # Semantic Structure
  # ─────────────────────────────────────────────────────────────────────────────

  @semantics
  Scenario: Gallery has proper semantic structure
    Then there should be a main landmark
    And region rules should mostly pass

  @semantics @ids
  Scenario: No duplicate IDs in DOM
    Then there should be no duplicate-id violations

  @semantics @lists
  Scenario: List semantics are correct
    Then list and listitem rules should pass
    And the gallery should have a list with aria-label

  @semantics @headings
  Scenario: Heading hierarchy is logical
    Then heading-order rules should pass

  @semantics @empty-elements
  Scenario: No empty links or buttons
    Then all links should have content
    And all buttons should have content

  # ─────────────────────────────────────────────────────────────────────────────
  # Datatable View
  # ─────────────────────────────────────────────────────────────────────────────

  @datatable @axe
  Scenario: Datatable view is accessible
    Given I switch to datatable view
    Then table accessibility rules should pass

  # ─────────────────────────────────────────────────────────────────────────────
  # Document Properties
  # ─────────────────────────────────────────────────────────────────────────────

  @document
  Scenario: Document has a lang attribute
    Then the HTML element should have a valid lang attribute

  # ─────────────────────────────────────────────────────────────────────────────
  # Zoom and Responsive
  # ─────────────────────────────────────────────────────────────────────────────

  @zoom @responsive
  Scenario: No issues with zoomed view at 300%
    Given I set the viewport to 300% zoom equivalent
    Then there should be no critical violations at zoom

  # ─────────────────────────────────────────────────────────────────────────────
  # Screen Reader Announcements
  # ─────────────────────────────────────────────────────────────────────────────

  @screen-reader @aria-live
  Scenario: ARIA live regions exist for announcements
    Then there should be ARIA live regions on the page

  @screen-reader
  Scenario: Dynamic content changes are announced
    When I perform an action that changes content
    Then the change should be announced to screen readers
