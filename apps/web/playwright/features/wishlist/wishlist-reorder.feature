@wishlist @reorder
Feature: Wishlist Priority Reorder and Empty States
  As a user
  I want polished wishlist interactions
  So that I can efficiently organize my wishlist with intuitive feedback

  Background:
    Given I am logged in as a test user
    And the wishlist API is mocked with items that have different priorities
    And the reorder-wishlist API is mocked

  @drag-and-drop @wish-2005
  Scenario: Reorder wishlist items via drag-and-drop
    When I navigate to the wishlist page
    Then I should see wishlist cards ordered by current priority
    When I drag the wishlist card "Technic Porsche 911 GT3 RS" above "Imperial Star Destroyer"
    Then the visual order of cards should update to reflect the new priority
    And a "Priority updated" toast should appear
    And the reorder-wishlist API should be called with the new order of item ids

  @undo @reorder @wish-2005
  Scenario: Undo a priority reorder from toast
    When I navigate to the wishlist page
    And I drag the wishlist card "Technic Porsche 911 GT3 RS" to a new position
    Then a "Priority updated" toast with an "Undo" action should appear
    When I click the "Undo" button in the toast within five seconds
    Then the wishlist items should revert to their original order

  @keyboard @reorder @wish-2005
  Scenario: Keyboard-based priority reorder
    When I navigate to the wishlist page
    And I focus the first wishlist card using the keyboard
    And I use keyboard controls to move the focused card down in priority
    Then the focused card should move to a lower position in the gallery
    And the reorder-wishlist API should be called with the updated order

  @empty-state @all-purchased @wish-2005
  Scenario: Empty wishlist with all items purchased shows celebration message
    Given the wishlist API is mocked to return an empty list with a "all purchased" state
    When I navigate to the wishlist page
    Then I should see an empty state message indicating all wishlist items have been purchased
    And I should see a celebratory visual or icon
    And I should see a call-to-action to browse sets or add new wishlist items
