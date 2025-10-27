import React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@repo/ui'
import { AlertCircle, FileX, File } from 'lucide-react'
import type { FileItem, FileListConfig, ResponsiveColumns } from '../schemas'
import { formatFileSize, formatDate, getFileIcon } from '../utils'

export interface FileListProps {
  /** Array of files to display */
  files: FileItem[]

  /** Configuration options for the file list */
  config?: Partial<FileListConfig>

  /** Custom actions to render for each file */
  children?: (file: FileItem) => React.ReactNode

  /** Callback when a file row is clicked */
  onFileClick?: (file: FileItem) => void

  /** Additional CSS classes */
  className?: string

  /** Loading state */
  loading?: boolean

  /** Error state */
  error?: string
}

const defaultConfig: FileListConfig = {
  dateField: 'createdAt',
  compact: false,
  showHeaders: true,
  striped: true,
  columns: {
    default: {
      icon: true,
      name: true,
      size: true,
      date: true,
      actions: true,
    },
    sm: {
      icon: true,
      name: true,
      size: false,
      date: false,
      actions: true,
    },
  },
}

export const FileList: React.FC<FileListProps> = ({
  files,
  config = {},
  children,
  onFileClick,
  className = '',
  loading = false,
  error,
}) => {
  const mergedConfig = { ...defaultConfig, ...config }

  // Loading state
  if (loading) {
    return (
      <div className={`border rounded-lg ${className}`}>
        <div className="p-8 text-center text-muted-foreground">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          Loading files...
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={`border rounded-lg ${className}`}>
        <div className="p-8 text-center text-destructive">
          <AlertCircle className="h-8 w-8 mx-auto mb-4" />
          <p>{error}</p>
        </div>
      </div>
    )
  }

  // Empty state
  if (!files || files.length === 0) {
    const emptyMessage = mergedConfig.emptyMessage || 'No files available'
    return (
      <div className={`border rounded-lg ${className}`}>
        <div className="p-8 text-center text-muted-foreground">
          <FileX className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{emptyMessage}</p>
        </div>
      </div>
    )
  }

  const getIconComponent = (iconName: string) => {
    // Import icons dynamically to avoid importing all of lucide-react
    const iconMap: Record<string, React.ComponentType<any>> = {
      File,
      FileText: File, // Fallback to File for now
      Image: File,
      Sheet: File,
      Code: File,
      Archive: File,
      Video: File,
      Music: File,
      Presentation: File,
    }
    return iconMap[iconName] || File
  }

  // Helper function to get responsive column classes
  const getColumnClasses = (column: keyof ResponsiveColumns) => {
    const { columns } = mergedConfig

    // For icon, size and date columns, hide on small screens and show on large screens
    if (column === 'icon' || column === 'size' || column === 'date') {
      return 'hidden lg:table-cell'
    }

    // For name and actions, always show
    if (column === 'name' || column === 'actions') {
      return 'table-cell'
    }

    return 'table-cell'
  }

  return (
    <div className={`border rounded-lg ${className}`}>
      <Table>
        {mergedConfig.showHeaders ? (
          <TableHeader className="hidden lg:table-header-group">
            <TableRow>
              <TableHead className={`w-12 ${getColumnClasses('icon')}`}></TableHead>
              <TableHead className={getColumnClasses('name')}>Name</TableHead>
              <TableHead className={getColumnClasses('size')}>Size</TableHead>
              <TableHead className={getColumnClasses('date')}>Date</TableHead>
              {children ? (
                <TableHead className={`text-right ${getColumnClasses('actions')}`}>
                  Actions
                </TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
        ) : null}
        <TableBody>
          {files.map((file, index) => {
            const IconComponent = getIconComponent(getFileIcon(file))
            const dateValue =
              mergedConfig.dateField === 'createdAt' ? file.createdAt : file.updatedAt

            return (
              <TableRow
                key={file.id}
                onClick={onFileClick ? () => onFileClick(file) : undefined}
                className={`
                  ${mergedConfig.striped && index % 2 === 1 ? 'bg-muted/25' : ''}
                  ${onFileClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                `.trim()}
              >
                <TableCell className={getColumnClasses('icon')}>
                  <div className="p-2 bg-primary/10 rounded-lg w-fit">
                    <IconComponent className="h-4 w-4 text-primary" />
                  </div>
                </TableCell>
                <TableCell className={getColumnClasses('name')}>
                  <div>
                    <p className={`font-medium ${mergedConfig.compact ? 'text-xs' : 'text-sm'}`}>
                      {file.name}
                    </p>
                  </div>
                </TableCell>
                <TableCell
                  className={`${getColumnClasses('size')} ${mergedConfig.compact ? 'text-xs' : 'text-sm'}`}
                >
                  {file.size ? formatFileSize(file.size) : '—'}
                </TableCell>
                <TableCell
                  className={`${getColumnClasses('date')} ${mergedConfig.compact ? 'text-xs' : 'text-sm'}`}
                >
                  {formatDate(dateValue)}
                </TableCell>
                {children ? (
                  <TableCell className={`text-right ${getColumnClasses('actions')}`}>
                    {children(file)}
                  </TableCell>
                ) : null}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
