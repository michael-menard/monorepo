import { pgTable, text, timestamp, uuid, boolean, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';

// Only define your Drizzle table here. Use Zod schemas/types in your handlers for type safety and validation.
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username'),
  email: text('email'),
  preferredName: text('preferred_name'),
  avatar: text('avatar'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Gallery Images Table
export const galleryImages = pgTable('gallery_images', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  tags: jsonb('tags').$type<string[]>(),
  imageUrl: text('image_url').notNull(),
  albumId: uuid('album_id'), // Will reference galleryAlbums.id
  flagged: boolean('flagged').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  lastUpdatedAt: timestamp('last_updated_at').notNull().defaultNow(),
});

// Gallery Albums Table
export const galleryAlbums = pgTable('gallery_albums', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  coverImageId: uuid('cover_image_id'), // Will reference galleryImages.id
  createdAt: timestamp('created_at').notNull().defaultNow(),
  lastUpdatedAt: timestamp('last_updated_at').notNull().defaultNow(),
});

// Gallery Flags Table
export const galleryFlags = pgTable('gallery_flags', {
  id: uuid('id').primaryKey().defaultRandom(),
  imageId: uuid('image_id').notNull().references(() => galleryImages.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  reason: text('reason'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  lastUpdatedAt: timestamp('last_updated_at').notNull().defaultNow(),
});

// Note: Circular foreign key references between galleryImages.albumId and galleryAlbums.id,
// and galleryAlbums.coverImageId and galleryImages.id will need to be handled in migrations
// since Drizzle doesn't support adding FKs after table creation. 