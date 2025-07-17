# How to Add a Column with Drizzle ORM

This guide explains how to add a new column to an existing table using Drizzle ORM in this project.

---

## 1. Update the Schema

Edit `schema.ts` and add your new column to the table definition. For example, to add a `location` column to the `users` table:

```typescript
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name'),
  bio: text('bio'),
  avatar: text('avatar'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  location: text('location'), // <-- new column
});
```

---

## 2. Generate a Migration

Use Drizzle Kit to generate a migration based on your schema changes:

```sh
npx drizzle-kit generate:pg
```

This will create a migration file in your migrations directory (e.g., `drizzle/migrations/`).

---

## 3. Review the Migration

Open the generated migration file and confirm it contains the correct SQL, e.g.:

```sql
ALTER TABLE "users" ADD COLUMN "location" text;
```

---

## 4. Run the Migration

Apply the migration to your database:

```sh
npx drizzle-kit push:pg
```

---

## 5. Update Types and Code (Optional)

- Update any Zod schemas, TypeScript types, or code that uses the new column.

---

## Summary Table

| Step                | What to do                                      |
|---------------------|-------------------------------------------------|
| 1. Update schema    | Add column in `schema.ts`                       |
| 2. Generate migrate | `npx drizzle-kit generate:pg`                   |
| 3. Review migration | Check generated SQL file                        |
| 4. Run migration    | `npx drizzle-kit push:pg`                       |
| 5. Update code      | Update types, validation, and usage in code     |

---

**Need help?** Ask for a step-by-step or example for your specific case! 