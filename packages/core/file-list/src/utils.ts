import type { FileItem } from './schemas'

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/**
 * Format date for display
 */
export function formatDate(date: string | Date | undefined): string {
  if (!date) return ''

  const dateObj = typeof date === 'string' ? new Date(date) : date

  if (isNaN(dateObj.getTime())) return ''

  return dateObj.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Get file extension from filename or mimeType
 */
export function getFileExtension(file: FileItem): string {
  if (file.extension) {
    return file.extension.startsWith('.') ? file.extension : `.${file.extension}`
  }

  const nameExtension = file.name.split('.').pop()
  if (nameExtension && nameExtension !== file.name) {
    return `.${nameExtension.toLowerCase()}`
  }

  // Fallback to mime type mapping
  if (file.mimeType) {
    const mimeToExt: Record<string, string> = {
      'application/pdf': '.pdf',
      'text/csv': '.csv',
      'application/json': '.json',
      'text/xml': '.xml',
      'application/xml': '.xml',
      'text/plain': '.txt',
      'application/vnd.ms-excel': '.xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
    }

    return mimeToExt[file.mimeType] || ''
  }

  return ''
}

/**
 * Get appropriate icon name for file type
 */
export function getFileIcon(file: FileItem): string {
  const extension = getFileExtension(file).toLowerCase()
  const mimeType = file.mimeType?.toLowerCase()

  // Image files
  if (
    mimeType?.startsWith('image/') ||
    ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(extension)
  ) {
    return 'Image'
  }

  // Document files
  if (extension === '.pdf') return 'FileText'
  if (['.doc', '.docx'].includes(extension)) return 'FileText'
  if (['.xls', '.xlsx', '.csv'].includes(extension)) return 'Sheet'
  if (['.ppt', '.pptx'].includes(extension)) return 'Presentation'

  // Data files
  if (['.json', '.xml'].includes(extension)) return 'Code'
  if (extension === '.txt') return 'FileText'

  // Archive files
  if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(extension)) return 'Archive'

  // Video files
  if (mimeType?.startsWith('video/') || ['.mp4', '.avi', '.mov', '.wmv'].includes(extension)) {
    return 'Video'
  }

  // Audio files
  if (mimeType?.startsWith('audio/') || ['.mp3', '.wav', '.flac', '.aac'].includes(extension)) {
    return 'Music'
  }

  // Default file icon
  return 'File'
}

/**
 * Validate and normalize file item data
 */
export function normalizeFileItem(file: any): FileItem {
  // Handle common field mappings
  const normalized = {
    id: file.id || file._id || file.fileId,
    name: file.name || file.filename || file.originalFilename || file.title || 'Untitled',
    size: file.size || file.fileSize,
    mimeType: file.mimeType || file.contentType || file.type,
    extension: file.extension || file.ext,
    url: file.url || file.fileUrl || file.downloadUrl || file.src,
    createdAt: file.createdAt || file.created || file.dateCreated,
    updatedAt: file.updatedAt || file.updated || file.dateModified || file.lastModified,
    metadata: file.metadata || {},
  }

  // Remove undefined values
  Object.keys(normalized).forEach(key => {
    if (normalized[key as keyof typeof normalized] === undefined) {
      delete normalized[key as keyof typeof normalized]
    }
  })

  return normalized as FileItem
}
