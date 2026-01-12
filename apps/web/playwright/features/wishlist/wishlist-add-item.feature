@wishlist @add-item
Feature: Wishlist Add Item
  As a user
  I want to add items to my wishlist
  So that I can track LEGO sets and instructions I want to purchase

  Background:
    Given I am logged in as a test user
    And the wishlist API is mocked with items
    And the add-to-wishlist API is mocked for create scenarios

  @smoke @happy-path @wish-2002
  Scenario: Happy path - add wishlist item with all fields
    When I navigate to the wishlist page
    And I click the "Add Item" button
    Then I should be on the "Add to Wishlist" page
    When I fill in the add item form with valid required and optional data
    And I upload a wishlist image
    And I submit the add item form
    Then I should see a success toast for adding to wishlist
    And I should be redirected back to the wishlist page
    And I should see the newly added item in the gallery

  @validation @wish-2002
  Scenario: Validation errors when required fields are missing
    When I navigate to the wishlist page
    And I click the "Add Item" button
    And I submit the add item form without filling required fields
    Then I should see validation errors for the required fields "Store" and "Title"
    And the form should remain on the add item page

  @validation @wish-2002
  Scenario: Optional fields can be left empty
    When I navigate to the wishlist page
    And I click the "Add Item" button
    And I fill only the required fields in the add item form
    And I submit the add item form
    Then I should see a success toast for adding to wishlist
    And I should be redirected back to the wishlist page
    And the new item should appear with fallback values for optional fields

  @image-upload @wish-2002
  Scenario: Image upload preview and removal
    When I navigate to the wishlist page
    And I click the "Add Item" button
    And I select an image to upload for the wishlist item
    Then I should see a preview of the uploaded image
    When I remove the uploaded image
    Then the image preview should disappear
    And I should be able to submit the form without an image

  @error-handling @wish-2002
  Scenario: API error on add item shows error toast
    Given the add-to-wishlist API is mocked to return an error
    When I navigate to the wishlist page
    And I click the "Add Item" button
    And I fill in the add item form with valid data
    And I submit the add item form
    Then I should see an error toast for failing to add to wishlist
    And I should remain on the add item page

  @navigation @wish-2002
  Scenario: Cancel add item and return to wishlist gallery
    When I navigate to the wishlist page
    And I click the "Add Item" button
    Then I should be on the "Add to Wishlist" page
    When I click the "Cancel" button on the add item form
    Then I should be redirected back to the wishlist page
    And no new wishlist item should be created
