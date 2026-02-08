import { FileText, Download, ExternalLink } from 'lucide-react'
import { InstructionsUpload } from '../InstructionsUpload'
import { DashboardCard } from './DashboardCard'

interface InstructionsCardProps {
  mocId: string
  instructionsPdfUrls: string[]
  onFilesUploaded?: () => void
}

export function InstructionsCard({
  mocId,
  instructionsPdfUrls,
  onFilesUploaded,
}: InstructionsCardProps) {
  const safeUrls = instructionsPdfUrls ?? []

  return (
    <DashboardCard
      id="instructions"
      title="Instructions"
      titleIcon={<FileText className="h-4 w-4 text-rose-500" />}
    >
      <div className="space-y-4">
        {/* Upload Component (INST-1104) */}
        <InstructionsUpload mocId={mocId} onSuccess={onFilesUploaded} />

        {/* Existing Instructions List */}
        {safeUrls.length === 0 ? (
          <p className="text-sm text-muted-foreground">No instruction PDFs uploaded yet.</p>
        ) : (
          <div>
            <h4 className="text-sm font-medium mb-2">Uploaded Files ({safeUrls.length})</h4>
            <ul className="space-y-2" role="list" aria-label="Instruction PDF files">
              {safeUrls.map((url, index) => {
                let filename = url
                try {
                  const parsed = new URL(url)
                  filename = parsed.pathname.split('/').pop() || url
                } catch {
                  filename = url.split('/').pop() || url
                }

                const displayName = filename.toLowerCase().endsWith('.pdf')
                  ? filename
                  : `Instructions PDF #${index + 1}`

                return (
                  <li
                    key={url}
                    className="flex items-center gap-3 rounded-lg p-3 border border-border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-300">
                      <FileText className="h-4 w-4" aria-hidden="true" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        Open
                      </a>
                      <a
                        href={url}
                        download={displayName}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Download className="h-3 w-3" aria-hidden="true" />
                        Download
                      </a>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </DashboardCard>
  )
}
