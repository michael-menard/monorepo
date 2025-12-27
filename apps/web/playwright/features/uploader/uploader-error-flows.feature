@uploader @error-flows
Feature: MOC Instructions Uploader - Error Flows
  As a registered user
  I want the uploader to handle errors gracefully
  So that I can recover from issues and complete my upload

  Background:
    Given I am logged in as a test user
    And I am on the instructions upload page

  @validation
  Scenario: Form validation - empty title
    When I fill in the description "A valid description with more than 10 characters"
    And I click the "Finalize & Publish" button
    Then I should see a title validation error

  @validation
  Scenario: Form validation - short description
    When I fill in the title "Valid Title"
    And I fill in the description "Short"
    And I click the "Finalize & Publish" button
    Then I should see a description validation error

  @validation
  Scenario: Form validation - no instruction file
    When I fill in the title "Valid Title"
    And I fill in the description "A valid description with more than 10 characters"
    And I expand the MOC Details section
    And I fill in the author "Test Builder"
    And I fill in the MOC ID "MOC-12345"
    And I fill in the parts count "100"
    And I fill in the theme "Technic"
    Then the "Finalize & Publish" button should be disabled

  @error @409
  Scenario: Handle 409 slug conflict
    Given the API will return a 409 conflict error
    When I fill in a complete valid form
    And I upload a PDF instruction file
    And the upload completes successfully
    And I click the "Finalize & Publish" button
    Then I should see the conflict resolution modal
    And I should see a suggested alternative slug
    When I enter a new title in the conflict modal
    And I confirm the new title
    Then the finalize should be retried with the new title

  @error @429
  Scenario: Handle 429 rate limit with countdown
    Given the API will return a 429 rate limit error
    When I fill in a complete valid form
    And I upload a PDF instruction file
    And the upload completes successfully
    And I click the "Finalize & Publish" button
    Then I should see the rate limit banner
    And I should see a countdown timer
    And the "Finalize & Publish" button should be disabled
    When the countdown completes
    Then the "Finalize & Publish" button should be enabled

  @error @expired
  Scenario: Handle expired presigned URLs
    Given the presigned URL will expire
    When I fill in a complete valid form
    And I upload a PDF instruction file
    And the upload fails with an expired URL error
    Then I should see the session expired banner
    And I should see a "Refresh Session" button
    When I click the "Refresh Session" button
    Then the uploads should be retried with new URLs

  @error @401
  Scenario: Handle 401 authentication error - restore intent
    Given the user session will expire during upload
    When I fill in the title "Auth Test MOC"
    And I fill in the description "Testing auth expiration handling"
    And I upload a PDF instruction file
    And the upload fails with an authentication error
    Then I should be redirected to the login page
    And the redirect URL should contain the uploader path
    When I log back in
    Then I should be returned to the uploader
    And my previous progress should be restored

  @error @file-validation
  Scenario: Handle per-file validation errors
    Given the API will return file validation errors
    When I fill in a complete valid form
    And I upload an invalid file type
    And the upload completes successfully
    And I click the "Finalize & Publish" button
    Then I should see file validation errors
    And the error should indicate which file failed
    And the error should show the reason for failure
