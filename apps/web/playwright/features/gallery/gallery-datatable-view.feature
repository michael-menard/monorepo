@gallery @datatable
Feature: Gallery Datatable View Mode
  As a gallery user on desktop or tablet
  I want to switch between grid and datatable views
  So that I can inspect items in a structured table with sortable columns

  # NOTE: These scenarios run against a real backend.
  # Test data assumptions (must be provided by environment/fixtures):
  # - A test user exists with wishlist items
  # - The wishlist gallery is available at "/wishlist"

  Background:
    Given I am logged in as a real gallery user

  @view-toggle @smoke
  Scenario: Toggle between grid and table view on desktop
    When I navigate to the wishlist gallery page
    Then I should see the gallery view toggle
    And the gallery should be in grid view
    When I switch the gallery to table view
    Then the gallery should be in table view
    And the gallery grid should not be visible

  @view-toggle @responsive
  Scenario: Table view is not available on mobile
    Given I am using a mobile viewport
    When I navigate to the wishlist gallery page
    Then I should not see the gallery view toggle
    And the gallery should be in grid view

  @persistence
  Scenario: Remember last selected view mode for wishlist gallery
    When I navigate to the wishlist gallery page
    And I switch the gallery to table view
    Then the gallery should be in table view
    When I reload the wishlist gallery page
    Then the gallery should still be in table view

  @tooltip @ux
  Scenario: First-time users see tooltip hint for table view
    When I navigate to the wishlist gallery page as a first-time viewer
    Then I should see a "Try table view" tooltip for the gallery view toggle

  @columns @smoke
  Scenario: Datatable renders wishlist-specific columns
    When I navigate to the wishlist gallery page
    And I switch the gallery to table view
    Then I should see a gallery table column header "Title"
    And I should see a gallery table column header "Store"
    And I should see a gallery table column header "Price"
    And I should see a gallery table column header "Pieces"
    And I should see a gallery table column header "Priority"

  @row-interactions
  Scenario: Clicking a table row opens the item detail view
    When I navigate to the wishlist gallery page
    And I switch the gallery to table view
    And I click the first gallery table row
    Then I should be navigated to the wishlist item detail page

  @loading
  Scenario: Show datatable loading skeleton on initial load
    When I navigate to the wishlist gallery page
    And I switch the gallery to table view
    Then I should see the gallery table loading skeleton while data is loading
    And after the gallery table finishes loading I should see table rows

  @empty-state
  Scenario: Show datatable empty state when no items
    # Backend fixture must ensure this user has an entirely empty wishlist.
    Given the wishlist for the real user has no items
    When I navigate to the wishlist gallery page
    And I switch the gallery to table view
    Then I should see the gallery table empty state
    And the datatable empty title should be "Your wishlist is empty"

  @empty-state
  Scenario: Show datatable no-results state when filters match nothing
    # Backend fixture must ensure this user has items but the current filters match nothing.
    Given the wishlist for the real user has items that do not match the active filters
    When I navigate to the wishlist gallery page
    And I switch the gallery to table view
    Then I should see the gallery table empty state
    And the datatable empty title should be "No results match your filters"
    And I should see the datatable clear filters button

  @error-handling
  Scenario: Show datatable error state when backend fails
    # Environment/backend must be configured to return an error for the wishlist list endpoint.
    Given the wishlist backend is unreachable or returns an error
    When I navigate to the wishlist gallery page
    And I switch the gallery to table view
    Then I should see the gallery table error state

  @sorting @multi-column
  Scenario: Sort by single column in table view
    When I navigate to the wishlist gallery page
    And I switch the gallery to table view
    And I sort the gallery table by column "Price"
    Then the gallery table should indicate that column "Price" is sorted ascending
    When I sort the gallery table by column "Price" again
    Then the gallery table should indicate that column "Price" is sorted descending

  @sorting @multi-column
  Scenario: Sort by two columns with priority indicators
    When I navigate to the wishlist gallery page
    And I switch the gallery to table view
    And I sort the gallery table by column "Title"
    And I sort the gallery table by column "Price"
    Then the gallery table should indicate that column "Title" is the primary sort
    And the gallery table should indicate that column "Price" is the secondary sort
    And the gallery table should not allow more than 2 active sort columns

  @sorting @clear
  Scenario: Clear all table sorts and return to default title sort
    When I navigate to the wishlist gallery page
    And I switch the gallery to table view
    And I sort the gallery table by column "Price"
    And I click the "Clear sorts" button
    Then the gallery table should indicate that column "Title" is sorted ascending by default
