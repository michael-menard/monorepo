import { motion } from 'framer-motion'
import { useParams, Link } from '@tanstack/react-router'
import {
  AppBadge,
  AppDataTable,
  AppInput,
  CustomButton,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Checkbox,
  Label,
} from '@repo/app-component-library'
import { ArrowLeft, Pencil, Check, X } from 'lucide-react'
import { useState, useEffect, useRef, startTransition, useMemo } from 'react'
import {
  useGetPlanBySlugQuery,
  useGetStoriesByPlanSlugQuery,
  useUpdatePlanMutation,
  type PlanStory,
} from '../store/roadmapApi'

interface StoryStats {
  total: number
  completed: number
  active: number
  backlog: number
}

function ActivityRings({ stats }: { stats: StoryStats }) {
  const { total, completed, active, backlog } = stats
  const completedPct = total > 0 ? completed / total : 0
  const activePct = total > 0 ? active / total : 0
  const backlogPct = total > 0 ? backlog / total : 0

  const sw = 8
  const gap = 4
  const r1 = 44
  const r2 = r1 - sw - gap
  const r3 = r2 - sw - gap
  const c1 = 2 * Math.PI * r1
  const c2 = 2 * Math.PI * r2
  const c3 = 2 * Math.PI * r3

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="w-1/2 aspect-square cursor-default">
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMin meet"
            className="-rotate-90 drop-shadow-lg"
            aria-hidden="true"
          >
            {/* Track rings */}
            <circle cx="50" cy="50" r={r1} fill="none" stroke="#060f1e" strokeWidth={sw} />
            <circle cx="50" cy="50" r={r2} fill="none" stroke="#060f1e" strokeWidth={sw} />
            <circle cx="50" cy="50" r={r3} fill="none" stroke="#060f1e" strokeWidth={sw} />
            {/* Completed — emerald outer */}
            <motion.circle
              cx="50"
              cy="50"
              r={r1}
              fill="none"
              stroke="#10b981"
              strokeWidth={sw}
              strokeDasharray={c1}
              strokeLinecap="round"
              initial={{ strokeDashoffset: c1 }}
              animate={{ strokeDashoffset: c1 * (1 - completedPct) }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0 }}
            />
            {/* Active — blue middle */}
            <motion.circle
              cx="50"
              cy="50"
              r={r2}
              fill="none"
              stroke="#60a5fa"
              strokeWidth={sw}
              strokeDasharray={c2}
              strokeLinecap="round"
              initial={{ strokeDashoffset: c2 }}
              animate={{ strokeDashoffset: c2 * (1 - activePct) }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.15 }}
            />
            {/* Created/backlog — cyan inner */}
            <motion.circle
              cx="50"
              cy="50"
              r={r3}
              fill="none"
              stroke="#22d3ee"
              strokeWidth={sw}
              strokeDasharray={c3}
              strokeLinecap="round"
              initial={{ strokeDashoffset: c3 }}
              animate={{ strokeDashoffset: c3 * (1 - backlogPct) }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
            />
          </svg>
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="left"
        className="bg-slate-800 border border-slate-600 text-slate-100 p-3 font-mono text-xs space-y-2"
      >
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
          <span className="text-slate-400">Completed</span>
          <span className="text-emerald-400 ml-4">
            {completed}/{total}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-blue-400 inline-block" />
          <span className="text-slate-400">Active</span>
          <span className="text-blue-400 ml-4">
            {active}/{total}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400 inline-block" />
          <span className="text-slate-400">Created</span>
          <span className="text-cyan-400 ml-4">
            {backlog}/{total}
          </span>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

interface EditableFieldProps {
  label: string
  value: string | number | null | undefined
  isEditing: boolean
  onStartEdit: () => void
  onSave: (value: string | number) => void
  onCancel: () => void
  type?: 'text' | 'number'
  editable: boolean
}

function EditableField({
  label,
  value,
  isEditing,
  onStartEdit,
  onSave,
  onCancel,
  type = 'text',
  editable,
}: EditableFieldProps) {
  const [editValue, setEditValue] = useState(String(value ?? ''))
  const [isDebouncing, setIsDebouncing] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isEditing) {
      setEditValue(String(value ?? ''))
      setIsDebouncing(false)
    }
  }, [isEditing, value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setEditValue(newValue)

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    setIsDebouncing(true)
    debounceRef.current = setTimeout(() => {
      startTransition(() => {
        if (type === 'number') {
          onSave(parseInt(newValue, 10) || 0)
        } else {
          onSave(newValue)
        }
        setIsDebouncing(false)
      })
    }, 500)
  }

  const handleSave = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    if (type === 'number') {
      onSave(parseInt(editValue, 10) || 0)
    } else {
      onSave(editValue)
    }
    setIsDebouncing(false)
  }

  if (!editable) {
    return (
      <div>
        <dt className="text-sm font-medium text-slate-400">{label}</dt>
        <dd className="text-slate-200">{value ?? '-'}</dd>
      </div>
    )
  }

  if (isEditing) {
    return (
      <div>
        <dt className="text-sm font-medium text-slate-400">{label}</dt>
        <dd className="flex items-center gap-2">
          <AppInput
            type={type}
            value={editValue}
            onChange={handleChange}
            className="h-8 text-sm bg-slate-800/50 border-slate-600/50 text-slate-100"
          />
          {isDebouncing && <span className="text-xs text-slate-400 font-mono">saving...</span>}
          <CustomButton
            variant="ghost"
            size="icon"
            onClick={handleSave}
            className="h-8 w-8 text-green-400 hover:text-green-300"
            title="Save"
          >
            <Check className="h-4 w-4" />
          </CustomButton>
          <CustomButton
            variant="ghost"
            size="icon"
            onClick={() => {
              if (debounceRef.current) {
                clearTimeout(debounceRef.current)
              }
              setIsDebouncing(false)
              onCancel()
            }}
            className="h-8 w-8 text-red-400 hover:text-red-300"
            title="Cancel"
          >
            <X className="h-4 w-4" />
          </CustomButton>
        </dd>
      </div>
    )
  }

  return (
    <div>
      <dt className="text-sm font-medium text-slate-400">{label}</dt>
      <dd className="flex items-center gap-2 group">
        <span className="text-slate-200">{value ?? '-'}</span>
        <CustomButton
          variant="ghost"
          size="icon"
          onClick={() => {
            setEditValue(String(value ?? ''))
            onStartEdit()
          }}
          className="opacity-0 group-hover:opacity-100 h-6 w-6 text-slate-500 hover:text-cyan-400"
          title="Edit"
        >
          <Pencil className="h-3 w-3" />
        </CustomButton>
      </dd>
    </div>
  )
}

