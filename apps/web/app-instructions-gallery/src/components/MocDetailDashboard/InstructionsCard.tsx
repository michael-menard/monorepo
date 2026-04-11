import { useState } from 'react'
import { FileText, Download, ExternalLink, Camera } from 'lucide-react'
import { Button } from '@repo/app-component-library'
import { InstructionsUpload } from '@repo/upload/components'
import { DashboardCard } from './DashboardCard'
import { PdfPagePickerModal } from './PdfPagePickerModal'

interface InstructionFile {
  id: string
  url: string
  filename: string
}

interface InstructionsCardProps {
  mocId: string
  instructionsPdfUrls: string[]
  instructionFiles?: InstructionFile[]
  coverImageUrl?: string
  onFilesUploaded?: () => void
}

export function InstructionsCard({
  mocId,
  instructionsPdfUrls,
  instructionFiles,
  coverImageUrl,
  onFilesUploaded,
}: InstructionsCardProps) {
  const safeUrls = instructionsPdfUrls ?? []
  const files = instructionFiles ?? []
  const [captureFile, setCaptureFile] = useState<InstructionFile | null>(null)

  return (
    <DashboardCard
      id="instructions"
      title="Instructions"
      titleIcon={<FileText className="h-4 w-4 text-rose-500" />}
    >
      <div className="space-y-4">
        <InstructionsUpload mocId={mocId} onSuccess={onFilesUploaded} />

        {safeUrls.length === 0 ? (
          <p className="text-sm text-muted-foreground">No instruction PDFs uploaded yet.</p>
        ) : (
          <div>
            <h4 className="text-sm font-medium mb-2">Uploaded Files ({safeUrls.length})</h4>
            <ul className="space-y-2" role="list" aria-label="Instruction PDF files">
              {safeUrls.map((url, index) => {
                const file = files[index]
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
                    {coverImageUrl ? (
                      <img
                        src={coverImageUrl}
                        alt=""
                        className="h-10 w-10 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-300">
                        <FileText className="h-4 w-4" aria-hidden="true" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {file ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCaptureFile(file)}
                          className="h-7 text-xs px-2"
                          title="Capture pages as gallery images"
                        >
                          <Camera className="h-3 w-3 mr-1" />
                          Capture
                        </Button>
                      ) : null}
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

      {captureFile ? (
        <PdfPagePickerModal
          mocId={mocId}
          fileId={captureFile.id}
          pdfUrl={captureFile.url}
          open={!!captureFile}
          onClose={() => setCaptureFile(null)}
        />
      ) : null}
    </DashboardCard>
  )
}
