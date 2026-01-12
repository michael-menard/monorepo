Feature: Wishlist modals for delete and Got It flows
  As a wishlist user
  I want confirmation and purchase modals
  So that I can safely remove items and mark them as purchased

  Background:
    Given I am on the wishlist gallery page

  Scenario: Delete modal - cancel closes without deleting
    When I open the delete confirmation modal for the first wishlist item
    And I cancel the delete confirmation
    Then the wishlist item is still visible in the gallery

  Scenario: Delete modal - confirm deletes and shows toast
    When I open the delete confirmation modal for the first wishlist item
    And I confirm the delete action
    Then the wishlist item is no longer visible in the gallery

  Scenario: Delete modal - Escape key closes modal
    When I open the delete confirmation modal for the first wishlist item
    And I press Escape in the delete confirmation modal
    Then the delete confirmation modal is closed

  Scenario: Got It modal - opens with item summary
    When I open the Got It modal for the first wishlist item
    Then the Got It modal shows the item title and optional set number

  Scenario: Got It modal - price pre-filled from wishlist item
    When I open the Got It modal for the first wishlist item
    Then the price paid field is pre-filled from the wishlist item price

  Scenario: Got It modal - submit marks as purchased and supports undo
    When I open the Got It modal for the first wishlist item
    And I submit the Got It form with default values
    Then the item is removed from the wishlist gallery
    And I see a success toast with an Undo action
    When I click the Undo action in the toast
    Then the item is restored in the wishlist gallery

  Scenario: Got It from detail page navigates to Set details
    Given I am on the wishlist item detail page for the first item
    When I open the Got It modal from the detail page
    And I submit the Got It form with default values
    Then I am navigated to the set details page for that item
