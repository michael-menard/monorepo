@admin @user-management @e2e
Feature: Admin User Management
  As an admin user
  I want to manage user accounts
  So that I can handle security incidents and policy violations

  Background:
    Given I am logged in as an admin user

  # ─────────────────────────────────────────────────────────────────────────────
  # User List Page
  # ─────────────────────────────────────────────────────────────────────────────

  @smoke @happy-path
  Scenario: Admin can view user list
    When I navigate to the admin users page
    Then I should see the user management heading
    And I should see the user search input
    And I should see the user table

  @search
  Scenario: Admin can search users by email
    Given I navigate to the admin users page
    When I search for user with email "test@example"
    Then I should see users matching the search term
    And I should see the user count updated

  @pagination
  Scenario: Admin can load more users
    Given I navigate to the admin users page
    And there are more users to load
    When I click the load more button
    Then I should see additional users in the table

  # ─────────────────────────────────────────────────────────────────────────────
  # User Detail Page
  # ─────────────────────────────────────────────────────────────────────────────

  @navigation
  Scenario: Admin can navigate to user detail page
    Given I navigate to the admin users page
    When I click on a user in the table
    Then I should be on the user detail page
    And I should see the user's email
    And I should see the user's account status

  @ui
  Scenario: User detail page shows action buttons
    Given I am on a user's detail page
    Then I should see the revoke tokens button
    And I should see the block user button

  @ui
  Scenario: User detail page shows suspended status for blocked users
    Given I am on a blocked user's detail page
    Then I should see the suspended badge
    And I should see the unblock user button
    And I should not see the block user button

  # ─────────────────────────────────────────────────────────────────────────────
  # Revoke Tokens Flow
  # ─────────────────────────────────────────────────────────────────────────────

  @action @revoke-tokens
  Scenario: Admin can revoke user's tokens
    Given I am on a user's detail page
    When I click the revoke tokens button
    Then I should see the revoke tokens confirmation dialog
    When I confirm the revoke tokens action
    Then I should see a success message for token revocation

  @action @revoke-tokens
  Scenario: Admin can cancel revoking tokens
    Given I am on a user's detail page
    When I click the revoke tokens button
    Then I should see the revoke tokens confirmation dialog
    When I click cancel in the dialog
    Then the dialog should be closed

  # ─────────────────────────────────────────────────────────────────────────────
  # Block User Flow
  # ─────────────────────────────────────────────────────────────────────────────

  @action @block
  Scenario: Admin can block a user with reason
    Given I am on a user's detail page
    When I click the block user button
    Then I should see the block user dialog
    When I select block reason "Security Incident"
    And I enter block notes "Multiple failed login attempts detected"
    And I confirm the block action
    Then I should see a success message for blocking user
    And the user should show as blocked

  @validation
  Scenario: Block user requires selecting a reason
    Given I am on a user's detail page
    When I click the block user button
    Then I should see the block user dialog
    And the confirm block button should be disabled
    When I select block reason "Policy Violation"
    Then the confirm block button should be enabled

  @action @block
  Scenario: Admin can cancel blocking a user
    Given I am on a user's detail page
    When I click the block user button
    Then I should see the block user dialog
    When I click cancel in the dialog
    Then the dialog should be closed

  # ─────────────────────────────────────────────────────────────────────────────
  # Unblock User Flow
  # ─────────────────────────────────────────────────────────────────────────────

  @action @unblock
  Scenario: Admin can unblock a previously blocked user
    Given I am on a blocked user's detail page
    When I click the unblock user button
    Then I should see the unblock user confirmation dialog
    When I confirm the unblock action
    Then I should see a success message for unblocking user
    And the user should show as active

  # ─────────────────────────────────────────────────────────────────────────────
  # Access Control
  # ─────────────────────────────────────────────────────────────────────────────

  @security @access-control
  Scenario: Non-admin users cannot access admin pages
    Given I am logged in as a regular user
    When I try to navigate to the admin users page
    Then I should be redirected to the unauthorized page

  @security @access-control
  Scenario: Unauthenticated users cannot access admin pages
    Given I am not logged in
    When I try to navigate to the admin users page
    Then I should be redirected to the login page

  # ─────────────────────────────────────────────────────────────────────────────
  # Error Handling
  # ─────────────────────────────────────────────────────────────────────────────

  @error-handling
  Scenario: Error message shown when user list fails to load
    Given the admin users API returns an error
    When I navigate to the admin users page
    Then I should see an error message for loading users

  @error-handling
  Scenario: Error message shown when block user fails
    Given I am on a user's detail page
    And the block user API will fail
    When I click the block user button
    And I select block reason "Other"
    And I confirm the block action
    Then I should see an error message for blocking user
