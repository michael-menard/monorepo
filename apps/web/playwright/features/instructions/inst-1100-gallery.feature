@instructions @gallery @e2e
Feature: View MOC Gallery (INST-1100)
  As a LEGO MOC builder
  I want to view my MOC instruction collection
  So that I can browse and manage my builds

  # ─────────────────────────────────────────────────────────────────────────────
  # Gallery Display (AC-1, AC-2, AC-3)
  # ─────────────────────────────────────────────────────────────────────────────

  @smoke @happy-path
  Scenario: Display user's MOC collection in grid
    Given I am logged in as a test user
    And I have MOCs in my collection
    When I navigate to the instructions gallery
    Then I should see the gallery region with proper accessibility
    And I should see MOC cards displayed in a grid
    And each card should show thumbnail, title, piece count, and theme

  @responsive
  Scenario: Gallery grid is responsive at mobile width
    Given I am logged in as a test user
    And I have MOCs in my collection
    When I navigate to the instructions gallery at 375px width
    Then the gallery grid should be visible
    And the grid should display 1 column

  @responsive
  Scenario: Gallery grid is responsive at tablet width
    Given I am logged in as a test user
    And I have MOCs in my collection
    When I navigate to the instructions gallery at 768px width
    Then the gallery grid should be visible
    And the grid should display 2 columns

  @responsive
  Scenario: Gallery grid is responsive at desktop width
    Given I am logged in as a test user
    And I have MOCs in my collection
    When I navigate to the instructions gallery at 1280px width
    Then the gallery grid should be visible
    And the grid should display 3 or more columns

  # ─────────────────────────────────────────────────────────────────────────────
  # Empty State (AC-4, AC-5, AC-6)
  # ─────────────────────────────────────────────────────────────────────────────

  @empty-state
  Scenario: Empty gallery displays appropriate message and CTA
    Given I am logged in as a test user
    And I have no MOCs in my collection
    When I navigate to the instructions gallery
    Then I should see the gallery empty state with message "No instructions yet"
    And I should see the "Create your first MOC" button
    And the empty state should be announced to screen readers

  # ─────────────────────────────────────────────────────────────────────────────
  # Loading State (AC-7, AC-8, AC-9)
  # ─────────────────────────────────────────────────────────────────────────────

  @loading
  Scenario: Gallery shows loading skeletons while fetching data
    Given I am logged in as a test user
    When I navigate to the instructions gallery
    Then I should see loading skeletons initially
    And the loading state should be announced to screen readers
    And the skeletons should be replaced by content when loaded

  # ─────────────────────────────────────────────────────────────────────────────
  # Error Handling (AC-14, AC-15, AC-16)
  # ─────────────────────────────────────────────────────────────────────────────

  @error-handling
  Scenario: Error state displays with retry option on API failure
    Given I am logged in as a test user
    And the MOC API returns an error
    When I navigate to the instructions gallery
    Then I should see an error message
    And I should see a "Try Again" button
    When I click the "Try Again" button
    Then the gallery should attempt to reload

  # ─────────────────────────────────────────────────────────────────────────────
  # Accessibility (AC-17, AC-18, AC-19, AC-20, AC-21)
  # ─────────────────────────────────────────────────────────────────────────────

  @accessibility
  Scenario: Gallery has proper ARIA attributes
    Given I am logged in as a test user
    And I have MOCs in my collection
    When I navigate to the instructions gallery
    Then the gallery region should have role="region"
    And the gallery region should have aria-label="MOC Gallery"

  @accessibility @keyboard
  Scenario: MOC cards are keyboard navigable
    Given I am logged in as a test user
    And I have MOCs in my collection
    When I navigate to the instructions gallery
    And I press Tab to navigate through cards
    Then each card should receive focus
    And focus should be visible with a ring indicator

  @accessibility @keyboard
  Scenario: Cards can be activated with keyboard
    Given I am logged in as a test user
    And I have MOCs in my collection
    When I navigate to the instructions gallery
    And I focus on the first MOC card
    And I press Enter
    Then I should navigate to the MOC detail page

  # ─────────────────────────────────────────────────────────────────────────────
  # Search and Filter (TEST-001 coverage)
  # ─────────────────────────────────────────────────────────────────────────────

  @search
  Scenario: User can search for instructions by name
    Given I am logged in as a test user
    And I have MOCs with titles "Castle" and "Spaceship" in my collection
    When I navigate to the instructions gallery
    And I type "Castle" in the instructions search field
    Then I should see instructions filtered results matching "Castle"
    And I should not see results matching "Spaceship"

  @search
  Scenario: Search with no results shows empty state
    Given I am logged in as a test user
    And I have MOCs in my collection
    When I navigate to the instructions gallery
    And I search instructions for "zzzznonexistent99999"
    Then I should see the empty state for no search results

  @search
  Scenario: User can clear search to show all results
    Given I am logged in as a test user
    And I have MOCs in my collection
    When I navigate to the instructions gallery
    And I search instructions for "Castle"
    And I clear the instructions search field
    Then I should see all my MOCs

  # ─────────────────────────────────────────────────────────────────────────────
  # Card Interactions (TEST-002 coverage)
  # ─────────────────────────────────────────────────────────────────────────────

  @card-interaction
  Scenario: Clicking a MOC card navigates to detail page
    Given I am logged in as a test user
    And I have MOCs in my collection
    When I navigate to the instructions gallery
    And I click on the first MOC card
    Then I should navigate to the MOC detail page

  @card-interaction
  Scenario: User can toggle favorite on a MOC card
    Given I am logged in as a test user
    And I have MOCs in my collection
    When I navigate to the instructions gallery
    And I click the favorite button on the first MOC card
    Then the favorite status should toggle

  @card-interaction
  Scenario: User can access edit from a MOC card
    Given I am logged in as a test user
    And I have MOCs in my collection
    When I navigate to the instructions gallery
    And I click the edit button on the first MOC card
    Then I should navigate to the MOC edit page

  # ─────────────────────────────────────────────────────────────────────────────
  # View Toggle
  # ─────────────────────────────────────────────────────────────────────────────

  @view-toggle
  Scenario: User can switch between grid and datatable view
    Given I am logged in as a test user
    And I have MOCs in my collection
    When I navigate to the instructions gallery
    And I click the list view button
    Then I should see instructions in datatable format
    When I click the grid view button
    Then I should see instructions in grid format

  # ─────────────────────────────────────────────────────────────────────────────
  # Filter Bar
  # ─────────────────────────────────────────────────────────────────────────────

  @filter-bar
  Scenario: Filter bar displays search input
    Given I am logged in as a test user
    When I navigate to the instructions gallery
    Then I should see the filter bar
    And the filter bar should have a search input with placeholder "Search instructions..."
