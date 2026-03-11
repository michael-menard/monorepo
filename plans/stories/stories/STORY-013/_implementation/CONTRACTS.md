# STORY-013 HTTP Contracts

## Overview

Added HTTP request contracts for the PATCH `/api/mocs/:id/edit` endpoint to `__http__/mocs.http`.

## Endpoint

- **Method**: PATCH
- **Path**: `/api/mocs/:id/edit`
- **Purpose**: Edit MOC metadata (title, description, slug, tags)

## Test Requests Added

| Request Name | Description | Expected Status |
|-------------|-------------|-----------------|
| `patchMocTitle` | Update title only | 200 |
| `patchMocMultipleFields` | Update multiple fields (title, description, tags) | 200 |
| `patchMocSlug` | Update slug | 200 |
| `patchMocNullDescription` | Set description to null | 200 |
| `patchMocNullTags` | Set tags to null | 200 |
| `patchMoc403` | Edit other user's MOC | 403 |
| `patchMoc404` | Non-existent MOC | 404 |
| `patchMocEmptyBody` | Empty request body | 400 |
| `patchMocSlugConflict` | Conflicting slug (already in use) | 409 |
| `patchMocInvalidSlug` | Invalid slug format | 400 |
| `patchMocTitleTooLong` | Title exceeds 100 characters | 400 |
| `patchMoc404InvalidUuid` | Invalid UUID format | 404 |

## Test Data References

- **MOC 0001** (`dddddddd-dddd-dddd-dddd-dddddddd0001`): King's Castle - owned by dev user
- **MOC 0002** (`dddddddd-dddd-dddd-dddd-dddddddd0002`): Space Station - owned by dev user
- **MOC 0004** (`dddddddd-dddd-dddd-dddd-dddddddd0004`): Technic Supercar - owned by OTHER user

## Request Body Schema

```typescript
{
  title?: string        // Max 100 characters
  description?: string | null
  slug?: string         // Must be URL-safe (lowercase, hyphens, no spaces/special chars)
  tags?: string[] | null
}
```

## Validation Rules Tested

1. **Empty body**: At least one field must be provided
2. **Title length**: Maximum 100 characters
3. **Slug format**: Must be URL-safe (no spaces, special characters)
4. **Slug uniqueness**: Must not conflict with existing slugs
5. **Authorization**: User must own the MOC to edit it
6. **UUID format**: MOC ID must be valid UUID

## File Modified

- `__http__/mocs.http` - Added 12 PATCH requests under STORY-013 section
