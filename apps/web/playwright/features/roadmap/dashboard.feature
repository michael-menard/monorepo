Feature: Dashboard Cross-Plan Health View
  As a project manager
  I want to see a cross-plan health dashboard
  So that I can identify bottlenecks and decide what to work on next

  Background:
    Given I am on the dashboard page

  @smoke @regression
  Scenario: Dashboard page loads with title
    Then I should see the dashboard page title
    And I should see the dashboard subtitle

  @smoke @regression
  Scenario: Flow Health strip is visible
    Then I should see the "Flow Health" section
    And I should see the total story count
    And I should see the state distribution bar

  @smoke @regression
  Scenario: Unblocked Work Queue is visible
    Then I should see the "Unblocked Work Queue" section
    And I should see work queue table headers

  @smoke @regression
  Scenario: Plan Progress grid is visible
    Then I should see the "Plan Progress" section
    And I should see at least one plan card

  @smoke
  Scenario: Aging Stories list is visible
    Then I should see the "Aging Stories" section

  @smoke
  Scenario: Impact Ranking is visible
    Then I should see the "Impact Ranking" section

  @regression
  Scenario: Dashboard link in navigation
    Given I am on the roadmap page
    Then I should see a "Dashboard" link in the header
    When I click the "Dashboard" link
    Then I should be on the dashboard page

  @regression
  Scenario: Story links in work queue navigate to story details
    Given the work queue has stories
    When I click on a story ID in the work queue
    Then I should be navigated to the story details page

  @regression
  Scenario: Plan cards link to plan details
    Given there are plan progress cards
    When I click on a plan card
    Then I should be navigated to the plan details page
