@auth
Feature: User Login

  As a user of the LEGO MOC Instructions application
  I want to be able to log in to my account
  So that I can access my personal content and features

  Background:
    Given I am on the login page

  @smoke
  Scenario: Display login page elements
    Then I should see the login form
    And I should see the email input field
    And I should see the password input field
    And I should see the sign in button

  @smoke
  Scenario: Navigate to signup page
    When I click the sign up link
    Then I should be on the signup page

  Scenario: Show validation error for empty email
    When I click the sign in button
    Then I should see an email validation error

  Scenario: Show validation error for invalid email format
    When I enter "invalid-email" in the email field
    And I click the sign in button
    Then I should see an email format error

  Scenario: Navigate to forgot password page
    When I click the forgot password link
    Then I should be on the forgot password page
