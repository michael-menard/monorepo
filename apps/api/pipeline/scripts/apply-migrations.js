/**
 * Pipeline Database Migration Runner
 * APIP-5001: Provisional migration runner for LangGraph checkpoint schema
 *
 * Applies numbered SQL migration files in sequence.
 * Idempotent — safe to run on an already-migrated database.
 *
 * Usage:
 *   pnpm db:migrate:test
 *   # or directly:
 *   tsx scripts/apply-migrations.ts
 *
 * Environment variables (PIPELINE_DB_* prefix):
 *   PIPELINE_DB_HOST, PIPELINE_DB_PORT, PIPELINE_DB_NAME,
 *   PIPELINE_DB_USER, PIPELINE_DB_PASSWORD
 *
 * NOTE: This runner is PROVISIONAL and will be superseded by APIP-5007
 * which integrates the @langchain/langgraph-checkpoint-postgres setup() method.
 *
 * @see APIP-5001 AC-3
 * @see APIP-5007 (supersedes this runner for production use)
 */
import { readdir, readFile } from 'fs/promises';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { config } from 'dotenv';
const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
// Load .env from package root
config({ path: resolve(__dirname, '../.env') });
const MIGRATIONS_DIR = resolve(__dirname, '../src/db/migrations');
/**
 * Create a Pool for migrations using PIPELINE_DB_* env vars.
 */
function createMigrationPool() {
    const password = process.env.PIPELINE_DB_PASSWORD;
    if (!password) {
        throw new Error('PIPELINE_DB_PASSWORD is required. Start the test DB with: pnpm db:test:start');
    }
    return new Pool({
        host: process.env.PIPELINE_DB_HOST || 'localhost',
        port: parseInt(process.env.PIPELINE_DB_PORT || '5434', 10),
        database: process.env.PIPELINE_DB_NAME || 'pipeline_test',
        user: process.env.PIPELINE_DB_USER || 'pipelineuser',
        password,
        max: 2,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 10000,
    });
}
/**
 * Ensure the migrations tracker table exists.
 * Creates checkpoint_migrations if not present (bootstrapping).
 */
async function ensureMigrationsTable(pool) {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS checkpoint_migrations (
      v INTEGER PRIMARY KEY
    )
  `);
}
/**
 * Get the set of already-applied migration versions.
 */
async function getAppliedVersions(pool) {
    const result = await pool.query('SELECT v FROM checkpoint_migrations ORDER BY v');
    return new Set(result.rows.map(row => row.v));
}
/**
 * Parse migration version from filename.
 * Expects format: NNN_description.sql (e.g., 001_langgraph_checkpoint_schema.sql)
 *
 * @returns version number, or null if not parseable
 */
function parseMigrationVersion(filename) {
    const match = filename.match(/^(\d+)_.*\.sql$/);
    if (!match)
        return null;
    return parseInt(match[1], 10);
}
/**
 * Apply all pending SQL migration files in sequence.
 *
 * - Reads *.sql files from src/db/migrations/
 * - Sorts by numeric prefix (001, 002, ...)
 * - Skips versions already recorded in checkpoint_migrations
 * - Wraps each migration in a transaction
 * - Records the version after successful apply
 *
 * @throws Error if any migration fails
 */
async function applyMigrations() {
    const pool = createMigrationPool();
    try {
        console.log(`[pipeline:migrate] Connecting to ${process.env.PIPELINE_DB_HOST || 'localhost'}:${process.env.PIPELINE_DB_PORT || '5434'}/${process.env.PIPELINE_DB_NAME || 'pipeline_test'}...`);
        // Verify connection
        await pool.query('SELECT 1');
        console.log('[pipeline:migrate] Connected.');
        // Bootstrap migrations table
        await ensureMigrationsTable(pool);
        // Get applied versions
        const applied = await getAppliedVersions(pool);
        console.log(`[pipeline:migrate] Already applied versions: ${[...applied].join(', ') || 'none'}`);
        // Read migration files
        const files = await readdir(MIGRATIONS_DIR);
        const sqlFiles = files
            .filter(f => f.endsWith('.sql'))
            .sort(); // Lexicographic sort works for NNN_ prefix format
        if (sqlFiles.length === 0) {
            console.log('[pipeline:migrate] No migration files found.');
            return;
        }
        let appliedCount = 0;
        for (const filename of sqlFiles) {
            const version = parseMigrationVersion(filename);
            if (version === null) {
                console.warn(`[pipeline:migrate] Skipping unparseable filename: ${filename}`);
                continue;
            }
            if (applied.has(version)) {
                console.log(`[pipeline:migrate] Skipping already-applied: ${filename}`);
                continue;
            }
            console.log(`[pipeline:migrate] Applying: ${filename} (v${version})`);
            const sql = await readFile(join(MIGRATIONS_DIR, filename), 'utf-8');
            // Run in transaction for atomicity
            await pool.query('BEGIN');
            try {
                await pool.query(sql);
                // Ensure version is recorded (SQL file also inserts it, but this is a safety net)
                await pool.query('INSERT INTO checkpoint_migrations (v) VALUES ($1) ON CONFLICT (v) DO NOTHING', [version]);
                await pool.query('COMMIT');
                appliedCount++;
                console.log(`[pipeline:migrate] Applied: ${filename}`);
            }
            catch (err) {
                await pool.query('ROLLBACK');
                throw new Error(`Migration failed for ${filename}: ${err instanceof Error ? err.message : String(err)}`);
            }
        }
        if (appliedCount === 0) {
            console.log('[pipeline:migrate] Database is up to date. No migrations to apply.');
        }
        else {
            console.log(`[pipeline:migrate] Applied ${appliedCount} migration(s) successfully.`);
        }
    }
    finally {
        await pool.end();
    }
}
// Run migrations
applyMigrations().catch(err => {
    console.error('[pipeline:migrate] FATAL:', err instanceof Error ? err.message : String(err));
    process.exit(1);
});
//# sourceMappingURL=apply-migrations.js.map