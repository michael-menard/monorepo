@wishlist @autosave @wish-2015
Feature: Wishlist Form Autosave
  As a user creating a wishlist item
  I want my form progress to be saved automatically
  So that I don't lose my work if I navigate away or refresh

  Background:
    Given I am logged in as a test user
    And I navigate to the add item page

  @smoke @happy-path
  Scenario: Form draft is saved and restored after page reload
    When I fill in the "Title" field with "LEGO Millennium Falcon"
    And I fill in the "Store" field with "LEGO"
    And I fill in the "Price" field with "849.99"
    And I wait for the autosave debounce
    And I reload the page
    Then I should see the resume draft banner
    When I click the resume draft button
    Then the "Title" field should contain "LEGO Millennium Falcon"
    And the "Store" field should contain "LEGO"
    And the "Price" field should contain "849.99"

  @smoke
  Scenario: Draft is cleared on successful form submission
    When I fill in the "Title" field with "LEGO AT-AT"
    And I fill in the "Store" field with "LEGO"
    And I wait for the autosave debounce
    And I reload the page
    Then I should see the resume draft banner
    When I click the resume draft button
    And I complete and submit the form
    Then the form should be submitted successfully
    When I navigate to the add item page
    Then I should not see the resume draft banner
    And all form fields should be empty

  @smoke
  Scenario: User can discard draft with Start fresh
    When I fill in the "Title" field with "LEGO Star Destroyer"
    And I fill in the "Store" field with "LEGO"
    And I wait for the autosave debounce
    And I reload the page
    Then I should see the resume draft banner
    When I click the start fresh button
    Then I should not see the resume draft banner
    And all form fields should be empty
    When I reload the page
    Then I should not see the resume draft banner

  Scenario: All form fields are preserved in draft
    When I fill in the "Title" field with "Test Set"
    And I fill in the "Store" field with "LEGO"
    And I fill in the "Set Number" field with "75192"
    And I fill in the "Price" field with "199.99"
    And I fill in the "Piece Count" field with "7541"
    And I fill in the "Notes" field with "Birthday gift idea"
    And I wait for the autosave debounce
    And I reload the page
    And I click the resume draft button
    Then the "Title" field should contain "Test Set"
    And the "Store" field should contain "LEGO"
    And the "Set Number" field should contain "75192"
    And the "Price" field should contain "199.99"
    And the "Piece Count" field should contain "7541"
    And the "Notes" field should contain "Birthday gift idea"

  Scenario: No draft banner on first visit
    Then I should not see the resume draft banner
    And all form fields should be empty

  @error-handling
  Scenario: Corrupted localStorage data is handled gracefully
    Given localStorage contains corrupted draft data
    When I navigate to the add item page
    Then I should not see the resume draft banner
    And all form fields should be empty

  @edge-case
  Scenario: Draft older than 7 days is ignored
    Given localStorage contains a draft older than 7 days
    When I navigate to the add item page
    Then I should not see the resume draft banner
