import React from 'react'
import { z } from 'zod'

// Schemas
export declare const FileItemSchema: z.ZodObject<any>
export declare const FileListConfigSchema: z.ZodObject<any>
export declare const ResponsiveColumnsSchema: z.ZodObject<any>
export declare const ActionConfigSchema: z.ZodObject<any>

export type FileItem = z.infer<typeof FileItemSchema>
export type FileListConfig = z.infer<typeof FileListConfigSchema>
export type ResponsiveColumns = z.infer<typeof ResponsiveColumnsSchema>
export type ActionConfig = z.infer<typeof ActionConfigSchema>

// Components
export interface FileListProps {
  files: FileItem[]
  config?: Partial<FileListConfig>
  children?: (file: FileItem) => React.ReactNode
  onFileClick?: (file: FileItem) => void
  className?: string
  loading?: boolean
  error?: string
}

export declare const FileList: React.FC<FileListProps>

export interface FileActionsProps {
  file: FileItem
  actions: Array<{
    key: string
    config: ActionConfig
    onClick: (file: FileItem) => void
  }>
  className?: string
}

export declare const FileActions: React.FC<FileActionsProps>

// Action creators
export declare const createViewAction: (onView: (file: FileItem) => void) => any
export declare const createDownloadAction: (onDownload: (file: FileItem) => void) => any
export declare const createDeleteAction: (onDelete: (file: FileItem) => void) => any
export declare const createEditAction: (onEdit: (file: FileItem) => void) => any
export declare const createShareAction: (onShare: (file: FileItem) => void) => any
export declare const createCommonActions: (handlers: {
  onView?: (file: FileItem) => void
  onDownload?: (file: FileItem) => void
  onEdit?: (file: FileItem) => void
  onDelete?: (file: FileItem) => void
  onShare?: (file: FileItem) => void
}) => any[]

// Utilities
export declare const formatFileSize: (bytes: number) => string
export declare const formatDate: (date: string | Date | undefined) => string
export declare const getFileExtension: (file: FileItem) => string
export declare const getFileIcon: (file: FileItem) => string
export declare const normalizeFileItem: (file: any) => FileItem
