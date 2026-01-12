@sets @gallery @readonly
Feature: Sets Gallery - Read-Only Flows
  As a LEGO collector
  I want to browse my sets collection in a read-only gallery
  So that I can view my sets, search, and filter them

  Background:
    Given I am logged in as a test user
    And the sets API is seeded with sample sets

  @smoke @happy-path
  Scenario: Sets gallery displays required elements for a populated collection
    When I navigate to the sets gallery page
    Then I should see the sets gallery page title "My Sets"
    And I should see the sets search input
    And I should see the sets sort dropdown
    And I should see set cards in the gallery grid

  @empty-state
  Scenario: Empty state when user has no sets
    Given the sets API is seeded with no sets
    When I navigate to the sets gallery page
    Then I should see the sets empty state message "Your collection is empty"
    And I should see an "Add Set" call-to-action button

  @search
  Scenario: Search filters sets by title
    When I navigate to the sets gallery page
    And I search sets for "Downtown Diner"
    Then I should see a set card with title "Downtown Diner"
    And I should not see a set card with title "Corner Garage"

  @filter
  Scenario: Filter sets by theme
    When I navigate to the sets gallery page
    And I filter sets by theme "Creator Expert"
    Then I should only see sets with theme "Creator Expert"

  @sort
  Scenario: Sort sets by piece count descending
    When I navigate to the sets gallery page
    And I sort sets by "Piece Count (High to Low)"
    Then the sets should be ordered by piece count in descending order

  @navigation
  Scenario: Navigate from gallery card to set detail page
    When I navigate to the sets gallery page
    And I open the set detail for "Downtown Diner"
    Then I should be on the set detail page for "Downtown Diner"
