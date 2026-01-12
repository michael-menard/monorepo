@wishlist @add
Feature: Wishlist Add Item
  As a registered user
  I want to add items to my wishlist
  So that I can track LEGO sets I want to purchase

  Background:
    Given I am logged in as a test user
    And the wishlist API is mocked with items

  @happy-path
  Scenario: Add wishlist item with image
    When I navigate to the add wishlist item page
    And I fill in the add wishlist form with valid data
    And I attach an image to the wishlist item
    And I submit the add wishlist form
    Then I should be redirected to the wishlist page
    And I should see the item titled "Add Form Test Set" in the wishlist

  @validation
  Scenario: Validation errors when required fields are missing
    When I navigate to the add wishlist item page
    And I submit the add wishlist form without filling required fields
    Then I should see a validation message for the missing title

  @api-error
  Scenario: API error when creating wishlist item
    Given the wishlist create API returns an error
    When I navigate to the add wishlist item page
    And I fill in the add wishlist form with valid data
    And I submit the add wishlist form
    Then I should see an error message for failed wishlist creation

  @navigation
  Scenario: Cancel add wishlist item
    When I navigate to the add wishlist item page
    And I click the cancel button on the add wishlist form
    Then I should be redirected to the wishlist page
