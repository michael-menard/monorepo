import { useParams, Link } from '@tanstack/react-router'
import { Badge } from '@repo/app-component-library'
import { ArrowLeft } from 'lucide-react'
import { useGetPlanBySlugQuery } from '../store/roadmapApi'

export function PlanDetailsPage() {
  const { slug } = useParams({ from: '/plan/$slug' })
  const { data, error, isLoading } = useGetPlanBySlugQuery(slug)

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
          <h1 className="text-3xl font-bold">{data.title}</h1>
          <Badge variant="outline">{data.status}</Badge>
          {data.priority ? (
            <Badge variant={data.priority === 'P1' ? 'destructive' : 'secondary'}>
              {data.priority}
            </Badge>
          ) : null}
        </div>
        <p className="text-muted-foreground font-mono text-sm">{data.planSlug}</p>
      </div>

      <div className="grid gap-6">
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Overview</h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Type</dt>
              <dd>{data.planType || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Priority</dt>
              <dd>{data.priority || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Feature Directory</dt>
              <dd className="font-mono text-sm">{data.featureDir || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Story Prefix</dt>
              <dd className="font-mono text-sm">{data.storyPrefix || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Estimated Stories</dt>
              <dd>{data.estimatedStories ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Created</dt>
              <dd>{new Date(data.createdAt).toLocaleDateString()}</dd>
            </div>
            {data.tags && data.tags.length > 0 ? (
              <div className="md:col-span-2">
                <dt className="text-sm font-medium text-muted-foreground mb-2">Tags</dt>
                <dd className="flex flex-wrap gap-2">
                  {data.tags.map(tag => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </dd>
              </div>
            ) : null}
          </dl>
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
