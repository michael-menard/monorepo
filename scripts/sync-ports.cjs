#!/usr/bin/env node
// Sync discovered services into ports.json and services.json.
// Usage:
//   node scripts/sync-ports.cjs          # dry-run
//   node scripts/sync-ports.cjs --write  # persist changes
'use strict'

const { readFileSync, writeFileSync, existsSync } = require('fs')
const { resolve } = require('path')
const { discoverServices } = require('../infra/discover.cjs')

const ROOT = resolve(__dirname, '..')
const PORTS_PATH = resolve(ROOT, 'infra/ports.json')
const SERVICES_PATH = resolve(ROOT, 'infra/services.json')

const write = process.argv.includes('--write')

const ports = JSON.parse(readFileSync(PORTS_PATH, 'utf8'))
const services = JSON.parse(readFileSync(SERVICES_PATH, 'utf8'))
const { registered, unregistered } = discoverServices()

const additions = []
const removals = []
const repairs = []

// Build a lookup from port key → discovered dir for stale-entry repair
const discoveredByKey = new Map()
for (const svc of [...registered, ...unregistered]) {
  discoveredByKey.set(svc.portKey, svc.dir)
}

// --- Add unregistered services ---
for (const svc of unregistered) {
  additions.push({ key: svc.portKey, port: svc.port, dir: svc.dir, command: svc.devCommand })
}

// --- Remove or repair stale entries from services.json ---
for (const [key, entry] of Object.entries(services)) {
  if (key.startsWith('_')) continue
  if (entry.cwd && !existsSync(resolve(ROOT, entry.cwd))) {
    // If the key matches a discovered service, repair the cwd instead of removing
    if (discoveredByKey.has(key)) {
      repairs.push({ key, oldCwd: entry.cwd, newCwd: discoveredByKey.get(key) })
    } else {
      removals.push({ key, cwd: entry.cwd })
    }
  }
}

// --- Summary ---
console.log('\n=== Port Discovery Sync ===\n')

console.log(`Registered services: ${registered.length}`)
for (const svc of registered) {
  console.log(`  ${svc.portKey.padEnd(30)} ${String(svc.port).padEnd(6)} ${svc.dir}`)
}

if (additions.length > 0) {
  console.log(`\nNew services to add: ${additions.length}`)
  for (const a of additions) {
    console.log(`  + ${a.key.padEnd(30)} ${String(a.port).padEnd(6)} ${a.dir}`)
  }
} else {
  console.log('\nNo new services to add.')
}

if (repairs.length > 0) {
  console.log(`\nStale entries to repair: ${repairs.length}`)
  for (const r of repairs) {
    console.log(`  ~ ${r.key.padEnd(30)} ${r.oldCwd} → ${r.newCwd}`)
  }
}

if (removals.length > 0) {
  console.log(`\nStale entries to remove: ${removals.length}`)
  for (const r of removals) {
    console.log(`  - ${r.key.padEnd(30)} ${r.cwd}`)
  }
} else if (repairs.length === 0) {
  console.log('No stale entries to remove.')
}

const hasChanges = additions.length > 0 || removals.length > 0 || repairs.length > 0
if (!write) {
  if (hasChanges) {
    console.log('\nDry run — pass --write to apply changes.')
  }
  process.exit(0)
}

// --- Apply changes ---
for (const a of additions) {
  ports[a.key] = a.port
  services[a.key] = { command: 'pnpm dev', cwd: a.dir }
}

for (const r of repairs) {
  services[r.key] = { ...services[r.key], cwd: r.newCwd }
}

for (const r of removals) {
  delete services[r.key]
}

writeFileSync(PORTS_PATH, JSON.stringify(ports, null, 2) + '\n', 'utf8')
writeFileSync(SERVICES_PATH, JSON.stringify(services, null, 2) + '\n', 'utf8')

console.log('\nChanges written to ports.json and services.json.')
