/**
 * File List Component
 *
 * Story 3.1.40: Display existing MOC files with preview/download links.
 * Groups files by category and shows file metadata.
 */

import { ExternalLink, FileText, Image, Package, ImageIcon, Download } from 'lucide-react'
import { Button } from '@repo/app-component-library'
import type { FileCategory, MocFileItem } from '@repo/upload-types'

/**
 * Props for FileList component
 */
export type FileListProps = {
  files: MocFileItem[]
}

/**
 * File category display configuration
 */
const CATEGORY_CONFIG: Record<FileCategory, { label: string; icon: typeof FileText }> = {
  instruction: { label: 'Instructions', icon: FileText },
  'parts-list': { label: 'Parts Lists', icon: Package },
  image: { label: 'Images', icon: Image },
  thumbnail: { label: 'Thumbnail', icon: ImageIcon },
}

/**
 * Format file size to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/**
 * Format date to relative or absolute string
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return 'Today'
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays < 7) {
    return `${diffDays} days ago`
  } else {
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }
}

/**
 * Get file icon based on MIME type
 */
function getFileIcon(mimeType: string, category: FileCategory) {
  const IconComponent = CATEGORY_CONFIG[category]?.icon || FileText
  return <IconComponent className="h-5 w-5 text-muted-foreground" />
}

/**
 * Group files by category
 */
function groupFilesByCategory(files: MocFileItem[]): Record<FileCategory, MocFileItem[]> {
  const groups: Record<FileCategory, MocFileItem[]> = {
    instruction: [],
    'parts-list': [],
    image: [],
    thumbnail: [],
  }

  files.forEach(file => {
    if (groups[file.category]) {
      groups[file.category].push(file)
    }
  })

  return groups
}

/**
 * Single file item display
 */
function FileItem({ file }: { file: MocFileItem }) {
  return (
    <div
      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
      data-testid={`file-item-${file.id}`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="flex-shrink-0 p-2 bg-background rounded-md">
          {getFileIcon(file.mimeType, file.category)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate" title={file.filename}>
            {file.filename}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatBytes(file.size)}</span>
            <span aria-hidden="true">-</span>
            <span>{formatDate(file.uploadedAt)}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Preview for images/PDFs */}
        {(file.mimeType.startsWith('image/') || file.mimeType === 'application/pdf') && (
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-muted-foreground hover:text-foreground"
          >
            <a href={file.url} target="_blank" rel="noopener noreferrer" aria-label={`Preview ${file.filename}`}>
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        )}
        {/* Download */}
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="text-muted-foreground hover:text-foreground"
        >
          <a href={file.url} download={file.filename} aria-label={`Download ${file.filename}`}>
            <Download className="h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  )
}

/**
 * File category section
 */
function CategorySection({
  category,
  files,
}: {
  category: FileCategory
  files: MocFileItem[]
}) {
  if (files.length === 0) return null

  const config = CATEGORY_CONFIG[category]

  return (
    <div className="space-y-2" data-testid={`file-category-${category}`}>
      <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <config.icon className="h-4 w-4" />
        {config.label}
        <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
          {files.length}
        </span>
      </h3>
      <div className="space-y-2">
        {files.map(file => (
          <FileItem key={file.id} file={file} />
        ))}
      </div>
    </div>
  )
}

/**
 * File List Component
 * Story 3.1.40: Display existing MOC files with preview/download links.
 *
 * Groups files by category (instruction, parts-list, image, thumbnail)
 * and displays file metadata including name, size, and upload date.
 */
export function FileList({ files }: FileListProps) {
  if (files.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-4 text-center" data-testid="file-list-empty">
        No files attached to this MOC
      </p>
    )
  }

  const groupedFiles = groupFilesByCategory(files)

  // Define display order for categories
  const categoryOrder: FileCategory[] = ['instruction', 'parts-list', 'thumbnail', 'image']

  return (
    <div className="space-y-6" data-testid="file-list">
      {categoryOrder.map(category => (
        <CategorySection
          key={category}
          category={category}
          files={groupedFiles[category]}
        />
      ))}
    </div>
  )
}
