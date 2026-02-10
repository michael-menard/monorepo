@wishlist @images @cdn
Feature: Wishlist Images CDN
  As a wishlist user
  I want images to load from CloudFront CDN
  So that I experience fast image loading

  # ─────────────────────────────────────────────────────────────────────────────
  # WISH-2018: CDN Integration
  #
  # CDN image delivery (WebP, picture element, lazy loading, fallbacks) is
  # covered by wishlist-image-optimization.feature (24 scenarios).
  #
  # CloudFront-specific URL pattern assertions are deferred until the CDN
  # distribution is provisioned in a non-mock environment. No scenarios here
  # to avoid false-positive @skip clutter.
  # ─────────────────────────────────────────────────────────────────────────────
