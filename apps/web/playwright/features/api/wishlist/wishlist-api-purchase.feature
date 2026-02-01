@api @wishlist @purchase
Feature: Wishlist API Purchase Flow
  As an API consumer
  I want to mark wishlist items as purchased
  So that they are moved to my Sets collection

  # Story: WISH-2042 (Purchase Flow), WISH-2004 (Delete/Modal actions)

  Background:
    Given the API is available
    And I am authenticated as the primary test user

  # ─────────────────────────────────────────────────────────────────────────────
  # Basic Purchase Flow (WISH-2042)
  # ─────────────────────────────────────────────────────────────────────────────

  @smoke @wish-2042
  Scenario: Mark item as purchased creates a Set
    Given I have created a wishlist item with title "Test Purchase Set"
    When I mark the item as purchased with price "99.99"
    Then the response status should be 201
    And the response should match the Set item schema
    And the Set title should be "Test Purchase Set"

  @wish-2042
  Scenario: Purchase removes item from wishlist by default
    Given I have created a wishlist item
    When I mark the item as purchased with keepOnWishlist false
    Then the response status should be 201
    When I request the original wishlist item
    Then the response status should be 404

  @wish-2042
  Scenario: Purchase with keepOnWishlist true retains item
    Given I have created a wishlist item
    When I mark the item as purchased with keepOnWishlist true
    Then the response status should be 201
    When I request the original wishlist item
    Then the response status should be 200

  @wish-2042
  Scenario: Purchase copies item data to Set
    Given I have created a wishlist item with all fields
    When I mark the item as purchased
    Then the response status should be 201
    And the Set should have the same title as the wishlist item
    And the Set should have the same setNumber as the wishlist item
    And the Set should have the same pieceCount as the wishlist item
    And the Set should reference the original wishlist item ID

  # ─────────────────────────────────────────────────────────────────────────────
  # Purchase Details
  # ─────────────────────────────────────────────────────────────────────────────

  @wish-2042
  Scenario: Purchase with all price details
    Given I have created a wishlist item
    When I mark the item as purchased with:
      | pricePaid    | 99.99      |
      | tax          | 8.50       |
      | shipping     | 5.99       |
      | quantity     | 1          |
    Then the response status should be 201
    And the Set purchasePrice should be "99.99"
    And the Set tax should be "8.50"
    And the Set shipping should be "5.99"

  @wish-2042
  Scenario: Purchase with quantity greater than 1
    Given I have created a wishlist item
    When I mark the item as purchased with quantity 3
    Then the response status should be 201
    And the Set quantity should be 3

  @wish-2042
  Scenario: Purchase with custom date
    Given I have created a wishlist item
    When I mark the item as purchased with purchaseDate "2024-06-15T10:00:00.000Z"
    Then the response status should be 201
    And the Set purchaseDate should contain "2024-06-15"

  @wish-2042
  Scenario: Purchase defaults to today's date
    Given I have created a wishlist item
    When I mark the item as purchased without specifying date
    Then the response status should be 201
    And the Set should have a purchaseDate

  @wish-2042
  Scenario: Purchase with minimal data
    Given I have created a wishlist item
    When I mark the item as purchased with only quantity 1
    Then the response status should be 201
    And the Set should be created successfully

  # ─────────────────────────────────────────────────────────────────────────────
  # Validation Errors
  # ─────────────────────────────────────────────────────────────────────────────

  @wish-2042 @validation
  Scenario: Purchase with invalid price format returns 400
    Given I have created a wishlist item
    When I mark the item as purchased with price "invalid"
    Then the response status should be 400
    And the response should contain error "Validation failed"

  @wish-2042 @validation
  Scenario: Purchase with negative price returns 400
    Given I have created a wishlist item
    When I mark the item as purchased with price "-10.00"
    Then the response status should be 400

  @wish-2042 @validation
  Scenario: Purchase with zero quantity returns 400
    Given I have created a wishlist item
    When I mark the item as purchased with quantity 0
    Then the response status should be 400
    And the response should contain error about quantity

  @wish-2042 @validation
  Scenario: Purchase with negative quantity returns 400
    Given I have created a wishlist item
    When I mark the item as purchased with quantity -1
    Then the response status should be 400

  @wish-2042 @validation
  Scenario: Purchase with future date returns 400
    Given I have created a wishlist item
    When I mark the item as purchased with a future date
    Then the response status should be 400
    And the response should contain error about purchase date

  @wish-2042 @validation
  Scenario: Purchase with invalid tax format returns 400
    Given I have created a wishlist item
    When I mark the item as purchased with tax "invalid"
    Then the response status should be 400

  @wish-2042 @validation
  Scenario: Purchase with invalid shipping format returns 400
    Given I have created a wishlist item
    When I mark the item as purchased with shipping "invalid"
    Then the response status should be 400

  # ─────────────────────────────────────────────────────────────────────────────
  # Error Cases
  # ─────────────────────────────────────────────────────────────────────────────

  @wish-2042
  Scenario: Purchase non-existent item returns 404
    When I mark item "00000000-0000-0000-0000-000000000000" as purchased
    Then the response status should be 404
    And the response should contain error "NOT_FOUND"

  @wish-2042 @auth
  Scenario: Purchase another user's item returns 404
    Given the secondary user has created a wishlist item
    When I try to purchase the secondary user's item
    Then the response status should be 404

  @wish-2042
  Scenario: Purchase already-deleted item returns 404
    Given I have created a wishlist item
    And I have deleted the item
    When I try to mark the deleted item as purchased
    Then the response status should be 404

  # ─────────────────────────────────────────────────────────────────────────────
  # Set Item Data Integrity
  # ─────────────────────────────────────────────────────────────────────────────

  @wish-2042
  Scenario: Set item has correct default values
    Given I have created a wishlist item
    When I mark the item as purchased
    Then the response status should be 201
    And the Set isBuilt should be false
    And the Set should have a valid UUID id
    And the Set userId should match my user ID

  @wish-2042
  Scenario: Set item includes wishlistItemId reference
    Given I have created a wishlist item
    When I mark the item as purchased with keepOnWishlist true
    Then the response status should be 201
    And the Set wishlistItemId should match the original item ID

  @wish-2042
  Scenario: Multiple purchases of same item (with keepOnWishlist)
    Given I have created a wishlist item
    When I mark the item as purchased with keepOnWishlist true and quantity 1
    Then the response status should be 201
    When I mark the same item as purchased again with keepOnWishlist true and quantity 2
    Then the response status should be 201
    # Creates two separate Set entries
