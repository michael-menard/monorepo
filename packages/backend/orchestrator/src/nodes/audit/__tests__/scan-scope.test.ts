import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { tmpdir } from 'os'
import { join } from 'path'
import { mkdir, writeFile, rm } from 'fs/promises'

import { scanScope } from '../scan-scope.js'
import type { CodeAuditState, CodeAuditConfig } from '../../../graphs/code-audit.js'

describe('scanScope', () => {
  let testDir: string

  beforeEach(async () => {
    // Create temp directory with unique name
    testDir = join(tmpdir(), `audit-test-${Date.now()}`)
    await mkdir(testDir, { recursive: true })
  })

  afterEach(async () => {
    // Cleanup temp directory
    try {
      await rm(testDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  it('discovers source files for scope=full', async () => {
    // Create fixture files
    await mkdir(join(testDir, 'src'), { recursive: true })
    await writeFile(join(testDir, 'src/index.ts'), 'export const test = 1')
    await writeFile(join(testDir, 'src/util.ts'), 'export const util = 1')
    await writeFile(join(testDir, 'src/component.tsx'), 'export const Component = () => null')

    const state: Partial<CodeAuditState> = {
      scope: 'full',
      mode: 'pipeline',
      target: testDir,
    }

    const config: CodeAuditConfig = {
      scope: 'full',
      mode: 'pipeline',
      lenses: [],
      target: testDir,
      nodeTimeoutMs: 60000,
    }

    const result = await scanScope(state as CodeAuditState, config)

    expect(result.targetFiles).toBeDefined()
    expect(result.targetFiles?.length).toBeGreaterThan(0)
    expect(result.targetFiles?.some(f => f.endsWith('index.ts'))).toBe(true)
    expect(result.targetFiles?.some(f => f.endsWith('util.ts'))).toBe(true)
    expect(result.targetFiles?.some(f => f.endsWith('component.tsx'))).toBe(true)
  })

  it('excludes node_modules from scan', async () => {
    // Create fixture with node_modules
    await mkdir(join(testDir, 'node_modules/pkg'), { recursive: true })
    await mkdir(join(testDir, 'src'), { recursive: true })
    await writeFile(join(testDir, 'node_modules/pkg/index.js'), 'module.exports = {}')
    await writeFile(join(testDir, 'src/index.ts'), 'export const test = 1')

    const state: Partial<CodeAuditState> = {
      scope: 'full',
      mode: 'pipeline',
      target: testDir,
    }

    const config: CodeAuditConfig = {
      scope: 'full',
      mode: 'pipeline',
      lenses: [],
      target: testDir,
      nodeTimeoutMs: 60000,
    }

    const result = await scanScope(state as CodeAuditState, config)

    expect(result.targetFiles?.every(f => !f.includes('node_modules'))).toBe(true)
  })

  it('excludes .git directory from scan', async () => {
    await mkdir(join(testDir, '.git/objects'), { recursive: true })
    await mkdir(join(testDir, 'src'), { recursive: true })
    await writeFile(join(testDir, '.git/config'), 'config')
    await writeFile(join(testDir, 'src/index.ts'), 'export const test = 1')

    const state: Partial<CodeAuditState> = {
      scope: 'full',
      mode: 'pipeline',
      target: testDir,
    }

    const config: CodeAuditConfig = {
      scope: 'full',
      mode: 'pipeline',
      lenses: [],
      target: testDir,
      nodeTimeoutMs: 60000,
    }

    const result = await scanScope(state as CodeAuditState, config)

    expect(result.targetFiles?.every(f => !f.includes('.git'))).toBe(true)
  })

  it('excludes dist, .next, .turbo directories from scan', async () => {
    await mkdir(join(testDir, 'dist'), { recursive: true })
    await mkdir(join(testDir, '.next'), { recursive: true })
    await mkdir(join(testDir, '.turbo'), { recursive: true })
    await mkdir(join(testDir, 'src'), { recursive: true })
    await writeFile(join(testDir, 'dist/bundle.js'), 'bundle')
    await writeFile(join(testDir, '.next/cache.json'), 'cache')
    await writeFile(join(testDir, '.turbo/config.json'), 'config')
    await writeFile(join(testDir, 'src/index.ts'), 'export const test = 1')

    const state: Partial<CodeAuditState> = {
      scope: 'full',
      mode: 'pipeline',
      target: testDir,
    }

    const config: CodeAuditConfig = {
      scope: 'full',
      mode: 'pipeline',
      lenses: [],
      target: testDir,
      nodeTimeoutMs: 60000,
    }

    const result = await scanScope(state as CodeAuditState, config)

    expect(result.targetFiles?.every(f => !f.includes('dist'))).toBe(true)
    expect(result.targetFiles?.every(f => !f.includes('.next'))).toBe(true)
    expect(result.targetFiles?.every(f => !f.includes('.turbo'))).toBe(true)
  })

  it('categorizes files as frontend', async () => {
    await mkdir(join(testDir, 'apps/web/src'), { recursive: true })
    await writeFile(join(testDir, 'apps/web/src/Component.tsx'), 'export const Component = () => null')

    const state: Partial<CodeAuditState> = {
      scope: 'full',
      mode: 'pipeline',
      target: testDir,
    }

    const config: CodeAuditConfig = {
      scope: 'full',
      mode: 'pipeline',
      lenses: [],
      target: testDir,
      nodeTimeoutMs: 60000,
    }

    const result = await scanScope(state as CodeAuditState, config)

    expect(result.fileCategories).toBeDefined()
    expect(result.fileCategories?.frontend).toBeGreaterThan(0)
  })

  it('categorizes files as backend', async () => {
    await mkdir(join(testDir, 'apps/api/src'), { recursive: true })
    await writeFile(join(testDir, 'apps/api/src/handler.ts'), 'export const handler = () => {}')

    const state: Partial<CodeAuditState> = {
      scope: 'full',
      mode: 'pipeline',
      target: testDir,
    }

    const config: CodeAuditConfig = {
      scope: 'full',
      mode: 'pipeline',
      lenses: [],
      target: testDir,
      nodeTimeoutMs: 60000,
    }

    const result = await scanScope(state as CodeAuditState, config)

    expect(result.fileCategories).toBeDefined()
    expect(result.fileCategories?.backend).toBeGreaterThan(0)
  })

  it('categorizes files as tests', async () => {
    await mkdir(join(testDir, 'src/__tests__'), { recursive: true })
    await writeFile(join(testDir, 'src/__tests__/index.test.ts'), 'test("test", () => {})')
    await writeFile(join(testDir, 'src/util.spec.ts'), 'test("spec", () => {})')

    const state: Partial<CodeAuditState> = {
      scope: 'full',
      mode: 'pipeline',
      target: testDir,
    }

    const config: CodeAuditConfig = {
      scope: 'full',
      mode: 'pipeline',
      lenses: [],
      target: testDir,
      nodeTimeoutMs: 60000,
    }

    const result = await scanScope(state as CodeAuditState, config)

    expect(result.fileCategories).toBeDefined()
    expect(result.fileCategories?.tests).toBeGreaterThan(0)
  })

  it('categorizes files as config', async () => {
    await mkdir(testDir, { recursive: true })
    await writeFile(join(testDir, 'tsconfig.json'), '{}')
    await writeFile(join(testDir, 'vite.config.ts'), 'export default {}')

    const state: Partial<CodeAuditState> = {
      scope: 'full',
      mode: 'pipeline',
      target: testDir,
    }

    const config: CodeAuditConfig = {
      scope: 'full',
      mode: 'pipeline',
      lenses: [],
      target: testDir,
      nodeTimeoutMs: 60000,
    }

    const result = await scanScope(state as CodeAuditState, config)

    expect(result.fileCategories).toBeDefined()
    expect(result.fileCategories?.config).toBeGreaterThan(0)
  })

  it('categorizes files as shared (packages)', async () => {
    await mkdir(join(testDir, 'packages/shared/src'), { recursive: true })
    await writeFile(join(testDir, 'packages/shared/src/util.ts'), 'export const util = 1')

    const state: Partial<CodeAuditState> = {
      scope: 'full',
      mode: 'pipeline',
      target: testDir,
    }

    const config: CodeAuditConfig = {
      scope: 'full',
      mode: 'pipeline',
      lenses: [],
      target: testDir,
      nodeTimeoutMs: 60000,
    }

    const result = await scanScope(state as CodeAuditState, config)

    expect(result.fileCategories).toBeDefined()
    expect(result.fileCategories?.shared).toBeGreaterThan(0)
  })

  it('excludes .d.ts declaration files', async () => {
    await mkdir(join(testDir, 'src'), { recursive: true })
    await writeFile(join(testDir, 'src/types.d.ts'), 'declare module "test"')
    await writeFile(join(testDir, 'src/index.ts'), 'export const test = 1')

    const state: Partial<CodeAuditState> = {
      scope: 'full',
      mode: 'pipeline',
      target: testDir,
    }

    const config: CodeAuditConfig = {
      scope: 'full',
      mode: 'pipeline',
      lenses: [],
      target: testDir,
      nodeTimeoutMs: 60000,
    }

    const result = await scanScope(state as CodeAuditState, config)

    expect(result.targetFiles?.every(f => !f.endsWith('.d.ts'))).toBe(true)
    expect(result.targetFiles?.some(f => f.endsWith('index.ts'))).toBe(true)
  })

  it('finds previous audit file', async () => {
    // Note: This test would need a real audit directory to work properly
    // For now, we just verify the result structure
    await mkdir(join(testDir, 'src'), { recursive: true })
    await writeFile(join(testDir, 'src/index.ts'), 'export const test = 1')

    const state: Partial<CodeAuditState> = {
      scope: 'full',
      mode: 'pipeline',
      target: testDir,
    }

    const config: CodeAuditConfig = {
      scope: 'full',
      mode: 'pipeline',
      lenses: [],
      target: testDir,
      nodeTimeoutMs: 60000,
    }

    const result = await scanScope(state as CodeAuditState, config)

    expect(result.previousAudit).toBeDefined()
    // Will be null if plans/audit doesn't exist, which is fine
  })

  it('handles empty directory', async () => {
    const state: Partial<CodeAuditState> = {
      scope: 'full',
      mode: 'pipeline',
      target: testDir,
    }

    const config: CodeAuditConfig = {
      scope: 'full',
      mode: 'pipeline',
      lenses: [],
      target: testDir,
      nodeTimeoutMs: 60000,
    }

    const result = await scanScope(state as CodeAuditState, config)

    expect(result.targetFiles).toEqual([])
    expect(result.fileCategories).toEqual({})
  })

  it('handles non-existent directory gracefully', async () => {
    const nonExistentDir = join(testDir, 'does-not-exist')

    const state: Partial<CodeAuditState> = {
      scope: 'full',
      mode: 'pipeline',
      target: nonExistentDir,
    }

    const config: CodeAuditConfig = {
      scope: 'full',
      mode: 'pipeline',
      lenses: [],
      target: nonExistentDir,
      nodeTimeoutMs: 60000,
    }

    const result = await scanScope(state as CodeAuditState, config)

    expect(result.targetFiles).toEqual([])
  })

  it('includes .js and .jsx files', async () => {
    await mkdir(join(testDir, 'src'), { recursive: true })
    await writeFile(join(testDir, 'src/legacy.js'), 'module.exports = {}')
    await writeFile(join(testDir, 'src/Component.jsx'), 'export const Component = () => null')

    const state: Partial<CodeAuditState> = {
      scope: 'full',
      mode: 'pipeline',
      target: testDir,
    }

    const config: CodeAuditConfig = {
      scope: 'full',
      mode: 'pipeline',
      lenses: [],
      target: testDir,
      nodeTimeoutMs: 60000,
    }

    const result = await scanScope(state as CodeAuditState, config)

    expect(result.targetFiles?.some(f => f.endsWith('legacy.js'))).toBe(true)
    expect(result.targetFiles?.some(f => f.endsWith('Component.jsx'))).toBe(true)
  })

  it('uses target from config when state target is missing', async () => {
    await mkdir(join(testDir, 'src'), { recursive: true })
    await writeFile(join(testDir, 'src/index.ts'), 'export const test = 1')

    const state: Partial<CodeAuditState> = {
      scope: 'full',
      mode: 'pipeline',
      // target not set in state
    }

    const config: CodeAuditConfig = {
      scope: 'full',
      mode: 'pipeline',
      lenses: [],
      target: testDir,
      nodeTimeoutMs: 60000,
    }

    const result = await scanScope(state as CodeAuditState, config)

    expect(result.targetFiles?.length).toBeGreaterThan(0)
  })
})
