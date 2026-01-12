@wishlist @detail-edit
Feature: Wishlist Detail and Edit Pages
  As a user
  I want to view and edit wishlist item details
  So that I can see full information and update items as needed

  Background:
    Given I am logged in as a test user
    And the wishlist API is mocked with items
    And the wishlist item API is mocked for detail and update scenarios

  @happy-path @detail @wish-2003
  Scenario: View wishlist item detail with full metadata
    When I open the wishlist detail page for item "wish-001"
    Then I should see the wishlist item title, store, and set number
    And I should see the price and currency
    And I should see the piece count
    And I should see the priority label
    And I should see tags and notes if present
    And I should see the primary image or a fallback image

  @navigation @detail @wish-2003
  Scenario: Navigate from gallery card to detail page
    When I navigate to the wishlist page
    And I click the wishlist card for "Millennium Falcon"
    Then I should be on the wishlist detail page for "Millennium Falcon"
    And the detail page should display the same title and store

  @not-found @detail @wish-2003
  Scenario: Detail page for nonexistent item shows not found state
    When I open the wishlist detail page for a nonexistent item id
    Then I should see a not found message for the wishlist item
    And I should see an action to return to the wishlist gallery

  @edit @wish-2003
  Scenario: Edit wishlist item from detail page
    When I open the wishlist detail page for item "wish-002"
    And I click the "Edit" button on the detail page
    Then I should be on the edit wishlist item page
    And the edit form should be pre-populated with the existing item data
    When I change the title and price
    And I submit the edit form
    Then I should see a success toast for updating the wishlist item
    And I should be redirected back to the wishlist detail page
    And the updated title and price should be visible

  @edit @validation @wish-2003
  Scenario: Validation errors on edit item
    When I open the wishlist detail page for item "wish-003"
    And I click the "Edit" button on the detail page
    And I clear the required title field
    And I submit the edit form
    Then I should see a validation error for the title field
    And the form should remain on the edit item page

  @edit @image @wish-2003
  Scenario: Replace existing image or remove image on edit
    When I open the wishlist detail page for item "wish-001"
    And I click the "Edit" button on the detail page
    And I remove the existing wishlist image
    And I submit the edit form
    Then I should see a success toast for updating the wishlist item
    And the detail page should show the image fallback
    When I edit the same wishlist item again
    And I upload a new image
    And I submit the edit form
    Then the detail page should show the new wishlist image

  @navigation @edit @wish-2003
  Scenario: Cancel edit and return to detail page without saving
    When I open the wishlist detail page for item "wish-004"
    And I click the "Edit" button on the detail page
    And I change the title field
    And I click the "Cancel" button on the edit form
    Then I should be redirected back to the wishlist detail page
    And the original title should still be visible
