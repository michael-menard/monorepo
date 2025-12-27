@sets @add-set
Feature: Add LEGO Set to Collection
  As a LEGO collector
  I want to add sets to my collection
  So that I can track and manage my LEGO sets

  Background:
    Given I am logged in
    And I am on the sets gallery page

  # Navigation
  @navigation
  Scenario: User can navigate to add set page
    When I click the "Add Set" button
    Then I should be on the add set page
    And I should see the page heading "Add Set"

  # UI Elements
  @ui
  Scenario: Add set form displays all required fields
    When I navigate to the add set page
    Then I should see a "Set Name" input field
    And I should see a "Set Number" input field
    And I should see a "Piece Count" input field
    And I should see a "Theme" select field
    And I should see a "Tags" input field
    And I should see a "Notes" textarea field
    And I should see an image upload zone
    And I should see an "Add Set" button

  @ui
  Scenario: Add set form displays optional purchase info fields
    When I navigate to the add set page
    Then I should see a "Purchase Date" input field
    And I should see a "Purchase Price" input field
    And I should see a "Currency" select field

  # Form Validation
  @validation
  Scenario: Form validation prevents submission with empty required fields
    When I navigate to the add set page
    And I click the "Add Set" button
    Then I should see validation error "Name is required"
    And I should see validation error "Set number is required"
    And I should see validation error "Piece count must be positive"
    And I should see validation error "Theme is required"

  @validation
  Scenario: Form validation requires positive piece count
    When I navigate to the add set page
    And I enter "Test Castle" in the "Set Name" field
    And I enter "10305" in the "Set Number" field
    And I enter "-10" in the "Piece Count" field
    And I select "Castle" from the "Theme" dropdown
    And I click the "Add Set" button
    Then I should see validation error "Piece count must be positive"

  # Successful Submission
  @happy-path
  Scenario: User can successfully add a set with required fields only
    When I navigate to the add set page
    And I enter "Medieval Castle" in the "Set Name" field
    And I enter "10305" in the "Set Number" field
    And I enter "4514" in the "Piece Count" field
    And I select "Castle" from the "Theme" dropdown
    And I click the "Add Set" button
    Then I should see a success message "Set added to collection"
    And I should be redirected to the sets gallery page
    And I should see "Medieval Castle" in the sets list

  @happy-path
  Scenario: User can add a set with all fields including optional data
    When I navigate to the add set page
    And I enter "Millennium Falcon" in the "Set Name" field
    And I enter "75192" in the "Set Number" field
    And I enter "7541" in the "Piece Count" field
    And I select "Star Wars" from the "Theme" dropdown
    And I add tags "UCS, Display, Expensive"
    And I enter "2024-01-15" in the "Purchase Date" field
    And I enter "849.99" in the "Purchase Price" field
    And I select "USD" from the "Currency" dropdown
    And I enter "Birthday gift from family" in the "Notes" field
    And I click the "Add Set" button
    Then I should see a success message "Set added to collection"
    And I should be redirected to the sets gallery page
    And I should see "Millennium Falcon" in the sets list

  # Tags
  @tags
  Scenario: User can add multiple tags
    When I navigate to the add set page
    And I add tag "castle"
    And I add tag "medieval"
    And I add tag "display"
    Then I should see 3 tags displayed
    And I should see tag "castle"
    And I should see tag "medieval"
    And I should see tag "display"

  @tags
  Scenario: User can remove tags
    When I navigate to the add set page
    And I add tag "castle"
    And I add tag "medieval"
    And I remove tag "castle"
    Then I should see 1 tag displayed
    And I should not see tag "castle"
    And I should see tag "medieval"

  # Images
  @images
  Scenario: User can upload images
    When I navigate to the add set page
    And I upload image "set-front.jpg"
    And I upload image "set-back.jpg"
    Then I should see 2 image previews

  @images
  Scenario: User can remove uploaded images
    When I navigate to the add set page
    And I upload image "set-front.jpg"
    And I upload image "set-back.jpg"
    And I remove the first image
    Then I should see 1 image preview

  # Navigation
  @navigation
  Scenario: User can cancel and return to gallery
    When I navigate to the add set page
    And I enter "Test Set" in the "Set Name" field
    And I click the "Back" button
    Then I should be on the sets gallery page
    And the form data should not be saved

  # Form Reset
  @form-reset
  Scenario: Form resets after successful submission
    When I navigate to the add set page
    And I enter "Test Castle" in the "Set Name" field
    And I enter "12345" in the "Set Number" field
    And I enter "100" in the "Piece Count" field
    And I select "Castle" from the "Theme" dropdown
    And I click the "Add Set" button
    And I wait for success message
    And I navigate to the add set page again
    Then all form fields should be empty

