import { useParams, Link } from '@tanstack/react-router'
import { AppBadge } from '@repo/app-component-library'
import { ArrowLeft } from 'lucide-react'
import { useGetStoryByIdQuery } from '../store/roadmapApi'

export function StoryDetailsPage() {
  const { storyId } = useParams({ from: '/story/$storyId' })
  const { data, error, isLoading } = useGetStoryByIdQuery(storyId)

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-800 rounded w-32"></div>
          <div className="h-8 bg-slate-800 rounded w-1/2"></div>
          <div className="flex gap-2">
            <div className="h-5 bg-slate-800 rounded-full w-20"></div>
            <div className="h-5 bg-slate-800 rounded-full w-16"></div>
          </div>
          <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6 space-y-3">
            <div className="h-4 bg-slate-800 rounded"></div>
            <div className="h-4 bg-slate-800 rounded"></div>
            <div className="h-4 bg-slate-800 rounded w-5/6"></div>
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
          className="inline-flex items-center text-sm text-slate-400 hover:text-cyan-400 mb-6 transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Roadmap
        </Link>
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg font-mono text-sm">
          ERROR: {error ? 'Failed to fetch story' : 'Story not found'}
        </div>
      </div>
    )
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
        <div className="flex items-center gap-3 mb-3">
          <h1 className="text-3xl font-bold tracking-wide bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            {data.title}
          </h1>
          <span className="font-mono text-sm text-cyan-500/70 border border-cyan-500/30 rounded px-2 py-0.5">
            {data.storyId}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <AppBadge
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
          </AppBadge>
          <AppBadge variant="secondary">{data.storyType || data.epic}</AppBadge>
          {data.priority && (
            <AppBadge
              variant={
                data.priority === 'P0'
                  ? 'destructive'
                  : data.priority === 'P1'
                    ? 'outline'
                    : 'secondary'
              }
            >
              {data.priority}
            </AppBadge>
          )}
        </div>
      </div>

      <div className="grid gap-6">
        <div className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-6">
          <h2 className="text-base font-semibold mb-4 text-slate-300 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 inline-block" />
            Details
          </h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-slate-400">Epic</dt>
              <dd className="font-mono text-slate-200">{data.epic}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-400">Complexity</dt>
              <dd className="text-slate-200">{data.complexity ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-400">Story Points</dt>
              <dd className="text-slate-200">{data.storyPoints ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-400">Created</dt>
              <dd className="text-slate-200">{new Date(data.createdAt).toLocaleDateString()}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-400">Last Updated</dt>
              <dd className="text-slate-200">{new Date(data.updatedAt).toLocaleDateString()}</dd>
            </div>
          </dl>
        </div>

        {data.description && (
          <div className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-6">
            <h2 className="text-base font-semibold mb-4 text-slate-300 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-500 inline-block" />
              Description
            </h2>
            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{data.description}</p>
          </div>
        )}

        {data.metadata && (
          <>
            {data.metadata.surfaces && (
              <div className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-6">
                <h2 className="text-base font-semibold mb-4 text-slate-300 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500 inline-block" />
                  Surfaces
                </h2>
                <div className="flex flex-wrap gap-2">
                  {data.metadata.surfaces.backend && <AppBadge variant="outline">Backend</AppBadge>}
                  {data.metadata.surfaces.frontend && (
                    <AppBadge variant="outline">Frontend</AppBadge>
                  )}
                  {data.metadata.surfaces.database && (
                    <AppBadge variant="outline">Database</AppBadge>
                  )}
                  {data.metadata.surfaces.infra && <AppBadge variant="outline">Infra</AppBadge>}
                  {!data.metadata.surfaces.backend &&
                    !data.metadata.surfaces.frontend &&
                    !data.metadata.surfaces.database &&
                    !data.metadata.surfaces.infra && <span className="text-slate-500">-</span>}
                </div>
              </div>
            )}

            {data.metadata.tags && data.metadata.tags.length > 0 && (
              <div className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-6">
                <h2 className="text-base font-semibold mb-4 text-slate-300 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-500 inline-block" />
                  Tags
                </h2>
                <div className="flex flex-wrap gap-2">
                  {data.metadata.tags.map(tag => (
                    <AppBadge key={tag} variant="secondary">
                      {tag}
                    </AppBadge>
                  ))}
                </div>
              </div>
            )}

            {data.metadata.blocked_by && data.metadata.blocked_by.length > 0 && (
              <div className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-6">
                <h2 className="text-base font-semibold mb-4 text-slate-300 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 inline-block" />
                  Blocked By
                </h2>
                <div className="flex flex-wrap gap-2">
                  {data.metadata.blocked_by.map(blockedId => (
                    <Link
                      key={blockedId}
                      to="/story/$storyId"
                      params={{ storyId: blockedId }}
                      className="font-mono text-sm text-cyan-400 hover:text-cyan-300 hover:underline border border-cyan-500/30 rounded px-2 py-0.5 transition-colors"
                    >
                      {blockedId}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {data.metadata.blocks && data.metadata.blocks.length > 0 && (
              <div className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-6">
                <h2 className="text-base font-semibold mb-4 text-slate-300 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" />
                  Blocks
                </h2>
                <div className="flex flex-wrap gap-2">
                  {data.metadata.blocks.map(blockedId => (
                    <Link
                      key={blockedId}
                      to="/story/$storyId"
                      params={{ storyId: blockedId }}
                      className="font-mono text-sm text-cyan-400 hover:text-cyan-300 hover:underline border border-cyan-500/30 rounded px-2 py-0.5 transition-colors"
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
