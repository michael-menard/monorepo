import dotenv from 'dotenv'
import pg from 'pg'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '../../../.env.local') })
dotenv.config({ path: resolve(process.cwd(), '../../../.env') })

const { Client } = pg

async function applyAdminAuditLog() {
  const connectionConfig = {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    user: process.env.POSTGRES_USERNAME || 'postgres',
    password: process.env.POSTGRES_PASSWORD || '',
    database: process.env.POSTGRES_DATABASE || 'lego_projects',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  }

  const client = new Client(connectionConfig)
  await client.connect()

  console.log('=== Applying Admin Audit Log Table ===\n')

  // Check if table already exists
  const check = await client.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'admin_audit_log'
    );
  `)

  if (check.rows[0].exists) {
    console.log('Table admin_audit_log already exists!')
    await client.end()
    return
  }

  // Create the table
  console.log('Creating admin_audit_log table...')
  await client.query(`
    CREATE TABLE "admin_audit_log" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "admin_user_id" text NOT NULL,
      "action_type" text NOT NULL,
      "target_user_id" text,
      "reason" text,
      "details" jsonb,
      "result" text NOT NULL,
      "error_message" text,
      "ip_address" text,
      "user_agent" text,
      "created_at" timestamp DEFAULT now() NOT NULL
    );
  `)
  console.log('Table created!')

  // Create indexes
  console.log('Creating indexes...')
  await client.query(`CREATE INDEX "idx_admin_audit_log_admin" ON "admin_audit_log" USING btree ("admin_user_id");`)
  await client.query(`CREATE INDEX "idx_admin_audit_log_target" ON "admin_audit_log" USING btree ("target_user_id");`)
  await client.query(`CREATE INDEX "idx_admin_audit_log_action" ON "admin_audit_log" USING btree ("action_type");`)
  await client.query(`CREATE INDEX "idx_admin_audit_log_created" ON "admin_audit_log" USING btree ("created_at");`)
  console.log('Indexes created!')

  console.log('\nDone! admin_audit_log table is ready.')

  await client.end()
}

applyAdminAuditLog().catch(console.error)
