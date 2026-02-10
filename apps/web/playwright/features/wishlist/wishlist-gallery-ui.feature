@wishlist @gallery @ui
Feature: Wishlist Gallery UI
  As a wishlist user
  I want to view, filter, and sort my wishlist items
  So that I can find and manage items easily

  Background:
    Given I am logged in as a test user
    And I navigate to the wishlist gallery

  # ─────────────────────────────────────────────────────────────────────────────
  # Gallery Loading
  # ─────────────────────────────────────────────────────────────────────────────

  @smoke @loading
  Scenario: Gallery displays wishlist cards
    Given the wishlist has items loaded
    Then I should see wishlist cards in the gallery
    And each card should display an image
    And each card should display a title

  @loading @filter-bar
  Scenario: Gallery shows filter bar
    Given the wishlist has items loaded
    Then I should see the filter bar
    And I should see a search input
    And I should see a sort dropdown

  # ─────────────────────────────────────────────────────────────────────────────
  # View Toggle
  # ─────────────────────────────────────────────────────────────────────────────

  @view-toggle
  Scenario: User can switch to grid view
    Given I am in datatable view
    When I click the grid view button
    Then items should be displayed in grid format

  @view-toggle
  Scenario: User can switch to datatable view
    Given I am in grid view
    When I click the datatable view button
    Then items should be displayed in table format

  # ─────────────────────────────────────────────────────────────────────────────
  # Filtering
  # ─────────────────────────────────────────────────────────────────────────────

  @filter @search
  Scenario: User can search for items
    Given the wishlist has items
    When I type a search query
    Then only matching items should be displayed

  @filter @store
  Scenario: User can filter by store
    Given the wishlist has items from multiple stores
    When I select a store filter
    Then only items from that store should be displayed

  # ─────────────────────────────────────────────────────────────────────────────
  # Sorting
  # ─────────────────────────────────────────────────────────────────────────────

  @sort
  Scenario: User can sort by price ascending
    When I select "Price: Low to High" from the sort dropdown
    Then items should be sorted by price ascending

  @sort
  Scenario: User can sort by priority
    When I select "Priority" from the sort dropdown
    Then items should be sorted by priority descending

  @sort
  Scenario: User can sort by manual order
    When I select "Manual Order" from the sort dropdown
    Then items should be displayed in custom order
    And drag handles should be available

  # ─────────────────────────────────────────────────────────────────────────────
  # Smart Sorting (WISH-2014)
  # ─────────────────────────────────────────────────────────────────────────────

  @sort @smart-sorting
  Scenario: Sort dropdown shows smart sorting options
    Given the wishlist has items loaded
    Then the sort dropdown should have option "Best Value"
    And the sort dropdown should have option "Expiring Soon"
    And the sort dropdown should have option "Hidden Gems"

  @sort @smart-sorting @best-value
  Scenario: Best Value orders by price-per-piece ratio
    Given the wishlist has items loaded
    When I select sort option "Best Value"
    Then the first card title should be "Imperial Star Destroyer"
    And the last card title should be "Medieval Castle MOC"

  @sort @smart-sorting @expiring-soon
  Scenario: Expiring Soon orders by oldest release date
    Given the wishlist has items loaded
    When I select sort option "Expiring Soon"
    Then the first card title should be "Technic Porsche 911 GT3 RS"
    And the last card title should be "Medieval Castle MOC"

  @sort @smart-sorting @hidden-gems
  Scenario: Hidden Gems prioritizes low-priority high-piece sets
    Given the wishlist has items loaded
    When I select sort option "Hidden Gems"
    Then the first card title should be "Medieval Castle MOC"
    And the last card title should be "Millennium Falcon"

  @sort @smart-sorting
  Scenario: Switching between smart sort modes reorders cards
    Given the wishlist has items loaded
    When I select sort option "Best Value"
    Then the first card title should be "Imperial Star Destroyer"
    When I select sort option "Hidden Gems"
    Then the first card title should be "Medieval Castle MOC"

  @sort @smart-sorting @stability
  Scenario: No console errors during smart sorting
    Given the wishlist has items loaded
    When I select sort option "Best Value"
    And I select sort option "Expiring Soon"
    And I select sort option "Hidden Gems"
    Then the page should not crash

  # ─────────────────────────────────────────────────────────────────────────────
  # Card Content
  # ─────────────────────────────────────────────────────────────────────────────

  @card-content
  Scenario: Wishlist card displays set information
    Given the wishlist has items loaded
    Then each card should show the set number
    And each card should show the price
    And each card should show the store badge

  @card-content @priority
  Scenario: High priority items show priority indicator
    Given the wishlist has a high priority item
    Then the priority indicator should be visible on high priority cards

  # ─────────────────────────────────────────────────────────────────────────────
  # Drag Preview
  # ─────────────────────────────────────────────────────────────────────────────

  @drag-preview
  Scenario: Drag preview shows during reorder
    Given I select "Manual Order" from the sort dropdown
    When I start dragging a wishlist card
    Then a drag preview should be visible

  @drag-preview @visual
  Scenario: Drag preview matches card appearance
    Given I select "Manual Order" from the sort dropdown
    When I start dragging a wishlist card
    Then the drag preview should show the card content

  # ─────────────────────────────────────────────────────────────────────────────
  # Empty and Error States
  # ─────────────────────────────────────────────────────────────────────────────

  @empty-state
  Scenario: Empty wishlist shows empty state
    Given the wishlist is empty
    Then I should see the empty state message
    And I should see an add item action button

  @error-state
  Scenario: API error shows error state
    Given the wishlist API returns an error
    When I navigate to the wishlist gallery
    Then I should see an error message

  # ─────────────────────────────────────────────────────────────────────────────
  # Responsive Layout
  # ─────────────────────────────────────────────────────────────────────────────

  @responsive @mobile
  Scenario: Mobile layout shows single column
    Given I am using a mobile viewport
    Then the gallery should display in a single column

  @responsive @desktop
  Scenario: Desktop layout shows multiple columns
    Given I am using a desktop viewport
    Then the gallery should display in multiple columns

  # ─────────────────────────────────────────────────────────────────────────────
  # Pagination
  # ─────────────────────────────────────────────────────────────────────────────

  @pagination
  Scenario: Gallery shows pagination when many items
    Given the wishlist has more than 20 items
    Then I should see pagination controls

  @pagination
  Scenario: User can navigate to next page
    Given the wishlist has multiple pages
    When I click the next page button
    Then I should see the next page of items
