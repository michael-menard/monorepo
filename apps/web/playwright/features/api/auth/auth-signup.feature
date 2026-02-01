@api @auth @signup
Feature: Cognito Authentication - Sign Up Flow
  As a new user
  I want to sign up for an account
  So that I can access the platform

  Background:
    Given the Cognito user pool is configured

  @smoke
  Scenario: Successful user registration
    Given I have a unique email address
    When I sign up with a valid password
    Then the sign up should succeed
    And a verification code should be sent to my email
    And the user should not be confirmed yet

  @smoke
  Scenario: Sign up and verify email
    Given I have a unique email address
    When I sign up with a valid password
    And the admin confirms my email
    Then the user should be confirmed
    And I should be able to sign in
    And I should receive valid tokens

  Scenario: Sign up with existing email fails
    Given a user already exists with email "existing-test@example.com"
    When I try to sign up with email "existing-test@example.com"
    Then the sign up should fail with "UsernameExistsException"

  Scenario: Sign up with weak password fails
    Given I have a unique email address
    When I try to sign up with password "weak"
    Then the sign up should fail with "InvalidPasswordException"

  Scenario Outline: Password validation rules
    Given I have a unique email address
    When I try to sign up with password "<password>"
    Then the sign up should fail with "InvalidPasswordException"

    Examples:
      | password      | reason                    |
      | short1!       | Too short (min 8 chars)   |
      | nouppercase1! | Missing uppercase         |
      | NOLOWERCASE1! | Missing lowercase         |
      | NoNumbers!    | Missing number            |

  Scenario: Sign up with invalid email format fails
    When I try to sign up with email "not-an-email" and password "ValidPass123!"
    Then the sign up should fail with "InvalidParameterException"
