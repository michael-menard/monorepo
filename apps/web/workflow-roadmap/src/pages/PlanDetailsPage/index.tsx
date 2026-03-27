import { useParams, useSearch, useNavigate, Link } from '@tanstack/react-router'
import {
  AppInput,
  AppTabs,
  AppTabsList,
  AppTabsTrigger,
  AppTabsContent,
  CustomButton,
} from '@repo/app-component-library'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Check,
  LayoutGrid,
  List,
  Copy,
  GanttChart,
  ArrowRightLeft,
  Trash2,
} from 'lucide-react'
import { useState, useEffect, useRef, startTransition, useMemo } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../../store'
import {
  useGetPlanBySlugQuery,
  useGetStoriesByPlanSlugQuery,
  useGetPlansQuery,
  useUpdatePlanMutation,
  useLazyGetPlanImpactQuery,
  useRetirePlanMutation,
  type Plan,
} from '../../store/roadmapApi'
import { useStorySSE } from '../../hooks/useStorySSE'
import { relativeTime } from '../../utils/formatters'
import { StoriesTable } from '../../components/StoriesTable'
import type { StoryStats } from '../../components/plan-details/ActivityRings'
import { PlanOverviewCard } from '../../components/plan-details/PlanOverviewCard'
import { StoryFilters } from '../../components/plan-details/StoryFilters'
import { PlanMetadataSection } from '../../components/plan-details/PlanMetadataSection'
import { TimelineView } from '../../components/plan-details/TimelineView'
import { DependencyGraph } from '../../components/plan-details/DependencyGraph'
import { KanbanView } from '../../components/plan-details/KanbanView'
import { PlanRetireDialog } from '../../components/plan-details/PlanRetireDialog'

