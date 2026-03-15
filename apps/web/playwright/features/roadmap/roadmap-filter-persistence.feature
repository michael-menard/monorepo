Feature: Roadmap Filter Persistence
  As a user of the workflow roadmap
  I want my filter, sort, and page size settings to be preserved
  So that I can return to the same view after navigating away or reloading

  Background:
    Given I am on the roadmap page

  @smoke @regression
  Scenario: Status filter is preserved after navigating to a plan and back
    When I open the status filter
    And I select "draft" status
    And I click on a plan row
    And I click the back to roadmap link
    Then the status filter should show "draft"

  @smoke @regression
  Scenario: Search text is preserved after navigating to a plan and back
    When I enter "workflow" in the search field
    And I wait for results to load
    And I click on a plan row
    And I click the back to roadmap link
    Then the search field should contain "workflow"

  @smoke @regression
  Scenario: Priority filter is preserved after navigating to a plan and back
    When I open the priority filter
    And I select "P1" priority
    And I click on a plan row
    And I click the back to roadmap link
    Then the priority filter should show "P1"

  @regression
  Scenario: Multiple filters are preserved together after navigation
    When I open the status filter
    And I select "active" status
    And I open the priority filter
    And I select "P2" priority
    And I click on a plan row
    And I click the back to roadmap link
    Then the status filter should show "active"
    And the priority filter should show "P2"

  @regression
  Scenario: Filters persist after page reload
    When I open the status filter
    And I select "active" status
    And I enter "auth" in the search field
    And I reload the page
    Then the status filter should show "active"
    And the search field should contain "auth"

  @regression
  Scenario: Hide completed toggle state is preserved after navigation
    When I uncheck the hide completed checkbox
    And I click on a plan row
    And I click the back to roadmap link
    Then the hide completed checkbox should be unchecked

  @regression
  Scenario: Page size selection is preserved after navigation
    When I change the page size to "20"
    And I click on a plan row
    And I click the back to roadmap link
    Then the page size should show "20"
