@auth @email-verification
Feature: Email Verification Page
  As a user who just signed up
  I want to verify my email address with a code
  So that I can complete my account registration

  Background:
    Given I am on the email verification page with a pending email

  # UI Elements
  @ui
  Scenario: Email verification page displays all required elements
    Then I should see the page title "Verify Your Email"
    And I should see a masked version of my email
    And I should see an OTP input with 6 digit fields
    And I should see a "Verify Email" button
    And I should see the resend code button
    And I should see a "Back to Sign Up" button

  @ui
  Scenario: Verify button is disabled when OTP is incomplete
    Then the verify button should be disabled
    When I enter partial OTP "123"
    Then the verify button should be disabled
    When I enter complete OTP "123456"
    Then the verify button should be enabled

  # OTP Input Behavior
  @ui @otp
  Scenario: OTP input accepts only digits
    When I type "abc123" in the OTP input
    Then the OTP input should contain "123"

  @ui @otp
  Scenario: OTP input supports filling all digits
    When I fill the OTP input with "654321"
    Then the OTP input should contain "654321"
    And the verify button should be enabled

  @ui @otp
  Scenario: OTP input allows backspace navigation
    When I enter complete OTP "123456"
    And I press backspace in the last OTP field
    Then the OTP input should contain "12345"
    And the verify button should be disabled

  # Navigation
  @navigation
  Scenario: Back to signup button navigates to registration page
    When I click the back to signup button
    Then I should be on the registration page

  @navigation
  Scenario: Redirects to signup if no pending email
    Given I am on the email verification page without a pending email
    Then I should be redirected to the registration page

  # Resend Code - UI only (API mocking requires additional infrastructure)
  @resend @ui
  Scenario: Resend code button is visible and clickable
    Then I should see the resend code button
    And the resend code button should be enabled

  # Verify Button State
  @ui
  Scenario: Verify button shows correct text
    Then the verify button should show "Verify Email"
    When I enter complete OTP "123456"
    Then the verify button should be enabled

