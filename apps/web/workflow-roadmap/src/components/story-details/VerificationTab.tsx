import type { StoryDetails } from '../../store/roadmapApi'
import { ArtifactJsonViewer } from './ArtifactJsonViewer'

export function VerificationTab({
  verification,
}: {
  verification: NonNullable<StoryDetails['verification']>
}) {
  const d = verification.data as Record<string, unknown> | null
  const summary = d?.summary as string | null
  const gates = d?.gates as Record<string, string> | null
  const advisoryNotes = d?.advisory_notes as string[] | null
  const verdictColor = (v: string) =>
    v === 'PASS'
      ? 'text-emerald-400'
      : v === 'EXEMPT'
        ? 'text-slate-500'
        : v === 'WARN'
          ? 'text-amber-400'
          : 'text-red-400'
  const verdictDot = (v: string) =>
    v === 'PASS'
      ? 'bg-emerald-400'
      : v === 'EXEMPT'
        ? 'bg-slate-600'
        : v === 'WARN'
          ? 'bg-amber-400'
          : 'bg-red-400'

  return (
    <div className="space-y-4">
      <div className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-base font-semibold text-slate-300">QA Verification</h2>
          {verification.verdict ? (
            <span
              className={`text-sm font-mono font-semibold ${verdictColor(verification.verdict)}`}
            >
              {verification.verdict}
            </span>
          ) : null}
        </div>
        {summary ? (
          <p className="text-sm text-slate-400 mb-4 leading-relaxed border-l-2 border-slate-700 pl-3">
            {summary}
          </p>
        ) : null}
        {gates && Object.keys(gates).length > 0 ? (
          <div className="space-y-1 mb-4">
            {Object.entries(gates).map(([gate, verdict]) => (
              <div
                key={gate}
                className="flex items-center gap-3 py-2 border-b border-slate-800/60 last:border-0"
              >
                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${verdictDot(verdict)}`} />
                <span className="font-mono text-xs text-slate-400 w-32 shrink-0 capitalize">
                  {gate.replace(/_/g, ' ')}
                </span>
                <span className={`text-xs font-mono ${verdictColor(verdict)}`}>{verdict}</span>
              </div>
            ))}
          </div>
        ) : null}
        {advisoryNotes && advisoryNotes.length > 0 ? (
          <div className="border-t border-slate-800 pt-3 space-y-1.5">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">
              Advisory Notes
            </p>
            {advisoryNotes.map((note, i) => (
              <p key={i} className="text-xs text-amber-400/70 leading-relaxed">
                {note}
              </p>
            ))}
          </div>
        ) : null}
      </div>
      <ArtifactJsonViewer title="" data={verification.data} meta={[]} />
    </div>
  )
}
