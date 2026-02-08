@wishlist @images @cdn
Feature: Wishlist Images
  As a wishlist user
  I want images to load from CloudFront CDN
  So that I experience fast image loading and proper compression

  Background:
    Given I am logged in as a test user
    And I navigate to the wishlist gallery
    And the wishlist has items with images

  # ─────────────────────────────────────────────────────────────────────────────
  # CloudFront CDN
  # ─────────────────────────────────────────────────────────────────────────────

  @cdn @smoke
  Scenario: Wishlist card images load from CloudFront
    Then wishlist card images should load from CloudFront domain

  @cdn
  Scenario: Card images use correct CDN URL format
    Then image URLs should contain the CloudFront distribution domain

  @cdn @responsive
  Scenario: Images have appropriate srcset for responsive loading
    Then wishlist card images should have responsive srcset attributes

  # ─────────────────────────────────────────────────────────────────────────────
  # Image Compression
  # ─────────────────────────────────────────────────────────────────────────────

  @compression @thumbnails
  Scenario: Thumbnail images use compressed format
    Then thumbnail images should be optimized for size

  @compression @quality
  Scenario: Gallery images have appropriate quality settings
    Then gallery images should use appropriate compression

  # ─────────────────────────────────────────────────────────────────────────────
  # Image Loading
  # ─────────────────────────────────────────────────────────────────────────────

  @loading @lazy
  Scenario: Images lazy load for performance
    Given I have many wishlist items
    Then below-fold images should not load immediately
    When I scroll down the page
    Then previously hidden images should start loading

  @loading @placeholder
  Scenario: Images show placeholder while loading
    Then image placeholders should be visible during load

  # ─────────────────────────────────────────────────────────────────────────────
  # Image Variants
  # ─────────────────────────────────────────────────────────────────────────────

  @variants
  Scenario: Thumbnail variant is used in gallery cards
    Then gallery cards should use thumbnail image variant

  @variants
  Scenario: Full-size image is used in detail view
    When I open a wishlist item detail view
    Then the detail view should use full-size image
