import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { DetailCard } from '../shared/DetailCard'

export function DependenciesCard({ blockedBy, blocks }: { blockedBy: string[]; blocks: string[] }) {
  return (
    <DetailCard>
      <h2 className="text-base font-semibold mb-4 text-slate-300 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500 inline-block" />
        Dependencies
      </h2>
      <div className="flex gap-8">
        <div className="flex-1">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">
            Blocked by — must complete first
          </p>
          {blockedBy.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {blockedBy.map(id => (
                <Link
                  key={id}
                  to={`/story/${id}`}
                  className="inline-flex items-center gap-1.5 font-mono text-sm text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-400/50 rounded px-2.5 py-1 transition-colors"
                >
                  {id}
                  <ArrowRight className="h-3 w-3 opacity-60" />
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-600 italic">No blockers</p>
          )}
        </div>
        <div className="flex-1">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">
            Blocks — waiting on this
          </p>
          {blocks.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {blocks.map(id => (
                <Link
                  key={id}
                  to={`/story/${id}`}
                  className="inline-flex items-center gap-1.5 font-mono text-sm text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-400/50 rounded px-2.5 py-1 transition-colors"
                >
                  <ArrowRight className="h-3 w-3 opacity-60" />
                  {id}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-600 italic">No downstream blocks</p>
          )}
        </div>
      </div>
    </DetailCard>
  )
}
