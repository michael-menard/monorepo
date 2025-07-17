import { db, users } from './index.ts';

async function migrate() {
  // Drizzle ORM does not have built-in migrations, so use raw SQL for now
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT NOT NULL,
      email TEXT NOT NULL,
      bio TEXT,
      avatar TEXT
    );
  `);
  console.log('Migration complete: users table ensured.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
}); 