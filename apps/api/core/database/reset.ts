import { Pool } from 'pg'
import { config } from 'dotenv'

// Load env files
config({ path: '.env.local' })
config({ path: '.env' })

/**
 * Database reset script - truncates all tables
 *
 * Uses TRUNCATE CASCADE to handle foreign key constraints automatically.
 * Schema (tables, indexes, constraints) is preserved - only data is removed.
 */
async function main() {
  console.log('🗑️  Starting database reset...')

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
    // All application tables (CASCADE handles FK order automatically)
    const tables = [
      'upload_session_parts',
      'upload_session_files',
      'upload_sessions',
      'moc_parts',
      'moc_parts_lists',
      'moc_gallery_albums',
      'moc_gallery_images',
      'moc_files',
      'moc_instructions',
      'gallery_flags',
      'gallery_images',
      'gallery_albums',
      'wishlist_items',
      'user_daily_uploads',
      'set_images',
      'sets',
    ]

    // Truncate all tables with CASCADE to handle FKs
    const tableList = tables.join(', ')
    await pool.query(`TRUNCATE TABLE ${tableList} CASCADE`)

    console.log(`✅ Truncated ${tables.length} tables:`)
    tables.forEach(t => console.log(`   - ${t}`))

    console.log('\n✅ Database reset completed successfully')
    console.log('💡 Run "pnpm db:seed" to repopulate with seed data')
  } catch (error) {
    console.error('❌ Database reset failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()
