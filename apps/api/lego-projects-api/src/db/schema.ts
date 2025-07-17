import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

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