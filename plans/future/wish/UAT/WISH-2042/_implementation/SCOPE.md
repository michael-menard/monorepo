# Scope - WISH-2042

## Surfaces Impacted

| Surface | Impacted | Notes |
|---------|----------|-------|
| backend | true | POST /api/wishlist/:id/purchased endpoint, cross-domain coordination with Sets service, S3 image copying |
| frontend | true | GotItModal component, RTK Query mutation, toast with undo, form validation |
| infra | false | No new infrastructure required - reuses existing S3 and database |

## Scope Summary

This story implements a cross-domain "Got It" / purchase flow that transitions wishlist items to the Sets collection. The backend requires a new endpoint with transaction semantics (create Set, optionally delete Wishlist item, copy S3 image). The frontend requires a modal form with purchase details, RTK Query integration, and a 5-second undo window with toast notification.

## Architecture Clarifications

Based on codebase analysis, the following clarifications resolve conditional ACs 25-36:

### AC-25/26/28/32: Architecture Pattern
The authoritative architecture is **lego-api hexagonal** with:
- Routes: `apps/api/lego-api/domains/{domain}/routes.ts`
- Services: `apps/api/lego-api/domains/{domain}/application/services.ts`
- Ports: `apps/api/lego-api/domains/{domain}/ports/index.ts`
- Adapters: `apps/api/lego-api/domains/{domain}/adapters/`

### AC-27: Cross-Domain Coordination
Use **dependency injection** via composition root. Inject SetsService into WishlistService dependencies when markAsPurchased is needed.

### AC-29: Transaction Semantics
Use **eventual consistency** with compensation:
1. Create Set (primary operation)
2. If Set creation succeeds, delete Wishlist item (best effort)
3. If deletion fails, log warning and return success (Set already created)

### AC-30: Image Handling
Skip S3 copy if wishlist item has no imageUrl. Set will be created without image.

### AC-31: Zod Schema
Add `MarkAsPurchasedInputSchema` to wishlist types.ts.

### AC-33: Sets Service Signature
Confirmed: `createSet(userId: string, input: CreateSetInput)` - userId is first param, not in input object.

### AC-34: DELETE Sets Endpoint
Confirmed: DELETE /api/sets/:id exists in sets/routes.ts lines 132-144.

### AC-35: RTK Query Location
Add endpoints to `packages/core/api-client/src/rtk/wishlist-gallery-api.ts`.

### AC-36: Decimal Handling
Accept number inputs in frontend form, convert to string format before sending to API.
