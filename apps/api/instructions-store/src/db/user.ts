import { db, users } from './index.ts';
import { eq } from 'drizzle-orm';

export async function getUserById(id: string) {
  const result = await db.select().from(users).where(eq(users.id, id));
  if (result.length === 0) return null;
  return result[0];
} 