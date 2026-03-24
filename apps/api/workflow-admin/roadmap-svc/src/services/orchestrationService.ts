import { createRequire } from 'module'
import { startService, stopService } from './processManagerService'

const _require = createRequire(import.meta.url)

const SELF_KEY = 'ROADMAP_SVC_PORT'

export interface OrchestrationEvent {
  type: 'starting' | 'started' | 'error' | 'skipped' | 'complete'
  key: string
  message: string
  timestamp: string
}

function getServicesByKind(filter?: 'frontend' | 'backend') {
  const { getRegistry } = _require('../../../../../../infra/ports.cjs')
  const registry = getRegistry() as Record<string, number>

  const entries = Object.entries(registry)
  const frontends = entries.filter(([_, port]) => (port as number) < 9000)
  const backends = entries.filter(([_, port]) => (port as number) >= 9000)

  if (filter === 'frontend') return { frontends, backends: [] }
  if (filter === 'backend') return { frontends: [], backends }
  return { frontends, backends }
}

function event(
  type: OrchestrationEvent['type'],
  key: string,
  message: string,
): OrchestrationEvent {
  return { type, key, message, timestamp: new Date().toISOString() }
}

export async function* startAll(
  filter?: 'frontend' | 'backend',
): AsyncGenerator<OrchestrationEvent> {
  const { frontends, backends } = getServicesByKind(filter)

  // Start backends first
  for (const [key] of backends) {
    if (key === SELF_KEY) {
      yield event('skipped', key, 'Self (already running)')
      continue
    }
    yield event('starting', key, `Starting ${key}...`)
    const result = await startService(key)
    yield event(result.success ? 'started' : 'error', key, result.message)
  }

  // Then frontends
  for (const [key] of frontends) {
    yield event('starting', key, `Starting ${key}...`)
    const result = await startService(key)
    yield event(result.success ? 'started' : 'error', key, result.message)
  }

  yield event('complete', '', 'All services started')
}

export async function* stopAll(
  filter?: 'frontend' | 'backend',
): AsyncGenerator<OrchestrationEvent> {
  const { frontends, backends } = getServicesByKind(filter)

  // Stop frontends first
  for (const [key] of frontends) {
    yield event('starting', key, `Stopping ${key}...`)
    const result = await stopService(key)
    yield event(result.success ? 'started' : 'error', key, result.message)
  }

  // Then backends
  for (const [key] of backends) {
    if (key === SELF_KEY) {
      yield event('skipped', key, 'Self (cannot stop)')
      continue
    }
    yield event('starting', key, `Stopping ${key}...`)
    const result = await stopService(key)
    yield event(result.success ? 'started' : 'error', key, result.message)
  }

  yield event('complete', '', 'All services stopped')
}
