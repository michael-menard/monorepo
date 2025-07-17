import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { pgTable, text, serial } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  username: text('username').notNull(),
  email: text('email').notNull(),
  bio: text('bio'),
  avatar: text('avatar'),
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool); 