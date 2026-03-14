import React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { AppDataTable, Badge } from '@repo/app-component-library'
import { useGetPlansQuery, type Plan } from '../store/roadmapApi'

interface AppDataTableColumn<T> {
  key: string
  header: string | ((column: AppDataTableColumn<T>) => React.ReactNode)
  render?: (item: T) => React.ReactNode
  className?: string
  responsive?: {
    hideAt?: 'sm' | 'md' | 'lg' | 'xl'
    priority?: number
  }
  sortable?: boolean
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
  const navigate = useNavigate({ from: '/' })
  const { data, error } = useGetPlansQuery({ page: 1, limit: 10 })

  const handleRowClick = (plan: Plan) => {
    navigate({ to: '/plan/$slug', params: { slug: plan.planSlug } })
  }

  const errorMessage = error ? ('error' in error ? error.error : 'Failed to fetch plans') : null

  if (errorMessage) {
    return (
      <div className="p-4">
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
          Error: {errorMessage}
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
        data={data?.data || []}
        columns={columns}
        onRowClick={handleRowClick}
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
