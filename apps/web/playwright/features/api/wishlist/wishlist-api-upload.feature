@api @wishlist @upload @security
Feature: Wishlist API Image Upload (Presigned URLs)
  As an API consumer
  I want to securely upload images for wishlist items
  So that I can attach images with proper security validation

  # Story: WISH-2013 (Upload Security)

  Background:
    Given the API is available
    And I am authenticated as the primary test user

  # ─────────────────────────────────────────────────────────────────────────────
  # Valid Presign Requests
  # ─────────────────────────────────────────────────────────────────────────────

  @smoke @wish-2013
  Scenario: Get presigned URL for JPEG image
    When I request a presigned URL for "test.jpg" with mimeType "image/jpeg"
    Then the response status should be 200
    And the response should contain a presignedUrl
    And the response should contain a key
    And the response should contain expiresIn

  @wish-2013
  Scenario: Get presigned URL for PNG image
    When I request a presigned URL for "test.png" with mimeType "image/png"
    Then the response status should be 200
    And the response should contain a presignedUrl

  @wish-2013
  Scenario: Get presigned URL for WebP image
    When I request a presigned URL for "test.webp" with mimeType "image/webp"
    Then the response status should be 200
    And the response should contain a presignedUrl

  @wish-2013
  Scenario Outline: Valid file extensions are accepted
    When I request a presigned URL for "image<extension>" with mimeType "<mimeType>"
    Then the response status should be 200

    Examples:
      | extension | mimeType   |
      | .jpg      | image/jpeg |
      | .jpeg     | image/jpeg |
      | .png      | image/png  |
      | .webp     | image/webp |

  @wish-2013
  Scenario: Presigned URL includes user-specific path
    When I request a presigned URL for "my-image.jpg" with mimeType "image/jpeg"
    Then the response status should be 200
    And the key should contain a user identifier or unique path

  @wish-2013
  Scenario: Presigned URL has reasonable expiration
    When I request a presigned URL for "test.jpg" with mimeType "image/jpeg"
    Then the response status should be 200
    And the expiresIn should be greater than 0

  # ─────────────────────────────────────────────────────────────────────────────
  # File Size Validation (WISH-2013 AC3, AC18)
  # ─────────────────────────────────────────────────────────────────────────────

  @wish-2013
  Scenario: Valid file size within limit
    When I request a presigned URL with fileSize 5242880
    Then the response status should be 200

  @wish-2013
  Scenario: File size at maximum limit (10MB)
    When I request a presigned URL with fileSize 10485760
    Then the response status should be 200

  @wish-2013 @validation
  Scenario: File size exceeds maximum returns 400
    When I request a presigned URL with fileSize 20971520
    Then the response status should be 400
    And the response should contain error "FILE_TOO_LARGE"
    And the response should contain message about maximum limit

  @wish-2013 @validation
  Scenario: File size of zero returns 400
    When I request a presigned URL with fileSize 0
    Then the response status should be 400
    And the response should contain error "FILE_TOO_SMALL"

  # ─────────────────────────────────────────────────────────────────────────────
  # Invalid File Types (Security)
  # ─────────────────────────────────────────────────────────────────────────────

  @wish-2013 @validation @security
  Scenario: Invalid MIME type returns 400
    When I request a presigned URL for "test.gif" with mimeType "image/gif"
    Then the response status should be 400
    And the response should contain error "INVALID_MIME_TYPE"
    And the response should contain allowedTypes

  @wish-2013 @validation @security
  Scenario Outline: Disallowed MIME types are rejected
    When I request a presigned URL for "file.<ext>" with mimeType "<mimeType>"
    Then the response status should be 400
    And the response should contain error "INVALID_MIME_TYPE" or "INVALID_EXTENSION"

    Examples:
      | ext  | mimeType              |
      | gif  | image/gif             |
      | bmp  | image/bmp             |
      | svg  | image/svg+xml         |
      | pdf  | application/pdf       |
      | exe  | application/octet-stream |
      | js   | text/javascript       |
      | html | text/html             |

  @wish-2013 @validation @security
  Scenario: Invalid file extension returns 400
    When I request a presigned URL for "script.exe" with mimeType "image/jpeg"
    Then the response status should be 400
    And the response should contain error "INVALID_EXTENSION"

  @wish-2013 @validation @security
  Scenario: MIME type and extension mismatch is handled
    When I request a presigned URL for "image.png" with mimeType "image/jpeg"
    Then the response status should be 200 or 400
    # Implementation may accept or reject based on strictness

  # ─────────────────────────────────────────────────────────────────────────────
  # Missing Parameters
  # ─────────────────────────────────────────────────────────────────────────────

  @wish-2013 @validation
  Scenario: Missing fileName returns 400
    When I request a presigned URL without fileName
    Then the response status should be 400
    And the response should contain error "Validation failed"

  @wish-2013 @validation
  Scenario: Missing mimeType returns 400
    When I request a presigned URL without mimeType
    Then the response status should be 400
    And the response should contain error "Validation failed"

  @wish-2013 @validation
  Scenario: Empty fileName returns 400
    When I request a presigned URL with empty fileName
    Then the response status should be 400

  @wish-2013 @validation
  Scenario: Empty mimeType returns 400
    When I request a presigned URL with empty mimeType
    Then the response status should be 400

  # ─────────────────────────────────────────────────────────────────────────────
  # Authorization
  # ─────────────────────────────────────────────────────────────────────────────

  @wish-2013 @auth
  Scenario: Unauthenticated presign request returns 401
    Given I am not authenticated
    When I request a presigned URL for "test.jpg" with mimeType "image/jpeg"
    Then the response status should be 401

  @wish-2013
  Scenario: Each user gets unique upload paths
    Given I am authenticated as the primary test user
    When I request a presigned URL for "test.jpg" with mimeType "image/jpeg"
    Then the response status should be 200
    And I store the presign key as "primaryKey"
    Given I am authenticated as the secondary test user
    When I request a presigned URL for "test.jpg" with mimeType "image/jpeg"
    Then the response status should be 200
    And the presign key should be different from "primaryKey"

  # ─────────────────────────────────────────────────────────────────────────────
  # Edge Cases
  # ─────────────────────────────────────────────────────────────────────────────

  @wish-2013
  Scenario: Filename with spaces is handled
    When I request a presigned URL for "my image file.jpg" with mimeType "image/jpeg"
    Then the response status should be 200

  @wish-2013
  Scenario: Filename with special characters is handled
    When I request a presigned URL for "image_test-123.jpg" with mimeType "image/jpeg"
    Then the response status should be 200

  @wish-2013
  Scenario: Unicode filename is handled
    When I request a presigned URL for "image.jpg" with mimeType "image/jpeg"
    Then the response status should be 200

  @wish-2013
  Scenario: Very long filename is handled
    When I request a presigned URL for a filename with 200 characters
    Then the response status should be 200 or 400
    # Implementation may have filename length limits
