import { Card, CardHeader, CardContent, AppBadge, Skeleton } from '@repo/app-component-library'
import { Sparkline } from '@repo/charts'
import type { ServiceHealth, PortHistoryResponse } from '../../store/__types__'
import { StatusBadge } from '../StatusBadge'
import { ServiceActions } from '../ServiceActions'

function LoadingRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i}>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-28" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-12" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-5 w-16" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-5 w-16" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-12" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-20" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-8 w-28" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-8" />
          </td>
        </tr>
      ))}
    </>
  )
}

export function ServiceStatusTable({
  services,
  isLoading,
  onSelectService,
  historyData,
}: {
  services?: ServiceHealth[]
  isLoading?: boolean
  onSelectService?: (key: string) => void
  historyData?: PortHistoryResponse
}) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">Services</h2>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="table">
            <thead>
              <tr className="border-b border-slate-700/50 text-left text-slate-400">
                <th className="px-4 py-3 font-medium">Service</th>
                <th className="px-4 py-3 font-medium">Port</th>
                <th className="px-4 py-3 font-medium">Kind</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Response</th>
                <th className="px-4 py-3 font-medium">Error</th>
                <th className="px-4 py-3 font-medium">Trend</th>
                <th className="px-4 py-3 font-medium w-12">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {isLoading ? (
                <LoadingRows />
              ) : (
                services?.map(service => (
                  <tr key={service.key} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      {onSelectService ? (
                        <button
                          type="button"
                          className="text-cyan-400 hover:text-cyan-300 hover:underline"
                          onClick={() => onSelectService(service.key)}
                        >
                          {service.name}
                        </button>
                      ) : (
                        service.name
                      )}
                      {service.unregistered ? (
                        <AppBadge variant="warning" size="sm" className="ml-2">
                          new
                        </AppBadge>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400">{service.port}</td>
                    <td className="px-4 py-3">
                      <AppBadge
                        variant={service.kind === 'backend' ? 'info' : 'secondary'}
                        size="sm"
                      >
                        {service.kind}
                      </AppBadge>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={service.status} />
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400">
                      {service.responseTimeMs !== null ? `${service.responseTimeMs}ms` : '\u2014'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                      {service.error ?? '\u2014'}
                    </td>
                    <td className="px-4 py-3">
                      {historyData?.[service.key] ? (
                        <Sparkline
                          data={historyData[service.key].responseTimes}
                          color={service.status === 'healthy' ? '#06b6d4' : '#ef4444'}
                        />
                      ) : (
                        <span className="text-slate-600">\u2014</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ServiceActions serviceKey={service.key} status={service.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
