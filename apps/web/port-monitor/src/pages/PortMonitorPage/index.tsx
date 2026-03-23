import { useState } from 'react'
import { Activity, CheckCircle2, XCircle } from 'lucide-react'
import { PageHeader, StatsCards } from '@repo/app-component-library'
import type { StatItem } from '@repo/app-component-library'
import {
  useGetPortHealthQuery,
  useGetPortHistoryQuery,
  useGetPortTopologyQuery,
} from '../../store/portMonitorApi'
import { ServiceStatusTable } from '../../components/ServiceStatusTable'
import { RefreshCountdown } from '../../components/RefreshCountdown'
import { ConflictBanner } from '../../components/ConflictBanner'
import { TopologyGraph } from '../../components/TopologyGraph'
import { BulkControls } from '../../components/BulkControls'
import { OrchestrationProgress } from '../../components/OrchestrationProgress'
import { LogPanel } from '../../components/LogPanel'
import { useStatusChangeNotifications } from '../../hooks/useStatusChangeNotifications'
import { useOrchestration } from '../../hooks/useOrchestration'

const POLL_INTERVAL = 10_000

export function PortMonitorPage() {
  const { data, isLoading, isFetching, error } = useGetPortHealthQuery(undefined, {
    pollingInterval: POLL_INTERVAL,
  })
  const { data: historyData } = useGetPortHistoryQuery(undefined, {
    pollingInterval: POLL_INTERVAL,
  })
  const { data: topologyData } = useGetPortTopologyQuery()

  useStatusChangeNotifications(data?.services)

  const [selectedServiceKey, setSelectedServiceKey] = useState<string | null>(null)
  const orchestration = useOrchestration()

  const stats: StatItem[] = [
    {
      icon: Activity,
      label: 'Total Services',
      value: data?.summary.total ?? 0,
      colorClass: 'text-cyan-500',
      bgClass: 'bg-cyan-500/10',
    },
    {
      icon: CheckCircle2,
      label: 'Healthy',
      value: data?.summary.healthy ?? 0,
      colorClass: 'text-green-500',
      bgClass: 'bg-green-500/10',
    },
    {
      icon: XCircle,
      label: 'Unhealthy',
      value: data?.summary.unhealthy ?? 0,
      colorClass: 'text-red-500',
      bgClass: 'bg-red-500/10',
    },
  ]

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Port Monitor" subtitle="Real-time service health status" />
        <BulkControls
          onStartAll={filter => orchestration.run('start-all', filter)}
          onStopAll={filter => orchestration.run('stop-all', filter)}
          isRunning={orchestration.isRunning}
        />
      </div>

      <StatsCards
        items={stats}
        isLoading={isLoading}
        error={error ? new Error(String(error)) : null}
        ariaLabel="Service health statistics"
      />

      {data?.conflicts && data.conflicts.length > 0 && (
        <ConflictBanner conflicts={data.conflicts} />
      )}

      <ServiceStatusTable
        services={data?.services}
        isLoading={isLoading}
        onSelectService={setSelectedServiceKey}
        historyData={historyData}
      />

      <TopologyGraph topology={topologyData} healthData={data} />

      <div className="flex justify-end">
        <RefreshCountdown
          intervalMs={POLL_INTERVAL}
          lastCheckedAt={data?.checkedAt}
          isFetching={isFetching}
        />
      </div>

      <OrchestrationProgress
        events={orchestration.events}
        isRunning={orchestration.isRunning}
        onClose={() => orchestration.cancel()}
      />

      <LogPanel
        serviceKey={selectedServiceKey}
        onClose={() => setSelectedServiceKey(null)}
      />
    </div>
  )
}
