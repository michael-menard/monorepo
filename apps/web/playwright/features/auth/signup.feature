@auth @signup
Feature: User Signup

  As a new user
  I want to create an account
  So that I can access the application

  Background:
    Given I am on the signup page

  # AC4: Test: Signup → Email verification flow
  @smoke @p0
  Scenario: Complete signup and email verification
    When I enter "newuser@example.com" in the email field
    And I enter "ValidPassword123!" in the password field
    And I enter "ValidPassword123!" in the confirm password field
    And I click the sign up button
    Then I should be redirected to the email verification page
    When I enter the valid verification code "123456"
    And I click the verify button
    Then I should see a verification success message
    And I should be redirected to the login page

  @p0
  Scenario: Display signup form elements
    Then I should see the signup form
    And I should see the email input field
    And I should see the password input field
    And I should see the confirm password field
    And I should see the sign up button

  # AC5: Test: Resend verification code
  @p1
  Scenario: Resend verification code
    Given I have submitted the signup form
    And I am on the email verification page
    When I click the resend code button
    Then I should see a code sent confirmation
    And the resend button should be disabled temporarily

  @p1
  Scenario: Resend cooldown timer
    Given I have submitted the signup form
    And I am on the email verification page
    When I click the resend code button
    Then I should see a cooldown timer
    And I cannot click resend until timer expires

  @p1
  Scenario: Validate password requirements during signup
    When I enter "newuser@example.com" in the email field
    And I enter "weak" in the password field
    Then I should see password strength indicator as weak
    When I enter "StrongPass123!" in the password field
    Then I should see password strength indicator as strong

  @p1
  Scenario: Validate password confirmation match
    When I enter "ValidPassword123!" in the password field
    And I enter "DifferentPassword123!" in the confirm password field
    And I click the sign up button
    Then I should see a passwords do not match error

  @p2
  Scenario: Show error for existing email
    When I enter "existing@example.com" in the email field
    And I enter "ValidPassword123!" in the password field
    And I enter "ValidPassword123!" in the confirm password field
    And I click the sign up button
    Then I should see an email already exists error
