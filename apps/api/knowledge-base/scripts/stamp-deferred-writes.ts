/**
 * Stamp all deferred KB write files with processed_at + imported: true.
 * This starts the 30-day TTL clock for cleanup by the retro agent.
 *
 * Usage:
 *   cd apps/api/knowledge-base
 *   npx tsx scripts/stamp-deferred-writes.ts [--dry-run]
 */

import { readFile, writeFile, appendFile } from 'node:fs/promises'
import { execSync } from 'node:child_process'

const isDryRun = process.argv.includes('--dry-run')
const now = new Date().toISOString()

function findDeferredFiles(): string[] {
  const result = execSync(
    'find /Users/michaelmenard/Development/monorepo/plans -name "DEFERRED*" -type f 2>/dev/null',
    { encoding: 'utf-8' },
  )
  return result
    .trim()
    .split('\n')
    .filter(f => f.length > 0)
}

async function main() {
  const files = findDeferredFiles()
  console.log(`Found ${files.length} deferred write files`)

  if (isDryRun) {
    console.log('DRY RUN — no files will be modified')
  }

  let stamped = 0
  let alreadyStamped = 0
  let errors = 0

  for (const filePath of files) {
    try {
      const content = await readFile(filePath, 'utf-8')

      // Skip if already stamped
      if (content.includes('processed_at:') && content.includes('imported:')) {
        alreadyStamped++
        continue
      }

      if (isDryRun) {
        stamped++
        continue
      }

      // Append TTL stamp at the end of the file
      const stamp = `\n# TTL stamp — added by import-deferred-writes\nprocessed_at: "${now}"\nimported: true\n`
      await appendFile(filePath, stamp)
      stamped++
    } catch (err) {
      errors++
      console.error(`  ERROR: ${filePath}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  console.log(`\nStamped: ${stamped}${isDryRun ? ' (would stamp)' : ''}`)
  console.log(`Already stamped: ${alreadyStamped}`)
  console.log(`Errors: ${errors}`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
