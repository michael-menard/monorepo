@wishlist @add-item @form
Feature: Wishlist Add Item
  As a wishlist user
  I want to add new items to my wishlist
  So that I can track LEGO sets I want to purchase

  Background:
    Given I am logged in as a test user
    And I navigate to the wishlist gallery
    And I click the Add Item button

  # ─────────────────────────────────────────────────────────────────────────────
  # Form Fields Rendering
  # ─────────────────────────────────────────────────────────────────────────────

  @smoke @form-fields
  Scenario: Form displays required fields
    Then I should see the store selector
    And I should see the title input

  @form-fields
  Scenario: Form displays optional fields
    Then I should see the set number input
    And I should see the price input
    And I should see the piece count input
    And I should see the priority selector
    And I should see the source URL input
    And I should see the notes input

  # ─────────────────────────────────────────────────────────────────────────────
  # Store Selector Options
  # ─────────────────────────────────────────────────────────────────────────────

  @store-selector
  Scenario: Store selector displays all 5 options
    When I click the store selector
    Then I should see 5 store options
    And I should see store option "LEGO"
    And I should see store option "Barweer"
    And I should see store option "Cata"
    And I should see store option "BrickLink"
    And I should see store option "Other"

  # ─────────────────────────────────────────────────────────────────────────────
  # Priority Selector Options
  # ─────────────────────────────────────────────────────────────────────────────

  @priority-selector
  Scenario: Priority selector displays 0-5 scale options
    When I click the priority selector
    Then I should see 6 priority options

  # ─────────────────────────────────────────────────────────────────────────────
  # Form Validation
  # ─────────────────────────────────────────────────────────────────────────────

  @validation
  Scenario: Form prevents submission without title
    Given the title field is empty
    When I click the submit button
    Then the form should not submit
    And I should remain on the add item page

  # ─────────────────────────────────────────────────────────────────────────────
  # Form Submission - Success
  # ─────────────────────────────────────────────────────────────────────────────

  @submission @smoke
  Scenario: Form submits with required fields only
    Given I fill in the title with "Test Wishlist Item"
    When I click the submit button
    Then the form should submit successfully
    And I should see success indication

  @submission
  Scenario: Form submits with all fields filled
    Given I fill in all form fields
    When I click the submit button
    Then the form should submit successfully
    And I should be redirected to the wishlist gallery

  @toast
  Scenario: Success toast displays after submission
    Given I fill in the title with "Success Toast Test"
    When I click the submit button
    Then I should see a success toast

  # ─────────────────────────────────────────────────────────────────────────────
  # Error Handling
  # ─────────────────────────────────────────────────────────────────────────────

  @error @api
  Scenario: Error toast displays when API returns error
    Given I mock POST to return 500 error
    And I fill in the title with "Error Test Item"
    When I click the submit button
    Then I should see an error indication

  @error @network
  Scenario: Form handles network errors gracefully
    Given I simulate a network error on POST
    And I fill in the title with "Network Error Test"
    When I click the submit button
    Then the page should not crash

  # ─────────────────────────────────────────────────────────────────────────────
  # Navigation
  # ─────────────────────────────────────────────────────────────────────────────

  @navigation
  Scenario: Back link returns to gallery
    When I click the Back to Gallery button
    Then I should be on the wishlist gallery page

  # ─────────────────────────────────────────────────────────────────────────────
  # Image Upload - S3 Flow
  # ─────────────────────────────────────────────────────────────────────────────

  @image-upload
  Scenario: Image upload drop zone is displayed
    Then I should see the image upload drop zone
    And I should see upload instructions

  @image-upload @api
  Scenario: Selecting image requests presigned URL
    Given I mock the presign endpoint
    When I select an image file for upload
    Then the presign endpoint should be called
    And I should see the image preview

  @image-upload
  Scenario: User can remove uploaded image
    Given I have uploaded an image
    When I click the remove image button
    Then the image preview should disappear
    And the drop zone should return

  @image-upload @submission
  Scenario: Form submits with uploaded image URL
    Given I have uploaded an image
    And I fill in the title with "Item with Image"
    When I click the submit button
    Then the form should submit successfully
