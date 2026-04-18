// Define your Drizzle ORM schema here
// Example:

import { pgTable, varchar, integer, primaryKey } from 'drizzle-orm/pg-core'
import { z } from 'zod'

export const artifacts = pgTable('artifacts', {
  id: varchar('id').primaryKey(),
  name: varchar('name'),
  type: varchar('type'),
  createdAt: integer('created_at'),
})

export const ArtifactsSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  createdAt: z.number(),
})
