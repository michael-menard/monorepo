import { useParams, Link } from '@tanstack/react-router'
import { AppBadge, AppDataTable, AppInput, CustomButton } from '@repo/app-component-library'
import { ArrowLeft, Pencil, Check, X } from 'lucide-react'
import { useState, useEffect, useRef, startTransition } from 'react'
import {
  useGetPlanBySlugQuery,
  useGetStoriesByPlanSlugQuery,
  useUpdatePlanMutation,
  type PlanStory,
} from '../store/roadmapApi'

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
          <AppBadge variant="outline">{data.status}</AppBadge>
          {data.priority ? (
            <AppBadge variant={data.priority === 'P1' ? 'destructive' : 'secondary'}>
              {data.priority}
            </AppBadge>
          ) : null}
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
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              label="Priority"
              value={data.priority}
              isEditing={editingField === 'priority'}
              onStartEdit={() => setEditingField('priority')}
              onSave={value => handleUpdate('priority', value)}
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
            <div>
              <dt className="text-sm font-medium text-slate-400">Created</dt>
              <dd className="text-slate-200">{new Date(data.createdAt).toLocaleDateString()}</dd>
            </div>
            <div className="md:col-span-2">
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
          </dl>
        </div>

        <div className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-6">
          <h2 className="text-base font-semibold mb-4 text-slate-300 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 inline-block" />
            Stories
          </h2>
          {isLoadingStories ? (
            <div className="animate-pulse space-y-2">
              <div className="h-8 bg-slate-800 rounded"></div>
              <div className="h-8 bg-slate-800 rounded"></div>
              <div className="h-8 bg-slate-800 rounded"></div>
            </div>
          ) : storiesData && storiesData.length > 0 ? (
            <AppDataTable
              data={storiesData}
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
                      {row.title ?? '-'}
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
                  key: 'currentPhase',
                  header: 'Phase',
                  render: (row: PlanStory) =>
                    row.currentPhase ? (
                      <AppBadge variant="outline">{row.currentPhase}</AppBadge>
                    ) : (
                      '-'
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
              ]}
              emptyMessage="No stories linked to this plan yet."
            />
          ) : (
            <p className="text-slate-500">No stories linked to this plan yet.</p>
          )}
        </div>

        {data.summary ? (
          <div className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-6">
            <h2 className="text-base font-semibold mb-4 text-slate-300 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-500 inline-block" />
              Summary
            </h2>
            <p className="text-slate-300 leading-relaxed">{data.summary}</p>
          </div>
        ) : null}

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
