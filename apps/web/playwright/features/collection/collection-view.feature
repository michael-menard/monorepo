# Story SETS-MVP-002: Collection View

Feature: Collection View
  As a user
  I want to view my owned LEGO sets in a collection page
  So that I can track what I have purchased

  Background:
    Given I am logged in as a test user

  @smoke @collection
  Scenario: View collection page with owned items
    Given I have 3 owned items in my collection
    When I navigate to "/wishlist/collection"
    Then I should see the page heading "My Collection"
    And I should see 3 collection cards
    And the cards should be displayed in a grid layout

  @collection @empty-state
  Scenario: Empty collection state
    Given I have 0 owned items
    When I navigate to "/wishlist/collection"
    Then I should see the page heading "My Collection"
    And I should see the empty state message "No sets in your collection yet"
    And I should see a call-to-action button "Browse your wishlist"
    When I click the "Browse your wishlist" button
    Then I should be redirected to "/wishlist"

  @collection @filtering
  Scenario: Collection filtering by store
    Given I have 5 owned items from "LEGO" store
    And I have 3 owned items from "Barweer" store
    When I navigate to "/wishlist/collection"
    And I filter by store "LEGO"
    Then I should see 5 collection cards
    When I filter by store "Barweer"
    Then I should see 3 collection cards

  @collection @search
  Scenario: Collection search
    Given I have owned items:
      | title                | setNumber | store |
      | Millennium Falcon    | 75192     | LEGO  |
      | Death Star           | 75159     | LEGO  |
      | Hogwarts Castle      | 71043     | LEGO  |
    When I navigate to "/wishlist/collection"
    And I search for "falcon"
    Then I should see 1 collection card
    And I should see the item "Millennium Falcon"

  @collection @navigation
  Scenario: Navigate to collection from sidebar
    When I am on the "/wishlist" page
    Then I should see the navigation menu
    When I click on the "My Collection" link in the sidebar
    Then I should be on the "/wishlist/collection" page
    And I should see the page heading "My Collection"
