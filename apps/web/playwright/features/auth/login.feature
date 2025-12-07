@auth @login
Feature: User Login
  As a registered user
  I want to log in to my account
  So that I can access protected features

  Background:
    Given I am on the login page

  # UI Elements
  @ui
  Scenario: Login form displays all required elements
    Then I should see the page title "Welcome back"
    And I should see an email input field
    And I should see a password input field
    And I should see a "Sign In" button
    And I should see a "Remember me" checkbox
    And I should see a "Forgot password?" link

  # Form Validation
  @validation
  Scenario: Login fails with empty form
    When I click the sign in button
    Then I should see email validation error
    And I should see password validation error

  @validation
  Scenario: Login fails with invalid email format
    When I enter email "invalid-email"
    And I enter password "TestPassword123!"
    And I click the sign in button
    Then I should see email validation error "Please enter a valid email address"

  @validation
  Scenario: Login fails with short password
    When I enter email "test@example.com"
    And I enter password "short"
    And I click the sign in button
    Then I should see password validation error "Password must be at least 8 characters"

  # Button State
  @ui
  Scenario: Sign in button shows loading state when clicked with valid data
    When I enter email "test@example.com"
    And I enter password "ValidPassword123!"
    And I click the sign in button
    Then I should see the button in loading state

  # Navigation
  @navigation
  Scenario: User can navigate to signup page
    When I click the signup link
    Then I should be redirected to the registration page

  @navigation
  Scenario: User can navigate to forgot password page
    When I click the forgot password link
    Then I should be redirected to the forgot password page

