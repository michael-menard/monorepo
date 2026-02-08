@instructions @moc-detail
Feature: MOC Detail Page
  As a MOC builder
  I want to view detailed information about my MOCs
  So that I can manage instructions, parts, and build progress

  Background:
    Given I am logged in as a test user
    And I navigate to the instructions gallery
    And the instructions gallery has items

  # ─────────────────────────────────────────────────────────────────────────────
  # Navigation
  # ─────────────────────────────────────────────────────────────────────────────

  @smoke @navigation
  Scenario: User navigates to MOC detail page from gallery card
    Given I click on the first MOC card
    Then I should be on the MOC detail page
    And the URL should contain the MOC ID
    And the MOC title should be displayed

  @navigation @direct-url
  Scenario: Detail page loads directly via URL
    When I navigate directly to a MOC detail URL
    Then either the detail page loads or an error page appears

  # ─────────────────────────────────────────────────────────────────────────────
  # Layout and Sidebar
  # ─────────────────────────────────────────────────────────────────────────────

  @layout @desktop
  Scenario: Desktop displays 12-column grid with sticky sidebar
    Given I am using a desktop viewport
    And I click on the first MOC card
    Then I should see the MOC detail dashboard
    And the sidebar should be visible
    And the main area should be visible
    And the sidebar should have sticky positioning

  @sidebar
  Scenario: Sidebar displays cover image card
    Given I click on the first MOC card
    Then I should see the MOC detail dashboard
    And the sidebar should contain a cover image

  @sidebar @metadata
  Scenario: Sidebar displays metadata card
    Given I click on the first MOC card
    And I should see the MOC title in the sidebar

  # ─────────────────────────────────────────────────────────────────────────────
  # Main Area Content
  # ─────────────────────────────────────────────────────────────────────────────

  @main-area @stats
  Scenario: Main area displays stats section
    Given I click on the first MOC card
    Then I should see the MOC detail dashboard
    And the main area should display numeric stats

  @main-area @cards
  Scenario: Main area displays draggable dashboard cards
    Given I click on the first MOC card
    Then I should see the MOC detail dashboard
    And I should see the "Instructions" card
    And I should see the "Parts Lists" card
    And I should see the "Gallery" card
    And I should see the "Parts Orders" card

  # ─────────────────────────────────────────────────────────────────────────────
  # Card Order Persistence
  # ─────────────────────────────────────────────────────────────────────────────

  @persistence @drag-drop
  Scenario: Card order persists to localStorage after drag
    Given I click on the first MOC card
    And I see the dashboard cards
    When I drag the first card to the second position
    Then the card order should be saved to localStorage

  @persistence
  Scenario: Card order restores from localStorage on page load
    Given I have a custom card order saved in localStorage
    When I click on the first MOC card
    Then the cards should be displayed in the saved order

  # ─────────────────────────────────────────────────────────────────────────────
  # Mobile Responsive
  # ─────────────────────────────────────────────────────────────────────────────

  @responsive @mobile
  Scenario: Mobile layout stacks sections vertically
    Given I am using a mobile viewport
    And I click on the first MOC card
    Then I should see the MOC detail dashboard
    And the sidebar should be visible
    And the main area should be visible
    And sections should be stacked vertically

  @responsive @mobile @scroll
  Scenario: All sections remain accessible on mobile via scrolling
    Given I am using a mobile viewport
    And I click on the first MOC card
    Then I should see the "Instructions" card
    When I scroll down the page
    Then I should see the "Parts Lists" card
    And I should see the "Gallery" card

  # ─────────────────────────────────────────────────────────────────────────────
  # Loading States
  # ─────────────────────────────────────────────────────────────────────────────

  @loading
  Scenario: Loading skeleton displays while fetching
    When I navigate to a MOC detail page
    Then either a loading skeleton or the dashboard should be visible

  # ─────────────────────────────────────────────────────────────────────────────
  # Error Handling
  # ─────────────────────────────────────────────────────────────────────────────

  @error @404
  Scenario: Invalid MOC ID displays 404 message
    When I navigate to an invalid MOC detail URL
    Then I should see a "not found" or error message

  @error @retry
  Scenario: Error page provides retry option
    When I navigate to an invalid MOC detail URL
    Then I should see a retry or back button

  # ─────────────────────────────────────────────────────────────────────────────
  # Accessibility
  # ─────────────────────────────────────────────────────────────────────────────

  @accessibility @aria
  Scenario: Dashboard cards have proper ARIA labels
    Given I click on the first MOC card
    Then draggable cards should have aria-roledescription

  @accessibility @keyboard
  Scenario: Keyboard navigation works for draggable cards
    Given I click on the first MOC card
    When I press Tab
    Then focus should move to focusable elements

  # ─────────────────────────────────────────────────────────────────────────────
  # Performance
  # ─────────────────────────────────────────────────────────────────────────────

  @performance
  Scenario: MOC detail page loads within reasonable time
    When I click on the first MOC card
    Then the MOC detail dashboard should load within 5 seconds
