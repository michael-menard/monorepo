#!/usr/bin/env tsx
/**
 * refresh-work-queue.ts
 *
 * Parses WORK-ORDER-BY-BATCH.md and produces WORK-QUEUE.json — a pre-computed,
 * machine-readable work queue for /next-work.
 *
 * Usage:
 *   pnpm exec tsx .claude/scripts/refresh-work-queue.ts plans/future/platform
 *
 * Staleness: exits immediately (no-op) if WORK-QUEUE.json was written < 120s ago,
 * unless --force is passed.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const STALE_AFTER_SECONDS = 120
const MAX_QUEUE_SIZE = 10

const EPIC_MAP: Record<string, string> = {
  WINT: 'wint',
  KBAR: 'kb-artifact-migration',
  LNGG: 'langgraph-update',
  INFR: 'infra-persistence',
  MODL: 'model-experimentation',
  AUDT: 'code-audit',
  TELE: 'telemetry',
  LERN: 'learning-loop',
  SDLC: 'sdlc-agents',
  AUTO: 'autonomous-dev',
  WKFL: 'workflow-learning',
}

const STATUS_TO_COMMAND: Record<string, string> = {
  '⏳': 'dev-implement-story',
  '🔍': 'qa-verify-story',
  '🚧': 'dev-implement-story',
  '📝': 'elab-story',
  '🆕': 'elab-story',
  '⚪': 'pm-story generate',
  '⏸️': 'dev-implement-story',
}

// Pipeline priority — finish work before starting new work
// (reserved for future queue-sort logic)
const _STAGE_PRIORITY: Record<string, number> = {
  qa: 0, // ready-for-qa → /qa-verify-story
  'code-review': 1, // needs-code-review → /dev-code-review
  implement: 2, // ready-to-work / in-progress → /dev-implement-story
  elab: 3, // elaboration → /elab-story
}

const STAGE_TO_COMMAND: Record<string, string> = {
  qa: 'qa-verify-story',
  'code-review': 'dev-code-review',
  implement: 'dev-implement-story',
  elab: 'elab-story',
}

const STAGE_DIRS: { dir: string; stage: string }[] = [
  { dir: 'ready-for-qa', stage: 'qa' },
  { dir: 'needs-code-review', stage: 'code-review' },
  { dir: 'ready-to-work', stage: 'implement' },
  { dir: 'in-progress', stage: 'implement' },
  { dir: 'elaboration', stage: 'elab' },
]

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Dep {
  story_id: string
  row: string
  satisfied: boolean
}

interface QueueItem {
  story_id: string
  title: string
  batch: string
  priority: string
  row: string
  status: string
  stage: 'qa' | 'code-review' | 'implement' | 'elab'
  feature_dir: string
  command: string
  deps: Dep[]
}

interface WorkingItem {
  story_id: string
  title: string
  worker: string
  row: string
}

interface GateInfo {
  id: string
  title: string
  waiting_on: string[]
}

interface WorkQueue {
  generated_at: string
  source: string
  stale_after_seconds: number
  summary: {
    complete: number
    blocked: number
    working: number
    cancelled: number
    unblocked: number
  }
  working: WorkingItem[]
  queue: QueueItem[]
  next_gate: GateInfo | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Scan all UAT/ directories under featureDir to find stories that passed QA.
 * This is the filesystem ground truth — stories here are done regardless of
 * what the markdown says.
 */
function buildUatSet(featureDir: string): Set<string> {
  const uatStories = new Set<string>()

  // Check top-level UAT/
  const topUat = path.join(featureDir, 'UAT')
  if (fs.existsSync(topUat)) {
    for (const entry of fs.readdirSync(topUat)) {
      if (/^[A-Z]+-\d+$/.test(entry)) uatStories.add(entry)
    }
  }

  // Check epic-level UAT/ dirs (e.g., wint/UAT/, langgraph-update/UAT/)
  for (const epicDir of Object.values(EPIC_MAP)) {
    const epicUat = path.join(featureDir, epicDir, 'UAT')
    if (fs.existsSync(epicUat)) {
      for (const entry of fs.readdirSync(epicUat)) {
        if (/^[A-Z]+-\d+$/.test(entry)) uatStories.add(entry)
      }
    }
  }

  return uatStories
}

