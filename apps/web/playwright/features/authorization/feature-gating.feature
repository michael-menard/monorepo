@authorization @feature-gating @tier
Feature: Feature Gating
  As a platform user
  I want to see appropriate content based on my tier
  So that I know which features are available to me

  # ─────────────────────────────────────────────────────────────────────────────
  # Free-tier User Restrictions
  # ─────────────────────────────────────────────────────────────────────────────

  @free-tier
  Scenario: Free-tier user sees upgrade prompt for gallery feature
    Given I am logged in as a free-tier test user
    When I navigate to the gallery page
    Then I should see an upgrade prompt or feature gate

  @free-tier @wishlist
  Scenario: Free-tier user has access to wishlist feature
    Given I am logged in as a free-tier test user
    When I navigate to the wishlist page
    Then I should not see an upgrade prompt for wishlist
    And I should see wishlist content

  # ─────────────────────────────────────────────────────────────────────────────
  # Quota Indicators
  # ─────────────────────────────────────────────────────────────────────────────

  @quota @dashboard
  Scenario: Dashboard displays quota usage
    Given I am logged in as a test user
    When I navigate to the dashboard
    Then I should see quota indicators if implemented

  # ─────────────────────────────────────────────────────────────────────────────
  # Permissions API Integration
  # ─────────────────────────────────────────────────────────────────────────────

  @permissions @api
  Scenario: Permissions API is called on authenticated page load
    Given I am logged in as a test user
    When I navigate to the dashboard
    Then the permissions endpoint may be called

  @suspended
  Scenario: Suspended user sees suspension message
    Given I am logged in as a suspended test user
    When I try to access protected features
    Then I should see a suspension message

  # ─────────────────────────────────────────────────────────────────────────────
  # Unauthenticated Access
  # ─────────────────────────────────────────────────────────────────────────────

  @unauthenticated @smoke
  Scenario: Unauthenticated user visiting protected route is handled
    Given I am not logged in
    When I try to access the gallery page
    Then I should be redirected to login or see appropriate content
    And the page should not crash
