@wishlist @purchase @toast
Feature: Purchase Success Toast
  As a wishlist user
  I want to see a success toast with a "View in Collection" link after purchasing
  So that I can quickly navigate to my collection after a purchase

  Story: SETS-MVP-0321 (E2E tests for SETS-MVP-0320)

  Background:
    Given I am logged in as a test user
    And I navigate to the wishlist gallery
    And the wishlist has items loaded

  # ─────────────────────────────────────────────────────────────────────────────
  # AC3: Success toast appears after purchase
  # ─────────────────────────────────────────────────────────────────────────────

  @smoke @got-it
  Scenario: Success toast appears after purchasing item
    Given I remember the first card title
    When I open the Got It modal for the first wishlist card
    And I submit the Got It form
    Then I should see a success toast with "Added to your collection!"
    And the success toast should contain the remembered item title

  # ─────────────────────────────────────────────────────────────────────────────
  # AC4: "View in Collection" navigates to /collection
  # ─────────────────────────────────────────────────────────────────────────────

  @navigation @got-it
  Scenario: View in Collection button navigates to collection page
    When I open the Got It modal for the first wishlist card
    And I submit the Got It form
    And I click "View in Collection" in the success toast
    Then I should be on the collection page

  # ─────────────────────────────────────────────────────────────────────────────
  # AC5: Item disappears from wishlist after purchase
  # ─────────────────────────────────────────────────────────────────────────────

  @got-it @removal
  Scenario: Purchased item disappears from wishlist gallery
    Given I remember the first card title
    And I count the wishlist cards
    When I open the Got It modal for the first wishlist card
    And I submit the Got It form
    Then the remembered card should not be in the gallery
    And the wishlist card count should decrease by 1

  # ─────────────────────────────────────────────────────────────────────────────
  # AC6: Toast auto-dismisses after timeout
  # ─────────────────────────────────────────────────────────────────────────────

  @got-it @toast-dismiss
  Scenario: Success toast auto-dismisses after timeout
    When I open the Got It modal for the first wishlist card
    And I submit the Got It form
    Then I should see a success toast with "Added to your collection!"
    When I wait for the toast to auto-dismiss
    Then the success toast should no longer be visible
