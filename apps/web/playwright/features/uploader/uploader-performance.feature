@uploader @performance @perf
Feature: MOC Instructions Uploader - Performance
  As a user
  I want the uploader to load quickly
  So that I can start uploading without delays

  Background:
    Given I am logged in as a test user

  @tti @budget
  Scenario: Uploader route loads within TTI budget
    When I navigate to the instructions upload page
    Then the page should be interactive within 2500ms
    And the title input should be visible within 2500ms

  @bundle-size
  Scenario: Uploader bundle is lazy loaded
    When I am on the dashboard
    Then the uploader module should not be loaded
    When I navigate to the instructions upload page
    Then the uploader module should be loaded

  @lcp
  Scenario: Largest Contentful Paint is acceptable
    When I navigate to the instructions upload page
    Then the LCP should be under 2500ms

  @cls
  Scenario: Cumulative Layout Shift is minimal
    When I navigate to the instructions upload page
    And I wait for the page to stabilize
    Then the CLS should be under 0.1
