Feature: MOC Build Status & Review System

  Background:
    Given the user is authenticated
    And a MOC exists with title "Test Castle MOC"

  Scenario: Change build status via dropdown
    Given I am on the MOC detail page for "Test Castle MOC"
    When I click the build status badge
    Then I see all 6 status options
    When I select "Acquiring Parts"
    Then the badge shows "Acquiring Parts" with amber color

  Scenario: Setting status to Complete triggers completion modal
    Given I am on the MOC detail page for "Test Castle MOC"
    When I click the build status badge
    And I select "Complete"
    Then the completion modal appears
    And I see "Review Now", "Remind Me Later", and "Skip" buttons

  Scenario: Review Now opens review form
    Given I am on the MOC detail page for "Test Castle MOC"
    And the build status is "complete"
    And the completion modal is showing
    When I click "Review Now"
    Then the multi-step review form opens at step 1

  Scenario: Complete all 7 review steps
    Given the review form is open for "Test Castle MOC"
    When I fill in Parts Quality with rating 4 and brand "mould_king"
    And I click "Next"
    And I fill in Instructions with rating 5 and clarity 4
    And I click "Next"
    And I toggle "Designer included minifigs" off in Minifigs
    And I click "Next"
    And I toggle "Has stickers" off in Stickers
    And I click "Next"
    And I fill in Value with rating 3 and price "fair"
    And I click "Next"
    And I fill in Build Experience with rating 5 and difficulty "advanced" and sessions 3
    And I click "Next"
    And I fill in Design with rating 4
    And I click "Submit Review"
    Then the review is saved
    And the "Review" tab appears on the MOC detail page

  Scenario: Skip all review steps
    Given the review form is open for "Test Castle MOC"
    When I click "Skip this step" 6 times
    And I click "Submit Review"
    Then the review is saved with empty sections

  Scenario: Remind Me Later re-shows modal on return
    Given the build status is "complete" for "Test Castle MOC"
    And no review exists
    And review is not skipped
    When I navigate to the MOC detail page
    Then the completion modal appears
    When I click "Remind Me Later"
    Then the modal closes
    When I navigate away and return to the MOC detail page
    Then the completion modal appears again

  Scenario: Skip permanently dismisses modal
    Given the build status is "complete" for "Test Castle MOC"
    And the completion modal is showing
    When I click "Skip"
    Then the modal closes
    When I navigate away and return to the MOC detail page
    Then the completion modal does NOT appear

  Scenario: Edit existing review
    Given a completed review exists for "Test Castle MOC"
    And I am on the MOC detail page
    When I click the "Review" tab
    And I click "Edit"
    Then the review form opens pre-populated with existing data
    When I change the Parts Quality rating to 5
    And I click "Submit Review"
    Then the review is updated

  Scenario: Badge shows correct color for each status
    Given I am on the MOC detail page for "Test Castle MOC"
    Then the build status badge for "instructions_added" has slate styling
    When I change status to "acquiring_parts"
    Then the badge has amber styling
    When I change status to "ready_to_build"
    Then the badge has sky styling
    When I change status to "building"
    Then the badge has teal styling
    When I change status to "complete"
    Then the badge has green styling
    When I change status to "parted_out"
    Then the badge has purple styling

  Scenario: Ratings become read-only after review
    Given a completed review exists for "Test Castle MOC"
    When I am on the MOC detail page
    Then the star ratings in the sidebar are read-only
