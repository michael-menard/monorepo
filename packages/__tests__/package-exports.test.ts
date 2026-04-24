import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { join, resolve } from 'path'
import { describe, expect, it } from 'vitest'

const PACKAGES_ROOT = resolve(__dirname, '..')

// Packages exempted from the dist/ export requirement
const EXEMPT_PACKAGES = new Set([
  '@repo/design-system', // CSS + Tailwind config exports
  '@repo/package-name', // .template reference — not a real package
])

// Deprecated packages that should not exist — test fails if they do
const DEPRECATED_PACKAGES = new Set(['@repo/upload-client', '@repo/upload-types'])

type ExportEntry = string | { import?: string; types?: string; require?: string; default?: string }

function collectPackages(dir: string): string[] {
  const results: string[] = []
  if (!existsSync(dir)) return results

  const entries = readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === 'node_modules' || entry.name === '__tests__')
      continue

    const pkgPath = join(dir, entry.name, 'package.json')
    if (existsSync(pkgPath)) {
      results.push(pkgPath)
    }

    // Check one level deeper (e.g. packages/backend/*, packages/core/*)
    const subDir = join(dir, entry.name)
    if (statSync(subDir).isDirectory()) {
      const subEntries = readdirSync(subDir, { withFileTypes: true })
      for (const subEntry of subEntries) {
        if (!subEntry.isDirectory() || subEntry.name === 'node_modules') continue
        const subPkgPath = join(subDir, subEntry.name, 'package.json')
        if (existsSync(subPkgPath)) {
          results.push(subPkgPath)
        }

        // One more level for sidecars (packages/backend/sidecars/*)
        const deepDir = join(subDir, subEntry.name)
        if (statSync(deepDir).isDirectory()) {
          const deepEntries = readdirSync(deepDir, { withFileTypes: true })
          for (const deepEntry of deepEntries) {
            if (!deepEntry.isDirectory() || deepEntry.name === 'node_modules') continue
            const deepPkgPath = join(deepDir, deepEntry.name, 'package.json')
            if (existsSync(deepPkgPath)) {
              results.push(deepPkgPath)
            }
          }
        }
      }
    }
  }
  return results
}

function extractPaths(entry: ExportEntry): string[] {
  if (typeof entry === 'string') return [entry]
  const paths: string[] = []
  if (entry.import) paths.push(entry.import)
  if (entry.types) paths.push(entry.types)
  if (entry.require) paths.push(entry.require)
  if (entry.default) paths.push(entry.default)
  return paths
}

function pointsToSrc(filePath: string): boolean {
  return filePath.includes('/src/') || filePath.startsWith('./src/')
}

describe('Package exports compliance', () => {
  const packageJsonPaths = collectPackages(PACKAGES_ROOT)

  it('should find packages to test', () => {
    expect(packageJsonPaths.length).toBeGreaterThan(0)
  })

  it('deprecated packages should not exist', () => {
    for (const pkgPath of packageJsonPaths) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
      if (DEPRECATED_PACKAGES.has(pkg.name)) {
        expect.fail(
          `Deprecated package "${pkg.name}" still exists at ${pkgPath} — remove it`,
        )
      }
    }
  })

  for (const pkgPath of collectPackages(PACKAGES_ROOT)) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    const pkgName: string = pkg.name || pkgPath
    const pkgDir = join(pkgPath, '..')

    if (EXEMPT_PACKAGES.has(pkgName) || DEPRECATED_PACKAGES.has(pkgName)) continue

    describe(pkgName, () => {
      it('should have a build script', () => {
        expect(pkg.scripts?.build, `${pkgName} is missing a "build" script`).toBeDefined()
      })

      it('should not export from ./src/', () => {
        const exports = pkg.exports
        if (!exports) return // no exports field is fine if main/types point to dist

        for (const [subpath, entry] of Object.entries(exports)) {
          const paths = extractPaths(entry as ExportEntry)
          for (const p of paths) {
            expect(
              pointsToSrc(p),
              `${pkgName} exports "${subpath}" → "${p}" — must export from ./dist/, not ./src/`,
            ).toBe(false)
          }
        }
      })

      it('should not have main or types pointing to ./src/', () => {
        if (pkg.main && pointsToSrc(pkg.main)) {
          expect.fail(`${pkgName} "main" points to "${pkg.main}" — must point to ./dist/`)
        }
        if (pkg.types && pointsToSrc(pkg.types)) {
          expect.fail(`${pkgName} "types" points to "${pkg.types}" — must point to ./dist/`)
        }
      })

      it('should have exported dist/ files that exist on disk', () => {
        const exports = pkg.exports
        if (!exports) return

        // Only run this check if dist/ directory exists (i.e., package has been built)
        const distDir = resolve(pkgDir, 'dist')
        if (!existsSync(distDir)) return

        for (const [subpath, entry] of Object.entries(exports)) {
          const paths = extractPaths(entry as ExportEntry)
          for (const p of paths) {
            if (p.startsWith('./dist/')) {
              const fullPath = resolve(pkgDir, p)
              expect(
                existsSync(fullPath),
                `${pkgName} exports "${subpath}" → "${p}" but file does not exist at ${fullPath}`,
              ).toBe(true)
            }
          }
        }
      })
    })
  }
})
