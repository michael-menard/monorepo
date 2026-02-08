@inspiration @gallery @e2e
Feature: Inspiration Gallery
  As a LEGO MOC builder
  I want to view and manage my visual inspirations
  So that I can organize ideas for my builds

  # ─────────────────────────────────────────────────────────────────────────────
  # Gallery Loading
  # ─────────────────────────────────────────────────────────────────────────────

  @smoke @happy-path
  Scenario: User views inspiration gallery
    Given I am logged in as a test user
    When I navigate to the inspiration gallery
    Then I should see the "Inspiration Gallery" heading
    And I should see the "Add Inspiration" button
    And I should see the "New Album" button

  @smoke
  Scenario: Gallery displays inspiration cards
    Given I am logged in as a test user
    And I have at least one inspiration saved
    When I navigate to the inspiration gallery
    Then I should see inspiration cards displayed
    And each card should show an image
    And each card should show a title

  # ─────────────────────────────────────────────────────────────────────────────
  # Tab Navigation
  # ─────────────────────────────────────────────────────────────────────────────

  @navigation
  Scenario: User switches between All Inspirations and Albums tabs
    Given I am logged in as a test user
    And I am on the inspiration gallery
    When I click the "Albums" tab
    Then the Albums tab should be active
    And I should see album content or empty state

  @navigation
  Scenario: User returns to All Inspirations tab
    Given I am logged in as a test user
    And I am on the inspiration gallery Albums tab
    When I click the "All Inspirations" tab
    Then the All Inspirations tab should be active
    And I should see inspiration content or empty state

  # ─────────────────────────────────────────────────────────────────────────────
  # Search
  # ─────────────────────────────────────────────────────────────────────────────

  @search
  Scenario: User searches for inspirations
    Given I am logged in as a test user
    And I am on the inspiration gallery
    And I have inspirations with the title "Castle Design"
    When I type "Castle" in the search field
    Then I should see filtered results matching "Castle"

  @search
  Scenario: User clears search
    Given I am logged in as a test user
    And I am on the inspiration gallery
    And I have searched for "Castle"
    When I clear the search field
    Then I should see all my inspirations

  @search
  Scenario: Search with no results shows empty state
    Given I am logged in as a test user
    And I am on the inspiration gallery
    When I search for "zzzznonexistent99999"
    Then I should see the no results empty state

  # ─────────────────────────────────────────────────────────────────────────────
  # Sorting
  # ─────────────────────────────────────────────────────────────────────────────

  @sorting
  Scenario: User sorts by title
    Given I am logged in as a test user
    And I am on the inspiration gallery
    When I select "Title" from the sort dropdown
    Then inspirations should be sorted alphabetically by title

  @sorting
  Scenario: User sorts by date added
    Given I am logged in as a test user
    And I am on the inspiration gallery
    When I select "Date Added" from the sort dropdown
    Then inspirations should be sorted by date with newest first

  @sorting
  Scenario: User sorts by custom order
    Given I am logged in as a test user
    And I am on the inspiration gallery
    When I select "Custom Order" from the sort dropdown
    Then inspirations should be displayed in custom order

  # ─────────────────────────────────────────────────────────────────────────────
  # View Toggle
  # ─────────────────────────────────────────────────────────────────────────────

  @view
  Scenario: User switches to list view
    Given I am logged in as a test user
    And I am on the inspiration gallery in grid view
    When I click the list view button
    Then inspirations should be displayed in list format

  @view
  Scenario: User switches back to grid view
    Given I am logged in as a test user
    And I am on the inspiration gallery in list view
    When I click the grid view button
    Then inspirations should be displayed in grid format

  # ─────────────────────────────────────────────────────────────────────────────
  # Multi-Select
  # ─────────────────────────────────────────────────────────────────────────────

  @multi-select
  Scenario: User enters multi-select mode
    Given I am logged in as a test user
    And I am on the inspiration gallery
    When I click the "Select" button
    Then I should be in multi-select mode
    And inspiration cards should show selection checkboxes

  @multi-select
  Scenario: User selects multiple inspirations
    Given I am logged in as a test user
    And I am on the inspiration gallery in multi-select mode
    And I have at least 3 inspirations
    When I click on the first inspiration
    And I click on the third inspiration
    Then 2 inspirations should be selected
    And the bulk actions bar should show "2 inspirations selected"

  @multi-select
  Scenario: User selects all inspirations
    Given I am logged in as a test user
    And I am on the inspiration gallery in multi-select mode
    When I press Ctrl+A
    Then all inspirations should be selected
    And the bulk actions bar should appear

  @multi-select
  Scenario: User clears selection
    Given I am logged in as a test user
    And I am on the inspiration gallery with items selected
    When I press Escape
    Then no inspirations should be selected
    And the bulk actions bar should disappear
