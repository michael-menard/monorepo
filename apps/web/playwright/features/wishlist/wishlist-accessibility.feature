@wishlist @accessibility-extended
Feature: Wishlist Accessibility and Keyboard Support
  As a user with accessibility needs
  I want full keyboard navigation and screen reader support
  So that I can use the wishlist without a mouse

  Background:
    Given I am logged in as a test user
    And the wishlist API is mocked with items

  @keyboard @grid @wish-2006
  Scenario: Arrow key navigation in wishlist gallery grid
    When I navigate to the wishlist page
    And focus is on the first wishlist card in the grid
    And I press the ArrowRight key
    Then focus should move to the next wishlist card in the same row
    When I press the ArrowDown key
    Then focus should move to the card in the next row
    When I press the Home key
    Then focus should move to the first card in the grid
    When I press the End key
    Then focus should move to the last card in the grid

  @keyboard @shortcuts @wish-2006
  Scenario: Keyboard shortcuts for add, got it, and delete
    When I navigate to the wishlist page
    And focus is on a wishlist card
    And I press the "A" key
    Then I should be navigated to the add wishlist item page
    When I return to the wishlist page
    And focus is on a wishlist card
    And I press the "G" key
    Then the Got It modal should open for the focused item
    When I close the Got It modal
    And focus is on a wishlist card
    And I press the Delete key
    Then the delete confirmation modal should open for the focused item

  @focus-management @modals @wish-2006
  Scenario: Focus management for modals and delete flow
    When I navigate to the wishlist page
    And I open the delete confirmation modal from a wishlist card
    Then focus should be trapped inside the delete confirmation modal
    When I confirm deletion
    Then focus should move to the next wishlist card if one exists
    When I delete the last remaining wishlist item
    Then focus should move to the "Add Item" button in the header

  @forms @wish-2006
  Scenario: Accessible add item form with labels and errors
    When I navigate to the wishlist page
    And I open the add wishlist item page
    Then every input in the add item form should have a visible label
    And required fields should be indicated to assistive technology
    When I submit the form with missing required fields
    Then error messages should be associated with the corresponding inputs

  @screen-reader @wish-2006
  Scenario: Screen reader announcements for key wishlist state changes
    When I navigate to the wishlist page
    Then the gallery should expose an accessible name describing wishlist items
    When I reorder a wishlist item
    Then a screen reader announcement should indicate the item was moved
    When I delete a wishlist item
    Then a screen reader announcement should indicate the item was removed
    When I successfully add a wishlist item
    Then a screen reader announcement should indicate the item was added to the wishlist
