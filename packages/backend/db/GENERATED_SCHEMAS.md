# Generated Zod Schemas from Drizzle ORM

This package now includes automatically generated Zod validation schemas derived from your Drizzle database schema definitions using `drizzle-zod`.

## Overview

The `generated-schemas.ts` file contains:

1. **Basic Generated Schemas**: Direct Zod schemas from Drizzle tables
2. **Business Logic Schemas**: Enhanced schemas with validation rules
3. **Utility Schemas**: Common patterns like pagination and filtering

## Usage

### Basic Import

```typescript
import {
  galleryImageSchemas,
  createGalleryImageSchema,
  updateGalleryImageSchema,
} from '@monorepo/db/generated-schemas'
```

### API Handler Example

```typescript
import { createGalleryImageSchema } from '@monorepo/db/generated-schemas'
import { db, galleryImages } from '@monorepo/db'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate request body
    const validatedData = createGalleryImageSchema.parse(body)

    // Insert into database
    const [newImage] = await db.insert(galleryImages).values(validatedData).returning()

    return Response.json({ success: true, data: newImage })
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 400 })
  }
}
```

## Available Schemas

### Gallery Schemas

- `galleryImageSchemas.select` - For validating query results
- `galleryImageSchemas.insert` - For validating inserts (basic)
- `galleryImageSchemas.update` - For validating updates (basic)
- `createGalleryImageSchema` - Enhanced insert validation with business rules
- `updateGalleryImageSchema` - Enhanced update validation with business rules

### MOC Instruction Schemas

- `mocInstructionSchemas.*` - Basic CRUD schemas
- `createMocSchema` - MOC-specific creation with required fields (author, partsCount, etc.)
- `createSetSchema` - LEGO Set-specific creation with required fields (brand, setNumber, etc.)

### Wishlist Schemas

- `wishlistItemSchemas.*` - Basic CRUD schemas
- `createWishlistItemSchema` - Enhanced creation with validation
- `updateWishlistItemSchema` - Enhanced updates with validation

### Parts Schemas

- `mocPartsListSchemas.*` - Parts list CRUD schemas
- `mocPartSchemas.*` - Individual part CRUD schemas
- `createMocPartsListSchema` - Enhanced parts list creation
- `createMocPartSchema` - Enhanced part creation

### Utility Schemas

- `paginationSchema` - Standard pagination parameters
- `userFilterSchema` - Common filtering for user-owned resources
- `mocFileUploadSchema` - File upload validation for MOC files

## Business Logic Features

### Type-Specific Validation

MOCs and Sets have different required fields:

```typescript
// MOC requires: author, partsCount, uploadedDate
const mocData = createMocSchema.parse({
  type: 'moc',
  title: 'My Custom Build',
  author: 'John Doe',
  partsCount: 500,
  // ... other fields
})

// Set requires: brand, setNumber, may have releaseYear
const setData = createSetSchema.parse({
  type: 'set',
  title: 'Millennium Falcon',
  brand: 'LEGO',
  setNumber: '75257',
  releaseYear: 2019,
  // ... other fields
})
```

### Validation Rules

- **String lengths**: Titles max 100 chars, descriptions max 500 chars
- **URL validation**: Image URLs must be valid URLs
- **Array limits**: Max 10 tags for images, max 20 for MOCs
- **Number ranges**: Release years between 1950 and current year + 2
- **Business constraints**: MOCs need authors, Sets need brands

### User Ownership

Update schemas automatically exclude `userId` to prevent ownership changes:

```typescript
// This will fail - cannot change userId
updateGalleryImageSchema.parse({
  userId: 'different-user', // ❌ Error
  title: 'New Title', // ✅ OK
})
```

## Benefits

1. **Type Safety**: Full TypeScript inference from database to API
2. **Automatic Sync**: Schemas stay in sync with database changes
3. **Business Logic**: Validation rules beyond database constraints
4. **Consistent APIs**: Standardized validation across all endpoints
5. **Error Messages**: Clear, user-friendly validation errors

## Extending Schemas

To add custom validation, use Zod's `.refine()` method:

```typescript
import { createGalleryImageSchema } from '@monorepo/db/generated-schemas'

const customImageSchema = createGalleryImageSchema.refine(data => data.title !== data.description, {
  message: 'Title and description cannot be the same',
  path: ['description'],
})
```

## Migration from Manual Schemas

1. Replace manual Zod schemas with generated ones
2. Move business logic to `.refine()` or `.extend()` calls
3. Update imports to use `@monorepo/db/generated-schemas`
4. Test thoroughly to ensure validation behavior is preserved

See `example-usage.ts` for complete working examples.
