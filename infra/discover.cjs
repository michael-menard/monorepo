// Auto-discovery for monorepo services.
// CommonJS — loadable by vite configs and Node scripts without a build step.
'use strict'

const { readdirSync, readFileSync, existsSync } = require('fs')
const { resolve, basename } = require('path')
const { getRegistry } = require('./ports.cjs')

const ROOT = resolve(__dirname, '..')

const SKIP_DIRS = new Set(['playwright', 'node_modules', '.turbo', 'dist'])

/**
 * Generate port key candidates from a directory name.
 * Tries multiple derivations to match existing registry keys:
 *   main-app                → [MAIN_APP_PORT]
 *   workflow-admin-app      → [WORKFLOW_ADMIN_APP_PORT, WORKFLOW_ADMIN_PORT]
 *   app-inspiration-gallery → [APP_INSPIRATION_GALLERY_PORT, INSPIRATION_GALLERY_PORT]
 *   lego-api                → [LEGO_API_PORT]
 *   roadmap-svc             → [ROADMAP_SVC_PORT]
 */
function portKeyVariants(dir) {
  const name = basename(dir)
  const base = name.toUpperCase().replace(/-/g, '_') + '_PORT'
  const variants = [base]
  // Try stripping -app suffix (workflow-admin-app → WORKFLOW_ADMIN_PORT)
  if (name.endsWith('-app')) {
    variants.push(name.slice(0, -4).toUpperCase().replace(/-/g, '_') + '_PORT')
  }
  // Try stripping app- prefix (app-inspiration-gallery → INSPIRATION_GALLERY_PORT)
  if (name.startsWith('app-')) {
    variants.push(name.slice(4).toUpperCase().replace(/-/g, '_') + '_PORT')
  }
  return variants
}

/**
 * Derive the best port key for a directory, matching against known registry keys.
 */
function derivePortKey(dir, registryKeys) {
  const variants = portKeyVariants(dir)
  if (registryKeys) {
    for (const v of variants) {
      if (registryKeys.has(v)) return v
    }
  }
  return variants[0]
}

/**
 * Scan a directory for package.json files that contain a dev script.
 * For apps/api, recurse one extra level to handle nested dirs like workflow-admin/roadmap-svc.
 */
function scanDir(baseDir, kind, registryKeys) {
  const results = []
  if (!existsSync(baseDir)) return results

  const entries = readdirSync(baseDir, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isDirectory() || SKIP_DIRS.has(entry.name)) continue

    const dir = resolve(baseDir, entry.name)
    const pkgPath = resolve(dir, 'package.json')

    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
      if (pkg.scripts && pkg.scripts.dev) {
        const relDir = dir.slice(ROOT.length + 1)
        results.push({
          dir: relDir,
          packageName: pkg.name || entry.name,
          kind,
          devCommand: pkg.scripts.dev,
          portKey: derivePortKey(relDir, registryKeys),
        })
      }
    }

    // For backend dirs, recurse one level deeper (e.g., apps/api/workflow-admin/roadmap-svc)
    if (kind === 'backend' && !existsSync(pkgPath)) {
      const nested = scanDir(dir, kind, registryKeys)
      results.push(...nested)
    }
  }

  return results
}

/**
 * Discover all services in the monorepo.
 * Returns { registered: [], unregistered: [] }
 */
function discoverServices() {
  const registry = getRegistry()
  const registeredKeys = new Set(Object.keys(registry))

  const frontendApps = scanDir(resolve(ROOT, 'apps/web'), 'frontend', registeredKeys)
  const backendApps = scanDir(resolve(ROOT, 'apps/api'), 'backend', registeredKeys)
  const allApps = [...frontendApps, ...backendApps]

  // Find highest used ports per kind for auto-assignment
  const usedPorts = Object.values(registry)
  const highestFrontend = usedPorts.filter(p => p < 9000).reduce((a, b) => Math.max(a, b), 7997)
  const highestBackend = usedPorts.filter(p => p >= 9000).reduce((a, b) => Math.max(a, b), 9097)

  let nextFrontend = highestFrontend + 3
  let nextBackend = highestBackend + 3

  const registered = []
  const unregistered = []

  for (const app of allApps) {
    if (registeredKeys.has(app.portKey)) {
      registered.push({ ...app, port: registry[app.portKey], registered: true })
    } else {
      const port = app.kind === 'frontend' ? nextFrontend : nextBackend
      if (app.kind === 'frontend') nextFrontend += 3
      else nextBackend += 3
      unregistered.push({ ...app, port, registered: false })
    }
  }

  return { registered, unregistered }
}

module.exports = { discoverServices, derivePortKey }
