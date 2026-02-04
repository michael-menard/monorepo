@auth @signup @e2e
Feature: User Account Registration
  As a new visitor to the LEGO MOC platform
  I want to create an account
  So that I can access personalized features and save my progress

  # ─────────────────────────────────────────────────────────────────────────────
  # Full E2E Flow (creates real user in Cognito)
  # ─────────────────────────────────────────────────────────────────────────────

  @smoke @happy-path
  Scenario: Complete account creation flow with Cognito confirmation
    Given a unique test email is generated
    And I am on the registration page
    When I enter my full name "E2E Test User"
    And I enter the generated test email
    And I enter a valid password "TestPassword123!"
    And I confirm my password "TestPassword123!"
    And I accept the terms and conditions
    And I click the sign up button
    Then I should be redirected to the email verification page
    When the user is confirmed via admin API
    Then the user should be confirmed in Cognito
    And the test user is cleaned up

  # ─────────────────────────────────────────────────────────────────────────────
  # Form Validation
  # ─────────────────────────────────────────────────────────────────────────────

  @validation
  Scenario: Registration fails with empty form
    Given I am on the registration page
    When I click the sign up button
    Then I should see validation error for the name field
    And I should see validation error for the email field
    And I should see validation error for the password field

  @validation
  Scenario: Registration fails with invalid email format
    Given I am on the registration page
    When I enter my full name "Test User"
    And I enter my email "invalid-email"
    And I enter a valid password "TestPassword123!"
    And I confirm my password "TestPassword123!"
    And I accept the terms and conditions
    And I click the sign up button
    Then I should see an email validation error

  @validation
  Scenario: Registration fails with weak password
    Given I am on the registration page
    When I enter my full name "Test User"
    And I enter my email "testuser@example.com"
    And I enter a valid password "weak"
    And I confirm my password "weak"
    And I accept the terms and conditions
    And I click the sign up button
    Then I should see a password validation error

  @validation
  Scenario: Registration fails when passwords do not match
    Given I am on the registration page
    When I enter my full name "Test User"
    And I enter my email "testuser@example.com"
    And I enter a valid password "TestPassword123!"
    And I confirm my password "DifferentPassword123!"
    And I accept the terms and conditions
    And I click the sign up button
    Then I should see a password mismatch error

  @validation
  Scenario: Registration fails without accepting terms
    Given I am on the registration page
    When I enter my full name "Test User"
    And I enter my email "testuser@example.com"
    And I enter a valid password "TestPassword123!"
    And I confirm my password "TestPassword123!"
    And I click the sign up button
    Then I should see a terms acceptance error

  # ─────────────────────────────────────────────────────────────────────────────
  # UI Elements
  # ─────────────────────────────────────────────────────────────────────────────

  @ui
  Scenario: Registration form displays all required elements
    Given I am on the registration page
    Then I should see the full name input field
    And I should see the email input field
    And I should see the password input field
    And I should see the confirm password input field
    And I should see the terms and conditions checkbox
    And I should see the sign up button
    And I should see a link to the login page

  @ui
  Scenario: Password visibility toggle works correctly
    Given I am on the registration page
    When I enter a valid password "TestPassword123!"
    Then the password field should be masked
    When I click the password visibility toggle
    Then the password field should show the password text

  # ─────────────────────────────────────────────────────────────────────────────
  # Navigation
  # ─────────────────────────────────────────────────────────────────────────────

  @navigation
  Scenario: User can navigate to login page from registration
    Given I am on the registration page
    When I click the link to sign in
    Then I should be on the login page

  # ─────────────────────────────────────────────────────────────────────────────
  # Cleanup
  # ─────────────────────────────────────────────────────────────────────────────

  @cleanup
  Scenario: Clean up any orphaned test users
    When any existing test user is cleaned up
    Then the cleanup should complete successfully
