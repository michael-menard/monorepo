# Scope - WISH-2041

## Surfaces Impacted

| Surface | Impacted | Notes |
|---------|----------|-------|
| backend | false | DELETE endpoint already implemented and tested in lego-api |
| frontend | true | DeleteConfirmModal, Toast with undo, RTK Query integration |
| infra | false | No infrastructure changes required |

## Scope Summary

This story implements the frontend delete flow for wishlist items. The backend DELETE /api/wishlist/:id endpoint already exists. Work focuses on creating the DeleteConfirmModal component, implementing toast notifications with undo functionality using Sonner's action API, and integrating with the existing RTK Query mutation.
