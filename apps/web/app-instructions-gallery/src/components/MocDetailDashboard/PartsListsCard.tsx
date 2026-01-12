import { Download, FileSpreadsheet } from 'lucide-react'
import { DashboardCard } from './DashboardCard'
import type { MocPartsList } from './__types__/moc'

interface PartsListsCardProps {
  partsLists: MocPartsList[]
}

export function PartsListsCard({ partsLists }: PartsListsCardProps) {
  const safeLists = partsLists ?? []

  return (
    <DashboardCard
      id="partsLists"
      title="Parts Lists"
      titleIcon={<FileSpreadsheet className="h-4 w-4 text-teal-500" />}
    >
      {safeLists.length === 0 ? (
        <p className="text-sm text-muted-foreground">No parts lists available.</p>
      ) : (
        <ul className="space-y-2" role="list" aria-label="Parts list files">
          {safeLists.map(file => (
            <li
              key={file.id}
              className="flex items-center gap-3 rounded-lg p-3 border border-border hover:bg-accent/50 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-300">
                <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{file.filename}</p>
              </div>

              <a
                href={file.url}
                download={file.filename}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Download className="h-3 w-3" aria-hidden="true" />
                Download
              </a>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  )
}
