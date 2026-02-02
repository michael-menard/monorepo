/**
 * Instructions Detail Module
 *
 * Module wrapper for the Instructions Detail Page.
 * Handles data fetching and navigation for lazy-loading by main-app shell.
 * Story 3.1.4: Instructions Detail Page
 */
import { useCallback } from 'react'
import { z } from 'zod'
import { ThemeProvider } from '@repo/app-component-library'
import { DetailPage } from './pages/detail-page'
import type { Instruction } from './__types__'

/**
 * Module props schema - validated at runtime
 */
const InstructionsDetailModulePropsSchema = z.object({
  /** The instruction ID to display */
  instructionId: z.string(),
  /** Optional pre-fetched instruction data (for SSR/RSC) */
  instruction: z
    .object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional(),
      thumbnail: z.string(),
      images: z.array(z.string()).optional(),
      pieceCount: z.number(),
      theme: z.string(),
      tags: z.array(z.string()),
      pdfUrl: z.string().optional(),
      createdAt: z.string(),
      updatedAt: z.string().optional(),
      isFavorite: z.boolean().optional(),
    })
    .optional(),
  /** Whether data is being loaded */
  isLoading: z.boolean().optional(),
  /** Error message if fetch failed */
  error: z.string().optional().nullable(),
  /** Handler for back navigation */
  onBack: z.function(z.tuple([]), z.void()).optional(),
  /** Handler for edit action */
  onEdit: z.function(z.tuple([z.string()]), z.void()).optional(),
  /** Handler for favorite toggle */
  onFavorite: z.function(z.tuple([z.string()]), z.void()).optional(),
  /** Handler for delete action */
  onDelete: z.function(z.tuple([z.string()]), z.void()).optional(),
  /** Optional className for styling */
  className: z.string().optional(),
})

export type InstructionsDetailModuleProps = z.infer<typeof InstructionsDetailModulePropsSchema>

/**
 * Instructions Detail Module Component
 *
 * This module wraps the DetailPage with ThemeProvider and handles props from main-app.
 * The data fetching is handled by main-app to allow RTK Query integration.
 */
export function InstructionsDetailModule({
  instruction,
  isLoading,
  error,
  onBack,
  onEdit,
  onFavorite,
  onDelete,
  className,
}: InstructionsDetailModuleProps) {
  // Default handlers that can be overridden by props
  const handleBack = useCallback(() => {
    if (onBack) {
      onBack()
    } else {
      // Fallback: use browser history
      window.history.back()
    }
  }, [onBack])

  const handleEdit = useCallback(
    (id: string) => {
      if (onEdit) {
        onEdit(id)
      } else {
        // Fallback: log for development
        // eslint-disable-next-line no-console
        console.log('Edit instruction:', id)
      }
    },
    [onEdit],
  )

  const handleFavorite = useCallback(
    (id: string) => {
      if (onFavorite) {
        onFavorite(id)
      } else {
        // Fallback: log for development
        // eslint-disable-next-line no-console
        console.log('Toggle favorite:', id)
      }
    },
    [onFavorite],
  )

  return (
    <ThemeProvider defaultTheme="system" storageKey="instructions-gallery-theme">
      <DetailPage
        instruction={instruction as Instruction | null}
        isLoading={isLoading}
        error={error}
        onBack={handleBack}
        onEdit={handleEdit}
        onFavorite={handleFavorite}
        onDelete={onDelete}
        className={className}
      />
    </ThemeProvider>
  )
}

export default InstructionsDetailModule
