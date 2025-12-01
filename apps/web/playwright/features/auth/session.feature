@auth @session
Feature: Session Management

  As an authenticated user
  I want my session to persist appropriately
  So that I have a seamless experience

  # AC8: Test: Logout flow
  @smoke @p0
  Scenario: Logout clears session
    Given I am logged in as "testuser@example.com"
    When I click the logout button
    Then I should be redirected to the login page
    And my session should be cleared
    When I navigate to the dashboard
    Then I should be redirected to the login page

  # AC9: Test: Protected route redirect to login
  @p0
  Scenario: Protected route redirects unauthenticated users
    Given I am not logged in
    When I navigate to the dashboard
    Then I should be redirected to the login page
    And I should see a login required message

  @p0
  Scenario: Redirect back after login
    Given I am not logged in
    When I navigate to "/settings"
    Then I should be redirected to the login page
    When I login with valid credentials
    Then I should be redirected to "/settings"

  # AC10: Test: Session persistence across page refresh
  @p0
  Scenario: Session persists across page refresh
    Given I am logged in as "testuser@example.com"
    When I refresh the page
    Then I should remain on the dashboard
    And I should still be authenticated

  @p1
  Scenario: Session persists across browser tabs
    Given I am logged in as "testuser@example.com"
    When I open a new browser tab
    And I navigate to the dashboard in the new tab
    Then I should be authenticated in the new tab

  @p2
  Scenario: Handle token expiry gracefully
    Given I am logged in with an expired token
    When I navigate to a protected route
    Then I should be redirected to the login page
    And I should see a session expired message
