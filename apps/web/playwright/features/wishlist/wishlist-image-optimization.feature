@wishlist @image-optimization @wish-2016
Feature: Image Optimization
  As a wishlist user
  I want optimized images with responsive variants
  So that pages load faster and images display at appropriate sizes

  Background:
    Given I am logged in as a test user
    And I navigate to the wishlist page

  # ─────────────────────────────────────────────────────────────────────────────
  # AC8: Responsive Image Display - Gallery Cards
  # ─────────────────────────────────────────────────────────────────────────────

  @smoke @ac8 @gallery
  Scenario: Gallery cards display optimized thumbnail images
    Then I should see wishlist cards in the gallery
    And gallery card images should use the thumbnail variant URL

  @ac8 @picture-element
  Scenario: Gallery cards use picture element with WebP source
    Then gallery card images should be wrapped in a picture element
    And the picture element should have a WebP source

  @ac8 @lazy-loading
  Scenario: Gallery card images use lazy loading
    Then gallery card images should have loading attribute set to lazy

  # ─────────────────────────────────────────────────────────────────────────────
  # AC3: WebP Format with JPEG Fallback
  # ─────────────────────────────────────────────────────────────────────────────

  @ac3 @webp-fallback
  Scenario: Responsive image provides JPEG fallback
    Then the picture element should have a WebP source
    And the img element should have a JPEG fallback src

  # ─────────────────────────────────────────────────────────────────────────────
  # AC10: Legacy Item Fallback
  # ─────────────────────────────────────────────────────────────────────────────

  @ac10 @legacy-fallback
  Scenario: Legacy items without image variants show original image
    Then legacy items should display using the fallback image element
    And the fallback image should use the original imageUrl

  @ac10 @graceful-degradation
  Scenario: Legacy items do not break the gallery layout
    Then all wishlist cards should be visible
    And no image errors should appear on the page

  # ─────────────────────────────────────────────────────────────────────────────
  # Processing States
  # ─────────────────────────────────────────────────────────────────────────────

  @processing @pending
  Scenario: Items with pending processing show optimizing indicator
    Given a wishlist item has processing status "pending"
    Then the item should show an optimizing indicator
    And the original image should still be visible

  @processing @failed
  Scenario: Items with failed processing show original image
    Given a wishlist item has processing status "failed"
    Then the item should display the original image
    And no broken image icons should appear

  # ─────────────────────────────────────────────────────────────────────────────
  # Image Dimensions and Aspect Ratio
  # ─────────────────────────────────────────────────────────────────────────────

  @dimensions @ac1
  Scenario: Thumbnail images have correct dimensions
    Then thumbnail variant images should have width 200

  @dimensions @aspect-ratio @ac1
  Scenario: Image variants preserve aspect ratio
    Then landscape image variants should maintain landscape proportions
    And portrait image variants should maintain portrait proportions
    And square image variants should maintain square proportions

  # ─────────────────────────────────────────────────────────────────────────────
  # Accessibility
  # ─────────────────────────────────────────────────────────────────────────────

  @accessibility @a11y
  Scenario: Optimized images have proper alt text
    Then all gallery images should have non-empty alt text

  @accessibility @a11y
  Scenario: Image loading states are accessible
    Then responsive images should not have empty alt attributes