export function PlanDetailsPage() {
  const { slug } = useParams({ from: '/plan/$slug' })
  const { data, error, isLoading } = useGetPlanBySlugQuery(slug)
  const [updatePlan] = useUpdatePlanMutation()
  const { data: storiesData, isLoading: isLoadingStories } = useGetStoriesByPlanSlugQuery(slug, {
    pollingInterval: 30_000,
  })
  useStorySSE()

  // --- Filter-aware prev/next navigation ---
  const { status, priority, type, tag, excludeCompleted, search, sortKey, sortDirection } =
    useSelector((state: RootState) => state.roadmapFilters)

  const navQueryParams = useMemo(
    () => ({
      page: 1,
      limit: 500,
      status: status ? [status] : undefined,
      priority: priority ? [priority] : undefined,
      planType: type ? [type] : undefined,
      tags: tag ? [tag] : undefined,
      excludeCompleted,
      search: search.trim() || undefined,
    }),
    [status, priority, type, tag, excludeCompleted, search],
  )

  const { data: navPlansData } = useGetPlansQuery(navQueryParams)

  const sortedNavPlans = useMemo((): Plan[] => {
    if (!navPlansData?.data) return []
    const plans = [...navPlansData.data]
    const key = sortKey as keyof Plan
    plans.sort((a, b) => {
      const av = a[key]
      const bv = b[key]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      let cmp: number
      if (typeof av === 'number' && typeof bv === 'number') {
        cmp = av - bv
      } else {
        cmp = String(av).localeCompare(String(bv))
      }
      return sortDirection === 'desc' ? -cmp : cmp
    })
    return plans
  }, [navPlansData, sortKey, sortDirection])

  const currentNavIndex = useMemo(
    () => sortedNavPlans.findIndex(p => p.planSlug === slug),
    [sortedNavPlans, slug],
  )

  const prevSlug = currentNavIndex > 0 ? sortedNavPlans[currentNavIndex - 1]?.planSlug : null
  const nextSlug =
    currentNavIndex >= 0 && currentNavIndex < sortedNavPlans.length - 1
      ? sortedNavPlans[currentNavIndex + 1]?.planSlug
      : null

  const storyStats = useMemo((): StoryStats | null => {
    if (!storiesData || storiesData.length === 0) return null
    const total = storiesData.length
    const countState = (...states: string[]) =>
      storiesData.filter(s => s.state && states.includes(s.state)).length
    return {
      total,
      completed: countState('uat', 'completed'),
      reviewed: countState(
        'needs_code_review',
        'ready_for_review',
        'ready_for_qa',
        'in_qa',
        'in_review',
      ),
      ready: countState('ready', 'in_progress'),
    }
  }, [storiesData])

  const lastWorkedAt = useMemo(() => {
    if (!storiesData || storiesData.length === 0) return null
    const max = Math.max(
      ...storiesData.map(s => (s.updatedAt ? new Date(s.updatedAt).getTime() : 0)),
    )
    if (max === 0) return null
    return relativeTime(new Date(max).toISOString())
  }, [storiesData])

  const [storySearch, setStorySearch] = useState('')
  const [storyStateFilter, setStoryStateFilter] = useState('')
  const [storyPriorityFilter, setStoryPriorityFilter] = useState('')
  const [hideCompleted, setHideCompleted] = useState(true)

  const filteredStories = useMemo(() => {
    if (!storiesData) return []
    return storiesData.filter(s => {
      if (hideCompleted && s.state === 'completed') return false
      if (storyStateFilter && s.state !== storyStateFilter) return false
      if (storyPriorityFilter && s.priority !== storyPriorityFilter) return false
      if (storySearch) {
        const q = storySearch.toLowerCase()
        if (!s.storyId.toLowerCase().includes(q) && !(s.title ?? '').toLowerCase().includes(q))
          return false
      }
      return true
    })
  }, [storiesData, storySearch, storyStateFilter, storyPriorityFilter, hideCompleted])

  const { tab: urlTab } = useSearch({ from: '/plan/$slug' })
  const navigate = useNavigate({ from: '/plan/$slug' })
  type Tab = 'table' | 'kanban' | 'timeline' | 'deps'
  const activeTab: Tab = urlTab ?? 'deps'
  const setActiveTab = (t: Tab) =>
    navigate({
      search: t === 'deps' ? {} : { tab: t },
      replace: true,
    })
  const [slugCopied, setSlugCopied] = useState(false)
  const [retireAction, setRetireAction] = useState<'delete' | 'supersede' | null>(null)
  const [isRetiring, setIsRetiring] = useState(false)
  const [triggerImpact, { data: impactData, isFetching: isLoadingImpact }] =
    useLazyGetPlanImpactQuery()
  const [retirePlan] = useRetirePlanMutation()

  const openRetireDialog = (action: 'delete' | 'supersede') => {
    setRetireAction(action)
    triggerImpact(slug)
  }

  const handleRetireConfirm = async () => {
    if (!retireAction) return
    setIsRetiring(true)
    try {
      await retirePlan({ slug, action: retireAction }).unwrap()
      setRetireAction(null)
      navigate({ to: '/' })
    } catch (_err) {
      // keep dialog open on error
    } finally {
      setIsRetiring(false)
    }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const go = (t: Tab) => navigate({ search: t === 'deps' ? {} : { tab: t }, replace: true })
      if (e.key === 't' || e.key === 'T') go('table')
      if (e.key === 'k' || e.key === 'K') go('kanban')
      if (e.key === 'g' || e.key === 'G') go('timeline')
      if (e.key === 'd' || e.key === 'D') go('deps')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate])

  const handleCopySlug = () => {
    if (!data) return
    navigator.clipboard.writeText(data.planSlug)
    setSlugCopied(true)
    setTimeout(() => setSlugCopied(false), 2000)
  }

  const [editingField, setEditingField] = useState<string | null>(null)
  const [titleValue, setTitleValue] = useState('')
  const [isTitleDebouncing, setIsTitleDebouncing] = useState(false)
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (data?.title) {
      setTitleValue(data.title)
    }
  }, [data?.title])

  const handleUpdate = async (field: string, value: string | number) => {
    try {
      await updatePlan({
        slug,
        input: { [field]: value },
      }).unwrap()
      setEditingField(null)
    } catch (err) {
      console.error('Failed to update plan:', err)
    }
  }

  const handleTitleChange = (newValue: string) => {
    setTitleValue(newValue)

    if (titleDebounceRef.current) {
      clearTimeout(titleDebounceRef.current)
    }

    setIsTitleDebouncing(true)
    titleDebounceRef.current = setTimeout(() => {
      startTransition(() => {
        handleUpdate('title', newValue)
        setIsTitleDebouncing(false)
      })
    }, 500)
  }

  const errorMessage = error ? ('error' in error ? error.error : 'Failed to fetch plan') : null

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-800 rounded w-32"></div>
          <div className="h-8 bg-slate-800 rounded w-1/3"></div>
          <div className="h-4 bg-slate-800 rounded w-1/4"></div>
          <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6 space-y-3">
            <div className="h-4 bg-slate-800 rounded"></div>
            <div className="h-4 bg-slate-800 rounded"></div>
            <div className="h-4 bg-slate-800 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-slate-400 hover:text-cyan-400 mb-6 transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Roadmap
        </Link>
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg font-mono text-sm">
          ERROR: {errorMessage}
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Roadmap
        </Link>
        {currentNavIndex >= 0 && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-600 font-mono mr-1">
              {currentNavIndex + 1} / {sortedNavPlans.length}
            </span>
            <CustomButton
              variant="ghost"
              size="sm"
              disabled={!prevSlug}
              onClick={() => {
                if (prevSlug) navigate({ to: '/plan/$slug', params: { slug: prevSlug } })
              }}
              className="h-7 px-2 text-slate-400 hover:text-cyan-400 disabled:opacity-30"
              title="Previous plan"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs">Prev</span>
            </CustomButton>
            <CustomButton
              variant="ghost"
              size="sm"
              disabled={!nextSlug}
              onClick={() => {
                if (nextSlug) navigate({ to: '/plan/$slug', params: { slug: nextSlug } })
              }}
              className="h-7 px-2 text-slate-400 hover:text-cyan-400 disabled:opacity-30"
              title="Next plan"
            >
              <span className="text-xs">Next</span>
              <ChevronRight className="h-4 w-4" />
            </CustomButton>
          </div>
        )}
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          {editingField === 'title' ? (
            <div className="flex items-center gap-2 flex-1">
              <AppInput
                type="text"
                value={titleValue}
                onChange={e => handleTitleChange(e.target.value)}
                className="text-3xl font-bold h-auto py-1 bg-slate-800/50 border-slate-600/50 text-slate-100"
                autoFocus
                onBlur={() => {
                  if (titleDebounceRef.current) {
                    clearTimeout(titleDebounceRef.current)
                  }
                  setIsTitleDebouncing(false)
                  setEditingField(null)
                }}
              />
              {isTitleDebouncing ? (
                <span className="text-xs text-slate-400 font-mono">saving...</span>
              ) : null}
              <CustomButton
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (titleDebounceRef.current) {
                    clearTimeout(titleDebounceRef.current)
                  }
                  setIsTitleDebouncing(false)
                  setEditingField(null)
                }}
                className="h-8 w-8 text-green-400 hover:text-green-300"
                title="Done"
              >
                <Check className="h-4 w-4" />
              </CustomButton>
            </div>
          ) : (
            <h1 className="text-3xl font-bold tracking-wide bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent flex-1">
              {data.title}
            </h1>
          )}
          {editingField !== 'title' && (
            <CustomButton
              variant="ghost"
              size="icon"
              onClick={() => setEditingField('title')}
              className="h-6 w-6 text-slate-500 hover:text-cyan-400"
              title="Edit title"
            >
              <Pencil className="h-3 w-3" />
            </CustomButton>
          )}
        </div>
        <div className="flex items-center gap-2 group/slug">
          <p className="text-cyan-500/70 font-mono text-sm">{data.planSlug}</p>
          <CustomButton
            variant="ghost"
            size="icon"
            onClick={handleCopySlug}
            className="h-6 w-6 opacity-0 group-hover/slug:opacity-100 text-slate-500 hover:text-cyan-400 transition-all"
            title="Copy slug"
          >
            {slugCopied ? (
              <Check className="h-3 w-3 text-emerald-400" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </CustomButton>
          {slugCopied ? <span className="text-xs text-emerald-400 font-mono">copied!</span> : null}
        </div>
        {data.status !== 'superseded' && (
          <div className="flex items-center gap-2 mt-3">
            <CustomButton
              variant="outline"
              size="sm"
              onClick={() => openRetireDialog('supersede')}
              className="bg-amber-500/10 text-amber-400 border-0 hover:bg-amber-500/20 hover:text-amber-300"
            >
              <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" />
              Supersede
            </CustomButton>
            <CustomButton
              variant="outline"
              size="sm"
              onClick={() => openRetireDialog('delete')}
              className="bg-red-500/10 text-red-400 border-0 hover:bg-red-500/20 hover:text-red-300"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete
            </CustomButton>
          </div>
        )}
        <PlanRetireDialog
          open={retireAction !== null}
          onOpenChange={open => {
            if (!open) setRetireAction(null)
          }}
          action={retireAction ?? 'delete'}
          planTitle={data.title}
          impact={impactData}
          isLoadingImpact={isLoadingImpact}
          isRetiring={isRetiring}
          onConfirm={handleRetireConfirm}
        />
      </div>

      <div className="grid gap-6">
        <PlanOverviewCard
          data={data}
          storyStats={storyStats}
          lastWorkedAt={lastWorkedAt}
          editingField={editingField}
          setEditingField={setEditingField}
          handleUpdate={handleUpdate}
        />

        <div className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-6">
          <AppTabs value={activeTab} onValueChange={v => setActiveTab(v as typeof activeTab)}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-300 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 inline-block" />
                Stories
                {storiesData && storiesData.length > 0 ? (
                  <span className="text-xs text-slate-500 font-mono font-normal">
                    ({filteredStories.length}/{storiesData.length})
                  </span>
                ) : null}
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-600 font-mono hidden xl:block 2xl:block">
                  T · D<span className="hidden xl:inline"> · K · G</span>
                </span>
                <AppTabsList variant="pills" className="bg-slate-800/60">
                  <AppTabsTrigger
                    value="table"
                    variant="pills"
                    className="flex items-center gap-1.5 text-xs data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100 text-slate-400"
                  >
                    <List className="h-3.5 w-3.5" />
                    Table
                  </AppTabsTrigger>
                  <AppTabsTrigger
                    value="kanban"
                    variant="pills"
                    className="hidden xl:flex items-center gap-1.5 text-xs data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100 text-slate-400"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    Kanban
                  </AppTabsTrigger>
                  <AppTabsTrigger
                    value="timeline"
                    variant="pills"
                    className="hidden xl:flex items-center gap-1.5 text-xs data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100 text-slate-400"
                  >
                    <GanttChart className="h-3.5 w-3.5" />
                    Timeline
                  </AppTabsTrigger>
                  <AppTabsTrigger
                    value="deps"
                    variant="pills"
                    className="flex items-center gap-1.5 text-xs data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100 text-slate-400"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <circle cx="3" cy="8" r="2" />
                      <circle cx="13" cy="3" r="2" />
                      <circle cx="13" cy="13" r="2" />
                      <path d="M5 8h3l2-3.5M5 8l5 3.5" />
                    </svg>
                    Deps
                  </AppTabsTrigger>
                </AppTabsList>
              </div>
            </div>
            {!isLoadingStories && storiesData && storiesData.length > 0 ? (
              <StoryFilters
                storySearch={storySearch}
                setStorySearch={setStorySearch}
                storyStateFilter={storyStateFilter}
                setStoryStateFilter={setStoryStateFilter}
                storyPriorityFilter={storyPriorityFilter}
                setStoryPriorityFilter={setStoryPriorityFilter}
                hideCompleted={hideCompleted}
                setHideCompleted={setHideCompleted}
              />
            ) : null}
            <AppTabsContent value="table">
              {isLoadingStories ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-8 bg-slate-800 rounded"></div>
                  <div className="h-8 bg-slate-800 rounded"></div>
                  <div className="h-8 bg-slate-800 rounded"></div>
                </div>
              ) : filteredStories.length > 0 ? (
                <StoriesTable data={filteredStories} planSlug={slug} planTitle={data.title} />
              ) : (
                <p className="text-slate-500">
                  {storiesData && storiesData.length > 0
                    ? 'No stories match the current filters.'
                    : 'No stories linked to this plan yet.'}
                </p>
              )}
            </AppTabsContent>
            <AppTabsContent value="kanban">
              {isLoadingStories ? (
                <div className="animate-pulse grid grid-cols-5 gap-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-4 bg-slate-800 rounded w-24"></div>
                      <div className="h-24 bg-slate-800 rounded"></div>
                      <div className="h-24 bg-slate-800 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <KanbanView stories={filteredStories} />
              )}
            </AppTabsContent>
            <AppTabsContent value="timeline">
              {isLoadingStories ? (
                <div className="animate-pulse space-y-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex gap-4 items-center">
                      <div className="h-8 bg-slate-800 rounded w-48 shrink-0"></div>
                      <div className="h-px bg-slate-800 flex-1"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <TimelineView stories={filteredStories} />
              )}
            </AppTabsContent>
            <AppTabsContent value="deps">
              {isLoadingStories ? (
                <div className="animate-pulse space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex gap-8 items-center">
                      <div className="h-14 bg-slate-800 rounded-lg w-44"></div>
                      <div className="h-px bg-slate-800 w-16"></div>
                      <div className="h-14 bg-slate-800 rounded-lg w-44"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <DependencyGraph stories={filteredStories} />
              )}
            </AppTabsContent>
          </AppTabs>
        </div>

        {data.details ? <PlanMetadataSection details={data.details} /> : null}
      </div>
    </div>
  )
}
