import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { config } from 'dotenv'
import { seedSets } from './sets'
import { seedWishlist } from './wishlist'
import { seedGallery } from './gallery'
import { seedMocPartsLists } from './moc-parts-lists'
import { seedMocs } from './mocs'
import { seedStory009 } from './story-009'

// Load env files from monorepo root
config({ path: '../../../.env.local' })
config({ path: '../../../.env' })

/**
 * Main seed runner
 * Uses simple direct connection (avoids path alias issues with tsx)
 */
async function main() {
  console.log('🌱 Starting database seeding...')

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set')
    process.exit(1)
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    max: 1,
  })

  try {
    const db = drizzle(pool)

    // Run seeds in order
    await seedSets(db)
    await seedWishlist(db)
    await seedGallery(db)
    await seedMocPartsLists(db)
    await seedMocs(db)
    await seedStory009(db)

    console.log('✅ Database seeding completed successfully')
  } catch (error) {
    console.error('❌ Database seeding failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()
