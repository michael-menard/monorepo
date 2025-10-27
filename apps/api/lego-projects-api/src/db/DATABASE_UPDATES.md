# Database Updates: Cascading Deletes and Lazy Fetching

## Overview

This document outlines the database schema updates implemented to support proper cascading deletes and lazy fetching for the MOC Instructions feature.

## Migration Files

### 1. `20240607_add_gallery_tables.sql`

- Initial gallery tables (images, albums, flags)
- Basic structure without foreign key constraints

### 2. `20240609_add_moc_instructions_tables.sql`

- MOC instructions and files tables
- Join tables for linking MOCs to gallery content
- Basic foreign key constraints

### 3. `20240610_update_cascading_deletes_and_lazy_fetching.sql` ⭐ **NEW**

- **Cascading delete constraints** for all relationships
- **Performance indexes** for lazy fetching
- **Safe delete function** for MOC instructions
- **Partial indexes** for flagged content

### 4. `20240611_add_profile_fields.sql`

- **Profile fields** (bio, avatar_url) added to users table
- **Indexes** for profile queries (username, email)
- **Backward compatibility** with existing avatar field

### 5. `20240612_add_wishlist_schema.sql`

- **Wishlist tables** for user LEGO set wishlists
- **Foreign key constraints** and indexes

### 6. `20241230_add_moc_parts_lists_table.sql`

- **MOC parts lists** table for detailed parts information
- **Relationships** to MOC instructions

### 7. `20250102_add_wishlist_category.sql`

- **Category field** added to wishlist items

### 8. `20250106_add_author_theme_to_moc_instructions.sql`

- **Author field** (TEXT NOT NULL) - Name or username of MOC creator
- **Theme field** (TEXT NOT NULL) - LEGO theme category
- **Updated schema** to match frontend form requirements
- **Backward compatibility** with default values for existing records

### 9. `20250106_add_moc_set_discrimination.sql`

- **Type field** (TEXT NOT NULL) - Discriminator for 'moc' vs 'set'
- **Set-specific fields** - brand, theme, setNumber, releaseYear, retired
- **Database constraints** - Ensures proper field requirements per type
- **Indexes** - Performance optimization for type-specific queries

### 10. `20250106_add_set_unique_constraints.sql` ⭐ **NEW**

- **Unique Set Constraint** - Prevents duplicate official LEGO sets (brand + setNumber)
- **Set Number Format** - Validates LEGO set number format (4-5 digits + optional letter)
- **Performance Indexes** - Optimized queries for Sets by brand, theme, year, retirement status
- **Data Integrity** - Ensures each official LEGO set exists only once in the system

## Cascading Delete Behavior

### User Deletion

When a user is deleted, the following cascade automatically:

- ✅ All user's gallery images
- ✅ All user's gallery albums (which cascade delete their images)
- ✅ All user's gallery flags
- ✅ All user's MOC instructions (which cascade delete their files and join tables)

### Album Deletion

When an album is deleted:

- ✅ All images in the album are automatically deleted
- ✅ MOC associations to the album are removed

### MOC Instructions Deletion

When MOC instructions are deleted:

- ✅ All MOC files are deleted
- ✅ All MOC-gallery associations are removed
- ✅ **Gallery images/albums are preserved** if used by other MOCs or albums
- ✅ **Gallery images/albums are deleted** only if not used elsewhere

### Image Deletion

When a gallery image is deleted:

- ✅ All flags for that image are deleted
- ✅ Album cover references are set to NULL (not deleted)
- ✅ MOC associations are removed

## Lazy Fetching Implementation

### Database Indexes

The migration adds optimized indexes for common query patterns:

```sql
-- User-based queries (lazy fetch user data)
CREATE INDEX idx_gallery_images_user_id_lazy ON gallery_images(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_moc_instructions_user_id_lazy ON moc_instructions(user_id) WHERE user_id IS NOT NULL;

-- Album-based queries (lazy fetch album data)
CREATE INDEX idx_gallery_images_album_id_lazy ON gallery_images(album_id) WHERE album_id IS NOT NULL;

-- MOC-based queries (lazy fetch MOC data)
CREATE INDEX idx_moc_files_moc_id_lazy ON moc_files(moc_id) WHERE moc_id IS NOT NULL;

-- Composite indexes for pagination
CREATE INDEX idx_gallery_images_user_created ON gallery_images(user_id, created_at DESC);
CREATE INDEX idx_moc_instructions_user_created ON moc_instructions(user_id, created_at DESC);

-- Partial indexes for flagged content
CREATE INDEX idx_gallery_images_not_flagged ON gallery_images(user_id, created_at DESC) WHERE flagged = FALSE;
```

### Drizzle ORM Relationships

The schema now includes proper relationships for lazy loading:

