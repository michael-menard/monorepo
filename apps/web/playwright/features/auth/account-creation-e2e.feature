@auth @e2e @account-creation
Feature: Full Account Creation E2E Flow
  As a new user
  I want to complete the entire account creation process
  So that I can log in and use the platform

  Background:
    Given a unique test email is generated

  @smoke @happy-path
  Scenario: Signup redirects to email verification and user can be confirmed
    Given I am on the registration page
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

  @cleanup
  Scenario: Clean up any orphaned test users
    When any existing test user is cleaned up
    Then the cleanup should complete successfully

