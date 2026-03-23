#!/usr/bin/env node
// CI check: validates no duplicate ports and all ports are in valid range.
'use strict'

const { resolve } = require('path')
const { getRegistry } = require(resolve(__dirname, '..', 'infra', 'ports.cjs'))

const registry = getRegistry()
const entries = Object.entries(registry)
let errors = 0

// Check valid range
for (const [key, port] of entries) {
  if (typeof port !== 'number' || port < 1024 || port > 65535) {
    console.error(`FAIL: ${key} = ${port} is not a valid port (must be 1024-65535)`)
    errors++
  }
}

// Check duplicates
const seen = new Map()
for (const [key, port] of entries) {
  if (seen.has(port)) {
    console.error(`FAIL: ${key} (${port}) collides with ${seen.get(port)} (${port})`)
    errors++
  } else {
    seen.set(port, key)
  }
}

if (errors > 0) {
  console.error(`\n${errors} port registry error(s) found.`)
  process.exit(1)
}

console.log(`OK: ${entries.length} ports registered, no duplicates, all in valid range.`)
