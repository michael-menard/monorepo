import { z } from 'zod'

/**
 * Generic file item schema for the file list component
 * This is designed to be flexible and work with any file data structure
 */
export const FileItemSchema = z.object({
  /** Unique identifier for the file */
  id: z.string(),

  /** Display name for the file */
  name: z.string(),

  /** File size in bytes (optional) */
  size: z.number().optional(),

  /** MIME type of the file (optional) */
  mimeType: z.string().optional(),

  /** File extension (optional, will be derived from name if not provided) */
  extension: z.string().optional(),

  /** URL to access/download the file */
  url: z.string().url(),

  /** Creation date (optional) */
  createdAt: z.union([z.string(), z.date()]).optional(),

  /** Last modified date (optional) */
  updatedAt: z.union([z.string(), z.date()]).optional(),

  /** Additional metadata that can be used for display or actions */
  metadata: z.record(z.unknown()).optional(),
})

export type FileItem = z.infer<typeof FileItemSchema>

/**
 * Responsive column configuration schema
 */
export const ResponsiveColumnsSchema = z.object({
  /** Show icon column */
  icon: z.boolean().default(true),

  /** Show name column */
  name: z.boolean().default(true),

  /** Show size column */
  size: z.boolean().default(true),

  /** Show date column */
  date: z.boolean().default(true),

  /** Show actions column */
  actions: z.boolean().default(true),
})

/**
 * Configuration schema for the file list component
 */
export const FileListConfigSchema = z.object({
  /** Which date field to display ('createdAt' | 'updatedAt') */
  dateField: z.enum(['createdAt', 'updatedAt']).default('createdAt'),

  /** Whether the table should be compact */
  compact: z.boolean().default(false),

  /** Custom empty state message */
  emptyMessage: z.string().optional(),

  /** Whether to show table headers */
  showHeaders: z.boolean().default(true),

  /** Whether to show striped rows (alternating background colors) */
  striped: z.boolean().default(true),

  /** Responsive column configuration for different screen sizes */
  columns: z
    .object({
      /** Columns to show on all screen sizes (default) */
      default: ResponsiveColumnsSchema.default({
        icon: true,
        name: true,
        size: true,
        date: true,
        actions: true,
      }),

      /** Columns to show on large screens and up (lg: 1024px+) */
      lg: ResponsiveColumnsSchema.optional(),

      /** Columns to show on medium screens (md: 768px - 1023px) */
      md: ResponsiveColumnsSchema.optional(),

      /** Columns to show on small screens and below (sm: 640px and below) */
      sm: ResponsiveColumnsSchema.default({
        icon: true,
        name: true,
        size: false,
        date: false,
        actions: true,
      }),
    })
    .default({
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
    }),
})

export type ResponsiveColumns = z.infer<typeof ResponsiveColumnsSchema>
export type FileListConfig = z.infer<typeof FileListConfigSchema>

/**
 * Action button configuration schema
 */
export const ActionConfigSchema = z.object({
  /** Icon name from lucide-react */
  icon: z.string(),

  /** Tooltip text */
  tooltip: z.string(),

  /** Button variant */
  variant: z
    .enum(['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'])
    .default('ghost'),

  /** Whether this action is destructive (affects styling) */
  destructive: z.boolean().default(false),

  /** Whether the action is disabled */
  disabled: z.boolean().default(false),
})

export type ActionConfig = z.infer<typeof ActionConfigSchema>
