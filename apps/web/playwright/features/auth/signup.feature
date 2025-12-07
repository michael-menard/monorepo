@auth @signup
Feature: User Account Registration
  As a new visitor to the LEGO MOC platform
  I want to create an account
  So that I can access personalized features and save my progress

  Background:
    Given I am on the registration page

  @smoke @happy-path
  Scenario: Registration form can be submitted with valid details
    When I enter my full name "Test User"
    And I enter my email "testuser@example.com"
    And I enter a valid password "TestPassword123!"
    And I confirm my password "TestPassword123!"
    And I accept the terms and conditions
    And I click the sign up button
    Then the sign up button should be disabled during submission

  @smoke @happy-path @redirect
  Scenario: Successful registration redirects to email verification
    When I enter my full name "Test User"
    And I enter a unique test email
    And I enter a valid password "TestPassword123!"
    And I confirm my password "TestPassword123!"
    And I accept the terms and conditions
    And I click the sign up button
    Then I should be redirected to the email verification page
    And the test user should be cleaned up

  @validation
  Scenario: Registration fails with empty form
    When I click the sign up button
    Then I should see validation error for the name field
    And I should see validation error for the email field
    And I should see validation error for the password field

  @validation
  Scenario: Registration fails with invalid email format
    When I enter my full name "Test User"
    And I enter my email "invalid-email"
    And I enter a valid password "TestPassword123"
    And I confirm my password "TestPassword123"
    And I accept the terms and conditions
    And I click the sign up button
    Then I should see an email validation error

  @validation
  Scenario: Registration fails with weak password
    When I enter my full name "Test User"
    And I enter my email "testuser@example.com"
    And I enter a valid password "weak"
    And I confirm my password "weak"
    And I accept the terms and conditions
    And I click the sign up button
    Then I should see a password validation error

  @validation
  Scenario: Registration fails when passwords do not match
    When I enter my full name "Test User"
    And I enter my email "testuser@example.com"
    And I enter a valid password "TestPassword123"
    And I confirm my password "DifferentPassword123"
    And I accept the terms and conditions
    And I click the sign up button
    Then I should see a password mismatch error

  @validation
  Scenario: Registration fails without accepting terms
    When I enter my full name "Test User"
    And I enter my email "testuser@example.com"
    And I enter a valid password "TestPassword123"
    And I confirm my password "TestPassword123"
    And I click the sign up button
    Then I should see a terms acceptance error

  @ui
  Scenario: Password visibility toggle works correctly
    When I enter a valid password "TestPassword123"
    Then the password field should be masked
    When I click the password visibility toggle
    Then the password field should show the password text

  @ui
  Scenario: Registration form displays all required elements
    Then I should see the full name input field
    And I should see the email input field
    And I should see the password input field
    And I should see the confirm password input field
    And I should see the terms and conditions checkbox
    And I should see the sign up button
    And I should see a link to the login page

  @navigation
  Scenario: User can navigate to login page from registration
    When I click the link to sign in
    Then I should be on the login page

