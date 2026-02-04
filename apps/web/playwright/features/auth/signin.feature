@auth @signin @e2e
Feature: User Sign In
  As a registered user
  I want to sign in to my account
  So that I can access protected features

  # ─────────────────────────────────────────────────────────────────────────────
  # Full E2E Flow (uses seeded Cognito test users)
  # ─────────────────────────────────────────────────────────────────────────────

  @smoke @happy-path @seeded
  Scenario: Successful sign in with seeded test user
    Given I am on the login page
    When I enter email "stan.marsh@southpark.test"
    And I enter password "0Xcoffee?"
    And I click the sign in button
    Then I should be redirected to the dashboard

  # ─────────────────────────────────────────────────────────────────────────────
  # Form Validation
  # ─────────────────────────────────────────────────────────────────────────────

  @validation
  Scenario: Sign in fails with empty form
    Given I am on the login page
    When I click the sign in button
    Then I should see email validation error
    And I should see password validation error

  @validation
  Scenario: Sign in fails with invalid email format
    Given I am on the login page
    When I enter email "not-an-email"
    And I enter password "SomePassword123!"
    And I click the sign in button
    Then I should see email validation error

  # TODO: Re-enable when UI displays auth error messages
  # @validation
  # Scenario: Sign in fails with wrong password
  # Scenario: Sign in fails with non-existent user

  # ─────────────────────────────────────────────────────────────────────────────
  # UI Elements
  # ─────────────────────────────────────────────────────────────────────────────

  @ui
  Scenario: Login form displays all required elements
    Given I am on the login page
    Then I should see an email input field
    And I should see a password input field
    And I should see a "Sign In" button
    And I should see a "Forgot password?" link
    And I should see a link to register

  # ─────────────────────────────────────────────────────────────────────────────
  # Navigation
  # ─────────────────────────────────────────────────────────────────────────────

  @navigation
  Scenario: User can navigate to registration page
    Given I am on the login page
    When I click the register link
    Then I should be on the registration page
