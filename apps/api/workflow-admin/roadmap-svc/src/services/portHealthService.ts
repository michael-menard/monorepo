import { createRequire } from 'module'
import { z } from 'zod'

const _require = createRequire(import.meta.url)
const { getRegistry } = _require('../../../../../../infra/ports.cjs')
const { discoverServices } = _require('../../../../../../infra/discover.cjs')

const ServiceKindSchema = z.enum(['frontend', 'backend'])
const ServiceStatusSchema = z.enum(['healthy', 'unhealthy', 'unknown'])

const ConflictInfoSchema = z.object({
  expectedKey: z.string(),
  actualPid: z.number(),
  actualProcessName: z.string(),
})

const ServiceHealthSchema = z.object({
  key: z.string(),
  name: z.string(),
  port: z.number(),
  kind: ServiceKindSchema,
  status: ServiceStatusSchema,
  responseTimeMs: z.number().nullable(),
  error: z.string().nullable(),
  checkedAt: z.string(),
  pid: z.number().nullable(),
  processName: z.string().nullable(),
  conflict: ConflictInfoSchema.nullable(),
  unregistered: z.boolean().optional(),
})

const PortHealthResponseSchema = z.object({
  services: z.array(ServiceHealthSchema),
  summary: z.object({
    total: z.number(),
    healthy: z.number(),
    unhealthy: z.number(),
    unknown: z.number(),
  }),
  conflicts: z.array(ConflictInfoSchema),
  checkedAt: z.string(),
})

type ServiceHealth = z.infer<typeof ServiceHealthSchema>
type PortHealthResponse = z.infer<typeof PortHealthResponseSchema>

// History buffer for sparklines (Phase 3)
const historyBuffer = new Map<
  string,
  Array<{ timestamp: string; responseTimeMs: number | null; status: string }>
>()
const MAX_HISTORY = 30

function deriveNameFromKey(key: string): string {
  return key
    .replace(/_PORT$/, '')
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

function classifyPort(port: number): z.infer<typeof ServiceKindSchema> {
  return port >= 9000 ? 'backend' : 'frontend'
}

async function pingService(
  port: number,
  kind: z.infer<typeof ServiceKindSchema>,
): Promise<{
  status: z.infer<typeof ServiceStatusSchema>
  responseTimeMs: number | null
  error: string | null
}> {
  const path = kind === 'backend' ? '/health' : '/'
  const url = `http://localhost:${port}${path}`
  const start = Date.now()

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(3000),
    })
    const responseTimeMs = Date.now() - start

    if (response.ok) {
      return { status: 'healthy', responseTimeMs, error: null }
    }
    return {
      status: 'unhealthy',
      responseTimeMs,
      error: `HTTP ${response.status}`,
    }
  } catch (err) {
    const responseTimeMs = Date.now() - start
    const error = err instanceof Error ? err.message : String(err)

    if (error.includes('timeout') || error.includes('abort')) {
      return { status: 'unknown', responseTimeMs: null, error: 'Timeout (3s)' }
    }
    return { status: 'unhealthy', responseTimeMs: null, error }
  }
}

