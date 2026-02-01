@api @wishlist @crud
Feature: Wishlist API CRUD Operations
  As an API consumer
  I want to perform CRUD operations on wishlist items
  So that I can manage my wishlist programmatically

  # Stories: WISH-2001, WISH-2002, WISH-2004

  Background:
    Given the API is available
    And I am authenticated as the primary test user

  # ─────────────────────────────────────────────────────────────────────────────
  # List Operations (WISH-2001)
  # ─────────────────────────────────────────────────────────────────────────────

  @smoke @wish-2001
  Scenario: List wishlist items returns paginated results
    When I request the wishlist list endpoint
    Then the response status should be 200
    And the response should contain an "items" array
    And the response should contain "pagination" metadata
    And the pagination should have "page", "limit", "total", and "totalPages" fields

  @wish-2001
  Scenario: List with pagination parameters
    When I request the wishlist list with page 1 and limit 5
    Then the response status should be 200
    And the pagination limit should be 5
    And the items array should have at most 5 items

  @wish-2001
  Scenario: List with search filter
    Given I have created a wishlist item with title "Unique Test Falcon"
    When I request the wishlist list with search "Unique Test Falcon"
    Then the response status should be 200
    And all returned items should contain "Unique Test Falcon" in the title

  @wish-2001
  Scenario: List with store filter
    When I request the wishlist list filtered by store "LEGO"
    Then the response status should be 200
    And all returned items should have store "LEGO"

  @wish-2001
  Scenario: List with priority filter
    When I request the wishlist list filtered by priority 5
    Then the response status should be 200
    And all returned items should have priority 5

  @wish-2001
  Scenario: List with tags filter
    Given I have created a wishlist item with tags "UCS,StarWars"
    When I request the wishlist list filtered by tags "UCS"
    Then the response status should be 200
    And all returned items should contain tag "UCS"

  @wish-2001
  Scenario: List with default sorting (sortOrder ascending)
    When I request the wishlist list endpoint
    Then the response status should be 200
    And the items should be sorted by sortOrder ascending

  @wish-2001
  Scenario: List sorted by price descending
    When I request the wishlist list sorted by "price" "desc"
    Then the response status should be 200

  @wish-2001
  Scenario: List sorted by title ascending
    When I request the wishlist list sorted by "title" "asc"
    Then the response status should be 200

  @wish-2001
  Scenario: List returns counts metadata
    When I request the wishlist list endpoint
    Then the response status should be 200
    And the response should contain "counts" metadata
    And the counts should include "total" and "byStore"

  @wish-2001
  Scenario: List returns filters metadata
    When I request the wishlist list endpoint
    Then the response status should be 200
    And the response should contain "filters" metadata
    And the filters should include "availableTags" and "availableStores"

  @wish-2001
  Scenario: Get single wishlist item
    Given I have created a wishlist item
    When I request the single item endpoint
    Then the response status should be 200
    And the response should match the wishlist item schema

  @wish-2001
  Scenario: Get non-existent item returns 404
    When I request the item with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404
    And the response should contain error "NOT_FOUND"

  # ─────────────────────────────────────────────────────────────────────────────
  # Create Operations (WISH-2002)
  # ─────────────────────────────────────────────────────────────────────────────

  @smoke @wish-2002
  Scenario: Create wishlist item with all fields
    When I create a wishlist item with all fields
    Then the response status should be 201
    And the response should match the wishlist item schema
    And the response should contain a valid UUID id
    And the response should have the correct userId

  @wish-2002
  Scenario: Create wishlist item with only required fields
    When I create a wishlist item with only required fields
    Then the response status should be 201
    And the response should have default values for optional fields

  @wish-2002
  Scenario Outline: Create item with different stores
    When I create a wishlist item with store "<store>"
    Then the response status should be 201
    And the response store should be "<store>"

    Examples:
      | store     |
      | LEGO      |
      | Barweer   |
      | Cata      |
      | BrickLink |
      | Other     |

  @wish-2002
  Scenario Outline: Create item with different currencies
    When I create a wishlist item with currency "<currency>"
    Then the response status should be 201

    Examples:
      | currency |
      | USD      |
      | EUR      |
      | GBP      |
      | CAD      |
      | AUD      |

  @wish-2002
  Scenario: Create item with tags array
    When I create a wishlist item with tags "Star Wars,UCS,Display"
    Then the response status should be 201
    And the response tags should contain "Star Wars"
    And the response tags should contain "UCS"
    And the response tags should contain "Display"

  @wish-2002
  Scenario: Create item assigns sortOrder automatically
    When I create a wishlist item with only required fields
    Then the response status should be 201
    And the response should have a sortOrder value

  # ─────────────────────────────────────────────────────────────────────────────
  # Update Operations
  # ─────────────────────────────────────────────────────────────────────────────

  @smoke
  Scenario: Update wishlist item title
    Given I have created a wishlist item
    When I update the item with title "Updated Title"
    Then the response status should be 200
    And the response title should be "Updated Title"

  Scenario: Update wishlist item price
    Given I have created a wishlist item
    When I update the item with price "199.99"
    Then the response status should be 200
    And the response price should be "199.99"

  Scenario: Update wishlist item priority
    Given I have created a wishlist item with priority 1
    When I update the item with priority 5
    Then the response status should be 200
    And the response priority should be 5

  Scenario: Update item preserves unmodified fields
    Given I have created a wishlist item with title "Original" and price "99.99"
    When I update the item with title "New Title"
    Then the response status should be 200
    And the response title should be "New Title"
    And the response price should be "99.99"

  Scenario: Update non-existent item returns 404
    When I update the item with ID "00000000-0000-0000-0000-000000000000" with title "Test"
    Then the response status should be 404

  # ─────────────────────────────────────────────────────────────────────────────
  # Delete Operations (WISH-2004)
  # ─────────────────────────────────────────────────────────────────────────────

  @smoke @wish-2004
  Scenario: Delete wishlist item returns 204
    Given I have created a wishlist item
    When I delete the item
    Then the response status should be 204
    And the response body should be empty

  @wish-2004
  Scenario: Deleted item no longer accessible
    Given I have created a wishlist item
    When I delete the item
    And I request the deleted item
    Then the response status should be 404

  @wish-2004
  Scenario: Delete non-existent item returns 404
    When I delete the item with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404

  @wish-2004
  Scenario: Delete is idempotent
    Given I have created a wishlist item
    When I delete the item
    Then the response status should be 204
    When I delete the same item again
    Then the response status should be 404
