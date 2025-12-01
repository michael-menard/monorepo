@auth @mfa
Feature: Multi-Factor Authentication

  As a user with MFA enabled
  I want to complete the MFA challenge after login
  So that my account remains secure

  Background:
    Given I am on the login page

  # AC3: Test: Login with MFA challenge → OTP verification
  @smoke @p0
  Scenario: Complete MFA verification successfully
    When I enter "mfa-user@example.com" in the email field
    And I enter "ValidPassword123!" in the password field
    And I click the sign in button
    Then I should be redirected to the OTP verification page
    When I enter the valid OTP code "123456"
    And I click the verify button
    Then I should be on the dashboard

  @p0
  Scenario: MFA challenge detection and redirect
    When I enter "mfa-user@example.com" in the email field
    And I enter "ValidPassword123!" in the password field
    And I click the sign in button
    Then I should be redirected to the OTP verification page
    And I should see the OTP input component
    And I should see a verify button

  # AC7: Test: Invalid OTP code error handling
  @p0
  Scenario: Show error for invalid OTP code
    Given I have triggered an MFA challenge
    When I enter the invalid OTP code "000000"
    And I click the verify button
    Then I should see an invalid code error
    And I should remain on the OTP verification page

  @p1
  Scenario: OTP input keyboard navigation
    Given I have triggered an MFA challenge
    Then I should be able to navigate OTP inputs with arrow keys
    And pasting a full code should populate all inputs

  @p2
  Scenario: Navigate back to login from OTP page
    Given I have triggered an MFA challenge
    When I click the back to login button
    Then I should be on the login page
