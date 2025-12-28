@wishlist @gallery
Feature: Wishlist Gallery
  As a registered user
  I want to view and manage my wishlist items in a gallery
  So that I can browse and track sets I want to purchase

  Background:
    Given I am logged in as a test user
    And the wishlist API is mocked with items

  @smoke @happy-path
  Scenario: Wishlist gallery displays all required elements
    When I navigate to the wishlist page
    Then I should see the page title "Wishlist"
    And I should see the total item count
    And I should see the filter bar with search input
    And I should see the sort dropdown
    And I should see wishlist cards in the gallery

  @smoke
  Scenario: Wishlist displays item cards with correct information
    When I navigate to the wishlist page
    Then I should see a wishlist card with title "Millennium Falcon"
    And the card should show store badge "LEGO"
    And the card should show price "$849.99"
    And the card should show piece count "7,541"
    And the card should show priority indicator

  @filter
  Scenario: Filter wishlist by store using tabs
    When I navigate to the wishlist page
    And I click on the "LEGO" store tab
    Then I should only see items from store "LEGO"
    And the item count should update

  @filter
  Scenario: Filter wishlist by store - Barweer
    When I navigate to the wishlist page
    And I click on the "Barweer" store tab
    Then I should only see items from store "Barweer"

  @search
  Scenario: Search wishlist by title
    Given the wishlist API returns search results for "Falcon"
    When I navigate to the wishlist page
    And I search for "Falcon"
    Then I should see items matching "Falcon"
    And I should not see items not matching "Falcon"

  @search
  Scenario: Search wishlist by set number
    Given the wishlist API returns search results for "75192"
    When I navigate to the wishlist page
    And I search for "75192"
    Then I should see the item with set number "75192"

  @sort
  Scenario: Sort wishlist by price low to high
    When I navigate to the wishlist page
    And I select sort option "Price: Low to High"
    Then the items should be sorted by price ascending

  @sort
  Scenario: Sort wishlist by priority high to low
    When I navigate to the wishlist page
    And I select sort option "Priority: High to Low"
    Then the items should be sorted by priority descending

  @empty-state
  Scenario: Show empty state when no items
    Given the wishlist API returns empty results
    When I navigate to the wishlist page
    Then I should see the empty state message "Your wishlist is empty"
    And I should see a "Browse Sets" action button

  @empty-state
  Scenario: Show no results message when filters match nothing
    Given the wishlist API returns search results for "nonexistent"
    When I navigate to the wishlist page
    And I search for "nonexistent"
    Then I should see the message "No matching items"
    And I should see a "Clear Filters" button

  @error-handling
  Scenario: Show error state on API failure
    Given the wishlist API returns an error
    When I navigate to the wishlist page
    Then I should see the error message "Failed to load wishlist"
    And I should see a "Retry" button

  @loading
  Scenario: Show loading skeleton while fetching
    Given the wishlist API has a 2 second delay
    When I navigate to the wishlist page
    Then I should see the loading skeleton
    And after loading completes I should see wishlist items

  @accessibility
  Scenario: Gallery is keyboard navigable
    When I navigate to the wishlist page
    And I press Tab to focus on the first card
    Then the first wishlist card should be focused
    When I press Tab again
    Then the next interactive element should be focused

  @responsive
  Scenario: Gallery displays correctly on mobile viewport
    Given I am using a mobile viewport
    When I navigate to the wishlist page
    Then the gallery should display in a single column
    And the filter bar should be collapsed

  @pagination
  Scenario: Pagination controls appear for many items
    Given the wishlist has more than 20 items
    When I navigate to the wishlist page
    Then I should see pagination controls
    When I click "Next Page"
    Then I should see the next page of items
