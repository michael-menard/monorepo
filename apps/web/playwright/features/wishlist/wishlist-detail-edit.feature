@wishlist @detail @edit @wish-2003
Feature: Wishlist Detail & Edit Pages
  As a wishlist user
  I want to view item details and edit item information
  So that I can see full item data and keep my wishlist up to date

  Background:
    Given I am logged in as a test user
    And the wishlist item API is mocked for detail and update scenarios

  # ─────────────────────────────────────────────────────────────────────────────
  # Detail Page - Core Fields
  # ─────────────────────────────────────────────────────────────────────────────

  @smoke @detail-view
  Scenario: Detail page displays item title, store, and set number
    When I open the wishlist detail page for item "wish-001"
    Then I should see the wishlist item title, store, and set number

  @detail-view
  Scenario: Detail page displays price and currency
    When I open the wishlist detail page for item "wish-001"
    Then I should see the price and currency

  @detail-view
  Scenario: Detail page displays piece count
    When I open the wishlist detail page for item "wish-001"
    Then I should see the piece count

  @detail-view
  Scenario: Detail page displays priority label
    When I open the wishlist detail page for item "wish-001"
    Then I should see the priority label

  @detail-view
  Scenario: Detail page displays tags and notes
    When I open the wishlist detail page for item "wish-001"
    Then I should see tags and notes if present

  @detail-view @image
  Scenario: Detail page displays primary image or fallback
    When I open the wishlist detail page for item "wish-001"
    Then I should see the primary image or a fallback image

  # ─────────────────────────────────────────────────────────────────────────────
  # Detail Page - Not Found
  # ─────────────────────────────────────────────────────────────────────────────

  @not-found
  Scenario: Nonexistent item shows not found message
    When I open the wishlist detail page for a nonexistent item id
    Then I should see a not found message for the wishlist item

  @not-found
  Scenario: Not found page offers return to gallery
    When I open the wishlist detail page for a nonexistent item id
    Then I should see an action to return to the wishlist gallery

  # ─────────────────────────────────────────────────────────────────────────────
  # Navigation from Gallery to Detail
  # ─────────────────────────────────────────────────────────────────────────────

  @navigation @smoke
  Scenario: Clicking a gallery card navigates to the detail page
    Given I navigate to the wishlist gallery
    And the wishlist has items loaded
    When I open the wishlist detail page for item "wish-001"
    Then I should be on the wishlist detail page for "Millennium Falcon"
    And the detail page should display the same title and store

  # ─────────────────────────────────────────────────────────────────────────────
  # Edit Mode - Toggle and Pre-population
  # ─────────────────────────────────────────────────────────────────────────────

  @edit @smoke
  Scenario: Edit button navigates to edit page
    When I open the wishlist detail page for item "wish-001"
    And I click the "Edit" button on the detail page
    Then I should be on the edit wishlist item page

  @edit @form
  Scenario: Edit form is pre-populated with existing item data
    When I open the wishlist detail page for item "wish-001"
    And I click the "Edit" button on the detail page
    Then I should be on the edit wishlist item page
    And the edit form should be pre-populated with the existing item data

  # ─────────────────────────────────────────────────────────────────────────────
  # Edit Mode - Save Changes
  # ─────────────────────────────────────────────────────────────────────────────

  @edit @save @smoke
  Scenario: Saving changes updates the item and shows success
    When I open the wishlist detail page for item "wish-001"
    And I click the "Edit" button on the detail page
    And I change the title and price
    And I submit the edit form
    Then I should see a success toast for updating the wishlist item
    And the updated title and price should be visible

  # ─────────────────────────────────────────────────────────────────────────────
  # Edit Mode - Validation
  # ─────────────────────────────────────────────────────────────────────────────

  @edit @validation
  Scenario: Clearing required title field shows validation error
    When I open the wishlist detail page for item "wish-001"
    And I click the "Edit" button on the detail page
    And I clear the required title field
    And I submit the edit form
    Then I should see a validation error for the title field

  # ─────────────────────────────────────────────────────────────────────────────
  # Edit Mode - Cancel
  # ─────────────────────────────────────────────────────────────────────────────

  @edit @cancel
  Scenario: Cancelling edit discards changes
    When I open the wishlist detail page for item "wish-004"
    And I click the "Edit" button on the detail page
    And I change the title field
    And I click the "Cancel" button on the edit form
    Then the original title should still be visible

  # ─────────────────────────────────────────────────────────────────────────────
  # Edit Mode - Image Management
  # ─────────────────────────────────────────────────────────────────────────────

  @edit @image
  Scenario: Removing image shows fallback on detail page
    When I open the wishlist detail page for item "wish-001"
    And I click the "Edit" button on the detail page
    And I remove the existing wishlist image
    And I submit the edit form
    Then the detail page should show the image fallback

  @edit @image
  Scenario: Uploading a new image displays it on the detail page
    When I open the wishlist detail page for item "wish-001"
    And I click the "Edit" button on the detail page
    And I upload a new image
    And I submit the edit form
    Then the detail page should show the new wishlist image
