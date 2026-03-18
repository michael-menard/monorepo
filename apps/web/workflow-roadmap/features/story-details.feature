@smoke
Feature: Story Details Page
  As a user viewing the roadmap plan details
  I want to click on a story to see its full details
  So that I can understand the story scope and metadata

  Background:
    Given I am viewing the roadmap application

  @regression
  Scenario: Navigate from plan details to story details
    Given I am on the plan details page for "e2e-test-plan"
    When I click on a story in the stories table
    Then I should be taken to the story details page

  @regression
  Scenario: Display story title and ID badge
    Given I am on the story details page for "E2E-0001"
    Then I should see the story title
    And I should see the story ID badge

  @regression
  Scenario: Display story state and priority badges
    Given I am on the story details page for "E2E-0001"
    Then I should see the story state badge
    And I should see the story priority badge

  @regression
  Scenario: Show story description when present
    Given I am on the story details page for "E2E-0001"
    Then I should see the story description

  @regression
  Scenario: Story details section renders core information
    Given I am on the story details page for "E2E-0001"
    Then I should see the story details section

  @smoke
  Scenario: Handle story with minimal data
    Given I am on the story details page for "E2E-0002"
    Then I should see the story title
    And I should not see the story description

  @regression
  Scenario: Back navigation to roadmap
    Given I am on the story details page for "E2E-0001"
    When I click the back to roadmap link
    Then I should be taken to the roadmap page

  @regression
  Scenario: Loading state displays skeleton
    Given I am viewing the roadmap application with loading delay
    When I navigate to the story details page for "E2E-0001"
    Then I should see the loading skeleton

  @regression
  Scenario: Error state displays message
    Given I am on the story details page for "INVALID-STORY"
    Then I should see an error message

  @regression
  Scenario: Not found state for invalid story
    Given I am on the story details page for "NOT-FOUND-999"
    Then I should see the story not found message