```typescript
// Example: Get user with lazy-loaded gallery images
const user = await db.query.users.findFirst({
  where: eq(users.id, userId),
  with: {
    galleryImages: {
      orderBy: [desc(galleryImages.createdAt)],
      limit: 10, // Only load first 10 images
    },
    galleryAlbums: {
      orderBy: [desc(galleryAlbums.createdAt)],
      limit: 5, // Only load first 5 albums
    },
  },
})
```

## Safe Delete Function

### `delete_moc_instructions_safe()`

This PostgreSQL function ensures that when MOC instructions are deleted:

1. **Checks each linked gallery image** to see if it's used by other MOCs
2. **Checks each linked gallery album** to see if it's used by other MOCs
3. **Preserves images/albums** that are still in use
4. **Deletes images/albums** only if they're not used elsewhere

### Trigger

A trigger automatically calls the safe delete function when MOC instructions are deleted:

```sql
CREATE TRIGGER tr_moc_instructions_delete_safe
    BEFORE DELETE ON moc_instructions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_delete_moc_instructions_safe();
```

## Usage Examples

### 1. Get MOC with Lazy-Loaded Details

```typescript
const moc = await db.query.mocInstructions.findFirst({
  where: eq(mocInstructions.id, mocId),
  with: {
    files: {
      orderBy: [desc(mocFiles.createdAt)],
    },
    galleryImages: {
      with: {
        galleryImage: {
          with: {
            user: {
              columns: {
                id: true,
                username: true,
                preferredName: true,
              },
            },
          },
        },
      },
    },
  },
})
```

### 2. Delete User (Cascading Delete)

```typescript
// This will automatically delete all user's data
const result = await db.delete(users).where(eq(users.id, userId))
```

### 3. Delete Album (Cascading Delete)

```typescript
// This will automatically delete all images in the album
const result = await db.delete(galleryAlbums).where(eq(galleryAlbums.id, albumId))
```

### 4. Delete MOC Instructions (Safe Delete)

```typescript
// This will use the safe delete function
const result = await db.delete(mocInstructions).where(eq(mocInstructions.id, mocId))
```

## Performance Benefits

### Lazy Loading

- **Reduced memory usage**: Only load data when needed
- **Faster initial queries**: Don't load related data unless requested
- **Better pagination**: Load limited sets of related data

### Index Optimization

- **Faster user-based queries**: Optimized indexes for user data
- **Efficient pagination**: Composite indexes for date-based sorting
- **Flagged content filtering**: Partial indexes for moderation queries

### Cascading Deletes

- **Data integrity**: Automatic cleanup of orphaned data
- **Performance**: Single delete operation handles all related data
- **Consistency**: No manual cleanup required

## Migration Instructions

1. **Run the migration**:

   ```bash
   psql -d your_database -f src/db/20240610_update_cascading_deletes_and_lazy_fetching.sql
   ```

2. **Update your code** to use the new lazy loading patterns (see `lazy-loading-examples.ts`)

3. **Test the cascading deletes** to ensure they work as expected

## Testing

### Test Cascading Deletes

```sql
-- Test user deletion
INSERT INTO users (id, username, email) VALUES ('test-user-1', 'testuser', 'test@example.com');
INSERT INTO gallery_images (id, user_id, title, image_url) VALUES ('test-image-1', 'test-user-1', 'Test Image', '/test.jpg');
INSERT INTO moc_instructions (id, user_id, title) VALUES ('test-moc-1', 'test-user-1', 'Test MOC');

-- Delete user and verify cascading
DELETE FROM users WHERE id = 'test-user-1';
-- Verify that gallery_images and moc_instructions are also deleted
```

### Test Safe Delete Function

```sql
-- Test MOC instructions safe delete
INSERT INTO users (id, username, email) VALUES ('test-user-2', 'testuser2', 'test2@example.com');
INSERT INTO gallery_images (id, user_id, title, image_url) VALUES ('test-image-2', 'test-user-2', 'Test Image 2', '/test2.jpg');
INSERT INTO moc_instructions (id, user_id, title) VALUES ('test-moc-2', 'test-user-2', 'Test MOC 2');
INSERT INTO moc_gallery_images (id, moc_id, gallery_image_id) VALUES ('test-link-1', 'test-moc-2', 'test-image-2');

-- Delete MOC and verify safe delete
DELETE FROM moc_instructions WHERE id = 'test-moc-2';
-- Verify that the image is preserved (not deleted)
```

## Notes

- **Circular references**: The migration handles circular foreign key references between `gallery_images.album_id` and `gallery_albums.id`
- **Cover image handling**: When a cover image is deleted, the album's `cover_image_id` is set to NULL (not deleted)
- **Performance**: The indexes are designed to support common query patterns and pagination
- **Safety**: The safe delete function prevents accidental deletion of shared gallery content
