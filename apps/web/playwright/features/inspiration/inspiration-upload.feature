@inspiration @upload @e2e
Feature: Inspiration Upload
  As a LEGO MOC builder
  I want to upload images as inspirations
  So that I can save visual references for my builds

  # ─────────────────────────────────────────────────────────────────────────────
  # Modal Opening/Closing
  # ─────────────────────────────────────────────────────────────────────────────

  @smoke @happy-path
  Scenario: User opens upload modal
    Given I am logged in as a test user
    And I am on the inspiration gallery
    When I click the "Add Inspiration" button
    Then the upload modal should be visible
    And I should see the file drop zone
    And I should see the title input field

  @modal
  Scenario: User closes upload modal with X button
    Given I am logged in as a test user
    And I am on the inspiration gallery
    And the upload modal is open
    When I click the close button
    Then the upload modal should not be visible

  @modal
  Scenario: User closes upload modal with Escape key
    Given I am logged in as a test user
    And I am on the inspiration gallery
    And the upload modal is open
    When I press Escape
    Then the upload modal should not be visible

  @keyboard
  Scenario: User opens upload modal with U keyboard shortcut
    Given I am logged in as a test user
    And I am on the inspiration gallery
    When I press the U key
    Then the upload modal should be visible

  # ─────────────────────────────────────────────────────────────────────────────
  # File Upload
  # ─────────────────────────────────────────────────────────────────────────────

  @upload @happy-path
  Scenario: User uploads an image file
    Given I am logged in as a test user
    And I am on the inspiration gallery
    And the upload modal is open
    When I upload a valid image file "test-image.jpg"
    And I enter title "My Test Inspiration"
    And I click the submit button
    Then I should see an upload success message
    And the inspiration should appear in the gallery

  @upload
  Scenario: User uploads with optional description
    Given I am logged in as a test user
    And I am on the inspiration gallery
    And the upload modal is open
    When I upload a valid image file "test-image.jpg"
    And I enter title "Castle Inspiration"
    And I enter description "A beautiful medieval castle design"
    And I click the submit button
    Then I should see an upload success message

  @upload
  Scenario: User uploads with tags
    Given I am logged in as a test user
    And I am on the inspiration gallery
    And the upload modal is open
    When I upload a valid image file "test-image.jpg"
    And I enter title "Space MOC"
    And I add tags "space, sci-fi, spaceship"
    And I click the submit button
    Then I should see an upload success message
    And the inspiration should have the tags

  # ─────────────────────────────────────────────────────────────────────────────
  # URL Import
  # ─────────────────────────────────────────────────────────────────────────────

  @url-import
  Scenario: User imports from URL
    Given I am logged in as a test user
    And I am on the inspiration gallery
    And the upload modal is open
    When I switch to URL import mode
    And I enter URL "https://example.com/inspiration.jpg"
    And I enter title "Web Inspiration"
    And I click the submit button
    Then I should see an upload success message

  @url-import @validation
  Scenario: URL validation fails for invalid URL
    Given I am logged in as a test user
    And I am on the inspiration gallery
    And the upload modal is open
    When I switch to URL import mode
    And I enter URL "not-a-valid-url"
    And I enter title "Test"
    And I click the submit button
    Then I should see a URL validation error

  # ─────────────────────────────────────────────────────────────────────────────
  # Validation
  # ─────────────────────────────────────────────────────────────────────────────

  @validation
  Scenario: Upload fails without image
    Given I am logged in as a test user
    And I am on the inspiration gallery
    And the upload modal is open
    When I enter title "Test Without Image"
    And I click the submit button
    Then I should see an error about missing image

  @validation
  Scenario: Upload fails without title
    Given I am logged in as a test user
    And I am on the inspiration gallery
    And the upload modal is open
    When I upload a valid image file "test-image.jpg"
    And I click the submit button without entering a title
    Then I should see a title required error

  # ─────────────────────────────────────────────────────────────────────────────
  # Drag and Drop
  # ─────────────────────────────────────────────────────────────────────────────

  @drag-drop
  Scenario: User drags file into drop zone
    Given I am logged in as a test user
    And I am on the inspiration gallery
    And the upload modal is open
    When I drag an image file into the drop zone
    Then the drop zone should show the file preview
    And the file name should be displayed

  @drag-drop
  Scenario: Drop zone shows active state on drag over
    Given I am logged in as a test user
    And I am on the inspiration gallery
    And the upload modal is open
    When I drag a file over the drop zone
    Then the drop zone should show active styling
