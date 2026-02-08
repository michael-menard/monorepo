@instructions @thumbnail @e2e
Feature: Upload Thumbnail for MOC Instructions (INST-1103)
  As a LEGO MOC builder
  I want to upload a thumbnail image for my MOC
  So that my builds are visually represented in the gallery

  Background:
    Given I am logged in as a test user
    And I have MOCs in my collection

  # ─────────────────────────────────────────────────────────────────────────────
  # AC45: JPEG Upload Success
  # ─────────────────────────────────────────────────────────────────────────────

  @smoke @happy-path
  Scenario: Upload JPEG thumbnail successfully
    Given I navigate to a MOC detail page
    When I select a JPEG image file for upload
    And I click the upload button
    Then I should see a thumbnail upload success message
    And the thumbnail should be updated on the page

  # ─────────────────────────────────────────────────────────────────────────────
  # AC46: Invalid File Type Rejection
  # ─────────────────────────────────────────────────────────────────────────────

  @validation @error-handling
  Scenario: Reject PDF file with appropriate error
    Given I navigate to a MOC detail page
    When I select a PDF file for upload
    Then I should see an error message about invalid file type
    And the upload button should not appear

  # ─────────────────────────────────────────────────────────────────────────────
  # AC47: Thumbnail Replacement
  # ─────────────────────────────────────────────────────────────────────────────

  @happy-path
  Scenario: Replace existing thumbnail with new image
    Given I navigate to a MOC detail page
    And the MOC already has a thumbnail
    When I select a new PNG image file for upload
    And I click the upload button
    Then I should see a thumbnail upload success message
    And the new thumbnail should replace the old one

  # ─────────────────────────────────────────────────────────────────────────────
  # AC48: Drag and Drop Upload
  # ─────────────────────────────────────────────────────────────────────────────

  @drag-drop
  Scenario: Upload thumbnail via drag and drop
    Given I navigate to a MOC detail page
    When I drag a JPEG image onto the upload zone
    And I click the upload button
    Then I should see a thumbnail upload success message
    And the thumbnail should be updated on the page

  @drag-drop @visual-feedback
  Scenario: Show visual feedback during drag over
    Given I navigate to a MOC detail page
    When I drag a file over the upload zone
    Then the upload zone should show visual feedback

  # ─────────────────────────────────────────────────────────────────────────────
  # Preview Management
  # ─────────────────────────────────────────────────────────────────────────────

  @preview
  Scenario: Show file metadata in preview
    Given I navigate to a MOC detail page
    When I select a JPEG image file for upload
    Then I should see the file name in the preview
    And I should see the file size in the preview

  @preview
  Scenario: Remove selected file before upload
    Given I navigate to a MOC detail page
    When I select a JPEG image file for upload
    And I click the remove button on the preview
    Then the preview should be removed
    And the upload zone should be visible again

  # ─────────────────────────────────────────────────────────────────────────────
  # Loading States
  # ─────────────────────────────────────────────────────────────────────────────

  @loading
  Scenario: Show loading state during upload
    Given I navigate to a MOC detail page
    When I select a JPEG image file for upload
    And I click the upload button
    Then I should see a loading indicator
    And the upload button should be disabled during upload

  # ─────────────────────────────────────────────────────────────────────────────
  # Accessibility
  # ─────────────────────────────────────────────────────────────────────────────

  @accessibility
  Scenario: File input has proper ARIA label
    Given I navigate to a MOC detail page
    Then the file input should have an accessible label

  @accessibility @keyboard
  Scenario: Upload zone is keyboard accessible
    Given I navigate to a MOC detail page
    When I focus the upload zone with keyboard
    And I press Enter
    Then the file picker should open
