# Scope - WISH-2001

## Surfaces Impacted

| Surface | Impacted | Notes |
|---------|----------|-------|
| backend | false | Backend already exists at `apps/api/lego-api/domains/wishlist/routes.ts`. Verification only via .http file. |
| frontend | true | Main implementation: WishlistCard, MainPage, gallery components. Uses existing RTK Query hooks. |
| infra | false | No infrastructure changes required. |

## Scope Summary

Frontend-only implementation of wishlist gallery MVP. Creates WishlistCard component and MainPage with store filter tabs, search, sorting, pagination, and view toggle. Backend endpoints and RTK Query hooks already exist - this story focuses on frontend UI integration.