export async function getPortOwner(
  port: number,
): Promise<{ pid: number; processName: string } | null> {
  try {
    const proc = Bun.spawn(['lsof', '-i', `:${port}`, '-P', '-n', '-sTCP:LISTEN'], {
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const text = await new Response(proc.stdout).text()
    await proc.exited

    const lines = text.trim().split('\n')
    if (lines.length < 2) return null

    // Parse lsof output: COMMAND PID USER ...
    const parts = lines[1].split(/\s+/)
    if (parts.length < 2) return null

    return {
      processName: parts[0],
      pid: parseInt(parts[1], 10),
    }
  } catch {
    return null
  }
}

// Expected process names per service key (heuristic)
const EXPECTED_PROCESS: Record<string, string[]> = {
  // Frontend vite servers
  MAIN_APP_PORT: ['node', 'bun'],
  APP_DASHBOARD_PORT: ['node', 'bun'],
  WORKFLOW_ADMIN_PORT: ['node', 'bun'],
  WORKFLOW_ROADMAP_PORT: ['node', 'bun'],
  PLAN_CHAT_PORT: ['node', 'bun'],
  PORT_MONITOR_PORT: ['node', 'bun'],
  // Backend services
  LEGO_API_PORT: ['bun', 'node'],
  ROADMAP_SVC_PORT: ['bun', 'node'],
}

export async function getPortHealth(): Promise<PortHealthResponse> {
  const registry = getRegistry() as Record<string, number>
  const checkedAt = new Date().toISOString()

  // Merge unregistered discovered services into the check list
  const discovered = discoverServices()
  const unregisteredMap = new Map<string, number>()
  for (const svc of discovered.unregistered) {
    unregisteredMap.set(svc.portKey, svc.port)
  }

  const entries = [...Object.entries(registry), ...Array.from(unregisteredMap.entries())]
  const results = await Promise.allSettled(
    entries.map(async ([key, port]): Promise<ServiceHealth> => {
      const kind = classifyPort(port)
      const ping = await pingService(port, kind)
      const owner = await getPortOwner(port)

      let conflict = null
      if (owner) {
        const expected = EXPECTED_PROCESS[key]
        if (expected && !expected.includes(owner.processName.toLowerCase())) {
          conflict = {
            expectedKey: key,
            actualPid: owner.pid,
            actualProcessName: owner.processName,
          }
        }
      }

      return {
        key,
        name: deriveNameFromKey(key),
        port,
        kind,
        status: ping.status,
        responseTimeMs: ping.responseTimeMs,
        error: ping.error,
        checkedAt,
        pid: owner?.pid ?? null,
        processName: owner?.processName ?? null,
        conflict,
        ...(unregisteredMap.has(key) ? { unregistered: true } : {}),
      }
    }),
  )

  const services: ServiceHealth[] = results.map((result, i) => {
    if (result.status === 'fulfilled') return result.value
    return {
      key: entries[i][0],
      name: deriveNameFromKey(entries[i][0]),
      port: entries[i][1],
      kind: classifyPort(entries[i][1]),
      status: 'unknown' as const,
      responseTimeMs: null,
      error: String(result.reason),
      checkedAt,
      pid: null,
      processName: null,
      conflict: null,
    }
  })

  // Append to history buffer
  for (const svc of services) {
    let history = historyBuffer.get(svc.key)
    if (!history) {
      history = []
      historyBuffer.set(svc.key, history)
    }
    history.push({ timestamp: checkedAt, responseTimeMs: svc.responseTimeMs, status: svc.status })
    if (history.length > MAX_HISTORY) {
      history.splice(0, history.length - MAX_HISTORY)
    }
  }

  const conflicts = services.filter(s => s.conflict !== null).map(s => s.conflict!)

  const summary = {
    total: services.length,
    healthy: services.filter(s => s.status === 'healthy').length,
    unhealthy: services.filter(s => s.status === 'unhealthy').length,
    unknown: services.filter(s => s.status === 'unknown').length,
  }

  return { services, summary, conflicts, checkedAt }
}

export function getPortHistory(): Record<
  string,
  { responseTimes: (number | null)[]; statuses: string[] }
> {
  const result: Record<string, { responseTimes: (number | null)[]; statuses: string[] }> = {}
  for (const [key, history] of historyBuffer) {
    result[key] = {
      responseTimes: history.map(h => h.responseTimeMs),
      statuses: history.map(h => h.status),
    }
  }
  return result
}

export function getPortTopology() {
  const registry = getRegistry() as Record<string, number>
  // Read deps from ports.json
  let deps: Record<string, string[]> = {}
  try {
    const raw = _require('../../../../../../infra/ports.json')
    deps = raw._deps ?? {}
  } catch {
    // no deps
  }

  const nodes = Object.entries(registry).map(([key, port]) => ({
    key,
    name: deriveNameFromKey(key),
    port: port as number,
    kind: classifyPort(port as number),
  }))

  const edges = Object.entries(deps).flatMap(([from, targets]) => targets.map(to => ({ from, to })))

  return { nodes, edges }
}

/** @internal Reset module state for tests */
export function _resetForTests() {
  historyBuffer.clear()
}
