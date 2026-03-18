#!/usr/bin/env bun
/**
 * Seed E2E test fixture data into the database.
 * Idempotent — safe to run multiple times before tests.
 *
 * Inserts:
 *   - plan:   e2e-test-plan
 *   - story:  E2E-0001 (in_progress, P1, has description)
 *   - story:  E2E-0002 (backlog, no priority, no description — minimal data)
 *   - links:  both stories linked to e2e-test-plan
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const { Client } = pg

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  try {
    console.log('[seed-e2e] Seeding E2E test fixture data...')

    // ── Plan ────────────────────────────────────────────────────────────────
    await client.query(
      `
      INSERT INTO workflow.plans (
        plan_slug, title, summary, plan_type, status, story_prefix, priority, tags,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      ON CONFLICT (plan_slug) DO NOTHING
      `,
      [
        'e2e-test-plan',
        'E2E Test Plan',
        'Dedicated fixture plan for Playwright end-to-end tests. Do not delete.',
        'feature',
        'active',
        'E2E',
        'P2',
        ['test', 'e2e', 'playwright'],
      ],
    )
    console.log('[seed-e2e] Plan e2e-test-plan upserted.')

    // ── Story E2E-0001 (full data) ───────────────────────────────────────────
    await client.query(
      `
      INSERT INTO workflow.stories (
        story_id, feature, title, description, state, priority,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (story_id) DO NOTHING
      `,
      [
        'E2E-0001',
        'e2e-testing',
        'E2E Test Story With Full Data',
        'This story has a description for testing the story details page.',
        'in_progress',
        'P1',
      ],
    )
    console.log('[seed-e2e] Story E2E-0001 upserted.')

    // ── Story E2E-0002 (minimal data — no description, no priority) ──────────
    await client.query(
      `
      INSERT INTO workflow.stories (
        story_id, feature, title, state,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, NOW(), NOW())
      ON CONFLICT (story_id) DO NOTHING
      `,
      ['E2E-0002', 'e2e-testing', 'E2E Test Story Minimal Data', 'backlog'],
    )
    console.log('[seed-e2e] Story E2E-0002 upserted.')

    // ── Links ────────────────────────────────────────────────────────────────
    // Delete and re-insert to keep links idempotent
    await client.query(`DELETE FROM workflow.plan_story_links WHERE plan_slug = 'e2e-test-plan'`)
    await client.query(
      `
      INSERT INTO workflow.plan_story_links (plan_slug, story_id, link_type, created_at)
      VALUES
        ('e2e-test-plan', 'E2E-0001', 'mentioned', NOW()),
        ('e2e-test-plan', 'E2E-0002', 'mentioned', NOW())
      `,
    )
    console.log('[seed-e2e] Story links inserted.')

    console.log('[seed-e2e] Done.')
  } finally {
    await client.end()
  }
}

main().catch(err => {
  console.error('[seed-e2e] Error:', err)
  process.exit(1)
})
