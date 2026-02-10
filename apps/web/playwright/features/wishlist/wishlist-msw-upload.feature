@msw @upload
Feature: Wishlist Image Upload with MSW
  As a user adding items to my wishlist
  I want image uploads to work reliably
  So that my wishlist items have images

  Background:
    Given I am logged in as a test user
    And the app is loaded with MSW mocking enabled

  @smoke @msw
  Scenario: MSW service worker is active
    Then the MSW service worker should be registered
    And API requests should be intercepted by MSW

  @upload @msw
  Scenario: Successful image upload via MSW
    Given I am on the add wishlist item page
    When I fill in the item title "Test LEGO Set"
    And I select an image file for upload
    And I submit the form
    Then the presign request should be intercepted by MSW
    And the S3 upload should be intercepted by MSW
    And I should see a success confirmation

  @upload @msw @error
  Scenario: Presign error shows error message
    Given I am on the add wishlist item page
    And the presign endpoint will return a 500 error
    When I fill in the item title "Error Test Set"
    And I select an image file for upload
    And I submit the form
    Then I should see an upload error message

  @upload @msw @error
  Scenario: S3 upload error shows error message
    Given I am on the add wishlist item page
    And the S3 upload will return a 403 error
    When I fill in the item title "S3 Error Test"
    And I select an image file for upload
    And I submit the form
    Then I should see an upload error message
