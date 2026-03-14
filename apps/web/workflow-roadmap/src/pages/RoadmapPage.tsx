import { useState, useEffect } from 'react'
import { AppDataTable, type AppDataTableColumn, Badge } from '@repo/app-component-library'

interface Plan {
  id: string
  planSlug: string
  title: string
  summary: string | null
  planType: string | null
  status: string
  featureDir: string | null
  storyPrefix: string | null
  estimatedStories: number | null
  tags: string[] | null
  priority: string | null
  createdAt: string
  updatedAt: string
}

const columns: AppDataTableColumn<Plan>[] = [
  {
    key: 'planSlug',
    header: 'Slug',
    render: plan => <span className="font-mono text-sm">{plan.planSlug}</span>,
  },
  {
    key: 'title',
    header: 'Title',
  },
  {
    key: 'status',
    header: 'Status',
    render: plan => <Badge variant="outline">{plan.status}</Badge>,
  },
  {
    key: 'priority',
    header: 'Priority',
    render: plan =>
      plan.priority ? (
        <Badge variant={plan.priority === 'P1' ? 'destructive' : 'secondary'}>
          {plan.priority}
        </Badge>
      ) : null,
  },
  {
    key: 'planType',
    header: 'Type',
  },
  {
    key: 'estimatedStories',
    header: 'Stories',
    responsive: { hideAt: 'md' },
  },
  {
    key: 'createdAt',
    header: 'Created',
    render: plan => new Date(plan.createdAt).toLocaleDateString(),
    responsive: { hideAt: 'lg' },
  },
]

export function RoadmapPage() {
  const [data, setData] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPlans = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch('/api/v1/roadmap?page=1&limit=10')
        if (!response.ok) {
          throw new Error('Failed to fetch plans')
        }
        const result = await response.json()
        setData(result.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchPlans()
  }, [])

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
          Error: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Roadmap</h1>
        <p className="text-muted-foreground mt-2">Browse and manage project plans</p>
      </div>

      <AppDataTable
        data={data}
        columns={columns}
        loading={loading}
        emptyMessage="No plans found"
        pagination={{
          enabled: true,
          pageSize: 10,
          showPageSizeSelector: true,
          showPageInfo: true,
          showNavigationButtons: true,
        }}
      />
    </div>
  )
}
