@api @wishlist @auth @security
Feature: Wishlist API Authorization
  As a security-conscious system
  I want to enforce authentication and authorization on all endpoints
  So that users can only access their own data

  # Story: WISH-2008 (Authorization & Security)

  # ─────────────────────────────────────────────────────────────────────────────
  # Unauthenticated Access (401)
  # ─────────────────────────────────────────────────────────────────────────────

  @smoke @wish-2008
  Scenario Outline: Unauthenticated requests return 401
    Given I am not authenticated
    When I make a <method> request to "<endpoint>"
    Then the response status should be 401
    And the response should contain error "UNAUTHORIZED"

    Examples:
      | method | endpoint                                       |
      | GET    | /api/wishlist                                  |
      | POST   | /api/wishlist                                  |
      | GET    | /api/wishlist/00000000-0000-0000-0000-000001   |
      | PUT    | /api/wishlist/00000000-0000-0000-0000-000001   |
      | DELETE | /api/wishlist/00000000-0000-0000-0000-000001   |
      | PUT    | /api/wishlist/reorder                          |
      | GET    | /api/wishlist/images/presign                   |
      | POST   | /api/wishlist/00000000-0000-0000-0000-000001/purchased |

  @wish-2008
  Scenario: Request with no Authorization header returns 401
    Given I send a request without Authorization header
    When I request the wishlist list endpoint
    Then the response status should be 401

  @wish-2008
  Scenario: Request with empty Authorization header returns 401
    Given I send a request with empty Authorization header
    When I request the wishlist list endpoint
    Then the response status should be 401

  # ─────────────────────────────────────────────────────────────────────────────
  # Invalid Token (401)
  # ─────────────────────────────────────────────────────────────────────────────

  @wish-2008
  Scenario: Malformed token returns 401
    Given I am authenticated with a malformed token
    When I request the wishlist list endpoint
    Then the response status should be 401
    And the response should contain error "UNAUTHORIZED"

  @wish-2008
  Scenario: Expired token returns 401
    Given I am authenticated with an expired token
    When I request the wishlist list endpoint
    Then the response status should be 401

  @wish-2008
  Scenario: Token with invalid signature returns 401
    Given I am authenticated with a tampered token
    When I request the wishlist list endpoint
    Then the response status should be 401

  # ─────────────────────────────────────────────────────────────────────────────
  # Cross-User Access Prevention (WISH-2008)
  # ─────────────────────────────────────────────────────────────────────────────

  @smoke @wish-2008
  Scenario: User cannot view another user's item
    Given I am authenticated as the primary test user
    And the secondary user has created a wishlist item
    When I request the secondary user's item
    Then the response status should be 404
    And the response should contain error "NOT_FOUND"

  @wish-2008
  Scenario: User cannot update another user's item
    Given I am authenticated as the primary test user
    And the secondary user has created a wishlist item
    When I try to update the secondary user's item
    Then the response status should be 404

  @wish-2008
  Scenario: User cannot delete another user's item
    Given I am authenticated as the primary test user
    And the secondary user has created a wishlist item
    When I try to delete the secondary user's item
    Then the response status should be 404

  @wish-2008
  Scenario: User cannot mark another user's item as purchased
    Given I am authenticated as the primary test user
    And the secondary user has created a wishlist item
    When I try to mark the secondary user's item as purchased
    Then the response status should be 404

  @wish-2008
  Scenario: List only returns current user's items
    Given I am authenticated as the primary test user
    And I have created a wishlist item with title "Primary User Item"
    And the secondary user has created a wishlist item with title "Secondary User Item"
    When I request the wishlist list endpoint
    Then the response status should be 200
    And the items should contain "Primary User Item"
    And the items should not contain "Secondary User Item"

  # ─────────────────────────────────────────────────────────────────────────────
  # Authorization Error Audit Logging (WISH-2008 AC14)
  # ─────────────────────────────────────────────────────────────────────────────

  @wish-2008 @audit
  Scenario: Unauthorized access attempt is logged
    Given I am authenticated as the primary test user
    And the secondary user has created a wishlist item
    When I request the secondary user's item
    Then the response status should be 404
    # Note: Audit logging is verified via backend logs, not API response

  # ─────────────────────────────────────────────────────────────────────────────
  # Role-Based Access (if applicable)
  # ─────────────────────────────────────────────────────────────────────────────

  @wish-2008
  Scenario: Regular user cannot access admin-only endpoints
    Given I am authenticated as the primary test user
    When I make a GET request to "/api/admin/wishlist"
    Then the response status should be 401 or 404
