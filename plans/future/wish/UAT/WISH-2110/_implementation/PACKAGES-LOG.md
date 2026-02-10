# Packages Implementation Log - WISH-2110

## Story
Custom Zod error messages for better form UX

## Scope
- Update `packages/core/api-client/src/schemas/wishlist.ts` with custom error messages
- Update `packages/core/api-client/src/schemas/__tests__/wishlist.test.ts` with error message assertions
- No structural changes to schemas - only adding message parameters

## Implementation Steps

### Step 1: Update WishlistItemSchema
- Add custom messages to all fields
- Use `.message()` for basic validations
- Use `errorMap` for enum types

### Step 2: Update CreateWishlistItemSchema  
- Enhance existing custom messages
- Add messages to fields missing them

### Step 3: Update UpdateWishlistItemSchema
- Verify inherited messages work correctly

### Step 4: Update WishlistQueryParamsSchema
- Add custom messages for pagination and filtering

### Step 5: Update BatchReorderSchema
- Add custom messages for reorder validations

### Step 6: Update Purchase Schemas
- Add custom messages for MarkAsPurchasedSchema
- Add messages to PurchaseDetailsInputSchema

### Step 7: Update Tests
- Replace generic `.toThrow()` with specific error message assertions
- Add new tests for all custom error messages
- Minimum 25 tests asserting specific error messages

## Status
Not started
