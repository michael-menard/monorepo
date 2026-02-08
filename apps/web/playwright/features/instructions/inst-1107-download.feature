@instructions @download @e2e
Feature: Download Files for MOC Instructions (INST-1107)
  As a LEGO MOC builder
  I want to download my instruction PDFs and parts lists
  So that I can access my files offline

  Background:
    Given I am logged in as a test user
    And I have MOCs with uploaded files in my collection

  # ─────────────────────────────────────────────────────────────────────────────
  # AC-68: Download instruction PDF file with correct filename
  # ─────────────────────────────────────────────────────────────────────────────

  @smoke @happy-path
  Scenario: Download instruction PDF file successfully
    Given I navigate to a MOC detail page with files
    When I click the download button for an instruction file
    Then the download should start
    And I should see the button return to ready state

  # ─────────────────────────────────────────────────────────────────────────────
  # AC-69: Download parts list CSV file
  # ─────────────────────────────────────────────────────────────────────────────

  @happy-path
  Scenario: Download parts list file successfully
    Given I navigate to a MOC detail page with files
    When I click the download button for a parts list file
    Then the download should start
    And I should see the button return to ready state

  # ─────────────────────────────────────────────────────────────────────────────
  # AC-71: Verify button shows loading state during download
  # ─────────────────────────────────────────────────────────────────────────────

  @loading
  Scenario: Show loading state during download
    Given I navigate to a MOC detail page with files
    When I click the download button for an instruction file
    Then I should see a loading spinner on the button
    And the download button should be disabled

  # ─────────────────────────────────────────────────────────────────────────────
  # AC-72: Verify unauthorized user cannot download file (404)
  # ─────────────────────────────────────────────────────────────────────────────

  @security @error-handling
  Scenario: Unauthorized user cannot download file
    Given I am not logged in
    When I try to access a file download URL directly
    Then I should receive an unauthorized error

  # ─────────────────────────────────────────────────────────────────────────────
  # Files Card Display
  # ─────────────────────────────────────────────────────────────────────────────

  @ui
  Scenario: Files section displays all uploaded files
    Given I navigate to a MOC detail page with files
    Then I should see a Files section
    And each file should display its name
    And each file should display its size
    And each file should have a download button

  # ─────────────────────────────────────────────────────────────────────────────
  # Accessibility
  # ─────────────────────────────────────────────────────────────────────────────

  @accessibility
  Scenario: Download button has proper accessibility attributes
    Given I navigate to a MOC detail page with files
    Then each download button should have an aria-label with the filename
    And each download button should be keyboard accessible

  @accessibility
  Scenario: Download button shows aria-busy during loading
    Given I navigate to a MOC detail page with files
    When I click the download button for an instruction file
    Then the button should have aria-busy set to true

  # ─────────────────────────────────────────────────────────────────────────────
  # Error Handling
  # ─────────────────────────────────────────────────────────────────────────────

  @error-handling
  Scenario: Show error toast when download fails
    Given I navigate to a MOC detail page with files
    And the download API is unavailable
    When I click the download button for an instruction file
    Then I should see an error toast notification
    And the button should return to ready state

  # ─────────────────────────────────────────────────────────────────────────────
  # Multiple Downloads
  # ─────────────────────────────────────────────────────────────────────────────

  @multiple
  Scenario: Multiple download buttons operate independently
    Given I navigate to a MOC detail page with multiple files
    When I click the download button for the first file
    Then only that button should show loading state
    And other download buttons should remain enabled
