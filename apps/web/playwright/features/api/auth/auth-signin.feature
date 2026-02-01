@api @auth @signin
Feature: Cognito Authentication - Sign In Flow
  As a registered user
  I want to sign in to my account
  So that I can access protected resources

  Background:
    Given the Cognito user pool is configured

  @smoke @seeded
  Scenario: Sign in with valid credentials
    When I sign in as "stan.marsh@southpark.test" with password "0Xcoffee?"
    Then the sign in should succeed
    And I should receive valid tokens
    And the access token should contain my user ID

  @seeded
  Scenario: Sign in with different seeded user
    When I sign in as "eric.cartman@southpark.test" with password "0Xcoffee?"
    Then the sign in should succeed
    And I should receive valid tokens

  Scenario: Sign in with wrong password fails
    When I sign in as "stan.marsh@southpark.test" with password "WrongPassword123!"
    Then the sign in should fail with "NotAuthorizedException"

  Scenario: Sign in with non-existent user fails
    # Cognito returns NotAuthorizedException for security (doesn't reveal if user exists)
    When I sign in as "nonexistent@example.com" with password "0Xcoffee?"
    Then the sign in should fail with "NotAuthorizedException"

  @seeded
  Scenario: Access token can be used to call API
    When I sign in as "kyle.broflovski@southpark.test" with password "0Xcoffee?"
    Then the sign in should succeed
    And I can use the token to call the wishlist API
