# Scope - WISH-2032

## Surfaces Impacted

| Surface | Impacted | Notes |
|---------|----------|-------|
| backend | false | No API changes needed - using existing addWishlistItem mutation |
| frontend | true | Optimistic UI updates, navigation, toast notifications, error rollback |
| infra | false | No infrastructure changes required |

## Scope Summary

This story adds optimistic UI to the wishlist item creation flow. On form submit, users immediately see a success toast and navigate to the gallery (or detail page), while the API call happens in the background. If the API fails, the UI rolls back and shows an error toast with retry capability.
