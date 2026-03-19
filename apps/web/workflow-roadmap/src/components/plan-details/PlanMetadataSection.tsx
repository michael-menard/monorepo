import { DetailCard } from '../shared/DetailCard'
import type { PlanDetails } from '../../store/roadmapApi'

export function PlanMetadataSection({ details }: { details: NonNullable<PlanDetails['details']> }) {
  return (
    <>
      {details.phases ? (
        <DetailCard>
          <h2 className="text-base font-semibold mb-4 text-slate-300 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 inline-block" />
            Phases
          </h2>
          <pre className="bg-black/40 border border-slate-700/50 p-4 rounded-lg overflow-x-auto text-sm font-mono text-slate-300">
            {JSON.stringify(details.phases, null, 2)}
          </pre>
        </DetailCard>
      ) : null}

      {details.sections ? (
        <DetailCard>
          <h2 className="text-base font-semibold mb-4 text-slate-300 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 inline-block" />
            Sections
          </h2>
          <pre className="bg-black/40 border border-slate-700/50 p-4 rounded-lg overflow-x-auto text-sm font-mono text-slate-300">
            {JSON.stringify(details.sections, null, 2)}
          </pre>
        </DetailCard>
      ) : null}

      {details.rawContent ? (
        <DetailCard>
          <h2 className="text-base font-semibold mb-4 text-slate-300 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 inline-block" />
            Full Content
          </h2>
          <pre className="bg-black/40 border border-slate-700/50 p-4 rounded-lg overflow-x-auto text-sm font-mono text-slate-300 whitespace-pre-wrap">
            {details.rawContent}
          </pre>
        </DetailCard>
      ) : null}

      <DetailCard>
        <h2 className="text-base font-semibold mb-4 text-slate-300 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-500 inline-block" />
          Metadata
        </h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-slate-400">Format Version</dt>
            <dd className="font-mono text-sm text-slate-200">{details.formatVersion || '-'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-400">Content Hash</dt>
            <dd className="font-mono text-sm text-slate-200">{details.contentHash || '-'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-400">Source File</dt>
            <dd className="font-mono text-sm text-slate-200">{details.sourceFile || '-'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-400">Imported At</dt>
            <dd className="text-slate-200">
              {details.importedAt ? new Date(details.importedAt).toLocaleString() : '-'}
            </dd>
          </div>
          <div className="md:col-span-2">
            <dt className="text-sm font-medium text-slate-400">Last Updated</dt>
            <dd className="text-slate-200">{new Date(details.updatedAt).toLocaleString()}</dd>
          </div>
        </dl>
      </DetailCard>
    </>
  )
}
