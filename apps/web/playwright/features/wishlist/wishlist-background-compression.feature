@wishlist @images @background-compression
Feature: Background Image Compression
  As a user adding items to my wishlist
  I want images to be compressed in the background while I fill out the form
  So that I don't have to wait for compression when I submit

  Background:
    Given I am signed in
    And I am on the add wishlist item page

  Scenario: Background compression completes before form submission
    When I select a large image for upload
    Then the form fields should remain enabled
    And I should see a compression success toast
    When I fill in the title with "Test Background Compression"
    And I select "LEGO" as the store
    And I click the submit button
    Then the item should be added successfully

  Scenario: Form remains interactive during background compression
    When I select a large image for upload
    Then the title input should be enabled
    And the store select should be enabled
    And the priority select should be enabled
    And I should be able to type "Interactive Test" in the title field

  Scenario: Skip compression checkbox bypasses background compression
    When I check the skip compression checkbox
    And I select a large image for upload
    Then I should not see a compression success toast within 2 seconds
    When I fill in the title with "Skip Compression Test"
    And I select "LEGO" as the store
    And I click the submit button
    Then the item should be added successfully
