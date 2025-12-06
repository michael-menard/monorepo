/**
 * Type definitions for Instructions Gallery
 * Story 3.1.2: Instructions Card Component
 */
import { z } from 'zod'

/**
 * Instruction Zod Schema
 * Defines the shape of an instruction item for the gallery
 * Story 3.1.2: Instructions Card Component
 * Story 3.1.4: Instructions Detail Page
 */
export const InstructionSchema = z.object({
  /** Unique identifier */
  id: z.string().uuid(),
  /** Display name of the instruction set */
  name: z.string().min(1),
  /** Optional description */
  description: z.string().optional(),
  /** Thumbnail image URL */
  thumbnail: z.string().url(),
  /** Array of image URLs for gallery view (detail page) */
  images: z.array(z.string()).optional().default([]),
  /** Total piece count for the MOC */
  pieceCount: z.number().int().nonnegative(),
  /** LEGO theme (e.g., "Technic", "City", "Star Wars") */
  theme: z.string(),
  /** User-defined tags for categorization */
  tags: z.array(z.string()),
  /** URL to downloadable PDF instructions */
  pdfUrl: z.string().url().optional(),
  /** Creation timestamp */
  createdAt: z.string().datetime(),
  /** Last update timestamp */
  updatedAt: z.string().datetime().optional(),
  /** Whether the user has favorited this instruction */
  isFavorite: z.boolean().optional().default(false),
})

export type Instruction = z.infer<typeof InstructionSchema>

/**
 * InstructionCard Props Schema
 */
export const InstructionCardPropsSchema = z.object({
  /** The instruction data to display */
  instruction: InstructionSchema,
  /** Handler for favorite action */
  onFavorite: z.function().args(z.string()).returns(z.void()).optional(),
  /** Handler for edit action */
  onEdit: z.function().args(z.string()).returns(z.void()).optional(),
  /** Handler for click/navigation */
  onClick: z.function().args(z.string()).returns(z.void()).optional(),
  /** Additional CSS classes */
  className: z.string().optional(),
})

export type InstructionCardProps = z.infer<typeof InstructionCardPropsSchema>
