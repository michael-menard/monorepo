import { createRequire } from 'module'
import { resolve } from 'path'
import { logger } from '@repo/logger'
import { appendLog } from './logBufferService'

const _require = createRequire(import.meta.url)
const MONOREPO_ROOT = resolve(import.meta.dir, '../../../../../..')

type ServiceManifest = Record<string, { command: string; cwd: string }>

function loadManifest(): ServiceManifest {
  const raw = _require('../../../../../../infra/services.json')
  const manifest: ServiceManifest = {}
  for (const [key, value] of Object.entries(raw)) {
    if (!key.startsWith('_') && typeof value === 'object' && value !== null) {
      manifest[key] = value as { command: string; cwd: string }
    }
  }
  return manifest
}

export interface ManagedProcess {
  process: ReturnType<typeof Bun.spawn>
  key: string
  startedAt: string
}

// Shared with log tailing (Phase 2)
export const managedProcesses = new Map<string, ManagedProcess>()

const SELF_KEY = 'ROADMAP_SVC_PORT'

function pipeStreamToLog(
  key: string,
  stream: ReadableStream<Uint8Array> | null,
  streamName: 'stdout' | 'stderr',
) {
  if (!stream) return
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  function read() {
    reader
      .read()
      .then(({ done, value }) => {
        if (done) return
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (line.trim()) appendLog(key, streamName, line)
        }
        read()
      })
      .catch(() => {})
  }
  read()
}

export async function findPidByPort(port: number): Promise<number | null> {
  try {
    const proc = Bun.spawn(['lsof', '-ti', `:${port}`], {
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const text = await new Response(proc.stdout).text()
    await proc.exited

    const pid = parseInt(text.trim().split('\n')[0], 10)
    return isNaN(pid) ? null : pid
  } catch {
    return null
  }
}

async function waitForPortFree(port: number, timeoutMs = 5000): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const pid = await findPidByPort(port)
    if (!pid) return true
    await Bun.sleep(200)
  }
  return false
}

async function waitForHealthy(port: number, kind: string, timeoutMs = 10000): Promise<boolean> {
  const path = kind === 'backend' ? '/health' : '/'
  const url = `http://localhost:${port}${path}`
  const start = Date.now()

  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) })
      if (res.ok) return true
    } catch {
      // not ready yet
    }
    await Bun.sleep(500)
  }
  return false
}

export async function stopService(key: string): Promise<{ success: boolean; message: string }> {
  if (key === SELF_KEY) {
    return { success: false, message: 'Cannot stop self (ROADMAP_SVC_PORT)' }
  }

  const { getRegistry } = _require('../../../../../../infra/ports.cjs')
  const registry = getRegistry() as Record<string, number>
  const port = registry[key]

  if (!port) {
    return { success: false, message: `Unknown service key: ${key}` }
  }

  // Clean up managed process if we started it
  const managed = managedProcesses.get(key)
  if (managed) {
    managed.process.kill()
    managedProcesses.delete(key)
  }

  const pid = await findPidByPort(port)
  if (!pid) {
    return { success: true, message: `${key} is not running` }
  }

  try {
    process.kill(pid, 'SIGTERM')
    logger.info(`Sent SIGTERM to ${key} (PID ${pid})`)

    const freed = await waitForPortFree(port, 5000)
    if (!freed) {
      // Escalate to SIGKILL
      try {
        process.kill(pid, 'SIGKILL')
        logger.warn(`Sent SIGKILL to ${key} (PID ${pid})`)
      } catch {
        // pid may be gone
      }
      await waitForPortFree(port, 2000)
    }

    return { success: true, message: `${key} stopped` }
  } catch (err) {
    return { success: false, message: `Failed to stop ${key}: ${err}` }
  }
}

export async function startService(key: string): Promise<{ success: boolean; message: string }> {
  const manifest = loadManifest()
  const entry = manifest[key]

  if (!entry) {
    return { success: false, message: `No manifest entry for ${key}` }
  }

  const { getRegistry } = _require('../../../../../../infra/ports.cjs')
  const registry = getRegistry() as Record<string, number>
  const port = registry[key]

  if (!port) {
    return { success: false, message: `Unknown port key: ${key}` }
  }

  // Check if already running
  const existingPid = await findPidByPort(port)
  if (existingPid) {
    return { success: true, message: `${key} is already running (PID ${existingPid})` }
  }

  const cwd = resolve(MONOREPO_ROOT, entry.cwd)
  const parts = entry.command.split(' ')

  try {
    const child = Bun.spawn(parts, {
      cwd,
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...process.env, PORT: String(port) },
    })

    managedProcesses.set(key, {
      process: child,
      key,
      startedAt: new Date().toISOString(),
    })

    // Pipe stdout/stderr into log buffer
    pipeStreamToLog(key, child.stdout, 'stdout')
    pipeStreamToLog(key, child.stderr, 'stderr')

    const kind = port >= 9000 ? 'backend' : 'frontend'
    const healthy = await waitForHealthy(port, kind, 10000)

    if (healthy) {
      logger.info(`${key} started and healthy on port ${port}`)
      return { success: true, message: `${key} started on port ${port}` }
    }

    logger.warn(`${key} started but health check timed out`)
    return { success: true, message: `${key} started but health check timed out` }
  } catch (err) {
    return { success: false, message: `Failed to start ${key}: ${err}` }
  }
}

export async function restartService(key: string): Promise<{ success: boolean; message: string }> {
  if (key === SELF_KEY) {
    return { success: false, message: 'Cannot restart self (ROADMAP_SVC_PORT)' }
  }

  const stopResult = await stopService(key)
  if (!stopResult.success) {
    return { success: false, message: `Stop failed: ${stopResult.message}` }
  }

  const { getRegistry } = _require('../../../../../../infra/ports.cjs')
  const registry = getRegistry() as Record<string, number>
  const port = registry[key]

  if (port) {
    await waitForPortFree(port, 5000)
  }

  return startService(key)
}