export function PlanDetailsPage() {
  const { slug } = useParams({ from: '/plan/$slug' })
  const { data, error, isLoading } = useGetPlanBySlugQuery(slug)
  const [updatePlan] = useUpdatePlanMutation()
  const { data: storiesData, isLoading: isLoadingStories } = useGetStoriesByPlanSlugQuery(slug)

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
        <p className="text-cyan-500/70 font-mono text-sm">{data.planSlug}</p>
      </div>

      <div className="grid gap-6">
        <div className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-6">
          <h2 className="text-base font-semibold mb-4 text-slate-300 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 inline-block" />
            Overview
          </h2>
          <div className="grid grid-cols-3 gap-x-8">
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
              {data.summary && (
                <div>
                  <dt className="text-sm font-medium text-slate-400 mb-1">Summary</dt>
                  <dd className="text-slate-300 text-sm leading-relaxed">{data.summary}</dd>
                </div>
              )}
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
            <div className="flex justify-end">
              {storyStats ? (
                <ActivityRings stats={storyStats} />
              ) : (
                <span className="text-xs text-slate-500 font-mono self-center">No stories</span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-6">
          <h2 className="text-base font-semibold mb-4 text-slate-300 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 inline-block" />
            Stories
            {storiesData && storiesData.length > 0 && (
              <span className="text-xs text-slate-500 font-mono font-normal">
                ({filteredStories.length}/{storiesData.length})
              </span>
            )}
          </h2>
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
                    <SelectItem value="backlog" className="focus:bg-slate-700 focus:text-slate-100">
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
                    <SelectItem value="blocked" className="focus:bg-slate-700 focus:text-slate-100">
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
          {isLoadingStories ? (
            <div className="animate-pulse space-y-2">
              <div className="h-8 bg-slate-800 rounded"></div>
              <div className="h-8 bg-slate-800 rounded"></div>
              <div className="h-8 bg-slate-800 rounded"></div>
            </div>
          ) : filteredStories.length > 0 ? (
            <AppDataTable
              data={filteredStories}
              columns={[
                {
                  key: 'storyId',
                  header: 'Story ID',
                  render: (row: PlanStory) => (
                    <Link
                      to="/story/$storyId"
                      params={{ storyId: row.storyId }}
                      className="font-mono text-sm text-cyan-400 hover:text-cyan-300 hover:underline"
                    >
                      {row.storyId}
                    </Link>
                  ),
                },
                {
                  key: 'title',
                  header: 'Title',
                  render: (row: PlanStory) => (
                    <Link
                      to="/story/$storyId"
                      params={{ storyId: row.storyId }}
                      className="hover:text-cyan-400 hover:underline transition-colors"
                    >
                      <div>{row.title ?? '-'}</div>
                      {row.description && (
                        <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                          {row.description}
                        </div>
                      )}
                    </Link>
                  ),
                },
                {
                  key: 'state',
                  header: 'State',
                  render: (row: PlanStory) => (
                    <div className="flex items-center gap-2">
                      <AppBadge
                        variant={
                          row.state === 'completed'
                            ? 'default'
                            : row.state === 'blocked' || row.hasBlockers
                              ? 'destructive'
                              : row.state === 'in_progress' || row.state === 'in_qa'
                                ? 'outline'
                                : 'secondary'
                        }
                      >
                        {row.state ?? '-'}
                      </AppBadge>
                      {row.isBlocked || row.hasBlockers ? (
                        <span title="Has blockers" className="text-destructive">
                          ⚠️
                        </span>
                      ) : null}
                    </div>
                  ),
                },
                {
                  key: 'blockedByStory',
                  header: 'Blocked By',
                  render: (row: PlanStory) =>
                    row.blockedByStory ? (
                      <Link
                        to="/story/$storyId"
                        params={{ storyId: row.blockedByStory }}
                        className="font-mono text-sm text-red-400 hover:text-red-300 hover:underline"
                      >
                        {row.blockedByStory}
                      </Link>
                    ) : (
                      <span className="text-slate-600">—</span>
                    ),
                },
                {
                  key: 'priority',
                  header: 'Priority',
                  render: (row: PlanStory) => (
                    <AppBadge
                      variant={
                        row.priority === 'P0'
                          ? 'destructive'
                          : row.priority === 'P1'
                            ? 'outline'
                            : 'secondary'
                      }
                    >
                      {row.priority ?? '-'}
                    </AppBadge>
                  ),
                },
                {
                  key: 'updatedAt',
                  header: 'Last Activity',
                  render: (row: PlanStory) => {
                    if (!row.updatedAt)
                      return <span className="text-xs text-slate-500 font-mono">—</span>
                    const ms = Date.now() - new Date(row.updatedAt).getTime()
                    const days = Math.floor(ms / 86400000)
                    let label: string
                    if (days === 0) label = 'today'
                    else if (days === 1) label = '1d ago'
                    else if (days < 7) label = `${days}d ago`
                    else if (days < 30) label = `${Math.floor(days / 7)}w ago`
                    else label = `${Math.floor(days / 30)}mo ago`
                    return <span className="text-xs text-slate-400 font-mono">{label}</span>
                  },
                },
              ]}
              emptyMessage="No stories match the current filters."
            />
          ) : (
            <p className="text-slate-500">
              {storiesData && storiesData.length > 0
                ? 'No stories match the current filters.'
                : 'No stories linked to this plan yet.'}
            </p>
          )}
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
