import { Link } from 'react-router-dom'
import type { DashboardResponse } from '../../store/roadmapApi'

export function ImpactRanking({ stories }: { stories: DashboardResponse['impactRanking'] }) {
  if (stories.length === 0) return null

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
        Impact Ranking
      </h2>
      <div className="space-y-1">
        {stories.map((story, i) => (
          <div
            key={story.storyId}
            className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-slate-800/30 transition-colors"
          >
            <span className="text-xs font-mono text-slate-500 w-5 text-right shrink-0">
              #{i + 1}
            </span>
            <Link
              to={`/story/${story.storyId}`}
              className="font-mono text-xs text-cyan-400 hover:text-cyan-300 hover:underline shrink-0"
            >
              {story.storyId}
            </Link>
            <span className="text-sm text-slate-300 truncate flex-1" title={story.title}>
              {story.title}
            </span>
            <span
              className={`text-xs font-mono shrink-0 ${story.fanOut > 5 ? 'text-amber-400 font-semibold' : 'text-slate-400'}`}
            >
              fan: {story.fanOut}
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
