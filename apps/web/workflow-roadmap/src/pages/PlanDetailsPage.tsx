import { useParams, Link } from '@tanstack/react-router'
import { Badge, AppDataTable } from '@repo/app-component-library'
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
        <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
        <dd>{value ?? '-'}</dd>
      </div>
    )
  }

  if (isEditing) {
    return (
      <div>
        <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
        <dd className="flex items-center gap-2">
          <input
            type={type}
            value={editValue}
            onChange={handleChange}
            className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
          {isDebouncing && <span className="text-xs text-muted-foreground">Saving...</span>}
          <button
            onClick={handleSave}
            className="p-1 h-8 w-8 text-green-600 hover:bg-green-50 rounded"
            title="Save"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              if (debounceRef.current) {
                clearTimeout(debounceRef.current)
              }
              setIsDebouncing(false)
              onCancel()
            }}
            className="p-1 h-8 w-8 text-red-600 hover:bg-red-50 rounded"
            title="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </dd>
      </div>
    )
  }

  return (
    <div>
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="flex items-center gap-2 group">
        <span>{value ?? '-'}</span>
        <button
          onClick={() => {
            setEditValue(String(value ?? ''))
            onStartEdit()
          }}
          className="opacity-0 group-hover:opacity-100 p-1 h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-opacity"
          title="Edit"
        >
          <Pencil className="h-3 w-3" />
        </button>
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
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-muted rounded w-1/2 mb-8"></div>
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-5/6"></div>
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
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Roadmap
        </Link>
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
          Error: {errorMessage}
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
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Roadmap
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          {editingField === 'title' ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                type="text"
                value={titleValue}
                onChange={e => handleTitleChange(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-3xl font-bold shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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
                <span className="text-xs text-muted-foreground">Saving...</span>
              )}
              <button
                onClick={() => {
                  if (titleDebounceRef.current) {
                    clearTimeout(titleDebounceRef.current)
                  }
                  setIsTitleDebouncing(false)
                  setEditingField(null)
                }}
                className="p-1 h-8 w-8 text-green-600 hover:bg-green-50 rounded"
                title="Done"
              >
                <Check className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <h1 className="text-3xl font-bold flex-1">{data.title}</h1>
          )}
          <Badge variant="outline">{data.status}</Badge>
          {data.priority ? (
            <Badge variant={data.priority === 'P1' ? 'destructive' : 'secondary'}>
              {data.priority}
            </Badge>
          ) : null}
          {editingField !== 'title' && (
            <button
              onClick={() => setEditingField('title')}
              className="p-1 h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
              title="Edit title"
            >
              <Pencil className="h-3 w-3" />
            </button>
          )}
        </div>
        <p className="text-muted-foreground font-mono text-sm">{data.planSlug}</p>
      </div>

      <div className="grid gap-6">
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Overview</h2>
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
              label="Feature Directory"
              value={data.featureDir}
              isEditing={editingField === 'featureDir'}
              onStartEdit={() => setEditingField('featureDir')}
              onSave={value => handleUpdate('featureDir', value)}
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
              label="Estimated Stories"
              value={data.estimatedStories}
              isEditing={editingField === 'estimatedStories'}
              onStartEdit={() => setEditingField('estimatedStories')}
              onSave={value => handleUpdate('estimatedStories', value)}
              onCancel={() => setEditingField(null)}
              type="number"
              editable
            />
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Created</dt>
              <dd>{new Date(data.createdAt).toLocaleDateString()}</dd>
            </div>
            <div className="md:col-span-2">
              <dt className="text-sm font-medium text-muted-foreground mb-2">Tags</dt>
              <dd className="flex flex-wrap gap-2">
                {data.tags && data.tags.length > 0 ? (
                  data.tags.map(tag => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
                <button
                  onClick={() => setEditingField('tags')}
                  className="p-1 h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
                  title="Edit tags"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </dd>
            </div>
          </dl>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Stories</h2>
          {isLoadingStories ? (
            <div className="animate-pulse space-y-2">
              <div className="h-8 bg-muted rounded"></div>
              <div className="h-8 bg-muted rounded"></div>
              <div className="h-8 bg-muted rounded"></div>
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
                      className="font-mono text-sm text-blue-600 hover:underline"
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
                      className="hover:underline"
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
                      <Badge
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
                      </Badge>
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
                    row.currentPhase ? <Badge variant="outline">{row.currentPhase}</Badge> : '-',
                },
                {
                  key: 'priority',
                  header: 'Priority',
                  render: (row: PlanStory) => (
                    <Badge
                      variant={
                        row.priority === 'P0'
                          ? 'destructive'
                          : row.priority === 'P1'
                            ? 'outline'
                            : 'secondary'
                      }
                    >
                      {row.priority ?? '-'}
                    </Badge>
                  ),
                },
              ]}
              emptyMessage="No stories linked to this plan yet."
            />
          ) : (
            <p className="text-muted-foreground">No stories linked to this plan yet.</p>
          )}
        </div>

        {data.summary ? (
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Summary</h2>
            <p className="text-muted-foreground">{data.summary}</p>
          </div>
        ) : null}

        {data.details ? (
          <>
            {data.details.phases ? (
              <div className="bg-card border rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Phases</h2>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                  {JSON.stringify(data.details.phases, null, 2)}
                </pre>
              </div>
            ) : null}

            {data.details.sections ? (
              <div className="bg-card border rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Sections</h2>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                  {JSON.stringify(data.details.sections, null, 2)}
                </pre>
              </div>
            ) : null}

            {data.details.rawContent ? (
              <div className="bg-card border rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Full Content</h2>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm whitespace-pre-wrap">
                    {data.details.rawContent}
                  </pre>
                </div>
              </div>
            ) : null}

            <div className="bg-card border rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Metadata</h2>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Format Version</dt>
                  <dd className="font-mono text-sm">{data.details.formatVersion || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Content Hash</dt>
                  <dd className="font-mono text-sm">{data.details.contentHash || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Source File</dt>
                  <dd className="font-mono text-sm">{data.details.sourceFile || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Imported At</dt>
                  <dd>
                    {data.details.importedAt
                      ? new Date(data.details.importedAt).toLocaleString()
                      : '-'}
                  </dd>
                </div>
                <div className="md:col-span-2">
                  <dt className="text-sm font-medium text-muted-foreground">Last Updated</dt>
                  <dd>{new Date(data.details.updatedAt).toLocaleString()}</dd>
                </div>
              </dl>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
