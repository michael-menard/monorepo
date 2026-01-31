# Agent Context - WISH-2005b

## Story Details

```yaml
story_id: WISH-2005b
feature_dir: plans/future/wish
command: qa-verify-story
mode: qa
base_path: plans/future/wish/UAT/WISH-2005b/
artifacts_path: plans/future/wish/UAT/WISH-2005b/_implementation/
status: in-qa
```

## Paths

| Item | Path |
|------|------|
| Story File | plans/future/wish/UAT/WISH-2005b/WISH-2005b.md |
| Elaboration | plans/future/wish/UAT/WISH-2005b/ELAB-WISH-2005b.md |
| Proof File | plans/future/wish/UAT/WISH-2005b/PROOF-WISH-2005b.md |
| Verification | plans/future/wish/UAT/WISH-2005b/_implementation/VERIFICATION.yaml |
| Implementation Dir | plans/future/wish/UAT/WISH-2005b/_implementation/ |
| Stories Index | plans/future/wish/stories.index.md |

## Key Files to Modify

| File | Purpose |
|------|---------|
| packages/core/api-client/src/rtk/wishlist-gallery-api.ts | Add onQueryStarted optimistic update to reorderWishlist mutation |
| apps/web/app-wishlist-gallery/src/components/DraggableWishlistGallery/index.tsx | Add undo flow with toast and rollback logic |

## Pattern References

| Pattern | Source File | Notes |
|---------|-------------|-------|
| Optimistic Update | WISH-2041 | Not currently in codebase - implement per story spec |
| Toast with Undo | GotItModal (WISH-2042) | 5-second duration, action button |
| RTK Query updateQueryData | RTK Query docs | Use dispatch + util.updateQueryData |

## Surfaces

- **backend**: false
- **frontend**: true
- **infra**: false
