import { Link } from 'react-router-dom'
import { AppBadge } from '@repo/app-component-library'
import type { DashboardResponse } from '../../store/roadmapApi'

function agingLabel(days: number): string {
  if (days === 0) return 'today'
  if (days < 7) return `${days}d`
  if (days < 30) return `${Math.floor(days / 7)}w`
  return `${Math.floor(days / 30)}mo`
}

export function StoryAgingList({ stories }: { stories: DashboardResponse['agingStories'] }) {
  if (stories.length === 0) return null

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
        Aging Stories
      </h2>
      <div className="space-y-1">
        {stories.map(story => (
          <div
            key={story.storyId}
            className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-slate-800/30 transition-colors"
          >
            <Link
              to={`/story/${story.storyId}`}
              className="font-mono text-xs text-cyan-400 hover:text-cyan-300 hover:underline shrink-0"
            >
              {story.storyId}
            </Link>
            <span className="text-sm text-slate-300 truncate flex-1" title={story.title}>
              {story.title}
            </span>
            <AppBadge variant="secondary" className="text-[10px] shrink-0">
              {story.state}
            </AppBadge>
            <span
              className={`text-xs font-mono shrink-0 ${story.daysInState > 14 ? 'text-red-400' : story.daysInState > 7 ? 'text-amber-400' : 'text-slate-400'}`}
            >
              {agingLabel(story.daysInState)}
            </span>
            {story.plans.length > 0 && (
              <span
                className="text-xs text-slate-500 shrink-0 truncate max-w-[100px]"
                title={story.plans.map(p => p.title).join(', ')}
              >
                {story.plans[0].planSlug}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
