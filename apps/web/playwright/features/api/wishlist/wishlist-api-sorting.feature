@api @wishlist @sorting
Feature: Wishlist API Sorting
  As an API consumer
  I want to sort wishlist items using various algorithms
  So that I can view items in meaningful orders

  # Stories: WISH-2014 (Smart Sorting), WISH-2001 (Standard Sorting)

  Background:
    Given the API is available
    And I am authenticated as the primary test user

  # ─────────────────────────────────────────────────────────────────────────────
  # Standard Sorting (WISH-2001)
  # ─────────────────────────────────────────────────────────────────────────────

  @smoke @wish-2001
  Scenario: Default sort is sortOrder ascending
    When I request the wishlist list endpoint
    Then the response status should be 200
    And the items should be sorted by sortOrder ascending

  @wish-2001
  Scenario Outline: Sort by standard fields
    When I request the wishlist list sorted by "<field>" "<order>"
    Then the response status should be 200

    Examples:
      | field      | order |
      | createdAt  | asc   |
      | createdAt  | desc  |
      | title      | asc   |
      | title      | desc  |
      | price      | asc   |
      | price      | desc  |
      | pieceCount | asc   |
      | pieceCount | desc  |
      | priority   | asc   |
      | priority   | desc  |

  @wish-2001
  Scenario: Sort by title ascending
    Given I have created items with titles "Zebra Set", "Apple Set", "Mango Set"
    When I request the wishlist list sorted by "title" "asc"
    Then the response status should be 200
    And the first item title should come before the last item title alphabetically

  @wish-2001
  Scenario: Sort by price ascending
    Given I have created items with prices "99.99", "19.99", "49.99"
    When I request the wishlist list sorted by "price" "asc"
    Then the response status should be 200
    And items should be ordered by price from lowest to highest

  @wish-2001
  Scenario: Sort by priority descending
    Given I have created items with priorities 1, 5, 3
    When I request the wishlist list sorted by "priority" "desc"
    Then the response status should be 200
    And items should be ordered by priority from highest to lowest

  @wish-2001
  Scenario: Invalid sort field returns 400
    When I request the wishlist list sorted by "invalidField" "asc"
    Then the response status should be 400
    And the response should contain a validation error

  @wish-2001
  Scenario: Invalid sort order returns 400
    When I request the wishlist list sorted by "price" "invalid"
    Then the response status should be 400

  # ─────────────────────────────────────────────────────────────────────────────
  # Smart Sorting - Best Value (WISH-2014)
  # ─────────────────────────────────────────────────────────────────────────────

  @smoke @wish-2014
  Scenario: Sort by bestValue algorithm
    When I request the wishlist list sorted by "bestValue" "asc"
    Then the response status should be 200

  @wish-2014
  Scenario: bestValue sorts by price-per-piece ratio
    Given I have created item "Expensive Small" with price "100.00" and pieceCount 100
    And I have created item "Cheap Large" with price "50.00" and pieceCount 500
    And I have created item "Medium Value" with price "100.00" and pieceCount 200
    When I request the wishlist list sorted by "bestValue" "asc"
    Then the response status should be 200
    And "Cheap Large" should appear before "Expensive Small" in results

  @wish-2014
  Scenario: bestValue handles items without price
    Given I have created item "No Price" without price but with pieceCount 500
    And I have created item "With Price" with price "50.00" and pieceCount 500
    When I request the wishlist list sorted by "bestValue" "asc"
    Then the response status should be 200
    And items without price should appear at the end

  @wish-2014
  Scenario: bestValue handles items without pieceCount
    Given I have created item "No Pieces" with price "50.00" but without pieceCount
    And I have created item "With Pieces" with price "50.00" and pieceCount 500
    When I request the wishlist list sorted by "bestValue" "asc"
    Then the response status should be 200

  # ─────────────────────────────────────────────────────────────────────────────
  # Smart Sorting - Expiring Soon (WISH-2014)
  # ─────────────────────────────────────────────────────────────────────────────

  @smoke @wish-2014
  Scenario: Sort by expiringSoon algorithm
    When I request the wishlist list sorted by "expiringSoon" "asc"
    Then the response status should be 200

  @wish-2014
  Scenario: expiringSoon sorts by releaseDate oldest first
    Given I have created item "Old Set" with releaseDate "2020-01-01"
    And I have created item "New Set" with releaseDate "2024-01-01"
    And I have created item "Mid Set" with releaseDate "2022-06-15"
    When I request the wishlist list sorted by "expiringSoon" "asc"
    Then the response status should be 200
    And "Old Set" should appear before "New Set" in results

  @wish-2014
  Scenario: expiringSoon handles items without releaseDate
    Given I have created item "No Date" without releaseDate
    And I have created item "With Date" with releaseDate "2023-01-01"
    When I request the wishlist list sorted by "expiringSoon" "asc"
    Then the response status should be 200

  # ─────────────────────────────────────────────────────────────────────────────
  # Smart Sorting - Hidden Gems (WISH-2014)
  # ─────────────────────────────────────────────────────────────────────────────

  @smoke @wish-2014
  Scenario: Sort by hiddenGems algorithm
    When I request the wishlist list sorted by "hiddenGems" "desc"
    Then the response status should be 200

  @wish-2014
  Scenario: hiddenGems prioritizes low-priority high-pieceCount items
    Given I have created item "Hidden Gem" with priority 1 and pieceCount 5000
    And I have created item "Popular Set" with priority 5 and pieceCount 1000
    And I have created item "Small Low Priority" with priority 1 and pieceCount 100
    When I request the wishlist list sorted by "hiddenGems" "desc"
    Then the response status should be 200
    # Hidden gems formula: (5 - priority) * pieceCount
    # Hidden Gem: (5-1) * 5000 = 20000
    # Popular Set: (5-5) * 1000 = 0
    # Small Low Priority: (5-1) * 100 = 400
    And "Hidden Gem" should appear before "Popular Set" in results

  @wish-2014
  Scenario: hiddenGems handles items without pieceCount
    Given I have created item "No Pieces Hidden" with priority 1 but without pieceCount
    And I have created item "With Pieces" with priority 1 and pieceCount 500
    When I request the wishlist list sorted by "hiddenGems" "desc"
    Then the response status should be 200

  # ─────────────────────────────────────────────────────────────────────────────
  # Combined Sorting and Filtering
  # ─────────────────────────────────────────────────────────────────────────────

  @wish-2014
  Scenario: Smart sorting works with store filter
    Given I have created multiple items with different stores and values
    When I request the wishlist list filtered by store "LEGO" sorted by "bestValue" "asc"
    Then the response status should be 200
    And all returned items should have store "LEGO"

  @wish-2014
  Scenario: Smart sorting works with search filter
    Given I have created items with title containing "Falcon" with different values
    When I request the wishlist list with search "Falcon" sorted by "bestValue" "asc"
    Then the response status should be 200
    And all returned items should contain "Falcon" in the title

  @wish-2014
  Scenario: Smart sorting works with pagination
    Given I have created 25 wishlist items with varying values
    When I request the wishlist list sorted by "bestValue" "asc" with page 1 and limit 10
    Then the response status should be 200
    And the items array should have 10 items
    And the pagination total should be 25
