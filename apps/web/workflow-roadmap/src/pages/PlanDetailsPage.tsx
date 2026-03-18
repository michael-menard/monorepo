import { useParams, useSearch, useNavigate, Link } from '@tanstack/react-router'
import {
  AppBadge,
  AppInput,
  AppTabs,
  AppTabsList,
  AppTabsTrigger,
  AppTabsContent,
  CustomButton,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Checkbox,
  Label,
} from '@repo/app-component-library'
import { ArrowLeft, Pencil, Check, LayoutGrid, List, Copy, GanttChart } from 'lucide-react'
import { useState, useEffect, useRef, startTransition, useMemo } from 'react'
import {
  useGetPlanBySlugQuery,
  useGetStoriesByPlanSlugQuery,
  useUpdatePlanMutation,
} from '../store/roadmapApi'
import { useStorySSE } from '../hooks/useStorySSE'
import { StoriesTable } from '../components/StoriesTable'
import { ActivityRings, type StoryStats } from '../components/plan-details/ActivityRings'
import { EditableField } from '../components/plan-details/EditableField'
import { TimelineView } from '../components/plan-details/TimelineView'
import { DependencyGraph } from '../components/plan-details/DependencyGraph'
import { KanbanView } from '../components/plan-details/KanbanView'

export function PlanDetailsPage() {
  const { slug } = useParams({ from: '/plan/$slug' })
  const { data, error, isLoading } = useGetPlanBySlugQuery(slug)
  const [updatePlan] = useUpdatePlanMutation()
  const { data: storiesData, isLoading: isLoadingStories } = useGetStoriesByPlanSlugQuery(slug, {
    pollingInterval: 30_000,
  })
  useStorySSE()

  const storyStats = useMemo((): StoryStats | null => {
    if (!storiesData || storiesData.length === 0) return null
    const total = storiesData.length
    const completed = storiesData.filter(s => s.state === 'completed').length
    const active = storiesData.filter(s => s.state === 'in_progress' || s.state === 'in_qa').length
    const backlog = total - completed - active
    return { total, completed, active, backlog }
  }, [storiesData])

  const lastWorkedAt = useMemo(() => {
    if (!storiesData || storiesData.length === 0) return null
    const max = Math.max(
      ...storiesData.map(s => (s.updatedAt ? new Date(s.updatedAt).getTime() : 0)),
    )
    if (max === 0) return null
    const ms = Date.now() - max
    const days = Math.floor(ms / 86400000)
    if (days === 0) return 'today'
    if (days === 1) return '1d ago'
    if (days < 7) return `${days}d ago`
    if (days < 30) return `${Math.floor(days / 7)}w ago`
    return `${Math.floor(days / 30)}mo ago`
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
      <Link
        to="/"
        className="inline-flex items-center text-sm text-slate-400 hover:text-cyan-400 mb-6 transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Roadmap
      </Link>

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
              {isTitleDebouncing && (
                <span className="text-xs text-slate-400 font-mono">saving...</span>
              )}
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
          {slugCopied && <span className="text-xs text-emerald-400 font-mono">copied!</span>}
        </div>
      </div>

      <div className="grid gap-6">
        <div className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-6">
          <h2 className="text-base font-semibold mb-4 text-slate-300 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 inline-block" />
            Overview
          </h2>
          <div className="grid grid-cols-[auto_1fr_auto] gap-x-12">
            {/* Column 1: Type, Story Prefix, Priority, Created, Last Worked */}
            <div className="flex flex-col gap-4">
              <EditableField
                label="Type"
                value={data.planType}
                isEditing={editingField === 'planType'}
                onStartEdit={() => setEditingField('planType')}
                onSave={value => handleUpdate('planType', value)}
                onCancel={() => setEditingField(null)}
                editable
              />
              <EditableField
                label="Story Prefix"
                value={data.storyPrefix}
                isEditing={editingField === 'storyPrefix'}
                onStartEdit={() => setEditingField('storyPrefix')}
                onSave={value => handleUpdate('storyPrefix', value)}
                onCancel={() => setEditingField(null)}
                editable
              />
              <EditableField
                label="Priority"
                value={data.priority}
                isEditing={editingField === 'priority'}
                onStartEdit={() => setEditingField('priority')}
                onSave={value => handleUpdate('priority', value)}
                onCancel={() => setEditingField(null)}
                editable
                options={['P1', 'P2', 'P3', 'P4', 'P5']}
              />
              <div>
                <dt className="text-sm font-medium text-slate-400">Created</dt>
                <dd className="text-slate-200">{new Date(data.createdAt).toLocaleDateString()}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-400">Last Worked</dt>
                <dd className="font-mono text-sm text-slate-400">{lastWorkedAt ?? '—'}</dd>
              </div>
            </div>

            {/* Column 2: Summary, Tags */}
            <div className="flex flex-col gap-4">
              <EditableField
                label="Summary"
                value={data.summary}
                isEditing={editingField === 'summary'}
                onStartEdit={() => setEditingField('summary')}
                onSave={value => handleUpdate('summary', value)}
                onCancel={() => setEditingField(null)}
                editable
                multiline
              />
              <div className="flex flex-wrap gap-2">
                <AppBadge variant="outline">{data.status}</AppBadge>
                {data.priority && (
                  <AppBadge variant={data.priority === 'P1' ? 'destructive' : 'secondary'}>
                    {data.priority}
                  </AppBadge>
                )}
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-400 mb-2">Tags</dt>
                <dd className="flex flex-wrap gap-2">
                  {data.tags && data.tags.length > 0 ? (
                    data.tags.map(tag => (
                      <AppBadge key={tag} variant="secondary">
                        {tag}
                      </AppBadge>
                    ))
                  ) : (
                    <span className="text-slate-500">-</span>
                  )}
                  <CustomButton
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingField('tags')}
                    className="h-6 w-6 text-slate-500 hover:text-cyan-400"
                    title="Edit tags"
                  >
                    <Pencil className="h-3 w-3" />
                  </CustomButton>
                </dd>
              </div>
            </div>

            {/* Column 3: Activity rings */}
            <div className="flex items-center justify-center pl-12">
              {storyStats ? (
                <ActivityRings stats={storyStats} />
              ) : (
                <span className="text-xs text-slate-500 font-mono self-center">No stories</span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-6">
          <AppTabs value={activeTab} onValueChange={v => setActiveTab(v as typeof activeTab)}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-300 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 inline-block" />
                Stories
                {storiesData && storiesData.length > 0 && (
                  <span className="text-xs text-slate-500 font-mono font-normal">
                    ({filteredStories.length}/{storiesData.length})
                  </span>
                )}
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
            {!isLoadingStories && storiesData && storiesData.length > 0 && (
              <div className="mb-4 flex flex-col gap-3">
                <Input
                  placeholder="Search by ID or title..."
                  value={storySearch}
                  onChange={e => setStorySearch(e.target.value)}
                  className="bg-slate-800/50 border-slate-600/50 text-slate-100 placeholder:text-slate-500 focus-visible:ring-cyan-500/50"
                />
                <div className="flex items-center gap-3">
                  <Select
                    value={storyStateFilter || '_all'}
                    onValueChange={v => setStoryStateFilter(v === '_all' ? '' : v)}
                  >
                    <SelectTrigger
                      aria-label="Filter by state"
                      className="bg-slate-800/40 border-slate-600/50 text-slate-100 focus:ring-cyan-500/50"
                    >
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600 text-slate-100">
                      <SelectItem value="_all" className="focus:bg-slate-700 focus:text-slate-100">
                        All States
                      </SelectItem>
                      <SelectItem
                        value="backlog"
                        className="focus:bg-slate-700 focus:text-slate-100"
                      >
                        Backlog
                      </SelectItem>
                      <SelectItem
                        value="ready_to_work"
                        className="focus:bg-slate-700 focus:text-slate-100"
                      >
                        Ready to Work
                      </SelectItem>
                      <SelectItem
                        value="in_progress"
                        className="focus:bg-slate-700 focus:text-slate-100"
                      >
                        In Progress
                      </SelectItem>
                      <SelectItem
                        value="needs_code_review"
                        className="focus:bg-slate-700 focus:text-slate-100"
                      >
                        Needs Code Review
                      </SelectItem>
                      <SelectItem
                        value="ready_for_review"
                        className="focus:bg-slate-700 focus:text-slate-100"
                      >
                        Ready for Review
                      </SelectItem>
                      <SelectItem
                        value="failed_code_review"
                        className="focus:bg-slate-700 focus:text-slate-100"
                      >
                        Failed Code Review
                      </SelectItem>
                      <SelectItem
                        value="ready_for_qa"
                        className="focus:bg-slate-700 focus:text-slate-100"
                      >
                        Ready for QA
                      </SelectItem>
                      <SelectItem value="in_qa" className="focus:bg-slate-700 focus:text-slate-100">
                        In QA
                      </SelectItem>
                      <SelectItem value="uat" className="focus:bg-slate-700 focus:text-slate-100">
                        UAT
                      </SelectItem>
                      <SelectItem
                        value="completed"
                        className="focus:bg-slate-700 focus:text-slate-100"
                      >
                        Completed
                      </SelectItem>
                      <SelectItem
                        value="blocked"
                        className="focus:bg-slate-700 focus:text-slate-100"
                      >
                        Blocked
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={storyPriorityFilter || '_all'}
                    onValueChange={v => setStoryPriorityFilter(v === '_all' ? '' : v)}
                  >
                    <SelectTrigger
                      aria-label="Filter by priority"
                      className="bg-slate-800/40 border-slate-600/50 text-slate-100 focus:ring-cyan-500/50"
                    >
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600 text-slate-100">
                      <SelectItem value="_all" className="focus:bg-slate-700 focus:text-slate-100">
                        All Priorities
                      </SelectItem>
                      <SelectItem value="P0" className="focus:bg-slate-700 focus:text-slate-100">
                        P0
                      </SelectItem>
                      <SelectItem value="P1" className="focus:bg-slate-700 focus:text-slate-100">
                        P1
                      </SelectItem>
                      <SelectItem value="P2" className="focus:bg-slate-700 focus:text-slate-100">
                        P2
                      </SelectItem>
                      <SelectItem value="P3" className="focus:bg-slate-700 focus:text-slate-100">
                        P3
                      </SelectItem>
                      <SelectItem value="P4" className="focus:bg-slate-700 focus:text-slate-100">
                        P4
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2 ml-auto">
                    <Checkbox
                      id="hide-completed"
                      checked={hideCompleted}
                      onCheckedChange={checked => setHideCompleted(checked === true)}
                    />
                    <Label
                      htmlFor="hide-completed"
                      className="text-sm text-slate-400 cursor-pointer select-none"
                    >
                      Hide completed
                    </Label>
                  </div>
                </div>
              </div>
            )}
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

        {data.details ? (
          <>
            {data.details.phases ? (
              <div className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-6">
                <h2 className="text-base font-semibold mb-4 text-slate-300 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 inline-block" />
                  Phases
                </h2>
                <pre className="bg-black/40 border border-slate-700/50 p-4 rounded-lg overflow-x-auto text-sm font-mono text-slate-300">
                  {JSON.stringify(data.details.phases, null, 2)}
                </pre>
              </div>
            ) : null}

            {data.details.sections ? (
              <div className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-6">
                <h2 className="text-base font-semibold mb-4 text-slate-300 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 inline-block" />
                  Sections
                </h2>
                <pre className="bg-black/40 border border-slate-700/50 p-4 rounded-lg overflow-x-auto text-sm font-mono text-slate-300">
                  {JSON.stringify(data.details.sections, null, 2)}
                </pre>
              </div>
            ) : null}

            {data.details.rawContent ? (
              <div className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-6">
                <h2 className="text-base font-semibold mb-4 text-slate-300 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 inline-block" />
                  Full Content
                </h2>
                <pre className="bg-black/40 border border-slate-700/50 p-4 rounded-lg overflow-x-auto text-sm font-mono text-slate-300 whitespace-pre-wrap">
                  {data.details.rawContent}
                </pre>
              </div>
            ) : null}

            <div className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-6">
              <h2 className="text-base font-semibold mb-4 text-slate-300 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-500 inline-block" />
                Metadata
              </h2>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-slate-400">Format Version</dt>
                  <dd className="font-mono text-sm text-slate-200">
                    {data.details.formatVersion || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-400">Content Hash</dt>
                  <dd className="font-mono text-sm text-slate-200">
                    {data.details.contentHash || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-400">Source File</dt>
                  <dd className="font-mono text-sm text-slate-200">
                    {data.details.sourceFile || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-400">Imported At</dt>
                  <dd className="text-slate-200">
                    {data.details.importedAt
                      ? new Date(data.details.importedAt).toLocaleString()
                      : '-'}
                  </dd>
                </div>
                <div className="md:col-span-2">
                  <dt className="text-sm font-medium text-slate-400">Last Updated</dt>
                  <dd className="text-slate-200">
                    {new Date(data.details.updatedAt).toLocaleString()}
                  </dd>
                </div>
              </dl>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
