Feature: Page Transitions
  As a user
  I want to see loading indicators during page navigation
  So that I know the app is working and not frozen

  Background:
    Given I am logged in as a valid user

  @navigation @loading
  Scenario: Spinner appears during slow navigation
    Given I am on the dashboard page
    When I click on a navigation link to a slow-loading page
    Then I should see a loading indicator after the delay threshold
    And the loading indicator should disappear when the page loads

  @navigation @loading
  Scenario: Spinner does not appear for fast navigation
    Given I am on the dashboard page
    When I click on a navigation link to a fast-loading page
    Then I should not see a loading indicator
    And I should see the target page immediately

  @navigation @delay
  Scenario: Delay threshold prevents flash on fast navigation
    Given I am on the dashboard page
    And the navigation will complete within 200 milliseconds
    When I click on a navigation link
    Then no loading indicator should flash briefly
    And the page should transition smoothly

  @navigation @accessibility
  Scenario: Loading indicator is accessible
    Given I am on the dashboard page
    When I trigger a slow page navigation
    And the loading indicator appears
    Then the loading indicator should have proper ARIA attributes
    And screen readers should announce the loading state
