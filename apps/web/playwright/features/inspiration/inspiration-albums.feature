@inspiration @albums @e2e
Feature: Inspiration Albums
  As a LEGO MOC builder
  I want to organize my inspirations into albums
  So that I can group related visual references together

  # ─────────────────────────────────────────────────────────────────────────────
  # Album Creation
  # ─────────────────────────────────────────────────────────────────────────────

  @smoke @happy-path
  Scenario: User creates a new album
    Given I am logged in as a test user
    And I am on the inspiration gallery
    When I click the "New Album" button
    Then the create album modal should be visible
    And I should see the title input field
    And I should see the description field

  @create
  Scenario: User creates album with title only
    Given I am logged in as a test user
    And I am on the inspiration gallery
    And the create album modal is open
    When I enter album title "My Castle Builds"
    And I click the create button
    Then I should see an album success message
    And the album should appear in the Albums tab

  @create
  Scenario: User creates album with description
    Given I am logged in as a test user
    And I am on the inspiration gallery
    And the create album modal is open
    When I enter album title "Space MOCs"
    And I enter album description "Ideas for space-themed builds"
    And I click the create button
    Then I should see an album success message

  @create @nested
  Scenario: User creates nested album
    Given I am logged in as a test user
    And I am on the inspiration gallery
    And I have an existing album "Parent Album"
    And the create album modal is open
    When I enter album title "Child Album"
    And I select parent album "Parent Album"
    And I click the create button
    Then I should see an album success message
    And "Child Album" should be nested under "Parent Album"

  @validation
  Scenario: Album creation fails without title
    Given I am logged in as a test user
    And I am on the inspiration gallery
    And the create album modal is open
    When I click the create button without entering a title
    Then I should see a title required error

  # ─────────────────────────────────────────────────────────────────────────────
  # Album Navigation
  # ─────────────────────────────────────────────────────────────────────────────

  @navigation
  Scenario: User views Albums tab
    Given I am logged in as a test user
    And I am on the inspiration gallery
    When I click the "Albums" tab
    Then the Albums tab should be active
    And I should see album cards or empty state

  @navigation
  Scenario: User opens an album
    Given I am logged in as a test user
    And I am on the inspiration gallery Albums tab
    And I have an album with inspirations
    When I click on the album card
    Then I should see the album contents
    And I should see the breadcrumb navigation

  @navigation
  Scenario: User navigates back using breadcrumbs
    Given I am logged in as a test user
    And I am viewing an album's contents
    When I click the gallery breadcrumb
    Then I should return to the main gallery view

  # ─────────────────────────────────────────────────────────────────────────────
  # Album Editing
  # ─────────────────────────────────────────────────────────────────────────────

  @edit
  Scenario: User edits album title
    Given I am logged in as a test user
    And I am on the inspiration gallery Albums tab
    And I have an existing album
    When I right-click on the album card
    And I click "Edit" in the context menu
    And I change the title to "Updated Album Name"
    And I save the changes
    Then the album should show the new title

  @edit
  Scenario: User updates album description
    Given I am logged in as a test user
    And I am on the inspiration gallery Albums tab
    And I have an existing album
    When I open the album edit modal
    And I update the description
    And I save the changes
    Then I should see an album success message

  # ─────────────────────────────────────────────────────────────────────────────
  # Album Deletion
  # ─────────────────────────────────────────────────────────────────────────────

  @delete
  Scenario: User deletes an empty album
    Given I am logged in as a test user
    And I am on the inspiration gallery Albums tab
    And I have an empty album
    When I right-click on the album card
    And I click "Delete" in the context menu
    And I confirm the deletion
    Then the album should be removed
    And I should see an album success message

  @delete
  Scenario: User sees warning when deleting album with items
    Given I am logged in as a test user
    And I am on the inspiration gallery Albums tab
    And I have an album with inspirations
    When I right-click on the album card
    And I click "Delete" in the context menu
    Then I should see a warning about contained items
    And I should see options to keep or delete items

  @delete
  Scenario: User cancels album deletion
    Given I am logged in as a test user
    And I am on the inspiration gallery Albums tab
    And I have an existing album
    When I right-click on the album card
    And I click "Delete" in the context menu
    And I click "Cancel"
    Then the album should still exist

  # ─────────────────────────────────────────────────────────────────────────────
  # Adding Items to Albums
  # ─────────────────────────────────────────────────────────────────────────────

  @add-items
  Scenario: User adds inspiration to album via drag
    Given I am logged in as a test user
    And I am on the inspiration gallery
    And I have an inspiration and an album
    When I drag the inspiration onto the album card
    Then the inspiration should be added to the album
    And I should see an album success message

  @add-items
  Scenario: User adds selected inspirations to album
    Given I am logged in as a test user
    And I am on the inspiration gallery in multi-select mode
    And I have selected multiple inspirations
    When I click "Add to Album" in the bulk actions bar
    And I select an album from the dropdown
    Then the selected inspirations should be added to the album

  @add-items
  Scenario: User removes inspiration from album
    Given I am logged in as a test user
    And I am viewing an album's contents
    And the album contains inspirations
    When I right-click on an inspiration
    And I click the "Remove from Album" menu item
    Then the inspiration should be removed from the album
    But the inspiration should still exist in All Inspirations

  # ─────────────────────────────────────────────────────────────────────────────
  # Album Cover
  # ─────────────────────────────────────────────────────────────────────────────

  @cover
  Scenario: Album shows first image as cover
    Given I am logged in as a test user
    And I am on the inspiration gallery Albums tab
    And I have an album with inspirations
    Then the album card should show a cover image

  @cover
  Scenario: User sets custom album cover
    Given I am logged in as a test user
    And I am viewing an album's contents
    When I right-click on an inspiration
    And I click the "Set as Album Cover" menu item
    Then that inspiration should become the album cover

  # ─────────────────────────────────────────────────────────────────────────────
  # Keyboard Shortcuts
  # ─────────────────────────────────────────────────────────────────────────────

  @keyboard
  Scenario: User opens create album modal with N key
    Given I am logged in as a test user
    And I am on the inspiration gallery
    When I press the N key
    Then the create album modal should be visible

  @keyboard
  Scenario: User closes album modal with Escape
    Given I am logged in as a test user
    And I am on the inspiration gallery
    And the create album modal is open
    When I press Escape
    Then the create album modal should not be visible
