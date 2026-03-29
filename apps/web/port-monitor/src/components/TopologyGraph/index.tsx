import { Card, CardHeader, CardContent, AppBadge } from '@repo/app-component-library'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import type { TopologyResponse, PortHealthResponse } from '../../store/__types__'

export function TopologyGraph({
  topology,
  healthData,
}: {
  topology?: TopologyResponse
  healthData?: PortHealthResponse
}) {
  const [collapsed, setCollapsed] = useState(false)

  if (!topology || topology.nodes.length === 0) return null

  const statusMap = new Map(healthData?.services.map(s => [s.key, s.status]) ?? [])

  const frontends = topology.nodes.filter(n => n.kind === 'frontend')
  const backends = topology.nodes.filter(n => n.kind === 'backend')

  const statusColor = (key: string) => {
    const status = statusMap.get(key)
    if (status === 'healthy') return 'border-green-500/50 bg-green-500/5'
    if (status === 'unhealthy') return 'border-red-500/50 bg-red-500/5'
    return 'border-slate-600/50 bg-slate-800/50'
  }

  const statusDot = (key: string) => {
    const status = statusMap.get(key)
    if (status === 'healthy') return 'bg-green-500'
    if (status === 'unhealthy') return 'bg-red-500'
    return 'bg-slate-500'
  }

  return (
    <Card>
      <CardHeader>
        <button
          type="button"
          className="flex items-center gap-2 text-lg font-semibold w-full text-left"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          Service Topology
        </button>
      </CardHeader>
      {!collapsed && (
        <CardContent>
          <div className="grid grid-cols-2 gap-8">
            {/* Frontends */}
            <div>
              <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
                Frontends
              </h3>
              <div className="space-y-2">
                {frontends.map(node => (
                  <div
                    key={node.key}
                    className={`rounded-lg border px-3 py-2 ${statusColor(node.key)}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${statusDot(node.key)}`} />
                      <span className="text-sm font-medium text-slate-200">{node.name}</span>
                      <span className="text-xs font-mono text-slate-500">:{node.port}</span>
                    </div>
                    {/* Show dependencies */}
                    {topology.edges
                      .filter(e => e.from === node.key)
                      .map(e => (
                        <div key={e.to} className="ml-4 mt-1 text-xs text-slate-500">
                          \u2192 {topology.nodes.find(n => n.key === e.to)?.name ?? e.to}
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Backends */}
            <div>
              <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
                Backends
              </h3>
              <div className="space-y-2">
                {backends.map(node => (
                  <div
                    key={node.key}
                    className={`rounded-lg border px-3 py-2 ${statusColor(node.key)}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${statusDot(node.key)}`} />
                      <span className="text-sm font-medium text-slate-200">{node.name}</span>
                      <span className="text-xs font-mono text-slate-500">:{node.port}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
