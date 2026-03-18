Feature: Roadmap Data Table
  As a user of the workflow roadmap
  I want to view and filter plans in a data table
  So that I can find and manage project plans efficiently

  Background:
    Given I am on the roadmap page

  @smoke @regression
  Scenario: Page loads with roadmap title
    Then I should see the roadmap page title

  @smoke @regression
  Scenario: Page displays plans data table
    Then I should see the plans data table

  @smoke @regression
  Scenario: Data table shows plan columns
    Then I should see the following columns:
      | column     |
      | Slug       |
      | Title      |
      | Status     |
      | Priority   |
      | Type       |
      | Stories    |
      | Created    |

  @smoke
  Scenario: Search filters plans by text
    Given I enter "test" in the search field
    When I wait for results to load
    Then I should see filtered results

  @smoke
  Scenario: Status filter dropdown works
    Given I open the status filter
    When I select "draft" status
    Then I should see filtered results

  @smoke
  Scenario: Priority filter dropdown works
    Given I open the priority filter
    When I select "P1" priority
    Then I should see filtered results

  @smoke
  Scenario: Type filter dropdown works
    Given I open the type filter
    When I select "feature" type
    Then I should see filtered results

  @smoke @regression
  Scenario: Hide completed checkbox filters out completed plans
    Given the "Hide completed" checkbox is checked
    Then completed plans should be hidden

  @smoke
  Scenario: Clicking a plan row navigates to plan details
    Given I click on a plan row
    Then I should be navigated to the plan details page

  @smoke @regression
  Scenario: Empty state when no plans match filters
    Given I apply filters that return no results
    Then I should see an empty state message

  @regression
  Scenario: Data table pagination controls
    Given there are more than 10 plans
    Then I should see pagination controls
    And I should be able to navigate between pages

  @regression
  Scenario: Drag and drop reordering within priority
    Given I select a single priority filter "P1"
    Then I should see drag handles on each row
    When I drag a plan row to a new position
    Then the plan order should be updated
