import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRegistry = {
  MAIN_APP_PORT: 8000,
  ROADMAP_SVC_PORT: 9103,
}

const mockManifest = {
  MAIN_APP_PORT: { command: 'pnpm dev', cwd: 'apps/web/main-app' },
  ROADMAP_SVC_PORT: { command: 'bun run --hot src/index.ts', cwd: 'apps/api/workflow-admin/roadmap-svc' },
}

vi.mock('module', () => ({
  createRequire: () => (path: string) => {
    if (path.includes('services.json')) return mockManifest
    if (path.includes('ports.cjs')) return { getRegistry: () => mockRegistry }
    return {}
  },
}))

// Mock Bun.spawn
const mockSpawn = vi.fn().mockReturnValue({
  stdout: new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(''))
      controller.close()
    },
  }),
  stderr: new ReadableStream({
    start(controller) {
      controller.close()
    },
  }),
  exited: Promise.resolve(0),
  kill: vi.fn(),
})

vi.stubGlobal('Bun', {
  spawn: mockSpawn,
  sleep: (ms: number) => new Promise(r => setTimeout(r, Math.min(ms, 10))),
})

const { stopService, startService, restartService, findPidByPort } = await import(
  '../processManagerService'
)

describe('processManagerService', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('findPidByPort', () => {
    it('returns null when no process found', async () => {
      mockSpawn.mockReturnValueOnce({
        stdout: new ReadableStream({
          start(c) {
            c.enqueue(new TextEncoder().encode(''))
            c.close()
          },
        }),
        exited: Promise.resolve(1),
      })
      const pid = await findPidByPort(9999)
      expect(pid).toBeNull()
    })
  })

  describe('stopService', () => {
    it('refuses to stop self', async () => {
      const result = await stopService('ROADMAP_SVC_PORT')
      expect(result.success).toBe(false)
      expect(result.message).toContain('Cannot stop self')
    })

    it('returns success when service not running', async () => {
      mockSpawn.mockReturnValueOnce({
        stdout: new ReadableStream({
          start(c) {
            c.enqueue(new TextEncoder().encode(''))
            c.close()
          },
        }),
        exited: Promise.resolve(1),
      })
      const result = await stopService('MAIN_APP_PORT')
      expect(result.success).toBe(true)
    })
  })

  describe('startService', () => {
    it('returns error for unknown key', async () => {
      const result = await startService('UNKNOWN_PORT')
      expect(result.success).toBe(false)
      expect(result.message).toContain('No manifest entry')
    })
  })

  describe('restartService', () => {
    it('refuses to restart self', async () => {
      const result = await restartService('ROADMAP_SVC_PORT')
      expect(result.success).toBe(false)
      expect(result.message).toContain('Cannot restart self')
    })
  })
})
