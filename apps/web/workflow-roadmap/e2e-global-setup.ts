/**
 * Playwright global setup — seeds E2E fixture data before tests run.
 */
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const roadmapSvcDir = path.resolve(__dirname, '../../../api/workflow-admin/roadmap-svc')

export default async function globalSetup() {
  console.log('[global-setup] Seeding E2E test data...')
  execSync('bun run scripts/seed-e2e-data.ts', {
    cwd: roadmapSvcDir,
    stdio: 'inherit',
  })
  console.log('[global-setup] E2E test data ready.')
}
