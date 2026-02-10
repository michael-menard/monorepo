@wishlist @image-compression @wish-2022
Feature: Wishlist Image Compression
  As a wishlist user
  I want images to be automatically compressed before upload
  So that uploads are faster and storage costs are reduced

  Background:
    Given I am logged in as a test user
    And I am on the add wishlist item page
    And the presign and upload endpoints are mocked

  # ─────────────────────────────────────────────────────────────────────────────
  # Compression UI Elements
  # ─────────────────────────────────────────────────────────────────────────────

  @smoke @ui
  Scenario: Compression quality selector is visible
    Then I should see the compression quality selector
    And the compression quality selector should default to "Balanced"

  @ui
  Scenario: Skip compression checkbox is visible
    Then I should see the skip compression checkbox
    And the skip compression checkbox should be unchecked

  @ui
  Scenario: All compression presets are available
    When I open the compression quality selector
    Then I should see preset option "Low bandwidth"
    And I should see preset option "Balanced"
    And I should see preset option "High quality"

  # ─────────────────────────────────────────────────────────────────────────────
  # Compression Happy Path
  # ─────────────────────────────────────────────────────────────────────────────

  @smoke @happy-path
  Scenario: Large image is compressed before upload
    When I select a large image for upload
    Then I should see the compression progress indicator
    And I should see a compression success toast
    And the image preview should be visible

  @happy-path
  Scenario: Compression progress shows sequential phases
    When I select a large image for upload
    Then I should see "Compressing image" in the progress text
    And after compression I should see "Uploading" in the progress text

  # ─────────────────────────────────────────────────────────────────────────────
  # Skip Compression - Small Images
  # ─────────────────────────────────────────────────────────────────────────────

  @skip-logic
  Scenario: Small image skips compression automatically
    When I select a small image for upload
    Then I should see an already optimized toast
    And the image preview should be visible

  # ─────────────────────────────────────────────────────────────────────────────
  # User Preference - Skip Compression Toggle
  # ─────────────────────────────────────────────────────────────────────────────

  @preferences
  Scenario: User can toggle skip compression
    When I check the skip compression checkbox
    Then the compression quality selector should be disabled

  @preferences
  Scenario: Skip compression preference persists across page loads
    When I check the skip compression checkbox
    And I reload the page
    Then the skip compression checkbox should be checked
    And the compression quality selector should be disabled

  # ─────────────────────────────────────────────────────────────────────────────
  # User Preference - Compression Preset Selection
  # ─────────────────────────────────────────────────────────────────────────────

  @preferences
  Scenario: User can change compression preset
    When I select compression preset "Low bandwidth"
    Then the compression quality selector should show "Low bandwidth"

  @preferences
  Scenario: Compression preset preference persists across page loads
    When I select compression preset "High quality"
    And I reload the page
    Then the compression quality selector should show "High quality"

  # ─────────────────────────────────────────────────────────────────────────────
  # Form Disabled During Compression
  # ─────────────────────────────────────────────────────────────────────────────

  @form-state
  Scenario: Form fields are disabled during compression
    When I select a large image for upload
    Then the title input should be disabled during upload
    And the submit button should be disabled during upload

  # ─────────────────────────────────────────────────────────────────────────────
  # Upload with Compression - Full Flow
  # ─────────────────────────────────────────────────────────────────────────────

  @e2e @happy-path
  Scenario: Full add item flow with image compression
    Given I fill in the title with "Compressed Image Test Item"
    When I select a large image for upload
    And I wait for the upload to complete
    And I click the submit button
    Then the form should submit successfully

  @e2e
  Scenario: Upload with skip compression enabled
    Given I check the skip compression checkbox
    And I fill in the title with "Uncompressed Image Test Item"
    When I select a small image for upload
    And I wait for the upload to complete
    And I click the submit button
    Then the form should submit successfully
