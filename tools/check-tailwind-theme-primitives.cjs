#!/usr/bin/env node

/**
 * Simple guardrail script to enforce that app Tailwind configs do not
 * redefine core theme primitives (colors, spacing, fontFamily, etc.).
 *
 * Intended usage (from repo root):
 *   node tools/check-tailwind-theme-primitives.cjs
 *
 * You can wire this into CI or lint scripts as needed.
 */

const fs = require('fs')
const path = require('path')

const REPO_ROOT = process.cwd()
const APPS_WEB_DIR = path.join(REPO_ROOT, 'apps', 'web')

// Keys we consider "primitives" that must only live in the design-system preset
const FORBIDDEN_THEME_KEYS = [
  'colors',
  'spacing',
  'fontFamily',
  'fontSize',
  'borderRadius',
  'zIndex',
  'boxShadow',
]

/**
 * Very lightweight static check: we just look for these keys inside a
 * `theme` or `theme: { extend: { ... } }` block. This is heuristic but
 * good enough to catch accidental redefinition.
 */
function fileHasForbiddenThemeKeys(filePath) {
  const src = fs.readFileSync(filePath, 'utf8')

  return FORBIDDEN_THEME_KEYS.some(key => {
    // Allow definitions that live in the shared preset only
    if (filePath.includes('packages/core/design-system')) return false

    const pattern = new RegExp(`theme\\s*:\\s*{[\\s\\S]*?${key}\\s*:`, 'm')
    const extendPattern = new RegExp(`theme\\s*:\\s*{[\\s\\S]*?extend\\s*:\\s*{[\\s\\S]*?${key}\\s*:`, 'm')

    return pattern.test(src) || extendPattern.test(src)
  })
}

function main() {
  const failures = []

  const entries = fs.readdirSync(APPS_WEB_DIR, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const configPath = path.join(APPS_WEB_DIR, entry.name, 'tailwind.config.ts')
    if (!fs.existsSync(configPath)) continue

    if (fileHasForbiddenThemeKeys(configPath)) {
      failures.push(path.relative(REPO_ROOT, configPath))
    }
  }

  if (failures.length > 0) {
    console.error('\n[tailwind-theme-check] The following Tailwind configs redefine core theme primitives:')
    for (const file of failures) {
      console.error(`  - ${file}`)
    }
    console.error('\nMove these definitions into packages/core/design-system (design-tokens.css or tailwind-preset.js) instead.')
    process.exit(1)
  }

  console.log('[tailwind-theme-check] OK: no app Tailwind configs redefine core theme primitives.')
}

main()