/**
 * Scan filesystem stage directories to determine each story's pipeline stage.
 * Priority order: qa > code-review > implement > elab.
 * Stories already in UAT are excluded.
 */
function buildStageMap(
  featureDir: string,
  uatStories: Set<string>,
): Map<string, { stage: string; feature_dir: string }> {
  const stageMap = new Map<string, { stage: string; feature_dir: string }>()
  const storyIdPattern = /^[A-Z]+-\d+$/

  for (const { dir, stage } of STAGE_DIRS) {
    const dirsToScan: { scanPath: string; featureBase: string }[] = []

    // Top-level stage dir
    const topDir = path.join(featureDir, dir)
    if (fs.existsSync(topDir)) {
      dirsToScan.push({ scanPath: topDir, featureBase: featureDir })
    }

    // Epic-level stage dirs
    for (const epicDir of Object.values(EPIC_MAP)) {
      const epicStageDir = path.join(featureDir, epicDir, dir)
      if (fs.existsSync(epicStageDir)) {
        dirsToScan.push({ scanPath: epicStageDir, featureBase: path.join(featureDir, epicDir) })
      }
    }

    for (const { scanPath, featureBase } of dirsToScan) {
      for (const entry of fs.readdirSync(scanPath)) {
        if (!storyIdPattern.test(entry)) continue
        if (uatStories.has(entry)) continue
        // Only set if not already mapped (earlier = higher priority stage wins)
        if (!stageMap.has(entry)) {
          stageMap.set(entry, { stage, feature_dir: featureBase })
        }
      }
    }
  }

  return stageMap
}

function isComplete(checkbox: string, status: string, allCols: string): boolean {
  if (checkbox.includes('[x]')) return true
  if (status.includes('✅')) return true
  const lower = allCols.toLowerCase()
  return ['done', 'uat verified', 'completed', 'verified', 'closed'].some(kw => lower.includes(kw))
}

function isCancelled(storyId: string, checkbox: string, status: string): boolean {
  return storyId.includes('~~') || checkbox.includes('[❌]') || status.includes('❌')
}

function isWorking(status: string): boolean {
  return status.includes('🔧')
}

function isGate(storyId: string): boolean {
  return /^GATE-\d+$/.test(storyId.replace(/[~*]/g, ''))
}

function cleanStoryId(raw: string): string {
  return raw.replace(/~~/g, '').replace(/\*\*/g, '').trim()
}

function extractRow(raw: string): string {
  return raw.replace(/[^0-9a-zA-Z]/g, '').trim()
}

