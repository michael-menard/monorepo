@auth @signout @e2e
Feature: User Sign Out
  As an authenticated user
  I want to sign out of my account
  So that my session is securely terminated and my data is protected

  # ─────────────────────────────────────────────────────────────────────────────
  # Full E2E Logout Flow
  # ─────────────────────────────────────────────────────────────────────────────

  @smoke @happy-path @seeded
  Scenario: Successful sign out from header dropdown
    Given I am on the login page
    When I enter email "stan.marsh@southpark.test"
    And I enter password "0Xcoffee?"
    And I click the sign in button
    Then I should be redirected to the dashboard
    When I click the user avatar in the header
    And I click the sign out menu item
    Then I should be redirected to the login page

  @security @seeded
  Scenario: Auth tokens are cleared after logout
    Given I am on the login page
    When I enter email "stan.marsh@southpark.test"
    And I enter password "0Xcoffee?"
    And I click the sign in button
    Then I should be redirected to the dashboard
    When I click the user avatar in the header
    And I click the sign out menu item
    Then I should be redirected to the login page
    And the Cognito tokens should be cleared from localStorage
    And the Redux auth state should be unauthenticated

  # ─────────────────────────────────────────────────────────────────────────────
  # Protected Page Access After Logout
  # ─────────────────────────────────────────────────────────────────────────────

  @security @seeded
  Scenario: Cannot access dashboard after logout
    Given I am on the login page
    When I enter email "stan.marsh@southpark.test"
    And I enter password "0Xcoffee?"
    And I click the sign in button
    Then I should be redirected to the dashboard
    When I click the user avatar in the header
    And I click the sign out menu item
    Then I should be redirected to the login page
    When I navigate directly to "/dashboard"
    Then I should be redirected to the login page

  @security @seeded
  Scenario: Cannot access wishlist after logout
    Given I am on the login page
    When I enter email "stan.marsh@southpark.test"
    And I enter password "0Xcoffee?"
    And I click the sign in button
    Then I should be redirected to the dashboard
    When I click the user avatar in the header
    And I click the sign out menu item
    Then I should be redirected to the login page
    When I navigate directly to "/wishlist"
    Then I should be redirected to the login page

  @security @seeded
  Scenario: Cannot access settings after logout
    Given I am on the login page
    When I enter email "stan.marsh@southpark.test"
    And I enter password "0Xcoffee?"
    And I click the sign in button
    Then I should be redirected to the dashboard
    When I click the user avatar in the header
    And I click the sign out menu item
    Then I should be redirected to the login page
    When I navigate directly to "/settings"
    Then I should be redirected to the login page
