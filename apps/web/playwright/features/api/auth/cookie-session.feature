@api @auth @cookie-session @security
Feature: Cookie-Based Authentication Session Management
  As a security-conscious system
  I want to use httpOnly cookies for authentication
  So that tokens are protected from XSS attacks

  # Story: Cookie-Based Auth Migration
  # This feature tests the new /auth/* session management endpoints
  # Note: Some validation scenarios are skipped when AUTH_BYPASS=true (dev mode)

  Background:
    Given the API server is running

  # ─────────────────────────────────────────────────────────────────────────────
  # Session Creation (POST /auth/session)
  # ─────────────────────────────────────────────────────────────────────────────

  @smoke @happy-path
  Scenario: Successfully create session with valid ID token
    Given I have a valid Cognito ID token for the primary test user
    When I POST to "/auth/session" with the ID token
    Then the response status should be 200
    And the response should indicate success
    And the response should set an httpOnly cookie named "auth_token"
    And the cookie should have SameSite=Strict

  @validation
  Scenario: Session creation fails without ID token
    When I POST to "/auth/session" with empty body
    Then the response status should be 400

  # Note: Invalid/expired token tests are skipped in dev mode (AUTH_BYPASS=true)
  # These would return 401 in production

  # ─────────────────────────────────────────────────────────────────────────────
  # Session Refresh (POST /auth/refresh)
  # ─────────────────────────────────────────────────────────────────────────────

  @happy-path
  Scenario: Successfully refresh session with valid ID token
    Given I have a valid Cognito ID token for the primary test user
    When I POST to "/auth/refresh" with the ID token
    Then the response status should be 200
    And the response should indicate success
    And the response should update the "auth_token" cookie

  # ─────────────────────────────────────────────────────────────────────────────
  # Session Logout (POST /auth/logout)
  # ─────────────────────────────────────────────────────────────────────────────

  @happy-path
  Scenario: Successfully clear session on logout
    Given I have an active cookie session
    When I POST to "/auth/logout"
    Then the response status should be 200
    And the response should indicate success
    And the "auth_token" cookie should be cleared

  @edge-case
  Scenario: Logout succeeds even without active session
    When I POST to "/auth/logout"
    Then the response status should be 200
    And the response should indicate success

  # ─────────────────────────────────────────────────────────────────────────────
  # Session Status (GET /auth/status)
  # ─────────────────────────────────────────────────────────────────────────────

  @happy-path
  Scenario: Check session status when authenticated
    Given I have an active cookie session
    When I GET "/auth/status"
    Then the response status should be 200
    And the response should indicate authenticated true
    And the response should contain user info

  @happy-path
  Scenario: Check session status when not authenticated
    When I GET "/auth/status" without credentials
    Then the response status should be 401
    And the response should indicate authenticated false

  # ─────────────────────────────────────────────────────────────────────────────
  # Cookie-Based API Access
  # ─────────────────────────────────────────────────────────────────────────────

  @smoke @integration
  Scenario: Protected endpoint accepts cookie authentication
    Given I have an active cookie session
    When I request the wishlist list endpoint with cookie auth
    Then the response status should be 200

  # ─────────────────────────────────────────────────────────────────────────────
  # Backward Compatibility (Authorization Header Fallback)
  # ─────────────────────────────────────────────────────────────────────────────

  @backward-compatibility
  Scenario: Protected endpoint still accepts Authorization header
    Given I am authenticated as the primary test user
    When I request the wishlist list endpoint with Authorization header
    Then the response status should be 200

  @backward-compatibility
  Scenario: Cookie takes precedence over Authorization header
    Given I have an active cookie session for the primary user
    And I have an Authorization header for a different user
    When I request the wishlist list endpoint with both auth methods
    Then the request should use the cookie authentication
