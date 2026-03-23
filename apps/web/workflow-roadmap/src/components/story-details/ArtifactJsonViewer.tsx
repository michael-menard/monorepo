import { useState } from 'react'

export function ArtifactJsonViewer({
  title,
  data,
  meta,
}: {
  title: string
  data: unknown
  meta: Array<{ label: string; value: string | null | undefined }>
}) {
  const [expanded, setExpanded] = useState(false)
  const hasData =
    data != null && (typeof data !== 'object' || Object.keys(data as object).length > 0)
  return (
    <div className="space-y-4">
      {/* Meta summary row */}
      <div className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-6">
        <h2 className="text-base font-semibold mb-4 text-slate-300">{title}</h2>
        <div className="flex flex-wrap gap-6">
          {meta
            .filter(m => m.value)
            .map(m => (
              <div key={m.label}>
                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">
                  {m.label}
                </dt>
                <dd className="text-sm text-slate-200 capitalize">{m.value}</dd>
              </div>
            ))}
        </div>
      </div>
      {/* Raw JSON */}
      {hasData ? (
        <div className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-xl overflow-hidden">
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-full flex items-center justify-between px-6 py-3 text-xs font-mono text-slate-500 hover:text-slate-300 transition-colors"
          >
            <span>Raw JSON</span>
            <span>{expanded ? '▲' : '▼'}</span>
          </button>
          {expanded ? (
            <pre className="px-6 pb-6 text-xs text-slate-400 overflow-auto max-h-[600px] leading-relaxed">
              {JSON.stringify(data, null, 2)}
            </pre>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
