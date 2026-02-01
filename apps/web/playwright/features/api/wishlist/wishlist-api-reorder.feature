@api @wishlist @reorder
Feature: Wishlist API Reorder Operations
  As an API consumer
  I want to reorder my wishlist items
  So that I can organize them according to my preferences

  # Story: WISH-2005a (Drag-and-drop Reordering)

  Background:
    Given the API is available
    And I am authenticated as the primary test user

  # ─────────────────────────────────────────────────────────────────────────────
  # Basic Reorder Operations
  # ─────────────────────────────────────────────────────────────────────────────

  @smoke @wish-2005a
  Scenario: Batch reorder multiple items
    Given I have created 5 wishlist items
    When I reorder the items with new sort orders
    Then the response status should be 200
    And the response should contain "updated" count of 5
    And the items should have the new sort orders when listed

  @wish-2005a
  Scenario: Reorder single item
    Given I have created 3 wishlist items
    When I reorder item 3 to position 1
    Then the response status should be 200
    And the response should contain "updated" count of 1

  @wish-2005a
  Scenario: Reorder updates sortOrder correctly
    Given I have created items "Item A", "Item B", "Item C" with sortOrders 0, 1, 2
    When I reorder with "Item C" at 0, "Item A" at 1, "Item B" at 2
    Then the response status should be 200
    When I request the wishlist list sorted by "sortOrder" "asc"
    Then the first item should be "Item C"
    And the second item should be "Item A"
    And the third item should be "Item B"

  @wish-2005a
  Scenario: Reorder preserves unmentioned items
    Given I have created 5 wishlist items
    When I reorder only the first 2 items
    Then the response status should be 200
    And the unreordered items should maintain their original sortOrder

  # ─────────────────────────────────────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────────────────────────────────────

  @wish-2005a
  Scenario: Reorder with same sortOrder values
    Given I have created 2 wishlist items
    When I reorder both items to sortOrder 0
    Then the response status should be 200
    # Implementation may handle duplicates gracefully

  @wish-2005a
  Scenario: Reorder with large sortOrder gaps
    Given I have created 3 wishlist items
    When I reorder with sortOrders 0, 100, 500
    Then the response status should be 200
    And the items should maintain relative ordering when listed

  @wish-2005a
  Scenario: Reorder with zero sortOrder
    Given I have created 2 wishlist items with sortOrders 1 and 2
    When I reorder item 2 to sortOrder 0
    Then the response status should be 200

  # ─────────────────────────────────────────────────────────────────────────────
  # Validation Errors
  # ─────────────────────────────────────────────────────────────────────────────

  @wish-2005a @validation
  Scenario: Reorder with empty items array returns 400
    When I send a reorder request with empty items array
    Then the response status should be 400
    And the response should contain error "Validation failed"

  @wish-2005a @validation
  Scenario: Reorder with invalid UUID returns 400
    When I send a reorder request with invalid item ID "not-a-uuid"
    Then the response status should be 400
    And the response should contain a validation error for "id"

  @wish-2005a @validation
  Scenario: Reorder with negative sortOrder returns 400
    Given I have created a wishlist item
    When I send a reorder request with sortOrder -1
    Then the response status should be 400
    And the response should contain error about sortOrder

  @wish-2005a @validation
  Scenario: Reorder with non-integer sortOrder returns 400
    Given I have created a wishlist item
    When I send a reorder request with decimal sortOrder "1.5"
    Then the response status should be 400

  @wish-2005a @validation
  Scenario: Reorder non-existent item returns 400
    When I send a reorder request with non-existent item ID
    Then the response status should be 400
    And the response should contain error "VALIDATION_ERROR"

  # ─────────────────────────────────────────────────────────────────────────────
  # Authorization
  # ─────────────────────────────────────────────────────────────────────────────

  @wish-2005a @auth
  Scenario: Cannot reorder another user's items
    Given the secondary user has created a wishlist item
    When I try to reorder the secondary user's item
    Then the response status should be 400
    # Returns 400 VALIDATION_ERROR because item doesn't exist for this user

  @wish-2005a @auth
  Scenario: Partial reorder fails if any item belongs to another user
    Given I have created a wishlist item
    And the secondary user has created a wishlist item
    When I send a reorder request including both items
    Then the response status should be 400

  # ─────────────────────────────────────────────────────────────────────────────
  # Concurrent Operations
  # ─────────────────────────────────────────────────────────────────────────────

  @wish-2005a @concurrent
  Scenario: Reorder after item deletion
    Given I have created 3 wishlist items
    And I have deleted the second item
    When I reorder the remaining 2 items
    Then the response status should be 200

  @wish-2005a
  Scenario: Reorder reflects in subsequent list calls
    Given I have created items "First", "Second", "Third"
    When I reorder "Third" to position 0
    And I request the wishlist list sorted by "sortOrder" "asc"
    Then the first item should be "Third"
