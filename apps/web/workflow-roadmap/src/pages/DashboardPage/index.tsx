import { useGetDashboardQuery } from '../../store/roadmapApi'
import { FlowHealthStrip } from '../../components/dashboard/FlowHealthStrip'
import { UnblockedWorkQueue } from '../../components/dashboard/UnblockedWorkQueue'
import { PlanProgressGrid } from '../../components/dashboard/PlanProgressGrid'
import { StoryAgingList } from '../../components/dashboard/StoryAgingList'
import { ImpactRanking } from '../../components/dashboard/ImpactRanking'

export function DashboardPage() {
  const { data, isLoading, error } = useGetDashboardQuery()

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="animate-pulse text-slate-400">Loading dashboard...</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="text-red-400">Failed to load dashboard</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">Cross-plan project health and next actions</p>
      </div>

      <FlowHealthStrip flowHealth={data.flowHealth} />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-8">
        <div className="space-y-8">
          <UnblockedWorkQueue queue={data.unblockedQueue} />
          <PlanProgressGrid plans={data.planProgress} />
          <StoryAgingList stories={data.agingStories} />
        </div>

        <aside className="space-y-8">
          <ImpactRanking stories={data.impactRanking} />
        </aside>
      </div>
    </div>
  )
}
