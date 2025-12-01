@auth @reset-password
Feature: Reset Password

  As a user with a reset code
  I want to set a new password
  So that I can access my account again

  Background:
    Given I am on the reset password page

  # AC12: Test: Reset password → enter code and new password
  @smoke @p0
  Scenario: Reset password successfully
    When I enter "testuser@example.com" in the email field
    And I enter the reset code "123456"
    And I enter "NewValidPassword123!" in the new password field
    And I enter "NewValidPassword123!" in the confirm password field
    And I click the reset password button
    Then I should see a password reset success message
    And I should be redirected to the login page

  @p0
  Scenario: Display reset password form elements
    Then I should see the reset password form
    And I should see the email input field
    And I should see the OTP code input
    And I should see the new password field
    And I should see the confirm password field
    And I should see the reset password button

  @p0
  Scenario: Pre-fill email from navigation state
    Given I came from the forgot password page with email "prefilled@example.com"
    Then the email field should contain "prefilled@example.com"

  # AC13: Test: Password validation rules
  @p0
  Scenario: Validate password minimum length
    When I enter "short" in the new password field
    Then I should see "at least 8 characters"

  @p0
  Scenario: Validate password requires uppercase
    When I enter "nouppercase1!" in the new password field
    Then I should see "uppercase"

  @p0
  Scenario: Display password strength indicator
    When I enter "weak" in the new password field
    Then the password strength should show "Weak"
    When I enter "StrongerPass1!" in the new password field
    Then the password strength should show "Strong"

  @p1
  Scenario: Validate password confirmation match
    When I enter "ValidPassword123!" in the new password field
    And I enter "DifferentPassword!" in the confirm password field
    And I click the reset password button
    Then I should see a passwords do not match error

  @p1
  Scenario: Show error for invalid reset code
    When I enter "testuser@example.com" in the email field
    And I enter the invalid reset code "000000"
    And I enter "NewValidPassword123!" in the new password field
    And I enter "NewValidPassword123!" in the confirm password field
    And I click the reset password button
    Then I should see an invalid code error

  @p1
  Scenario: Show error for expired reset code
    When I enter "testuser@example.com" in the email field
    And I enter the expired reset code "999999"
    And I enter "NewValidPassword123!" in the new password field
    And I enter "NewValidPassword123!" in the confirm password field
    And I click the reset password button
    Then I should see a code expired error

  @p2
  Scenario: Request new reset code
    When I click the resend code link
    Then I should be redirected to the forgot password page
