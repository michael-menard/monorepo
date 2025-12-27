@uploader @happy-path
Feature: MOC Instructions Uploader - Happy Path
  As a registered user
  I want to upload MOC instructions with files
  So that I can share my creations with the community

  Background:
    Given I am logged in as a test user
    And I am on the instructions upload page

  @smoke
  Scenario: Upload page displays all required elements
    Then I should see the page title "Create New MOC Instructions"
    And I should see a title input field
    And I should see a description textarea
    And I should see an "Instructions" upload button
    And I should see a "Parts List" upload button
    And I should see a "Thumbnail" upload button
    And I should see a "Gallery" upload button
    And I should see a "Cancel" button
    And I should see a "Reset" button
    And I should see a "Finalize & Publish" button

  @smoke @happy-path
  Scenario: Complete upload flow - presign, upload, finalize
    When I fill in the title "My Awesome LEGO MOC"
    And I fill in the description "A detailed description of my MOC creation with at least 10 characters"
    And I expand the MOC Details section
    And I fill in the author "Test Builder"
    And I fill in the MOC ID "MOC-12345"
    And I fill in the parts count "500"
    And I fill in the theme "Technic"
    And I upload a PDF instruction file
    Then I should see the file in the upload list
    And I should see the upload progress
    When the upload completes successfully
    And I click the "Finalize & Publish" button
    Then I should be redirected to the new MOC page

  @upload
  Scenario: Upload multiple file types
    When I fill in the title "Multi-file MOC"
    And I fill in the description "Testing multiple file upload types"
    And I expand the MOC Details section
    And I fill in the author "Test Builder"
    And I fill in the MOC ID "MOC-54321"
    And I fill in the parts count "300"
    And I fill in the theme "City"
    And I upload a PDF instruction file
    And I upload a CSV parts list file
    And I upload a thumbnail image
    And I upload gallery images
    Then I should see 4 files in the upload list

  @state-persistence
  Scenario: Session state persists on page reload
    When I fill in the title "Persistence Test MOC"
    And I fill in the description "Testing session persistence"
    And I upload a PDF instruction file
    And the upload completes successfully
    And I reload the page
    Then I should see the restored progress message
    And the title field should contain "Persistence Test MOC"
