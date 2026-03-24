// Zero-dependency port registry reader.
// CommonJS so vite configs can load it via createRequire before any build step.
'use strict'

const { readFileSync } = require('fs')
const { resolve } = require('path')

const REGISTRY_PATH = resolve(__dirname, 'ports.json')

let _cache = null

function getRegistry() {
  if (_cache) return _cache
  const raw = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'))
  // Strip metadata keys (prefixed with _)
  const ports = {}
  for (const [key, value] of Object.entries(raw)) {
    if (!key.startsWith('_')) ports[key] = value
  }
  _cache = ports
  return ports
}

function readPort(key) {
  const registry = getRegistry()
  if (!(key in registry)) {
    throw new Error(
      `Port key "${key}" not found in ${REGISTRY_PATH}. Available keys: ${Object.keys(registry).join(', ')}`,
    )
  }
  return registry[key]
}

function getDeps() {
  const raw = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'))
  return raw._deps || {}
}

module.exports = { readPort, getRegistry, getDeps }
