@api @admin @flag-scheduling @wish-2119
Feature: Flag Scheduling API
  As an admin user
  I want to schedule flag state changes for a future time
  So that feature rollouts happen automatically without manual intervention

  Background:
    Given the API is available
    And I am authenticated as an admin user
    And the test flag "e2e-schedule-flag" exists

  # ─────────────────────────────────────────────────────────────────────────────
  # Create Schedule - Happy Path
  # ─────────────────────────────────────────────────────────────────────────────

  @smoke
  Scenario: Create a schedule to enable a flag
    When I create a schedule for flag "e2e-schedule-flag" to enable it in 2 hours
    Then the response status should be 201
    And the schedule response should have status "pending"
    And the schedule response should have flagKey "e2e-schedule-flag"
    And the schedule response should include "enabled" in updates

  @smoke
  Scenario: Create a schedule to set rollout percentage
    When I create a schedule for flag "e2e-schedule-flag" with rolloutPercentage 50 in 3 hours
    Then the response status should be 201
    And the schedule response should have status "pending"
    And the schedule response should include "rolloutPercentage" in updates

  Scenario: Create a schedule with both enabled and rolloutPercentage
    When I create a schedule for flag "e2e-schedule-flag" with enabled true and rolloutPercentage 75 in 4 hours
    Then the response status should be 201
    And the schedule response should have status "pending"
    And the schedule response should include "enabled" in updates
    And the schedule response should include "rolloutPercentage" in updates
    And the schedule response should have a valid UUID id
    And the schedule response should have a valid scheduledAt datetime
    And the schedule response should have a valid createdAt datetime

  # ─────────────────────────────────────────────────────────────────────────────
  # Create Schedule - Validation Errors
  # ─────────────────────────────────────────────────────────────────────────────

  Scenario: Reject schedule with past scheduledAt date
    When I create a schedule for flag "e2e-schedule-flag" with a past date
    Then the response status should be 400
    And the response should contain error "Validation failed"

  Scenario: Reject schedule with empty updates
    When I create a schedule for flag "e2e-schedule-flag" with empty updates in 2 hours
    Then the response status should be 400
    And the response should contain error "Validation failed"

  Scenario: Reject schedule with rolloutPercentage over 100
    When I create a schedule for flag "e2e-schedule-flag" with rolloutPercentage 150 in 2 hours
    Then the response status should be 400
    And the response should contain error "Validation failed"

  Scenario: Reject schedule with negative rolloutPercentage
    When I create a schedule for flag "e2e-schedule-flag" with rolloutPercentage -10 in 2 hours
    Then the response status should be 400
    And the response should contain error "Validation failed"

  Scenario: Reject schedule with invalid datetime format
    When I create a schedule for flag "e2e-schedule-flag" with invalid datetime "not-a-date"
    Then the response status should be 400
    And the response should contain error "Validation failed"

  Scenario: Reject schedule with missing scheduledAt
    When I create a schedule for flag "e2e-schedule-flag" with missing scheduledAt
    Then the response status should be 400
    And the response should contain error "Validation failed"

  # ─────────────────────────────────────────────────────────────────────────────
  # Create Schedule - Flag Not Found
  # ─────────────────────────────────────────────────────────────────────────────

  Scenario: Reject schedule for non-existent flag
    When I create a schedule for flag "non-existent-flag-xyz" to enable it in 2 hours
    Then the response status should be 404
    And the response should contain error "NOT_FOUND"

  # ─────────────────────────────────────────────────────────────────────────────
  # List Schedules
  # ─────────────────────────────────────────────────────────────────────────────

  @smoke
  Scenario: List schedules for a flag with results
    Given I have created a schedule for flag "e2e-schedule-flag"
    When I list schedules for flag "e2e-schedule-flag"
    Then the response status should be 200
    And the schedule list should not be empty
    And each schedule in the list should have an id and status

  Scenario: List schedules for a flag with no schedules
    When I list schedules for flag "e2e-schedule-flag-empty"
    Then the response status should be 200
    And the schedule list should be empty

  Scenario: List schedules for non-existent flag returns 404
    When I list schedules for flag "non-existent-flag-xyz"
    Then the response status should be 404
    And the response should contain error "NOT_FOUND"

  # ─────────────────────────────────────────────────────────────────────────────
  # Cancel Schedule
  # ─────────────────────────────────────────────────────────────────────────────

  @smoke
  Scenario: Cancel a pending schedule
    Given I have created a schedule for flag "e2e-schedule-flag"
    When I cancel the created schedule for flag "e2e-schedule-flag"
    Then the response status should be 200
    And the schedule response should have status "cancelled"

  Scenario: Cancel non-existent schedule returns 404
    When I cancel schedule "00000000-0000-0000-0000-000000000000" for flag "e2e-schedule-flag"
    Then the response status should be 404
    And the response should contain error "NOT_FOUND"

  Scenario: Cancel schedule for non-existent flag returns 404
    When I cancel schedule "00000000-0000-0000-0000-000000000000" for flag "non-existent-flag-xyz"
    Then the response status should be 404
    And the response should contain error "NOT_FOUND"

  # ─────────────────────────────────────────────────────────────────────────────
  # Authentication & Authorization
  # ─────────────────────────────────────────────────────────────────────────────

  Scenario: Unauthenticated request returns 401
    Given I am not authenticated
    When I create a schedule for flag "e2e-schedule-flag" to enable it in 2 hours
    Then the response status should be 401

  Scenario: Non-admin user returns 403
    Given I am authenticated as the primary test user
    When I create a schedule for flag "e2e-schedule-flag" to enable it in 2 hours
    Then the response status should be 403