function extractDepRefs(
  depText: string,
  storyIdToRow: Map<string, string>,
): { storyId: string; row: string; inlineSatisfied: boolean }[] {
  const refs: { storyId: string; row: string; inlineSatisfied: boolean }[] = []
  const seen = new Set<string>()

  // Match patterns like "WINT-1011 (#48a)" or "#48a" or "WINT-7010 (#15) ✅"
  const pattern = /(?:([A-Z]+-\d+)\s+)?\(#(\w+)\)(\s*✅)?/g
  let m: RegExpExecArray | null
  while ((m = pattern.exec(depText)) !== null) {
    const sid = m[1] || ''
    refs.push({ storyId: sid, row: m[2], inlineSatisfied: !!m[3] })
    if (sid) seen.add(sid)
    seen.add(`#${m[2]}`)
  }

  // Also match bare story IDs without (#NN) — e.g., "WINT-0190" standing alone
  // \b prevents backtracking on \d+ (e.g., matching WINT-022 instead of WINT-0220)
  const barePattern = /([A-Z]+-\d+)\b(?!\s*\(#)/g
  let bm: RegExpExecArray | null
  while ((bm = barePattern.exec(depText)) !== null) {
    const sid = bm[1]
    if (seen.has(sid)) continue // already captured with a (#NN) ref
    const row = storyIdToRow.get(sid) || ''
    const inlineSatisfied =
      depText.includes(`${sid}`) &&
      depText.slice(bm.index).match(new RegExp(`${sid.replace('-', '\\-')}[^,|]*✅`)) !== null
    refs.push({ storyId: sid, row, inlineSatisfied })
    seen.add(sid)
  }

  return refs
}

function resolveFeatureDir(featureDir: string, storyId: string): string {
  const prefix = storyId.split('-')[0]
  const epicDir = EPIC_MAP[prefix]
  if (!epicDir) return featureDir
  return path.join(featureDir, epicDir)
}

function resolveCommand(
  status: string,
  featureDir: string,
  storyId: string,
  stage?: string,
): string {
  let cmd: string | undefined
  // Stage-based command takes precedence when provided
  if (stage && STAGE_TO_COMMAND[stage]) {
    cmd = STAGE_TO_COMMAND[stage]
  }
  if (!cmd) {
    const trimmed = status.trim()
    cmd = 'dev-implement-story'
    for (const [emoji, c] of Object.entries(STATUS_TO_COMMAND)) {
      if (trimmed.includes(emoji)) {
        cmd = c
        break
      }
    }
  }
  const dir = resolveFeatureDir(featureDir, storyId)
  return `/${cmd} ${dir} ${storyId}`
}

function resolveStageFromStatus(status: string): 'qa' | 'code-review' | 'implement' | 'elab' {
  const trimmed = status.trim()
  if (trimmed.includes('🔍')) return 'qa'
  if (trimmed.includes('📝') || trimmed.includes('🆕')) return 'elab'
  return 'implement'
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

function parseWorkOrder(featureDir: string): WorkQueue {
  const filePath = path.join(featureDir, 'WORK-ORDER-BY-BATCH.md')
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')

  // Filesystem ground truth: stories in UAT/ directories have passed QA
  const uatStories = buildUatSet(featureDir)

  // Filesystem stage map: determines each story's pipeline stage from directory location
  const stageMap = buildStageMap(featureDir, uatStories)

  // Pass 1: build row→info map and completion/cancelled sets
  const rowMap = new Map<
    string,
    { storyId: string; checkbox: string; status: string; allCols: string }
  >()
  const storyIdToRow = new Map<string, string>()
  const completedRows = new Set<string>()
  const cancelledRows = new Set<string>()

  let currentBatch = ''
  let currentPriority = ''

  for (const line of lines) {
    // Track batch headers
    const batchMatch = line.match(/^## (Batch \d+\s*—\s*.+?)(?:\s*\(|$)/)
    if (batchMatch) {
      currentBatch = batchMatch[1].trim()
      currentPriority = ''
      continue
    }

    // Track priority headers
    const prioMatch = line.match(/^### (?:Priority\s+)?(P\d+|Sub-batch\s+\w+)/i)
    if (prioMatch) {
      currentPriority = prioMatch[1].trim()
      continue
    }

    // Skip non-table rows
    if (!line.startsWith('|')) continue

    // Split columns
    const cols = line
      .split('|')
      .map(c => c.trim())
      .filter(c => c !== '')
    if (cols.length < 5) continue

    // Skip header/separator rows
    if (cols[0] === '☑' || cols[0].match(/^-+$/)) continue

    // Extract fields — columns are: ☑, #, Story ID, Title, Status, ...rest
    const checkbox = cols[0] || ''
    const rowNum = extractRow(cols[1] || '')
    const rawStoryId = cols[2] || ''
    const storyId = cleanStoryId(rawStoryId)
    const status = cols[4] || ''
    const allCols = cols.join(' ')

    if (!storyId || !rowNum) continue

    rowMap.set(rowNum, { storyId, checkbox, status, allCols })
    storyIdToRow.set(storyId, rowNum)

    if (isComplete(checkbox, status, allCols) || uatStories.has(storyId)) {
      completedRows.add(rowNum)
    }
    if (isCancelled(rawStoryId, checkbox, status)) {
      cancelledRows.add(rowNum)
    }
  }

  // Count completed stories from the Progress Tracking section (rows removed from tables)
  // Look for "✅ UAT Verified: NN stories" pattern
  let uatVerifiedCount = 0
  const uatMatch = content.match(/✅ UAT Verified:\s*(\d+)\s*stories/)
  if (uatMatch) {
    uatVerifiedCount = parseInt(uatMatch[1], 10)
  }

  // Pass 2: collect queue items, working items, stats
  const queue: QueueItem[] = []
  const working: WorkingItem[] = []
  let completeCount = 0
  let blockedCount = 0
  let workingCount = 0
  let cancelledCount = 0
  let nextGate: GateInfo | null = null

  currentBatch = ''
  currentPriority = ''

  for (const line of lines) {
    const batchMatch = line.match(/^## (Batch \d+\s*—\s*.+?)(?:\s*\(|$)/)
    if (batchMatch) {
      currentBatch = batchMatch[1].trim()
      currentPriority = ''
      continue
    }

    const prioMatch = line.match(/^### (?:Priority\s+)?(P\d+|Sub-batch\s+\w+)/i)
    if (prioMatch) {
      currentPriority = prioMatch[1].trim()
      continue
    }

    // E2E Gate header resets priority
    if (line.match(/^### E2E Gate/)) {
      currentPriority = ''
      continue
    }

    if (!line.startsWith('|')) continue

    const cols = line
      .split('|')
      .map(c => c.trim())
      .filter(c => c !== '')
    if (cols.length < 5) continue
    if (cols[0] === '☑' || cols[0].match(/^-+$/)) continue

    const checkbox = cols[0] || ''
    const rowNum = extractRow(cols[1] || '')
    const rawStoryId = cols[2] || ''
    const storyId = cleanStoryId(rawStoryId)
    const title = (cols[3] || '').replace(/~~/g, '').trim()
    const status = cols[4] || ''
    const allCols = cols.join(' ')

    if (!storyId || !rowNum) continue

    // Count stats — filesystem UAT check is ground truth
    if (isComplete(checkbox, status, allCols) || uatStories.has(storyId)) {
      completeCount++
      continue
    }
    if (isCancelled(rawStoryId, checkbox, status)) {
      cancelledCount++
      continue
    }

    // Handle GATE entries
    if (isGate(storyId)) {
      if (!nextGate) {
        // Find unsatisfied deps for this gate
        const waitingOn: string[] = []
        // Look for dependency info in remaining columns
        const depCol = cols.slice(5).join(' ')
        const depRefs = extractDepRefs(depCol, storyIdToRow)
        for (const ref of depRefs) {
          if (!ref.inlineSatisfied && !completedRows.has(ref.row)) {
            waitingOn.push(ref.storyId || `#${ref.row}`)
          }
        }
        // Also check for "Blocked on STORY-ID" text
        const blockedOnMatch = depCol.match(/Blocked on ([A-Z]+-\d+)/g)
        if (blockedOnMatch) {
          for (const bm of blockedOnMatch) {
            const sid = bm.replace('Blocked on ', '')
            if (!waitingOn.includes(sid)) waitingOn.push(sid)
          }
        }
        // If gate mentions "all Batch N" we don't enumerate, just note it
        if (waitingOn.length === 0 && depCol.includes('all Batch')) {
          waitingOn.push('(batch stories)')
        }
        nextGate = { id: storyId, title, waiting_on: waitingOn }
      }
      continue
    }

    // Working stories (skip if already in UAT)
    if (isWorking(status)) {
      if (uatStories.has(storyId)) {
        completeCount++
        continue
      }
      workingCount++
      const worker = cols[5] || ''
      working.push({ story_id: storyId, title, worker, row: rowNum })
      continue
    }

    // Check dependencies — find the deps column by looking for #NN patterns
    let depText = ''
    for (let i = 5; i < cols.length; i++) {
      if (cols[i].includes('#') && /\(#\w+\)/.test(cols[i])) {
        depText = cols[i]
        break
      }
    }
    // Also check if "Dependencies" column exists by position — some tables have it at col 7
    if (!depText) {
      for (let i = 5; i < cols.length; i++) {
        if (/[A-Z]+-\d+/.test(cols[i]) && cols[i].includes('#')) {
          depText = cols[i]
          break
        }
      }
    }

    const depRefs = extractDepRefs(depText, storyIdToRow)
    const deps: Dep[] = []
    let blocked = false

    for (const ref of depRefs) {
      const satisfied = ref.inlineSatisfied || completedRows.has(ref.row) || !rowMap.has(ref.row)
      deps.push({ story_id: ref.storyId || `#${ref.row}`, row: ref.row, satisfied })
      if (!satisfied) blocked = true
    }

    if (blocked) {
      blockedCount++
      continue
    }

    // This story is unblocked — add to queue if we haven't hit max
    if (queue.length < MAX_QUEUE_SIZE) {
      const stageInfo = stageMap.get(storyId)
      const stage = (stageInfo?.stage ?? resolveStageFromStatus(status)) as QueueItem['stage']
      const storyFeatureDir = stageInfo?.feature_dir ?? resolveFeatureDir(featureDir, storyId)
      queue.push({
        story_id: storyId,
        title,
        batch: currentBatch,
        priority: currentPriority || 'P1',
        row: rowNum,
        status: status.trim(),
        stage,
        feature_dir: storyFeatureDir,
        command: resolveCommand(status, featureDir, storyId, stage),
        deps,
      })
    }
  }

  return {
    generated_at: new Date().toISOString(),
    source: 'WORK-ORDER-BY-BATCH.md',
    stale_after_seconds: STALE_AFTER_SECONDS,
    summary: {
      complete: uatVerifiedCount > completeCount ? uatVerifiedCount : completeCount,
      blocked: blockedCount,
      working: workingCount,
      cancelled: cancelledCount,
      unblocked: queue.length,
    },
    working,
    queue,
    next_gate: nextGate,
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2)
  const force = args.includes('--force')
  const featureDir = args.find(a => !a.startsWith('--'))

  if (!featureDir) {
    console.error(
      'Usage: pnpm exec tsx .claude/scripts/refresh-work-queue.ts <feature-dir> [--force]',
    )
    process.exit(1)
  }

  const queuePath = path.join(featureDir, 'WORK-QUEUE.json')

  // Staleness check — exit early if fresh
  if (!force && fs.existsSync(queuePath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(queuePath, 'utf-8'))
      const generatedAt = new Date(existing.generated_at).getTime()
      const ageSeconds = (Date.now() - generatedAt) / 1000
      if (ageSeconds < STALE_AFTER_SECONDS) {
        console.log(
          `WORK-QUEUE.json is fresh (${Math.round(ageSeconds)}s old). Use --force to override.`,
        )
        process.exit(0)
      }
    } catch {
      // Corrupted JSON — regenerate
    }
  }

  // Verify source file exists
  const sourcePath = path.join(featureDir, 'WORK-ORDER-BY-BATCH.md')
  if (!fs.existsSync(sourcePath)) {
    console.error(`No WORK-ORDER-BY-BATCH.md found in ${featureDir}`)
    process.exit(1)
  }

  const queue = parseWorkOrder(featureDir)
  fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2) + '\n')

  console.log(
    `WORK-QUEUE.json written: ${queue.queue.length} unblocked, ${queue.summary.complete} complete, ${queue.summary.blocked} blocked, ${queue.summary.working} working`,
  )
}

main()
