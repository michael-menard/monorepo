# Scope - WISH-2014

## Surfaces Impacted

| Surface | Impacted | Notes |
|---------|----------|-------|
| backend | true | Extend ListWishlistQuerySchema with new sort values, implement sorting algorithms in repository layer |
| frontend | true | Update sort dropdown in main-page.tsx with new options, icons, and tooltips |
| infra | false | No infrastructure changes needed - uses existing database fields |

## Scope Summary

This story extends the wishlist GET endpoint with three smart sorting algorithms: Best Value (price/pieceCount ratio), Expiring Soon (oldest release date first), and Hidden Gems (low priority + high piece count score). The backend implementation adds new sort enum values to the Zod schema and implements the sorting logic in the Drizzle repository layer. The frontend adds three new options to the existing sort dropdown with icons (TrendingDown, Clock, Gem) and tooltips explaining each mode.
