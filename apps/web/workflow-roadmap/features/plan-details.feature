Feature: Plan Details Page
  As a user viewing a plan
  I want to see plan details and linked stories
  So that I can understand the plan and navigate to stories

  Background:
    Given I am on the plan details page for "e2e-test-plan"

  @smoke @regression
  Scenario: Page displays plan title
    Then I should see the plan title

  @smoke @regression
  Scenario: Page displays plan slug
    Then I should see the plan slug

  @smoke @regression
  Scenario: Page displays status badge
    Then I should see the status badge

  @smoke @regression
  Scenario: Page displays priority badge
    Then I should see the priority badge

  @smoke @regression
  Scenario: Page displays overview section
    Then I should see the overview section with fields:
      | field              |
      | Type               |
      | Priority           |
      | Feature Directory  |
      | Story Prefix       |
      | Estimated Stories  |
      | Created            |

  @smoke @regression
  Scenario: Page displays tags
    Then I should see the tags section

  @smoke @regression
  Scenario: Back navigation to roadmap
    Given I click the back to roadmap link
    Then I should be navigated to the roadmap page

  @smoke @regression
  Scenario: Page displays linked stories table
    Then I should see the stories table

  @smoke
  Scenario: Stories table has correct columns
    Then the stories table should have columns:
      | column    |
      | Story ID  |
      | Title     |
      | State     |
      | Phase     |
      | Priority  |

  @smoke
  Scenario: Clicking story ID navigates to story details
    Given I click on a story ID in the stories table
    Then I should be navigated to the story details page

  @smoke
  Scenario: Clicking story title navigates to story details
    Given I click on a story title in the stories table
    Then I should be navigated to the story details page

  @regression
  Scenario: Empty stories state
    Given the plan has no linked stories
    Then I should see "No stories linked to this plan yet"

  @regression
  Scenario: Loading state shows skeleton
    Given the page is loading
    Then I should see a loading skeleton

  @regression
  Scenario: Error state displays message
    Given there is an error loading the plan
    Then I should see an error message

  @regression
  Scenario: Not found state for invalid plan
    Given I navigate to a non-existent plan
    Then I should see an error message
