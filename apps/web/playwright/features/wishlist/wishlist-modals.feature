@wishlist @modals
Feature: Wishlist Delete and Got It Modals
  As a user
  I want confirmation and purchase flow modals
  So that I can safely remove items and track when I acquire wishlist items

  Background:
    Given I am logged in as a test user
    And the wishlist API is mocked with items
    And the delete-from-wishlist API is mocked
    And the mark-as-purchased API is mocked

  @delete @detail @wish-2004
  Scenario: Delete wishlist item from detail page with confirmation
    When I open the wishlist detail page for item "wish-002"
    And I click the "Delete" button on the detail page
    Then I should see the delete confirmation modal with the item title
    When I click "Cancel" in the delete confirmation modal
    Then the modal should close
    And the wishlist item should still be visible on the detail page
    When I click the "Delete" button on the detail page again
    And I confirm deletion in the delete confirmation modal
    Then I should see a success toast for removing the wishlist item
    And I should be redirected back to the wishlist page
    And the deleted item should no longer appear in the gallery

  @delete @gallery @wish-2004
  Scenario: Delete wishlist item from gallery card menu
    When I navigate to the wishlist page
    And I open the action menu for the wishlist card "Imperial Star Destroyer"
    And I choose the "Remove" action
    Then I should see the delete confirmation modal with the item title
    When I confirm deletion in the delete confirmation modal
    Then I should see a success toast for removing the wishlist item
    And the removed item should disappear from the gallery

  @got-it @detail @wish-2004
  Scenario: Mark wishlist item as purchased from detail page
    When I open the wishlist detail page for item "wish-001"
    And I click the "Got it!" button on the detail page
    Then I should see the Got It modal with the item summary
    And the price paid field should be pre-filled from the wishlist price
    And the purchase date field should default to today
    When I fill in the remaining purchase details
    And I submit the Got It form
    Then I should see a success toast for adding the item to my collection
    And the wishlist item should be removed from the gallery if not kept on wishlist

  @got-it @keep-on-wishlist @wish-2004
  Scenario: Keep item on wishlist after marking as purchased
    When I open the wishlist detail page for item "wish-003"
    And I click the "Got it!" button on the detail page
    And I check "Keep on wishlist" in the Got It modal
    And I submit the Got It form
    Then I should see a success toast for marking the item as purchased
    And the wishlist item should remain visible in the gallery

  @got-it @undo @wish-2004
  Scenario: Undo marking item as purchased from toast
    When I open the wishlist detail page for item "wish-004"
    And I click the "Got it!" button on the detail page
    And I submit the Got It form without keeping the item on wishlist
    Then I should see a success toast with an "Undo" action
    And the item should disappear from the wishlist gallery
    When I click the "Undo" button in the toast within five seconds
    Then the wishlist item should reappear in the gallery

  @keyboard @modals @wish-2004
  Scenario: Keyboard interaction with delete modal
    When I open the wishlist detail page for item "wish-002"
    And I open the delete confirmation modal
    And I press the Escape key
    Then the delete confirmation modal should close
    And focus should return to the delete button on the detail page
