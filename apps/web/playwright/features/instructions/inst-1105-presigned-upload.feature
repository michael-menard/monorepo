@instructions @upload @presigned @e2e @INST-1105
Feature: Presigned URL Upload for Large Instructions (INST-1105)
  As a LEGO MOC builder
  I want to upload instruction PDFs larger than 10MB using presigned URLs
  So I can share comprehensive building guides

  Background:
    Given I am logged in as a test user
    And I have MOCs in my collection

  # ─────────────────────────────────────────────────────────────────────────────
  # AC80: Upload 30MB PDF via presigned URL (happy path)
  # ─────────────────────────────────────────────────────────────────────────────

  @smoke @happy-path @AC80
  Scenario: Upload 30MB PDF via presigned URL successfully
    Given I navigate to a MOC detail page
    When I select a 30MB PDF file for presigned upload
    Then I should see a progress bar
    And the progress should update during upload
    When the upload completes
    Then I should see an upload success message
    And the file should appear in the instructions list

  # ─────────────────────────────────────────────────────────────────────────────
  # AC81: Progress bar updates during upload
  # ─────────────────────────────────────────────────────────────────────────────

  @progress @AC81
  Scenario: Progress bar updates during upload
    Given I navigate to a MOC detail page
    When I select a 30MB PDF file for presigned upload
    Then I should see "Uploading..." with a percentage
    And the percentage should increase over time
    And I should see the upload speed displayed

  # ─────────────────────────────────────────────────────────────────────────────
  # AC82: Upload completes and file appears in list
  # ─────────────────────────────────────────────────────────────────────────────

  @happy-path @AC82
  Scenario: Upload completes and file appears in instructions list
    Given I navigate to a MOC detail page
    When I upload a 30MB PDF file successfully
    Then I should see "Instructions uploaded!" toast
    And the instructions list should refresh
    And I should see my uploaded file in the list

  # ─────────────────────────────────────────────────────────────────────────────
  # AC83: Reject file larger than 50MB
  # ─────────────────────────────────────────────────────────────────────────────

  @validation @error-handling @AC83
  Scenario: Reject file larger than 50MB
    Given I navigate to a MOC detail page
    When I select a 60MB PDF file for upload
    Then I should see an error "File too large. Max 50MB."
    And the file should not be added to the upload queue

  # ─────────────────────────────────────────────────────────────────────────────
  # AC84: Cancel upload mid-progress
  # ─────────────────────────────────────────────────────────────────────────────

  @cancellation @AC84
  Scenario: Cancel upload mid-progress
    Given I navigate to a MOC detail page
    When I select a 30MB PDF file for presigned upload
    And I click the Cancel button during upload
    Then the upload should be aborted
    And the file should be removed from the queue

  # ─────────────────────────────────────────────────────────────────────────────
  # AC85: Retry after network error
  # ─────────────────────────────────────────────────────────────────────────────

  @error-handling @retry @AC85
  Scenario: Retry after network error
    Given I navigate to a MOC detail page
    And the network connection is unstable
    When I select a 30MB PDF file for presigned upload
    And the upload fails due to network error
    Then I should see "Upload failed. Check your connection."
    When I click the Retry button
    Then the upload should restart

  # ─────────────────────────────────────────────────────────────────────────────
  # Additional Critical Scenarios
  # ─────────────────────────────────────────────────────────────────────────────

  @file-detection
  Scenario: Large files automatically use presigned upload flow
    Given I navigate to a MOC detail page
    When I select a 30MB PDF file for presigned upload
    Then the presigned upload flow should be triggered
    And I should not see direct upload indicators

  @file-detection
  Scenario: Small files use direct upload flow
    Given I navigate to a MOC detail page
    When I select a 5MB PDF file for upload
    Then the direct upload flow should be triggered
    And I should not see presigned upload indicators

  @concurrent-uploads
  Scenario: Multiple files upload with max 3 concurrent
    Given I navigate to a MOC detail page
    When I select 5 files of 15MB each for upload
    Then a maximum of 3 files should upload concurrently
    And queued files should wait for available slots
    And all files should eventually complete

  @session-expiry
  Scenario: Show session expiry warning
    Given I navigate to a MOC detail page
    When I select a 30MB PDF file for presigned upload
    And the upload session is near expiry
    Then I should see a session expiry warning
    And the session should auto-refresh before expiry

  @accessibility
  Scenario: Progress bar is screen reader accessible
    Given I navigate to a MOC detail page
    When I select a 30MB PDF file for presigned upload
    Then the progress bar should have aria-valuenow attribute
    And the progress bar should have aria-label
    And progress updates should be announced

  @keyboard
  Scenario: Cancel button is keyboard accessible
    Given I navigate to a MOC detail page
    When I select a 30MB PDF file for presigned upload
    And I focus the Cancel button with keyboard
    And I press Enter
    Then the upload should be aborted
