@auth @login
Feature: User Login

  As a user of the LEGO MOC Instructions application
  I want to be able to log in to my account
  So that I can access my personal content and features

  Background:
    Given I am on the login page

  # AC2: Test: Successful login flow (no MFA)
  @smoke @p0
  Scenario: Successful login with valid credentials
    When I enter "testuser@example.com" in the email field
    And I enter "ValidPassword123!" in the password field
    And I click the sign in button
    Then I should be on the dashboard
    And I should see a welcome message

  @smoke @p0
  Scenario: Display login page elements
    Then I should see the login form
    And I should see the email input field
    And I should see the password input field
    And I should see the sign in button
    And I should see the forgot password link
    And I should see the sign up link

  # AC6: Test: Invalid credentials error handling
  @p0
  Scenario: Show error for invalid credentials
    When I enter "testuser@example.com" in the email field
    And I enter "WrongPassword123!" in the password field
    And I click the sign in button
    Then I should see an authentication error
    And I should remain on the login page

  @p1
  Scenario: Show validation error for empty email
    When I click the sign in button
    Then I should see an email validation error

  @p1
  Scenario: Show validation error for invalid email format
    When I enter "invalid-email" in the email field
    And I click the sign in button
    Then I should see an email format error

  @p1
  Scenario: Show validation error for empty password
    When I enter "testuser@example.com" in the email field
    And I click the sign in button
    Then I should see a password validation error

  @p2
  Scenario: Navigate to signup page
    When I click the sign up link
    Then I should be on the signup page

  @p2
  Scenario: Navigate to forgot password page
    When I click the forgot password link
    Then I should be on the forgot password page
