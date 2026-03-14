import { useParams, Link } from '@tanstack/react-router'
import { Badge } from '@repo/app-component-library'
import { ArrowLeft } from 'lucide-react'
import { useGetStoryByIdQuery } from '../store/roadmapApi'

export function StoryDetailsPage() {
  const { storyId } = useParams({ from: '/story/$storyId' })
  const { data, error, isLoading } = useGetStoryByIdQuery(storyId)

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

  if (error || !data) {
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
          Error: {error ? 'Failed to fetch story' : 'Story not found'}
        </div>
      </div>
    )
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
          <Badge variant="outline">{data.storyId}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              data.state === 'completed'
                ? 'default'
                : data.state === 'blocked'
                  ? 'destructive'
                  : data.state === 'in_progress' || data.state === 'in_qa'
                    ? 'outline'
                    : 'secondary'
            }
          >
            {data.state}
          </Badge>
          <Badge variant="secondary">{data.storyType || data.epic}</Badge>
          {data.priority && (
            <Badge
              variant={
                data.priority === 'P0'
                  ? 'destructive'
                  : data.priority === 'P1'
                    ? 'outline'
                    : 'secondary'
              }
            >
              {data.priority}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-6">
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Details</h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Epic</dt>
              <dd className="font-mono">{data.epic}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Complexity</dt>
              <dd>{data.complexity ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Story Points</dt>
              <dd>{data.storyPoints ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Created</dt>
              <dd>{new Date(data.createdAt).toLocaleDateString()}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Last Updated</dt>
              <dd>{new Date(data.updatedAt).toLocaleDateString()}</dd>
            </div>
          </dl>
        </div>

        {data.description && (
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Description</h2>
            <p className="text-muted-foreground whitespace-pre-wrap">{data.description}</p>
          </div>
        )}

        {data.metadata && (
          <>
            {data.metadata.surfaces && (
              <div className="bg-card border rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Surfaces</h2>
                <div className="flex flex-wrap gap-2">
                  {data.metadata.surfaces.backend && <Badge variant="outline">Backend</Badge>}
                  {data.metadata.surfaces.frontend && <Badge variant="outline">Frontend</Badge>}
                  {data.metadata.surfaces.database && <Badge variant="outline">Database</Badge>}
                  {data.metadata.surfaces.infra && <Badge variant="outline">Infra</Badge>}
                  {!data.metadata.surfaces.backend &&
                    !data.metadata.surfaces.frontend &&
                    !data.metadata.surfaces.database &&
                    !data.metadata.surfaces.infra && (
                      <span className="text-muted-foreground">-</span>
                    )}
                </div>
              </div>
            )}

            {data.metadata.tags && data.metadata.tags.length > 0 && (
              <div className="bg-card border rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {data.metadata.tags.map(tag => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {data.metadata.blocked_by && data.metadata.blocked_by.length > 0 && (
              <div className="bg-card border rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Blocked By</h2>
                <div className="flex flex-wrap gap-2">
                  {data.metadata.blocked_by.map(blockedId => (
                    <Link
                      key={blockedId}
                      to="/story/$storyId"
                      params={{ storyId: blockedId }}
                      className="font-mono text-sm text-blue-600 hover:underline"
                    >
                      {blockedId}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {data.metadata.blocks && data.metadata.blocks.length > 0 && (
              <div className="bg-card border rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Blocks</h2>
                <div className="flex flex-wrap gap-2">
                  {data.metadata.blocks.map(blockedId => (
                    <Link
                      key={blockedId}
                      to="/story/$storyId"
                      params={{ storyId: blockedId }}
                      className="font-mono text-sm text-blue-600 hover:underline"
                    >
                      {blockedId}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
