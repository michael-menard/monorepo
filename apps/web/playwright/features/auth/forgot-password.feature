@auth @forgot-password
Feature: Forgot Password

  As a user who forgot my password
  I want to request a password reset code
  So that I can regain access to my account

  Background:
    Given I am on the forgot password page

  # AC11: Test: Forgot password → request reset code
  @smoke @p0
  Scenario: Request password reset code successfully
    When I enter "testuser@example.com" in the email field
    And I click the send reset code button
    Then I should see a code sent success message
    And I should be redirected to the reset password page

  @p0
  Scenario: Display forgot password form elements
    Then I should see the forgot password form
    And I should see the email input field
    And I should see the send reset code button
    And I should see the back to login link

  @p1
  Scenario: Validate email format
    When I enter "invalid-email" in the email field
    And I click the send reset code button
    Then I should see an email format error

  @p1
  Scenario: Handle rate limiting
    When I request reset codes 3 times rapidly
    Then I should see a rate limit error
    And I should see a retry after message

  @p2
  Scenario: Navigate back to login
    When I click the back to login link
    Then I should be on the login page

  @p2
  Scenario: Handle non-existent email gracefully
    When I enter "nonexistent@example.com" in the email field
    And I click the send reset code button
    Then I should see a generic success message
    # Security: Don't reveal if email exists
