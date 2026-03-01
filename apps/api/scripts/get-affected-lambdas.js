#!/usr/bin/env node
/**
 * get-affected-lambdas.js
 *
 * Detects which Lambda functions are affected by changes in the current PR/commit.
 * Uses git diff to identify changed files and maps them to Lambda function names.
 *
 * Usage:
 *   node scripts/get-affected-lambdas.js --base=origin/main
 *   node scripts/get-affected-lambdas.js --base=origin/main --verbose
 *
 * Output: Space-separated list of affected Lambda function names, or empty string if none.
 */

import { execSync } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Parse CLI args
const args = process.argv.slice(2)
const base = (args.find(a => a.startsWith('--base=')) || '--base=HEAD^1').split('=')[1]
const verbose = args.includes('--verbose')

function log(...msgs) {
  if (verbose) {
    process.stderr.write(msgs.join(' ') + '\n')
  }
}

// Map of file path patterns to Lambda function names
// Each entry: { pattern: RegExp, functionName: string }
const FUNCTION_MAPPINGS = [
  // lego-api domains -> API function
  { pattern: /^apps\/api\/lego-api\//, functionName: 'lego-api' },
  // knowledge-base -> knowledge-base function
  { pattern: /^apps\/api\/knowledge-base\//, functionName: 'knowledge-base' },
  // pipeline -> pipeline function
  { pattern: /^apps\/api\/pipeline\//, functionName: 'pipeline' },
  // infrastructure changes -> all functions
  { pattern: /^apps\/api\/infrastructure\//, functionName: 'ALL' },
  // shared packages that affect API
  { pattern: /^packages\/backend\//, functionName: 'lego-api' },
]

function getChangedFiles(baseRef) {
  try {
    const output = execSync(`git diff --name-only ${baseRef}...HEAD`, {
      encoding: 'utf8',
      cwd: resolve(__dirname, '../../..'),
    }).trim()
    return output ? output.split('\n') : []
  } catch (err) {
    log('Error getting changed files:', err.message)
    // Try fallback to HEAD^1
    try {
      const output = execSync(`git diff --name-only HEAD^1...HEAD`, {
        encoding: 'utf8',
        cwd: resolve(__dirname, '../../..'),
      }).trim()
      return output ? output.split('\n') : []
    } catch {
      return []
    }
  }
}

function getAffectedFunctions(changedFiles) {
  const affected = new Set()

  for (const file of changedFiles) {
    for (const { pattern, functionName } of FUNCTION_MAPPINGS) {
      if (pattern.test(file)) {
        if (functionName === 'ALL') {
          // Add all known functions
          FUNCTION_MAPPINGS.filter(m => m.functionName !== 'ALL').forEach(m =>
            affected.add(m.functionName),
          )
        } else {
          affected.add(functionName)
        }
        break
      }
    }
  }

  return Array.from(affected)
}

// Main
const changedFiles = getChangedFiles(base)
log(`Found ${changedFiles.length} changed files`)
log('Changed files:', changedFiles.slice(0, 10).join(', '))

const affected = getAffectedFunctions(changedFiles)
log(`Affected functions: ${affected.join(', ') || '(none)'}`)

// Output to stdout - space separated for the workflow
process.stdout.write(affected.join(' '))
